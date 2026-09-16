import { NextResponse, type NextRequest } from "next/server";
import { club, COLLECTIONS } from "@/lib/firebase/collections";
import { authErrorResponse, requireCapability } from "@/lib/session";
import { requireGithubUser, type GithubIdentity } from "@/lib/github-auth";
import { RATE_LIMITS, checkRateLimit } from "@/lib/rate-limit";
import { verifyEvidence } from "@/lib/github-verify";
import {
    EVIDENCE_RULES,
    EvidenceError,
    checkArena,
    checkAuthor,
    checkHardReview,
    checkKind,
    checkMilestone10,
    emptyJourney,
    journeyId,
    milestoneExists,
    validateReflection,
    type JourneyEntry,
    type JourneyRecord,
} from "@/lib/pr-journey";

export const runtime = "nodejs";

type Params = { params: Promise<{ n: string }> };

async function milestoneFrom(params: Params["params"]): Promise<number | null> {
    const n = Number((await params).n);
    return milestoneExists(n) ? n : null;
}

/** Null when allowed; otherwise the response to send. */
async function throttle(identity: GithubIdentity): Promise<NextResponse | null> {
    const limit = await checkRateLimit("journey-check", String(identity.id), RATE_LIMITS.journeyCheck);
    if (limit.ok) return null;
    return NextResponse.json(
        {
            ok: false,
            message: `That is a lot of checks in a short time. Try again in ${Math.ceil(limit.retryAfterSeconds / 60)} minutes.`,
        },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
}

/**
 * Submits one milestone: a GitHub link plus the five-field reflection.
 *
 * Open to anyone signed in with GitHub. Everything checkable is checked here
 * rather than trusted — the link resolves, you opened it (or, for milestone 8,
 * you did not), and it sits in the right kind of repository for where you are
 * on the ladder. What a human still has to judge is the reflection, which is
 * why submission lands in `submitted` and a reviewer moves it to `signed-off`.
 */
export async function PUT(request: NextRequest, { params }: Params) {
    try {
        const me = await requireGithubUser();
        const n = await milestoneFrom(params);
        if (n === null) return NextResponse.json({ ok: false, message: "No such milestone." }, { status: 404 });

        const body = (await request.json().catch(() => ({}))) as { url?: string; reflection?: unknown };
        const reflection = validateReflection(body.reflection);

        const ref = club<JourneyRecord>(COLLECTIONS.prJourney).doc(journeyId(me.id));
        const snap = await ref.get();
        const record = snap.exists ? (snap.data() as JourneyRecord) : emptyJourney(me);

        // The ladder is the product, so it is enforced here and not only in the
        // page that draws the padlocks. It also runs before the GitHub lookup:
        // a submission that is going to be refused anyway should not spend the
        // shared API budget finding that out.
        if (n > 1 && record.entries[String(n - 1)]?.state !== "signed-off") {
            return NextResponse.json(
                {
                    ok: false,
                    message: `Milestone ${n - 1} has to be signed off before you can submit ${n}. The order is the point.`,
                },
                { status: 409 },
            );
        }
        if (record.entries[String(n)]?.state === "signed-off") {
            return NextResponse.json(
                { ok: false, message: "That milestone is already signed off. Talk to your reviewer to reopen it." },
                { status: 409 },
            );
        }

        const throttled = await throttle(me);
        if (throttled) return throttled;

        const rule = EVIDENCE_RULES[n];
        const evidence = await verifyEvidence(String(body.url ?? ""));

        checkKind(evidence.kind, rule);
        checkAuthor({ login: evidence.author, id: evidence.authorId }, rule, me);
        checkArena(evidence.repo.split("/")[0], rule.arena, me.login);
        if (n === 9) checkHardReview(evidence);
        if (n === 10) checkMilestone10(evidence);

        const entry: JourneyEntry = {
            n,
            evidence,
            reflection,
            state: "submitted",
            submittedAt: new Date().toISOString(),
        };

        record.entries[String(n)] = entry;
        // Keep the display fields current: people rename themselves and change
        // avatars, and the reviewer queue should show who they are now.
        record.github = me.login;
        record.name = me.name;
        record.avatar = me.avatar;
        record.updatedAt = entry.submittedAt;
        await ref.set(record);

        return NextResponse.json({ ok: true, message: "Submitted for sign-off.", entry });
    } catch (error) {
        if (error instanceof EvidenceError) {
            return NextResponse.json({ ok: false, message: error.message }, { status: 422 });
        }
        return authErrorResponse(error);
    }
}

/**
 * Re-checks a submission against GitHub and stores what it finds now.
 *
 * A PR is rarely in its final state when it is submitted — it is open on
 * Tuesday and merged on Friday, and the record should say so without anyone
 * refiling anything. Only the observed facts move; the reflection and the
 * sign-off are untouched, so a merge cannot launder a milestone a reviewer
 * already sent back.
 *
 * Participants re-check their own, signed in with GitHub. A reviewer re-checks
 * anyone's by passing the record id, signed in to the club — which is what
 * makes the queue trustworthy: the state shown at sign-off is the state now.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
    try {
        const n = await milestoneFrom(params);
        if (n === null) return NextResponse.json({ ok: false, message: "No such milestone." }, { status: 404 });

        const body = (await request.json().catch(() => ({}))) as { id?: string };

        let target: string;
        if (body.id) {
            await requireCapability("journey:review");
            target = body.id;
        } else {
            const me = await requireGithubUser();
            const throttled = await throttle(me);
            if (throttled) return throttled;
            target = journeyId(me.id);
        }

        const ref = club<JourneyRecord>(COLLECTIONS.prJourney).doc(target);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ ok: false, message: "No journey there." }, { status: 404 });

        const record = snap.data() as JourneyRecord;
        const entry = record.entries[String(n)];
        if (!entry) {
            return NextResponse.json({ ok: false, message: "Nothing submitted for that milestone." }, { status: 404 });
        }

        const fresh = await verifyEvidence(entry.evidence.url);
        const changed =
            fresh.state !== entry.evidence.state || fresh.reviewRounds !== entry.evidence.reviewRounds;

        entry.evidence = fresh;
        record.entries[String(n)] = entry;
        record.updatedAt = new Date().toISOString();
        await ref.set(record);

        return NextResponse.json({
            ok: true,
            changed,
            entry,
            message: changed
                ? `Now ${fresh.state}, ${fresh.reviewRounds} review rounds.`
                : `Still ${fresh.state}. Nothing has moved.`,
        });
    } catch (error) {
        if (error instanceof EvidenceError) {
            return NextResponse.json({ ok: false, message: error.message }, { status: 422 });
        }
        return authErrorResponse(error);
    }
}

/** Withdraws a submission that has not been signed off yet. */
export async function DELETE(_request: NextRequest, { params }: Params) {
    try {
        const me = await requireGithubUser();
        const n = await milestoneFrom(params);
        if (n === null) return NextResponse.json({ ok: false, message: "No such milestone." }, { status: 404 });

        const ref = club<JourneyRecord>(COLLECTIONS.prJourney).doc(journeyId(me.id));
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ ok: true });

        const record = snap.data() as JourneyRecord;
        if (record.entries[String(n)]?.state === "signed-off") {
            return NextResponse.json(
                { ok: false, message: "Signed-off milestones stay on the record." },
                { status: 409 },
            );
        }

        delete record.entries[String(n)];
        record.updatedAt = new Date().toISOString();
        await ref.set(record);

        return NextResponse.json({ ok: true, message: "Withdrawn." });
    } catch (error) {
        return authErrorResponse(error);
    }
}
