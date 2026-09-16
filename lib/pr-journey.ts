import { milestones, type Arena } from "@/data/pr-workbook";
import type { GithubIdentity } from "@/lib/github-auth";

/**
 * The 10 PR Journey, as tracked state.
 *
 * A milestone is never self-marked. A member submits a GitHub URL as evidence
 * plus the five-field reflection; the server checks the URL against the GitHub
 * API (does it exist, did you actually open it, is it in the right kind of
 * repository) and only then records it as submitted. A reviewer with
 * `journey:review` signs it off.
 *
 * That order matters: the point of the workbook is that the claim on your CV is
 * backed by a link anyone can open.
 */

export const JOURNEY_TAG = "pr-journey";
export const CLUB_ORG = "nst-devforge";

export type EvidenceKind = "pr" | "issue";
export type PRState = "merged" | "open" | "closed";
export type EntryState = "submitted" | "signed-off" | "changes-requested";

/** What counts as proof for each milestone. Mirrors the ladder in the spec. */
export interface EvidenceRule {
    kind: EvidenceKind;
    /** "self": you must be the author. "other": you must NOT be (milestone 8). */
    author: "self" | "other";
    arena: Arena;
}

export const EVIDENCE_RULES: Record<number, EvidenceRule> = {
    1: { kind: "pr", author: "self", arena: "workbook" },
    2: { kind: "pr", author: "self", arena: "club" },
    3: { kind: "issue", author: "self", arena: "external" },
    4: { kind: "pr", author: "self", arena: "external" },
    5: { kind: "pr", author: "self", arena: "external" },
    6: { kind: "pr", author: "self", arena: "external" },
    7: { kind: "pr", author: "self", arena: "external" },
    8: { kind: "pr", author: "other", arena: "external" },
    9: { kind: "pr", author: "self", arena: "external" },
    10: { kind: "pr", author: "self", arena: "external" },
};

export interface Reflection {
    tried: string;
    broke: string;
    reviewerSaid: string;
    differently: string;
    hours: number;
    rounds: number;
    status: PRState;
}

/** What the GitHub check actually observed. Stored so nobody re-litigates it later. */
export interface Evidence {
    url: string;
    kind: EvidenceKind;
    repo: string;
    number: number;
    title: string;
    author: string;
    /** GitHub's numeric id for the author, so a later username change cannot orphan the proof. */
    authorId: number;
    state: PRState;
    /** Distinct review submissions. Milestone 9 wants three or more. */
    reviewRounds: number;
    openedAt: string;
    verifiedAt: string;
}

export interface JourneyEntry {
    n: number;
    evidence: Evidence;
    reflection: Reflection;
    state: EntryState;
    submittedAt: string;
    signedOffBy?: string;
    signedOffByName?: string;
    signedOffAt?: string;
    reviewerNote?: string;
}

/**
 * One person's journey, keyed on their GitHub account.
 *
 * It used to be keyed on the club USN, which tied the workbook to club
 * membership. Anyone can take it now, and the only identity every participant
 * shares is GitHub — the numeric id specifically, since usernames can be
 * renamed and a rename must not orphan a semester of signed-off work.
 */
export interface JourneyRecord {
    githubId: number;
    /** Login and profile as of the most recent submission; display only. */
    github: string;
    name: string;
    avatar: string;
    /** Keyed by milestone number as a string, because Firestore keys are strings. */
    entries: Record<string, JourneyEntry>;
    startedAt: string;
    updatedAt: string;
}

/** Firestore document id for a participant. Prefixed so it can never collide with a USN. */
export function journeyId(githubId: number): string {
    return `gh_${githubId}`;
}

export function emptyJourney(identity: GithubIdentity): JourneyRecord {
    const now = new Date().toISOString();
    return {
        githubId: identity.id,
        github: identity.login,
        name: identity.name,
        avatar: identity.avatar,
        entries: {},
        startedAt: now,
        updatedAt: now,
    };
}

export function signedOffCount(record: JourneyRecord | null): number {
    if (!record) return 0;
    return Object.values(record.entries).filter((e) => e.state === "signed-off").length;
}

/* ------------------------------------------------------------------ */
/* URL parsing                                                         */
/* ------------------------------------------------------------------ */

export interface ParsedRef {
    owner: string;
    repo: string;
    number: number;
    kind: EvidenceKind;
}

/**
 * Accepts the two URL shapes GitHub actually shows people:
 *   https://github.com/owner/repo/pull/123
 *   https://github.com/owner/repo/issues/45
 * Trailing paths (/files, #discussion_r…) are tolerated — people paste from the
 * address bar mid-review.
 */
export function parseGithubRef(input: string): ParsedRef | null {
    const match = input
        .trim()
        .match(/^https?:\/\/(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)\/(pull|issues)\/(\d+)/i);
    if (!match) return null;

    const [, owner, repo, type, number] = match;
    return { owner, repo, number: Number(number), kind: type.toLowerCase() === "pull" ? "pr" : "issue" };
}

/* ------------------------------------------------------------------ */
/* Rule checks                                                         */
/* ------------------------------------------------------------------ */

export class EvidenceError extends Error {}

/**
 * The ladder's rules, enforced rather than trusted. Milestones 1-2 must live in
 * the club org (you do not take training wheels into a stranger's repository);
 * 3 onward must not — and must not be your own repository either, since merging
 * your own PR proves nothing about contributing to someone else's project.
 */
export function checkArena(owner: string, arena: Arena, memberGithub?: string): void {
    const org = owner.toLowerCase();
    const mine = memberGithub?.toLowerCase();

    if (arena === "workbook" || arena === "club") {
        if (org !== CLUB_ORG) {
            throw new EvidenceError(
                `Milestones 1 and 2 happen in a DevForge repository — this one belongs to "${owner}". ` +
                    `That is on purpose: learn the mechanics where a mistake costs a teammate five minutes.`,
            );
        }
        return;
    }

    if (org === CLUB_ORG) {
        throw new EvidenceError(
            "From milestone 3 onward the work has to be outside the club. This is a DevForge repository.",
        );
    }
    if (mine && org === mine) {
        throw new EvidenceError(
            `"${owner}" is your own account. Contributing to a project you own does not teach the thing this milestone is for.`,
        );
    }
}

/**
 * Compares GitHub ids, not usernames. The signed-in id is proven by OAuth, and
 * ids survive renames, so neither a rename nor a look-alike login can pass as
 * someone else's work.
 */
export function checkAuthor(
    author: { login: string; id: number },
    rule: EvidenceRule,
    me: { login: string; id: number },
): void {
    const isMine = author.id === me.id;

    if (rule.author === "self" && !isMine) {
        throw new EvidenceError(
            `That was opened by @${author.login}, not @${me.login}. Link your own work for this milestone.`,
        );
    }
    if (rule.author === "other" && isMine) {
        throw new EvidenceError(
            "Milestone 8 is about reviewing someone else's work — link the PR you reviewed, not one you wrote.",
        );
    }
}

export function checkKind(found: EvidenceKind, rule: EvidenceRule): void {
    if (found === rule.kind) return;
    throw new EvidenceError(
        rule.kind === "issue"
            ? "Milestone 3 has no code in it. Link the issue you filed, not a pull request."
            : "This milestone wants a pull request. That link points at an issue.",
    );
}

/** The one milestone with a numeric bar: three rounds, or a closed PR. */
export function checkHardReview(evidence: Evidence): void {
    if (evidence.state === "closed") return;
    if (evidence.reviewRounds >= 3) return;
    throw new EvidenceError(
        `Milestone 9 needs three or more rounds of review, or a PR that got closed. This one has ` +
            `${evidence.reviewRounds}. That is good news for the PR and not yet a milestone — keep going.`,
    );
}

export function checkMilestone10(evidence: Evidence): void {
    if (evidence.state !== "merged") {
        throw new EvidenceError("Milestone 10 is the one a project actually kept. This PR is not merged yet.");
    }
}

/* ------------------------------------------------------------------ */
/* Reflection validation                                               */
/* ------------------------------------------------------------------ */

const WORD_CAPS: Record<keyof Pick<Reflection, "tried" | "broke" | "differently">, number> = {
    tried: 100,
    broke: 100,
    differently: 60,
};

function words(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Caps are enforced, not suggested. A reflection nobody can read in thirty
 * seconds is one nobody reads at all — including the person who wrote it, three
 * months later, in an interview.
 */
export function validateReflection(input: unknown): Reflection {
    if (!input || typeof input !== "object") throw new EvidenceError("The reflection is missing.");
    const r = input as Record<string, unknown>;

    const text = (key: string, label: string): string => {
        const value = typeof r[key] === "string" ? (r[key] as string).trim() : "";
        if (!value) throw new EvidenceError(`"${label}" is empty. Every field is required.`);
        return value;
    };

    const reflection: Reflection = {
        tried: text("tried", "What I tried"),
        broke: text("broke", "What broke"),
        reviewerSaid: text("reviewerSaid", "What the reviewer said"),
        differently: text("differently", "What I would do differently"),
        hours: Number(r.hours),
        rounds: Number(r.rounds),
        status: r.status as PRState,
    };

    for (const [key, cap] of Object.entries(WORD_CAPS)) {
        const count = words(reflection[key as keyof typeof WORD_CAPS]);
        if (count > cap) {
            throw new EvidenceError(`That field is capped at ${cap} words — yours is ${count}. Cut it down.`);
        }
    }
    if (words(reflection.broke) < 5) {
        throw new EvidenceError('"What broke" needs a real answer. If nothing broke, the task was too small.');
    }
    if (!Number.isFinite(reflection.hours) || reflection.hours <= 0) {
        throw new EvidenceError("Hours spent has to be a positive number.");
    }
    if (!Number.isInteger(reflection.rounds) || reflection.rounds < 0) {
        throw new EvidenceError("Rounds of review has to be zero or more.");
    }
    if (!["merged", "open", "closed"].includes(reflection.status)) {
        throw new EvidenceError("Status has to be merged, open or closed.");
    }
    return reflection;
}

export function milestoneExists(n: number): boolean {
    return milestones.some((m) => m.n === n);
}
