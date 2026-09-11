"use client";

import { motion } from "framer-motion";
import { Github, ExternalLink, Star, GitFork, Calendar, Filter, SortDesc } from "lucide-react";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DataState } from "@/components/ui/empty-state";
import { FreshnessNote, YearSwitcher } from "@/components/ui/year-switcher";
import { cohortFromParam } from "@/lib/cohorts";

interface QualityPR {
    title: string;
    url: string;
    number: number;
    mergedAt: string;
    repoName: string;
    repoUrl: string;
    repoStars: number;
    repoForks: number;
    author: {
        name: string;
        github: string;
        avatar: string;
    };
}

interface QualityPRsData {
    prs: QualityPR[];
    totalCount: number;
    lastUpdated: string;
    year: string;
    yearLabel: string;
    source: "live" | "snapshot";
    generatedAt: string | null;
}

type SortOption = 'date' | 'stars' | 'forks';

export function QualityPRsList() {
    const [data, setData] = useState<QualityPRsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filterAuthor, setFilterAuthor] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortOption>('date');

    const searchParams = useSearchParams();
    const cohort = cohortFromParam(searchParams.get("year"));

    useEffect(() => {
        async function fetchPRs() {
            try {
                const response = await fetch(`/api/quality-prs?year=${cohort.id}`);
                if (!response.ok) throw new Error('Failed to fetch quality PRs');
                const result = await response.json();
                setData(result);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'An error occurred');
            } finally {
                setLoading(false);
            }
        }

        fetchPRs();
    }, [cohort.id]);

    // Derived, not cleared in the effect: while the next year group loads, the
    // previous one's pull requests are still in state and must not render under
    // the new heading.
    const stale = data !== null && data.year !== cohort.id;

    if (loading || error || !data || stale) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black">
                <div className="flex justify-center pt-24">
                    <YearSwitcher />
                </div>
                <DataState
                    loading={loading}
                    error={error ? `⚠️ ${error}` : !data ? "⚠️ Failed to load PRs" : null}
                    loadingLabel={`Loading ${cohort.label} quality PRs...`}
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    // Get unique authors for filter
    const authors = Array.from(new Set(data.prs.map(pr => pr.author.github)));
    // A filter left over from the other year group names somebody who is not in
    // this list, which would silently render zero results. Fall back to "all".
    const activeAuthor = authors.includes(filterAuthor) ? filterAuthor : 'all';

    // Filter and sort PRs
    let filteredPRs = activeAuthor === 'all'
        ? data.prs
        : data.prs.filter(pr => pr.author.github === activeAuthor);

    filteredPRs = [...filteredPRs].sort((a, b) => {
        if (sortBy === 'date') return new Date(b.mergedAt).getTime() - new Date(a.mergedAt).getTime();
        if (sortBy === 'stars') return b.repoStars - a.repoStars;
        return b.repoForks - a.repoForks;
    });

    return (
        <section className="py-24 bg-gradient-to-b from-black via-neutral-950 to-black min-h-screen">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                        Quality <span className="text-cyan-400">PRs</span>
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-2">
                        Browse all merged PRs to repositories with ≥100 ⭐ and ≥100 forks
                    </p>
                    <p className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                        {data.totalCount} Quality PRs
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <YearSwitcher />
                        <p className="text-sm text-neutral-400">{data.yearLabel} — {cohort.blurb}</p>
                        <FreshnessNote source={data.source} generatedAt={data.generatedAt} />
                    </div>
                </motion.div>

                {/* Filters */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.1 }}
                    className="flex flex-wrap gap-4 justify-center mb-12"
                >
                    {/* Author Filter */}
                    <div className="flex items-center gap-2 glass rounded-lg px-4 py-2">
                        <Filter className="w-4 h-4 text-cyan-400" />
                        <select
                            value={activeAuthor}
                            onChange={(e) => setFilterAuthor(e.target.value)}
                            className="bg-transparent text-white border-none outline-none cursor-pointer"
                        >
                            <option value="all" className="bg-neutral-900">All Members</option>
                            {authors.map(author => (
                                <option key={author} value={author} className="bg-neutral-900">
                                    {author}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sort */}
                    <div className="flex items-center gap-2 glass rounded-lg px-4 py-2">
                        <SortDesc className="w-4 h-4 text-cyan-400" />
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as SortOption)}
                            className="bg-transparent text-white border-none outline-none cursor-pointer"
                        >
                            <option value="date" className="bg-neutral-900">Newest First</option>
                            <option value="stars" className="bg-neutral-900">Most Stars</option>
                            <option value="forks" className="bg-neutral-900">Most Forks</option>
                        </select>
                    </div>
                </motion.div>

                {/* Results count */}
                <div className="text-center text-neutral-400 mb-8">
                    Showing {filteredPRs.length} PR{filteredPRs.length !== 1 ? 's' : ''}
                </div>

                {/* PR Cards Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPRs.map((pr, index) => (
                        <motion.div
                            key={pr.url}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 + index * 0.02 }}
                            whileHover={{ y: -5 }}
                            className="group"
                        >
                            <div className="relative glass rounded-2xl p-6 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 h-full flex flex-col">
                                {/* Gradient overlay */}
                                <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                <div className="relative flex-1 flex flex-col">
                                    {/* Repo info */}
                                    <div className="flex items-center gap-3 mb-4">
                                        <a
                                            href={pr.repoUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                                        >
                                            <Github className="w-4 h-4" />
                                            <span className="truncate max-w-[200px]">{pr.repoName}</span>
                                        </a>
                                    </div>

                                    {/* Repo stats */}
                                    <div className="flex items-center gap-4 mb-4 text-sm text-neutral-400">
                                        <span className="flex items-center gap-1">
                                            <Star className="w-4 h-4 text-yellow-500" />
                                            {pr.repoStars.toLocaleString()}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <GitFork className="w-4 h-4 text-blue-400" />
                                            {pr.repoForks.toLocaleString()}
                                        </span>
                                    </div>

                                    {/* PR Title */}
                                    <a
                                        href={pr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block mb-4 flex-1"
                                    >
                                        <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                                            {pr.title}
                                        </h3>
                                        <span className="text-xs text-neutral-500">#{pr.number}</span>
                                    </a>

                                    {/* Author & Date */}
                                    <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                                        <div className="flex items-center gap-2">
                                            <img
                                                src={pr.author.avatar}
                                                alt={pr.author.name}
                                                className="w-8 h-8 rounded-full border border-cyan-400/30"
                                            />
                                            <span className="text-sm text-neutral-400">{pr.author.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(pr.mergedAt).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {/* View PR Link */}
                                    <a
                                        href={pr.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 flex items-center justify-center gap-2 w-full py-2 bg-neutral-800/50 hover:bg-cyan-400/20 border border-neutral-700 hover:border-cyan-400/50 rounded-lg transition-all duration-200 text-neutral-400 hover:text-cyan-400"
                                    >
                                        <span className="text-sm">View PR</span>
                                        <ExternalLink className="w-3 h-3" />
                                    </a>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Empty state */}
                {filteredPRs.length === 0 && (
                    <div className="text-center text-neutral-400 py-12">
                        <p className="text-xl">No quality PRs found</p>
                        <p className="text-sm mt-2">Try changing the filter</p>
                    </div>
                )}

                {/* Last Updated */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="text-center mt-12 text-neutral-500 text-sm"
                >
                    Last updated: {new Date(data.lastUpdated).toLocaleString()}
                </motion.div>
            </div>
        </section>
    );
}
