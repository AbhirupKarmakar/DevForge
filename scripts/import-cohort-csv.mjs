#!/usr/bin/env node

/**
 * Turns a Google Form response CSV into a cohort roster under data/.
 *
 * Run with:
 *   node scripts/import-cohort-csv.mjs <responses.csv> --cohort first-year
 *
 * The source sheet is an intake form and carries personal data the public site
 * has no business holding — date of birth, phone number, personal email, and a
 * Drive link to a photo. Only the four public-profile columns are read here
 * (name, GitHub, LinkedIn, portfolio); everything else is dropped at the
 * boundary rather than filtered downstream, so a later change to a page cannot
 * accidentally surface it. Keep the CSV itself outside the repo.
 */

import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

/* ------------------------------------------------------------------ */
/* CSV                                                                 */
/* ------------------------------------------------------------------ */

/** RFC-4180 enough for Google's export: quoted fields, doubled quotes, CRLF. */
function parseCsv(text) {
    const rows = [];
    let row = [];
    let field = "";
    let quoted = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (quoted) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    quoted = false;
                }
            } else {
                field += char;
            }
            continue;
        }

        if (char === '"') {
            quoted = true;
        } else if (char === ",") {
            row.push(field);
            field = "";
        } else if (char === "\n" || char === "\r") {
            // Swallow the \n of a \r\n pair rather than emitting a blank row.
            if (char === "\r" && text[i + 1] === "\n") i++;
            row.push(field);
            rows.push(row);
            row = [];
            field = "";
        } else {
            field += char;
        }
    }

    if (field || row.length) {
        row.push(field);
        rows.push(row);
    }

    const [header, ...body] = rows;
    return body
        .filter((cells) => cells.some((cell) => cell.trim()))
        .map((cells) => Object.fromEntries(header.map((key, i) => [key.trim(), (cells[i] ?? "").trim()])));
}

/* ------------------------------------------------------------------ */
/* Field cleaning                                                      */
/* ------------------------------------------------------------------ */

/**
 * Free-text answers to "Github" that are not handles. The site's own
 * normalizeGithub() accepts any alphanumeric string, so "No", "Yes" and "NA"
 * would otherwise sail through and become github.com/No — a real 404 avatar on
 * a real leaderboard row.
 */
const NOT_A_HANDLE = new Set([
    "no", "yes", "none", "nope", "na", "n-a", "n/a", "nil", "nothing", "null",
    "soon", "later", "tbd", "pending", "notyet", "new", "github", "dashboard",
    // Single-word answers to "do you have a GitHub?" rather than the handle
    // itself. Several of these are registered accounts belonging to strangers.
    "done", "created", "made", "have", "ok", "okay", "sure", "maybe",
    "account", "profile", "username", "user", "link", "here", "mine", "my",
]);

const HANDLE_RE = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

/**
 * A GitHub username from whatever the student typed.
 *
 * Accepts a bare handle or a profile URL, and recovers the two shapes that
 * appear often enough in the sheet to be worth handling: a leading "@", and a
 * handle parenthesised inside a sentence ("yes(Harshit-2208)"). Anything still
 * ambiguous returns null — an unresolved row is dropped from the leaderboard
 * rather than guessed at, because a wrong handle silently credits one student's
 * pull requests to another.
 */
export function githubHandle(value) {
    if (!value) return null;
    let text = value.trim();
    if (!text) return null;

    // "yes(Harshit-2208)" and friends: trust the parenthesised part.
    const parenthesised = text.match(/\(([^)]+)\)/);
    if (parenthesised) {
        text = parenthesised[1].trim();
    } else if (/\s/.test(text) && !/^(https?:\/\/|www\.|github\.com\/)/i.test(text)) {
        // Prose, not a handle. This check matters more than it looks: the first
        // word of "Have to join", "Yet to set up" and "i will make soon" is a
        // real, taken GitHub username belonging to a stranger, so asking the API
        // whether the account exists says yes and attributes somebody else's
        // pull requests to the student. Multi-word answers are only ever a
        // sentence or a person's full name; neither is a handle.
        return null;
    }

    text = text
        .replace(/^https?:\/\//i, "")
        .replace(/^www\./i, "")
        .replace(/^github\.com\//i, "")
        .replace(/^@/, "");

    const candidate = text.split(/[/?#\s,]/)[0]?.trim();
    if (!candidate) return null;
    if (NOT_A_HANDLE.has(candidate.toLowerCase())) return null;
    // A one or two character answer is a typo or an initial, never a real
    // submission, but "i" and "yet" are taken accounts and would pass the API check.
    if (candidate.length < 3) return null;
    return HANDLE_RE.test(candidate) ? candidate : null;
}

/** A full https URL, or null when the answer was prose rather than a link. */
function url(value, mustInclude) {
    if (!value) return null;
    const text = value.trim();
    if (!text || NOT_A_HANDLE.has(text.toLowerCase())) return null;
    if (/\s/.test(text) && !/^https?:\/\//i.test(text)) return null;
    const withProtocol = /^https?:\/\//i.test(text) ? text : `https://${text.replace(/^\/+/, "")}`;
    if (mustInclude && !withProtocol.toLowerCase().includes(mustInclude)) return null;
    try {
        return new URL(withProtocol).toString();
    } catch {
        return null;
    }
}

/** Collapses the double spaces and stray casing the form collects. */
function displayName(value) {
    return value.replace(/\s+/g, " ").trim();
}

/* ------------------------------------------------------------------ */
/* Build                                                               */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Verification                                                        */
/* ------------------------------------------------------------------ */

/**
 * Confirms each handle is a real GitHub account.
 *
 * The free-text answers defeat any amount of string cleaning — "I don't have",
 * "i will make soon", "Yet to set up" and "N/A" all reduce to something that
 * looks exactly like a username. Asking GitHub is the only check that actually
 * separates a handle from a sentence, and it catches ordinary typos too, so the
 * roster cannot carry a row whose avatar 404s and whose PR count is a
 * permanent zero.
 *
 * Returns the canonical login, because GitHub is case-insensitive on lookup but
 * the API, avatars and profile URLs all use the account's own spelling.
 */
async function verify(people, token) {
    const confirmed = [];
    const rejected = [];

    for (const [index, person] of people.entries()) {
        const response = await fetch(`https://api.github.com/users/${person.github}`, {
            headers: {
                Accept: "application/vnd.github+json",
                "User-Agent": "DevForge-cohort-import",
                Authorization: `token ${token}`,
            },
        });

        if (response.status === 404) {
            rejected.push({ ...person, reason: "no such GitHub account" });
        } else if (response.ok) {
            const account = await response.json();
            // Organisations would break per-author PR search; only people count.
            if (account.type !== "User") {
                rejected.push({ ...person, reason: `is a GitHub ${account.type}, not a user` });
            } else {
                confirmed.push({ ...person, github: account.login });
            }
        } else {
            // Never drop somebody because the network wobbled — keep the row and
            // say so, so a bad run is visible instead of silently shrinking the roster.
            rejected.push({ ...person, reason: `check failed with HTTP ${response.status}`, kept: true });
            confirmed.push(person);
        }

        if ((index + 1) % 25 === 0) console.log(`  checked ${index + 1}/${people.length}...`);
    }

    return { confirmed, rejected };
}

function build(rows) {
    const byHandle = new Map();
    const withoutHandle = [];

    for (const row of rows) {
        const name = displayName(row["Full Name"] ?? "");
        if (!name) continue;

        const handle = githubHandle(row["Github"] ?? "");
        if (!handle) {
            withoutHandle.push(name);
            continue;
        }

        const person = {
            name,
            github: handle,
            linkedin: url(row["LinkedIn"] ?? "", "linkedin.com"),
            website: url(row["Portfolio Website (If Available)"] ?? "", null),
        };

        // The form allows resubmission, so the same handle can appear twice.
        // Later rows win: they are the student's more recent answer.
        byHandle.set(handle.toLowerCase(), person);
    }

    const people = [...byHandle.values()].sort((a, b) => a.name.localeCompare(b.name));
    return { people, withoutHandle };
}

function serialise(people, cohort) {
    const entries = people
        .map((person) => {
            const fields = [
                `        name: ${JSON.stringify(person.name)},`,
                `        github: ${JSON.stringify(person.github)},`,
                person.linkedin ? `        linkedin: ${JSON.stringify(person.linkedin)},` : null,
                person.website ? `        website: ${JSON.stringify(person.website)},` : null,
            ].filter(Boolean);
            return `    {\n${fields.join("\n")}\n    },`;
        })
        .join("\n");

    return `// Generated by scripts/import-cohort-csv.mjs — do not edit by hand.
// Re-run the importer against the intake sheet to refresh this file.
//
// Public profile fields only. The source sheet also holds dates of birth, phone
// numbers and personal email addresses; none of that is imported, and none of
// it belongs on a public page.

import type { CohortMember } from "@/lib/cohorts";

export const ${cohort}Roster: CohortMember[] = [
${entries}
];
`;
}

async function main() {
    const [csvPath, ...flags] = process.argv.slice(2);
    if (!csvPath) {
        console.error(
            "usage: node scripts/import-cohort-csv.mjs <responses.csv> [--cohort first-year] [--verify]",
        );
        process.exit(1);
    }

    const cohortFlag = flags.indexOf("--cohort");
    const cohortSlug = cohortFlag >= 0 ? flags[cohortFlag + 1] : "first-year";
    const camel = cohortSlug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

    const rows = parseCsv(readFileSync(csvPath, "utf8"));
    const { people, withoutHandle } = build(rows);

    let roster = people;
    let rejected = [];

    if (flags.includes("--verify")) {
        const token = process.env.GITHUB_TOKEN;
        if (!token) {
            console.error(
                "--verify needs GITHUB_TOKEN: unauthenticated calls get 60 an hour and this needs one per student.",
            );
            process.exit(1);
        }
        console.log(`verifying ${people.length} handles against GitHub...`);
        ({ confirmed: roster, rejected } = await verify(people, token));
    }

    const outPath = path.join(process.cwd(), "data", `${cohortSlug}-roster.ts`);
    writeFileSync(outPath, serialise(roster, camel), "utf8");

    console.log(`\nrows read:            ${rows.length}`);
    console.log(`with a usable handle: ${people.length}`);
    console.log(`dropped (no handle):  ${withoutHandle.length}`);
    if (rejected.length) console.log(`dropped (not on GitHub): ${rejected.filter((r) => !r.kept).length}`);
    console.log(`on the roster:        ${roster.length}`);

    if (withoutHandle.length) {
        console.log("\nNo GitHub handle on the form — ask these students directly:");
        for (const name of withoutHandle) console.log(`  - ${name}`);
    }
    if (rejected.length) {
        console.log("\nHandle did not resolve on GitHub:");
        for (const person of rejected) {
            console.log(`  - ${person.name} (${person.github}) — ${person.reason}${person.kept ? " [kept]" : ""}`);
        }
    }
    console.log(`\nwrote ${path.relative(process.cwd(), outPath)}`);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
