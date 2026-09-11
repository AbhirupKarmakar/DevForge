import firstYearSnapshot from "@/data/oss-snapshot-first-year.json";
import type { CohortId } from "@/lib/cohorts";

/**
 * Precomputed contribution counts, for the year groups too large to count live.
 *
 * See lib/cohorts.ts for why a cohort is on a snapshot at all. The short
 * version: one GitHub search per student against a budget of thirty a minute
 * means a hundred and forty of them cannot be counted inside a page load.
 *
 * Written by scripts/oss-snapshot.ts. Nothing regenerates it automatically, so
 * `generatedAt` is surfaced to the reader rather than hidden — a leaderboard
 * that silently ages is worse than one that says when it was last counted.
 */

export interface SnapshotPR {
    title: string;
    url: string;
    number: number;
    state: "merged" | "open" | "closed";
    mergedAt: string | null;
    createdAt: string;
    repo: string;
    stars: number;
    forks: number;
    /** Decided at snapshot time by the same rule the live routes apply. */
    quality: boolean;
}

export interface SnapshotMember {
    name: string;
    github: string;
    linkedin?: string | null;
    website?: string | null;
    prCount: number;
    totalPRs: number;
    openPRs: number;
    closedPRs: number;
    orgs: { name: string; count: number }[];
    prs: SnapshotPR[];
    live: boolean;
}

export interface CohortSnapshot {
    cohort: CohortId;
    generatedAt: string;
    unavailable: string[];
    members: SnapshotMember[];
}

const SNAPSHOTS: Partial<Record<CohortId, CohortSnapshot>> = {
    "first-year": firstYearSnapshot as CohortSnapshot,
};

export function snapshotFor(cohort: CohortId): CohortSnapshot | null {
    return SNAPSHOTS[cohort] ?? null;
}

/** True once the snapshot has actually been generated, as opposed to stubbed. */
export function hasSnapshot(cohort: CohortId): boolean {
    const snapshot = snapshotFor(cohort);
    return Boolean(snapshot && snapshot.members.length > 0);
}
