import { NextResponse, type NextRequest } from "next/server";
import { club, COLLECTIONS } from "@/lib/firebase/collections";
import { authErrorResponse, requireCapability } from "@/lib/session";
import { getGithubSession } from "@/lib/github-auth";
import { resolveGithub } from "@/lib/member-github";
import type { JourneyRecord } from "@/lib/pr-journey";

export const runtime = "nodejs";

/**
 * Everything waiting on a reviewer, oldest first — a queue, not a dashboard.
 * Reflections are what a reviewer actually reads, so they come down with it
 * rather than behind a second request per entry.
 *
 * Participants sign in with GitHub and may not be club members at all;
 * reviewers are still club members holding `journey:review`, signed in the
 * club's way. Signing off someone's work is a club responsibility even when
 * taking the journey is not.
 */
export async function GET() {
    try {
        await requireCapability("journey:review");

        const snap = await club<JourneyRecord>(COLLECTIONS.prJourney).get();
        const pending = snap.docs
            .flatMap((doc) => {
                const record = doc.data() as JourneyRecord;
                // Records from before GitHub sign-in were keyed on a USN and
                // carry no GitHub id; there is nobody to hand feedback back to.
                if (!record.githubId) return [];
                return Object.values(record.entries ?? {})
                    .filter((entry) => entry.state === "submitted")
                    .map((entry) => ({
                        id: doc.id,
                        name: record.name,
                        github: record.github,
                        avatar: record.avatar,
                        entry,
                    }));
            })
            .sort((a, b) => a.entry.submittedAt.localeCompare(b.entry.submittedAt));

        return NextResponse.json({ ok: true, pending });
    } catch (error) {
        return authErrorResponse(error);
    }
}

/**
 * Signs a milestone off, or sends it back.
 *
 * Sending back is deliberately as easy as signing off: a reviewer who can only
 * approve will approve, and the reflection is the part of this workbook that
 * decays first when nobody pushes back on it.
 */
export async function POST(request: NextRequest) {
    try {
        const { member } = await requireCapability("journey:review");
        const body = (await request.json().catch(() => ({}))) as {
            id?: string;
            n?: number;
            decision?: "sign-off" | "changes-requested";
            note?: string;
        };

        const { id, n, decision } = body;
        const note = body.note?.trim();

        if (!id || !Number.isInteger(n) || !["sign-off", "changes-requested"].includes(decision ?? "")) {
            return NextResponse.json({ ok: false, message: "Bad request." }, { status: 400 });
        }
        if (decision === "changes-requested" && !note) {
            return NextResponse.json(
                { ok: false, message: "Say what needs changing — a bounce with no reason is not feedback." },
                { status: 400 },
            );
        }

        const ref = club<JourneyRecord>(COLLECTIONS.prJourney).doc(id);
        const snap = await ref.get();
        if (!snap.exists) return NextResponse.json({ ok: false, message: "No journey there." }, { status: 404 });

        const record = snap.data() as JourneyRecord;

        // A reviewer who is also taking the journey must not pass their own
        // work. Their club record and their GitHub session are separate
        // identities, so check both routes back to the same person.
        const reviewerGithub = await resolveGithub(member.usn, member.github);
        const githubSession = await getGithubSession();
        const ownRecord =
            githubSession?.id === record.githubId ||
            (reviewerGithub !== undefined && reviewerGithub.toLowerCase() === record.github?.toLowerCase());
        if (ownRecord) {
            return NextResponse.json(
                { ok: false, message: "You cannot sign off your own milestone." },
                { status: 403 },
            );
        }

        const entry = record.entries[String(n)];
        if (!entry) return NextResponse.json({ ok: false, message: "Nothing submitted." }, { status: 404 });

        entry.state = decision === "sign-off" ? "signed-off" : "changes-requested";
        entry.signedOffBy = member.usn;
        entry.signedOffByName = member.name;
        entry.signedOffAt = new Date().toISOString();
        if (note) entry.reviewerNote = note;

        record.entries[String(n)] = entry;
        record.updatedAt = entry.signedOffAt;
        await ref.set(record);

        return NextResponse.json({ ok: true, message: decision === "sign-off" ? "Signed off." : "Sent back." });
    } catch (error) {
        return authErrorResponse(error);
    }
}
