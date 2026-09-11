import { NextResponse } from "next/server";
import { isGsocOrg } from "@/data/gsoc-orgs";
import { ossRoster, type Contributor } from "@/lib/oss-roster";
import { GithubError, allPRsFor, prState, repoNameFromUrl, type PRState } from "@/lib/github-prs";
import { cohortFromParam } from "@/lib/cohorts";
import { snapshotFor } from "@/lib/oss-snapshot";

export const runtime = "nodejs";

interface PR {
    title: string;
    url: string;
    repo: string;
    number: number;
    date: string;
    state: PRState;
    isGsoc: boolean;
}

interface MemberData {
    name: string;
    github: string;
    merged: PR[];
    open: PR[];
    closed: PR[];
    gsocPRs: PR[];
}

async function fetchPRsForUser(person: Contributor): Promise<MemberData> {
    const result: MemberData = {
        name: person.name,
        github: person.github,
        merged: [],
        open: [],
        closed: [],
        gsocPRs: [],
    };

    // One paged query for every state at once. Three separate searches per
    // member is what exhausted the search budget and left open and closed
    // silently empty on the GSoC page.
    const prs = await allPRsFor(person.github);

    for (const pr of prs) {
        const repo = repoNameFromUrl(pr.repository_url);
        const isGsoc = isGsocOrg(repo.split("/")[0]);
        const state: PRState = prState(pr);

        const entry: PR = {
            title: pr.title,
            url: pr.html_url,
            repo,
            number: pr.number,
            date: pr.closed_at ?? pr.created_at,
            state,
            isGsoc,
        };

        result[state].push(entry);
        if (isGsoc) result.gsocPRs.push(entry);
    }

    return result;
}

/**
 * The same per-member breakdown for a snapshot-backed cohort.
 *
 * The snapshot stores every pull request with its resolved repository name, so
 * the GSoC-organisation test applies here exactly as it does to a live fetch —
 * this is a different source for the same shape, not a different calculation.
 */
function membersFromSnapshot(cohort: Parameters<typeof snapshotFor>[0]): MemberData[] {
    const snapshot = snapshotFor(cohort);
    if (!snapshot) return [];

    return snapshot.members.map((person) => {
        const result: MemberData = {
            name: person.name,
            github: person.github,
            merged: [],
            open: [],
            closed: [],
            gsocPRs: [],
        };

        for (const stored of person.prs) {
            const pr: PR = {
                title: stored.title,
                url: stored.url,
                repo: stored.repo,
                number: stored.number,
                date: stored.mergedAt ?? stored.createdAt,
                state: stored.state,
                isGsoc: isGsocOrg(stored.repo.split("/")[0]),
            };
            result[pr.state].push(pr);
            if (pr.isGsoc) result.gsocPRs.push(pr);
        }

        return result;
    });
}

export async function GET(request: Request) {
    const cohort = cohortFromParam(new URL(request.url).searchParams.get("year"));

    try {
        const membersData: MemberData[] = [];
        const unavailable: string[] = [];

        if (cohort.source === "snapshot") {
            membersData.push(...membersFromSnapshot(cohort.id));
            unavailable.push(...(snapshotFor(cohort.id)?.unavailable ?? []));
        } else {
            const roster = await ossRoster(cohort.id);

            for (const person of roster) {
                try {
                    membersData.push(await fetchPRsForUser(person));
                } catch (error) {
                    console.error(`[pr-breakdown] ${person.github}:`, error);
                    unavailable.push(person.github);
                }
            }
        }

        const summary = {
            merged: 0,
            open: 0,
            closed: 0,
            total: 0,
            gsocMerged: 0,
            gsocOpen: 0,
            gsocClosed: 0,
            gsocTotal: 0,
        };

        for (const m of membersData) {
            summary.merged += m.merged.length;
            summary.open += m.open.length;
            summary.closed += m.closed.length;
            summary.gsocMerged += m.gsocPRs.filter((p) => p.state === "merged").length;
            summary.gsocOpen += m.gsocPRs.filter((p) => p.state === "open").length;
            summary.gsocClosed += m.gsocPRs.filter((p) => p.state === "closed").length;
        }
        summary.total = summary.merged + summary.open + summary.closed;
        summary.gsocTotal = summary.gsocMerged + summary.gsocOpen + summary.gsocClosed;

        return NextResponse.json({
            year: cohort.id,
            yearLabel: cohort.label,
            source: cohort.source,
            generatedAt: snapshotFor(cohort.id)?.generatedAt ?? null,
            summary,
            members: membersData
                .map((m) => {
                    const orgStats: Record<string, { merged: number; open: number; closed: number; prs: PR[] }> = {};
                    for (const pr of m.gsocPRs) {
                        const org = pr.repo.split("/")[0];
                        orgStats[org] ??= { merged: 0, open: 0, closed: 0, prs: [] };
                        orgStats[org][pr.state]++;
                        orgStats[org].prs.push(pr);
                    }

                    return {
                        name: m.name,
                        github: m.github,
                        merged: m.merged.length,
                        open: m.open.length,
                        closed: m.closed.length,
                        gsocMerged: m.gsocPRs.filter((p) => p.state === "merged").length,
                        gsocOpen: m.gsocPRs.filter((p) => p.state === "open").length,
                        gsocClosed: m.gsocPRs.filter((p) => p.state === "closed").length,
                        gsocPRs: m.gsocPRs,
                        orgBreakdown: Object.entries(orgStats)
                            .map(([org, stats]) => ({
                                org,
                                merged: stats.merged,
                                open: stats.open,
                                closed: stats.closed,
                                total: stats.merged + stats.open + stats.closed,
                                prs: stats.prs,
                            }))
                            .sort((a, b) => b.total - a.total),
                    };
                })
                .filter((m) => m.gsocPRs.length > 0),
            lastUpdated: new Date().toISOString(),
            unavailable,
        });
    } catch (error) {
        const status = error instanceof GithubError ? 503 : 500;
        console.error("[pr-breakdown] failed:", error);
        return NextResponse.json(
            { message: error instanceof GithubError ? error.message : "Could not load the PR breakdown." },
            { status },
        );
    }
}
