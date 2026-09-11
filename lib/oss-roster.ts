import { members as staticRoster } from "@/data/members";
import { loadRoster } from "@/lib/members";
import { normalizeGithub } from "@/lib/members";
import { firstYearRoster } from "@/data/first-year-roster";
import { DEFAULT_COHORT, type CohortId } from "@/lib/cohorts";

/**
 * One roster for every open-source statistic on the site.
 *
 * Before this existed, the same list of contributors was hand-maintained in
 * four places — three API routes plus a second copy inside the PR-stats route
 * carrying typed-in PR counts. Adding a member meant four edits, and a missed
 * one silently dropped that person from a public page. The routes now all read
 * from here.
 *
 * Rosters are per year group. The second year is the founding batch and is the
 * union of two sources, deduped on the GitHub handle:
 *   - contributors below, which is the only hand-edited list left;
 *   - the live club roster in Firestore, so an approved member with a GitHub
 *     handle on their profile appears without anybody editing anything.
 *
 * It is a union rather than a straight switch to Firestore on purpose: several
 * people on the public stats pages are not (or not yet) approved rows in
 * Firestore, and quietly erasing them from the leaderboard would be a worse
 * bug than the one this replaces.
 *
 * The first year comes from the intake form instead, imported by
 * scripts/import-cohort-csv.mjs. Those students are not in Firestore yet, and
 * their numbers are read from a snapshot rather than counted live — see
 * lib/cohorts.ts for why.
 */
export interface Contributor {
    name: string;
    /** Bare GitHub username, never a URL. */
    github: string;
    role: string;
    avatar: string;
    year: CohortId;
}

/** Hand-maintained additions: people not carried by the Firestore roster. */
const contributors: Contributor[] = [
    { name: "Geetansh Goyal", github: "geetxnshgoyal", role: "Club President", avatar: "/geetansh.jpg", year: "second-year" },
    { name: "Ravi Sharma", github: "ravisharma-09", role: "Member", avatar: "/ravi.jpg", year: "second-year" },
    { name: "Lay Shah", github: "Layyzyy", role: "Event Coordinator", avatar: "/lay.png", year: "second-year" },
    { name: "Luvya Rana", github: "luvyarana", role: "Tech Lead", avatar: "/luvya.jpg", year: "second-year" },
    { name: "Vikas Sharma", github: "sharmavikas18", role: "Member", avatar: "/vikas.png", year: "second-year" },
    { name: "Aryan Patel", github: "AryanPatel-ui", role: "Member", avatar: "/aryan.png", year: "second-year" },
    { name: "Nithyaraj", github: "nithyarajmudhaliyar", role: "Member", avatar: "/nithyaraj.png", year: "second-year" },
    { name: "Prateek", github: "prateek6789-ai", role: "Member", avatar: "/prateek.jpg", year: "second-year" },
    { name: "Sahitya Singh", github: "sahitya0xsingh", role: "Designer", avatar: "/sahitya.png", year: "second-year" },
    { name: "Dushyant Acharya", github: "Dotify71", role: "Member", avatar: "https://github.com/Dotify71.png", year: "second-year" },
    { name: "Pranav Choudhary", github: "pranavchoudhary-tech", role: "Member", avatar: "https://github.com/pranavchoudhary-tech.png", year: "second-year" },
    { name: "Saurabh", github: "saurabhyuvi14-ai", role: "Member", avatar: "/saurabh.jpg", year: "second-year" },
    { name: "Sidharth", github: "SidharthxNST", role: "Member", avatar: "/sidharth.png", year: "second-year" },
    { name: "Bhavesh Sharma", github: "bhavesh-210", role: "Member", avatar: "/bhavesh.jpg", year: "second-year" },
    { name: "Unnati Jaiswal", github: "unnati-jaiswal24", role: "Member", avatar: "/unnati.png", year: "second-year" },
    { name: "Shristi Kumari", github: "Shristibot", role: "Member", avatar: "https://github.com/Shristibot.png", year: "second-year" },
    { name: "Dhiraj Rathod", github: "dhiraj-143r", role: "Member", avatar: "https://github.com/dhiraj-143r.png", year: "second-year" },
];

function add(into: Map<string, Contributor>, person: Contributor): void {
    const key = person.github.toLowerCase();
    // First writer wins, so a curated name, role and avatar are not overwritten
    // by a thinner record for the same person from another source.
    if (!into.has(key)) into.set(key, person);
}

/** The founding batch: hand-maintained list, plus whoever Firestore knows about. */
async function secondYear(): Promise<Contributor[]> {
    const byHandle = new Map<string, Contributor>();

    contributors.forEach((person) => add(byHandle, person));

    try {
        const live = await loadRoster();
        for (const member of live) {
            if (!member.github) continue;
            add(byHandle, {
                name: member.name,
                github: member.github,
                role: member.councilPosition ?? "Member",
                avatar: member.hasPhoto
                    ? `/api/members/${member.usn}/avatar`
                    : `https://github.com/${member.github}.png`,
                year: "second-year",
            });
        }
    } catch (error) {
        console.error("[oss-roster] live roster unavailable, using the static list only:", error);
    }

    for (const member of staticRoster) {
        const handle = normalizeGithub(member.github);
        if (!handle) continue;
        add(byHandle, {
            name: member.name,
            github: handle,
            role: "Member",
            avatar: `https://github.com/${handle}.png`,
            year: "second-year",
        });
    }

    return [...byHandle.values()];
}

/** The 2026 intake, from the form. Every handle here was checked against GitHub at import. */
function firstYear(): Contributor[] {
    return firstYearRoster.map((member) => ({
        name: member.name,
        github: member.github,
        role: "Member",
        // These students have no uploaded photo yet, so their GitHub avatar is
        // the only picture of them the site can honestly show.
        avatar: `https://github.com/${member.github}.png`,
        year: "first-year" as const,
    }));
}

/**
 * Everyone in one year group whose public contributions the site counts.
 *
 * A Firestore outage degrades to the hand-maintained list rather than throwing:
 * a stats page missing its newest joiner is recoverable, a stats page that
 * 500s is not.
 */
export async function ossRoster(cohort: CohortId = DEFAULT_COHORT): Promise<Contributor[]> {
    const people = cohort === "first-year" ? firstYear() : await secondYear();
    return people.sort((a, b) => a.name.localeCompare(b.name));
}
