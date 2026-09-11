import { NextResponse } from "next/server";
import { ossRoster, type Contributor } from "@/lib/oss-roster";
import {
    GithubError,
    QUALITY_FORKS,
    QUALITY_STARS,
    allPRsFor,
    isQualityRepo,
    prState,
    repoFacts,
} from "@/lib/github-prs";
import { cohortFromParam } from "@/lib/cohorts";
import { snapshotFor } from "@/lib/oss-snapshot";

export const runtime = "nodejs";

interface QualityPR {
    title: string;
    url: string;
    number: number;
    mergedAt: string | null;
    repoName: string;
    repoUrl: string;
    repoStars: number;
    repoForks: number;
    author: { name: string; github: string; avatar: string };
}

/**
 * Merged PRs into repositories with genuine adoption behind them.
 *
 * Paging matters here more than anywhere else on the site: the old single
 * hundred-result request meant the most prolific contributors — the exact
 * people this page exists to show — were the ones getting cut off.
 */
async function qualityPRsFor(person: Contributor): Promise<QualityPR[]> {
    const merged = (await allPRsFor(person.github)).filter((pr) => prState(pr) === "merged");
    const out: QualityPR[] = [];

    for (const pr of merged) {
        const facts = await repoFacts(pr.repository_url);
        if (!isQualityRepo(facts) || !facts) continue;

        out.push({
            title: pr.title,
            url: pr.html_url,
            number: pr.number,
            mergedAt: pr.closed_at,
            repoName: facts.name,
            repoUrl: `https://github.com/${facts.name}`,
            repoStars: facts.stars,
            repoForks: facts.forks,
            author: { name: person.name, github: person.github, avatar: person.avatar },
        });
    }

    return out;
}

/**
 * The same list for a snapshot-backed cohort.
 *
 * `quality` was decided when the snapshot was written, by the same rule applied
 * above, so this filters rather than re-deciding. Re-deriving it here from the
 * stored star counts would be a second copy of the threshold, and this codebase
 * has already been bitten once by two routes disagreeing about it on one page.
 */
function qualityPRsFromSnapshot(cohort: Parameters<typeof snapshotFor>[0]): {
    prs: QualityPR[];
    generatedAt: string | null;
    unavailable: string[];
} {
    const snapshot = snapshotFor(cohort);
    if (!snapshot) return { prs: [], generatedAt: null, unavailable: [] };

    const prs = snapshot.members.flatMap((person) =>
        person.prs
            .filter((pr) => pr.state === "merged" && pr.quality)
            .map((pr) => ({
                title: pr.title,
                url: pr.url,
                number: pr.number,
                mergedAt: pr.mergedAt,
                repoName: pr.repo,
                repoUrl: `https://github.com/${pr.repo}`,
                repoStars: pr.stars,
                repoForks: pr.forks,
                author: {
                    name: person.name,
                    github: person.github,
                    avatar: `https://github.com/${person.github}.png`,
                },
            })),
    );

    return { prs, generatedAt: snapshot.generatedAt, unavailable: snapshot.unavailable };
}

export async function GET(request: Request) {
    const cohort = cohortFromParam(new URL(request.url).searchParams.get("year"));

    try {
        let prs: QualityPR[];
        let generatedAt: string | null = null;
        const unavailable: string[] = [];

        if (cohort.source === "snapshot") {
            const fromSnapshot = qualityPRsFromSnapshot(cohort.id);
            prs = fromSnapshot.prs;
            generatedAt = fromSnapshot.generatedAt;
            unavailable.push(...fromSnapshot.unavailable);
        } else {
            const roster = await ossRoster(cohort.id);
            prs = [];

            for (const person of roster) {
                try {
                    prs.push(...(await qualityPRsFor(person)));
                } catch (error) {
                    console.error(`[quality-prs] ${person.github}:`, error);
                    unavailable.push(person.github);
                }
            }
        }

        prs.sort((a, b) => (b.mergedAt ?? "").localeCompare(a.mergedAt ?? ""));

        return NextResponse.json({
            year: cohort.id,
            yearLabel: cohort.label,
            source: cohort.source,
            generatedAt,
            prs,
            totalCount: prs.length,
            threshold: { stars: QUALITY_STARS, forks: QUALITY_FORKS },
            lastUpdated: new Date().toISOString(),
            unavailable,
        });
    } catch (error) {
        const status = error instanceof GithubError ? 503 : 500;
        console.error("[quality-prs] failed:", error);
        return NextResponse.json(
            { message: error instanceof GithubError ? error.message : "Could not load quality PRs." },
            { status },
        );
    }
}
