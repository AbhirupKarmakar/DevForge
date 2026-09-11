/**
 * Counts a cohort's open-source contributions ahead of time.
 *
 *   GITHUB_TOKEN=... npx tsx scripts/oss-snapshot.ts --cohort first-year
 *
 * Why this exists: /api/pr-stats counts live, which is the right answer for the
 * seventeen second-years and impossible for a hundred and forty-nine
 * first-years. GitHub's search endpoint allows thirty requests a minute and the
 * route needs one per student, so a live first-year page would spend five
 * minutes fetching before it rendered anything. This writes the same numbers to
 * data/oss-snapshot-<cohort>.json instead, and the route serves that.
 *
 * It deliberately imports the counting helpers the live route uses rather than
 * reimplementing them. The quality-PR rule in particular has already drifted
 * once in this codebase, when two routes computed it separately and disagreed
 * on the same page; a second copy here would be the same bug with a slower fuse.
 *
 * Re-run it whenever the roster changes or the numbers go stale. Nothing about
 * it is automatic.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";
import { firstYearRoster } from "@/data/first-year-roster";
import type { CohortId, CohortMember } from "@/lib/cohorts";
import { allPRsFor, isQualityRepo, prState, repoFacts, repoNameFromUrl } from "@/lib/github-prs";

const ROSTERS: Partial<Record<CohortId, CohortMember[]>> = {
    "first-year": firstYearRoster,
};

/**
 * One pull request, with the repository facts already resolved.
 *
 * The star and fork counts are stored alongside rather than looked up again by
 * whoever reads this, because the repository lookup is the expensive half of
 * the job and its answer is what decides whether a pull request counts as a
 * quality one. Storing the raw list means all three open-source routes can be
 * answered from this file instead of each re-deriving it from GitHub.
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
    quality: boolean;
}

export interface SnapshotMember extends CohortMember {
    /** Merged pull requests into repositories with real adoption. */
    prCount: number;
    /** Every merged pull request, anywhere. */
    totalPRs: number;
    openPRs: number;
    closedPRs: number;
    /** Merged pull requests per organisation, biggest first. */
    orgs: { name: string; count: number }[];
    prs: SnapshotPR[];
    /** False when GitHub could not be reached for this student. */
    live: boolean;
}

export interface CohortSnapshot {
    cohort: CohortId;
    generatedAt: string;
    /** Students on the roster whose counts could not be fetched this run. */
    unavailable: string[];
    members: SnapshotMember[];
}

async function countFor(person: CohortMember): Promise<SnapshotMember> {
    try {
        const all = await allPRsFor(person.github);

        // Sequential because repoFacts caches per repository: a parallel burst
        // would fire duplicate lookups for the same repo before the first lands,
        // and popular repositories are exactly the ones that repeat here.
        const prs: SnapshotPR[] = [];
        for (const pr of all) {
            const facts = await repoFacts(pr.repository_url);
            prs.push({
                title: pr.title,
                url: pr.html_url,
                number: pr.number,
                state: prState(pr),
                mergedAt: pr.pull_request?.merged_at ?? null,
                createdAt: pr.created_at,
                repo: facts?.name ?? repoNameFromUrl(pr.repository_url),
                stars: facts?.stars ?? 0,
                forks: facts?.forks ?? 0,
                quality: isQualityRepo(facts),
            });
        }

        const merged = prs.filter((pr) => pr.state === "merged");
        const orgCounts = new Map<string, number>();
        for (const pr of merged) {
            const org = pr.repo.split("/")[0];
            orgCounts.set(org, (orgCounts.get(org) ?? 0) + 1);
        }

        return {
            ...person,
            prCount: merged.filter((pr) => pr.quality).length,
            totalPRs: merged.length,
            openPRs: prs.filter((pr) => pr.state === "open").length,
            closedPRs: prs.filter((pr) => pr.state === "closed").length,
            orgs: [...orgCounts.entries()]
                .map(([name, count]) => ({ name, count }))
                .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name)),
            prs: prs.sort((a, b) => (b.mergedAt ?? b.createdAt).localeCompare(a.mergedAt ?? a.createdAt)),
            live: true,
        };
    } catch (error) {
        // Recorded as not-live rather than as a zero. A student with no merged
        // pull requests and a student the API refused to talk about are very
        // different facts, and the page says so.
        console.error(`  ! ${person.github}: ${error instanceof Error ? error.message : error}`);
        return {
            ...person,
            prCount: 0,
            totalPRs: 0,
            openPRs: 0,
            closedPRs: 0,
            orgs: [],
            prs: [],
            live: false,
        };
    }
}

async function main() {
    const flags = process.argv.slice(2);
    const cohortFlag = flags.indexOf("--cohort");
    const cohort = (cohortFlag >= 0 ? flags[cohortFlag + 1] : "first-year") as CohortId;

    const roster = ROSTERS[cohort];
    if (!roster) {
        console.error(`No roster for cohort "${cohort}". Known: ${Object.keys(ROSTERS).join(", ")}`);
        process.exit(1);
    }
    if (!process.env.GITHUB_TOKEN) {
        console.error(
            "GITHUB_TOKEN is not set. Unauthenticated search allows ten requests a minute,\n" +
                `and this run needs about ${roster.length}. Set a token and try again.`,
        );
        process.exit(1);
    }

    console.log(`Counting ${roster.length} students in ${cohort}. This takes a few minutes.\n`);
    const started = Date.now();

    const members: SnapshotMember[] = [];
    for (const [index, person] of roster.entries()) {
        const result = await countFor(person);
        members.push(result);
        const flag = result.live ? "" : "  (unavailable)";
        console.log(
            `[${String(index + 1).padStart(3)}/${roster.length}] ${person.github}: ` +
                `${result.totalPRs} merged, ${result.prCount} quality${flag}`,
        );
    }

    members.sort((a, b) => b.prCount - a.prCount || b.totalPRs - a.totalPRs || a.name.localeCompare(b.name));

    const snapshot: CohortSnapshot = {
        cohort,
        generatedAt: new Date().toISOString(),
        unavailable: members.filter((m) => !m.live).map((m) => m.github),
        members,
    };

    const outPath = path.join(process.cwd(), "data", `oss-snapshot-${cohort}.json`);
    writeFileSync(outPath, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

    const merged = members.reduce((sum, m) => sum + m.totalPRs, 0);
    const quality = members.reduce((sum, m) => sum + m.prCount, 0);
    const contributing = members.filter((m) => m.totalPRs > 0).length;

    console.log(`\nDone in ${Math.round((Date.now() - started) / 1000)}s.`);
    console.log(`  students with a merged PR: ${contributing}/${members.length}`);
    console.log(`  merged pull requests:      ${merged}`);
    console.log(`  of those, quality repos:   ${quality}`);
    if (snapshot.unavailable.length) {
        console.log(`  could not be counted:      ${snapshot.unavailable.length}`);
    }
    console.log(`\nwrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
