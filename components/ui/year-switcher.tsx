"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { GraduationCap } from "lucide-react";
import { COHORTS, DEFAULT_COHORT, isCohortId, type CohortId } from "@/lib/cohorts";

/**
 * Picks which year group an open-source page is showing.
 *
 * The choice lives in the URL rather than in component state so that every
 * cohort view is a page somebody can link to, bookmark and share — "the
 * first-year leaderboard" has to be an address, not a thing you reach by
 * arriving somewhere else and then changing a dropdown.
 *
 * Rendered as a native <select>. A custom menu would match the rest of the
 * site's styling more closely, but this control is the only way to reach half
 * the content on these pages, and the native element is the one that already
 * works with a keyboard, a screen reader and a phone's picker.
 */
export function YearSwitcher({ className = "" }: { className?: string }) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const raw = searchParams.get("year");
    const current: CohortId = isCohortId(raw) ? raw : DEFAULT_COHORT;

    const onChange = useCallback(
        (year: string) => {
            const params = new URLSearchParams(searchParams.toString());
            // The default cohort is the bare URL, so /pr-stats and
            // /pr-stats?year=second-year don't become two addresses for one page.
            if (year === DEFAULT_COHORT) params.delete("year");
            else params.set("year", year);

            const query = params.toString();
            router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
        },
        [pathname, router, searchParams],
    );

    return (
        <label
            className={`inline-flex items-center gap-2.5 rounded-full border border-white/15 bg-white/5 px-4 py-2 backdrop-blur transition-colors hover:border-white/30 focus-within:border-cyan-400/70 ${className}`}
        >
            <GraduationCap className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
            <span className="sr-only">Show contributions for</span>
            <select
                value={current}
                onChange={(event) => onChange(event.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-medium text-white outline-none"
                style={{
                    // The arrow has to be drawn here: appearance-none removes the
                    // native one, and a background-image in a class would be
                    // overridden by the utility reset.
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12' fill='none' stroke='%2322d3ee' stroke-width='1.6'%3E%3Cpath d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "right center",
                    backgroundSize: "12px 12px",
                }}
            >
                {COHORTS.map((cohort) => (
                    // Dark so the open menu is readable on the site's dark chrome;
                    // some browsers render option backgrounds from the OS otherwise.
                    <option key={cohort.id} value={cohort.id} className="bg-neutral-900 text-white">
                        {cohort.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

/**
 * Says where a page's numbers came from and when.
 *
 * The two cohorts are counted differently — the second year live on each load,
 * the first year from a file somebody regenerates by hand — and a leaderboard
 * that hides that difference invites the reader to assume both are current.
 */
export function FreshnessNote({
    source,
    generatedAt,
    className = "",
}: {
    source?: "live" | "snapshot";
    generatedAt?: string | null;
    className?: string;
}) {
    if (source !== "snapshot") return null;

    const counted = generatedAt ? new Date(generatedAt) : null;
    const isReal = counted && !Number.isNaN(counted.valueOf()) && counted.getFullYear() > 1971;

    return (
        <p className={`text-xs text-neutral-500 ${className}`}>
            {isReal
                ? `Counted on ${counted.toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                  })}. This year group is counted in batches, not on every page load.`
                : "These numbers have not been generated yet."}
        </p>
    );
}

/**
 * Shown when a page has nothing to say about the selected year group.
 *
 * The programme pages are records of who took part in a specific cohort's
 * GSSoC or ESoC round. For a year group that has not taken part, the truthful
 * page is this one: an explanation and a way back, not a leaderboard of zeroes
 * that reads like nobody contributed.
 */
export function CohortUnavailable({
    title,
    reason,
}: {
    title: string;
    reason: string;
}) {
    return (
        <div className="min-h-screen pt-24 pb-16">
            <div className="mx-auto max-w-2xl px-4 text-center">
                <div className="mb-8 flex justify-center">
                    <YearSwitcher />
                </div>
                <h1 className="mb-4 text-4xl font-bold text-white md:text-5xl">{title}</h1>
                <p className="text-neutral-400">{reason}</p>
            </div>
        </div>
    );
}
