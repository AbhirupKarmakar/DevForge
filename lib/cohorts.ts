/**
 * Year groups, and which roster backs each one.
 *
 * The club was one batch until the 2026 intake, so every open-source page on
 * the site implicitly meant "the founding batch". Now that there are two
 * cohorts, that has to be said out loud: the existing pages are the second
 * year, and the first year is a separate, much larger roster imported from the
 * intake form.
 *
 * The two are fetched differently on purpose, which is the reason `source`
 * exists. Counting contributions costs one GitHub search per person against a
 * budget of 30 requests a minute, so the seventeen second-years can be counted
 * live on every page load, and a hundred and thirty first-years cannot — that
 * roster is counted ahead of time by scripts/oss-snapshot.mjs and read from
 * disk. Pages should treat the distinction as a freshness note to show the
 * reader, not as two different shapes of data.
 */

export type CohortId = "first-year" | "second-year";

export interface Cohort {
    id: CohortId;
    /** What the dropdown and the page heading call this group. */
    label: string;
    /** One line under the heading, explaining who these people are. */
    blurb: string;
    /** Where the contribution counts come from. See the note above. */
    source: "live" | "snapshot";
}

export const COHORTS: Cohort[] = [
    {
        id: "second-year",
        label: "2nd Year",
        blurb: "The founding batch — the record this site was built to show.",
        source: "live",
    },
    {
        id: "first-year",
        label: "1st Year",
        blurb: "The 2026 intake, starting their open-source journey.",
        source: "snapshot",
    },
];

/** The cohort the open-source pages open on when no year is in the URL. */
export const DEFAULT_COHORT: CohortId = "second-year";

export interface CohortMember {
    name: string;
    /** Bare GitHub username, never a URL. */
    github: string;
    linkedin?: string | null;
    website?: string | null;
}

export function isCohortId(value: string | null | undefined): value is CohortId {
    return value === "first-year" || value === "second-year";
}

/**
 * The cohort named by a `?year=` parameter, falling back to the default.
 *
 * Unknown values fall back rather than 404 — a stale bookmark or a hand-typed
 * URL should land on a working page, not an error.
 */
export function cohortFromParam(value: string | string[] | null | undefined): Cohort {
    const raw = Array.isArray(value) ? value[0] : value;
    const id = isCohortId(raw) ? raw : DEFAULT_COHORT;
    return COHORTS.find((cohort) => cohort.id === id)!;
}

export function cohortLabel(id: CohortId): string {
    return COHORTS.find((cohort) => cohort.id === id)?.label ?? id;
}
