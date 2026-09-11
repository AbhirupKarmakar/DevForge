"use client";

import { motion } from "framer-motion";
import { Github, ExternalLink, GitMerge, GitPullRequest, XCircle, Star, TrendingUp, PieChart as PieChartIcon, BarChart3 } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSearchParams } from "next/navigation";
import { DataState } from "@/components/ui/empty-state";
import { FreshnessNote, YearSwitcher } from "@/components/ui/year-switcher";
import { cohortFromParam } from "@/lib/cohorts";

interface PR {
    title: string;
    url: string;
    repo: string;
    number: number;
    date: string;
    state: 'merged' | 'open' | 'closed';
    isGsoc: boolean;
}

interface OrgStats {
    org: string;
    merged: number;
    open: number;
    closed: number;
    total: number;
    prs: PR[];
}

interface MemberData {
    name: string;
    github: string;
    merged: number;
    open: number;
    closed: number;
    gsocMerged: number;
    gsocOpen: number;
    gsocClosed: number;
    gsocPRs: PR[];
    orgBreakdown: OrgStats[];
}

interface BreakdownData {
    summary: {
        merged: number;
        open: number;
        closed: number;
        total: number;
        gsocMerged: number;
        gsocOpen: number;
        gsocClosed: number;
        gsocTotal: number;
    };
    members: MemberData[];
    lastUpdated: string;
    year: string;
    yearLabel: string;
    source: "live" | "snapshot";
    generatedAt: string | null;
}

export function GsocStats() {
    const [data, setData] = useState<BreakdownData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMember, setSelectedMember] = useState<string>('all');

    const searchParams = useSearchParams();
    const cohort = cohortFromParam(searchParams.get("year"));

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch(`/api/pr-breakdown?year=${cohort.id}`);
                if (!response.ok) throw new Error('Failed to fetch');
                const result = await response.json();
                setData(result);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Error');
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [cohort.id]);

    // Derived rather than cleared in the effect, so the previous year group's
    // breakdown never renders under the new heading while the fetch is in flight.
    const stale = data !== null && data.year !== cohort.id;

    if (loading || error || !data || stale) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-black via-neutral-950 to-black">
                <div className="flex justify-center pt-24">
                    <YearSwitcher />
                </div>
                <DataState
                    loading={loading}
                    error={error ? `⚠️ ${error}` : !data ? "⚠️ Failed to load GSoC data" : null}
                    loadingLabel={`Loading ${cohort.label} GSoC data...`}
                    onRetry={() => window.location.reload()}
                />
            </div>
        );
    }

    // A member picked in the other year group is not in this list; falling back
    // to "all" beats rendering an empty breakdown that looks like real data.
    const activeMember = data.members.some(m => m.github === selectedMember) ? selectedMember : 'all';
    const filteredGsocPRs = activeMember === 'all'
        ? data.members.flatMap(m => m.gsocPRs)
        : data.members.find(m => m.github === activeMember)?.gsocPRs || [];

    return (
        <section className="py-24 bg-gradient-to-b from-black via-neutral-950 to-black min-h-screen">
            <div className="max-w-7xl mx-auto px-4">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
                        <span className="text-cyan-400">GSoC</span> Ready
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                        PR bifurcation for Google Summer of Code eligible organizations
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <YearSwitcher />
                        <p className="text-sm text-neutral-400">{data.yearLabel} — {cohort.blurb}</p>
                        <FreshnessNote source={data.source} generatedAt={data.generatedAt} />
                    </div>
                </motion.div>

                {/* GSoC PRs Summary - Single Featured Card */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-12"
                >
                    <div className="bg-gradient-to-br from-cyan-400/20 to-purple-500/20 border-2 border-cyan-400 rounded-3xl p-8 shadow-[0_0_50px_rgb(var(--ac-400)/0.3)]">
                        <div className="text-center mb-8">
                            <div className="flex items-center justify-center gap-3 mb-4">
                                <Star className="w-10 h-10 text-cyan-400" />
                                <h2 className="text-3xl font-bold text-white">GSoC Organization PRs</h2>
                            </div>
                            <p className="text-neutral-400">Contributions to Google Summer of Code eligible organizations</p>
                        </div>

                        <div className="grid grid-cols-4 gap-6">
                            <div className="text-center p-6 bg-purple-500/10 rounded-2xl border border-purple-500/30">
                                <GitMerge className="w-10 h-10 text-purple-500 mx-auto mb-3" />
                                <div className="text-5xl font-bold text-purple-500 mb-1">{data.summary.gsocMerged}</div>
                                <p className="text-neutral-400 text-lg">Merged</p>
                            </div>
                            <div className="text-center p-6 bg-green-500/10 rounded-2xl border border-green-500/30">
                                <GitPullRequest className="w-10 h-10 text-green-500 mx-auto mb-3" />
                                <div className="text-5xl font-bold text-green-500 mb-1">{data.summary.gsocOpen}</div>
                                <p className="text-neutral-400 text-lg">Open</p>
                            </div>
                            <div className="text-center p-6 bg-red-500/10 rounded-2xl border border-red-500/30">
                                <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                                <div className="text-5xl font-bold text-red-500 mb-1">{data.summary.gsocClosed}</div>
                                <p className="text-neutral-400 text-lg">Closed</p>
                            </div>
                            <div className="text-center p-6 bg-gradient-to-br from-cyan-400/20 to-purple-500/20 rounded-2xl border border-cyan-400/50">
                                <Star className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                                <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 mb-1">{data.summary.gsocTotal}</div>
                                <p className="text-cyan-300 text-lg font-semibold">Total GSoC</p>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Charts & Trends Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="mb-12"
                >
                    <div className="flex items-center justify-center gap-3 mb-8">
                        <TrendingUp className="w-8 h-8 text-cyan-400" />
                        <h2 className="text-3xl font-bold text-white">Contribution Trends</h2>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Organization Distribution Pie Chart */}
                        <div className="glass rounded-2xl p-4 md:p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <PieChartIcon className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-lg md:text-xl font-bold text-white">Organization Distribution</h3>
                            </div>
                            <div className="h-72 md:h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={(() => {
                                                const orgCounts: Record<string, number> = {};
                                                data.members.forEach(m => {
                                                    m.orgBreakdown?.forEach(o => {
                                                        orgCounts[o.org] = (orgCounts[o.org] || 0) + o.total;
                                                    });
                                                });
                                                return Object.entries(orgCounts)
                                                    .map(([name, value]) => ({ name, value }))
                                                    .sort((a, b) => b.value - a.value)
                                                    .slice(0, 6);
                                            })()}
                                            cx="50%"
                                            cy="40%"
                                            innerRadius={40}
                                            outerRadius={70}
                                            dataKey="value"
                                            paddingAngle={2}
                                        >
                                            {[
                                                '#22d3ee', '#a855f7', '#22c55e', '#3b82f6', '#ef4444', '#eab308'
                                            ].map((color, index) => (
                                                <Cell key={`cell-${index}`} fill={color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                            formatter={(value) => [`${value} PRs`, 'Count']}
                                        />
                                        <Legend
                                            layout="horizontal"
                                            verticalAlign="bottom"
                                            align="center"
                                            wrapperStyle={{ paddingTop: '20px' }}
                                            formatter={(value) => <span style={{ color: '#ccc', fontSize: '12px' }}>{value}</span>}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Per-Member Contribution Bar Chart */}
                        <div className="glass rounded-2xl p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <BarChart3 className="w-5 h-5 text-cyan-400" />
                                <h3 className="text-xl font-bold text-white">GSoC PRs per Member</h3>
                            </div>
                            <div className="h-80">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={data.members.map(m => ({
                                            name: m.name.split(' ')[0],
                                            merged: m.gsocMerged,
                                            open: m.gsocOpen,
                                            closed: m.gsocClosed
                                        }))}
                                        layout="vertical"
                                        margin={{ top: 10, right: 20, left: 20, bottom: 5 }}
                                    >
                                        <XAxis type="number" stroke="#888" tick={{ fill: '#ccc' }} />
                                        <YAxis
                                            type="category"
                                            dataKey="name"
                                            stroke="#888"
                                            width={110}
                                            tick={{ fontSize: 13, fill: '#fff', fontWeight: 500 }}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                                        />
                                        <Legend />
                                        <Bar dataKey="merged" stackId="a" fill="#a855f7" name="Merged" />
                                        <Bar dataKey="open" stackId="a" fill="#eab308" name="Open" />
                                        <Bar dataKey="closed" stackId="a" fill="#ef4444" name="Closed" />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Contribution Insights */}
                    <div className="mt-6 grid md:grid-cols-3 gap-4">
                        <div className="glass rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-purple-500 mb-1">
                                {data.summary.gsocTotal > 0 ? Math.round((data.summary.gsocMerged / data.summary.gsocTotal) * 100) : 0}%
                            </div>
                            <div className="text-neutral-400 text-sm">Merge Rate</div>
                            <div className="text-xs text-neutral-500 mt-1">PRs successfully merged</div>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-cyan-400 mb-1">
                                {(() => {
                                    const orgSet = new Set<string>();
                                    data.members.forEach(m => m.orgBreakdown?.forEach(o => orgSet.add(o.org)));
                                    return orgSet.size;
                                })()}
                            </div>
                            <div className="text-neutral-400 text-sm">Organizations</div>
                            <div className="text-xs text-neutral-500 mt-1">Unique GSoC orgs contributed to</div>
                        </div>
                        <div className="glass rounded-xl p-4 text-center">
                            <div className="text-3xl font-bold text-green-500 mb-1">
                                {data.members.length}
                            </div>
                            <div className="text-neutral-400 text-sm">Contributors</div>
                            <div className="text-xs text-neutral-500 mt-1">Active GSoC participants</div>
                        </div>
                    </div>
                </motion.div>

                {/* GSoC Member Breakdown - Only members with GSoC PRs */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mb-12"
                >
                    <h2 className="text-3xl font-bold text-white mb-8 text-center">
                        🌟 GSoC Contributors
                    </h2>

                    <div className="space-y-8">
                        {data.members.map((member, i) => (
                            <motion.div
                                key={member.github}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 + i * 0.1 }}
                                className="bg-gradient-to-br from-cyan-400/10 to-purple-500/10 border border-cyan-400/30 rounded-2xl p-6"
                            >
                                {/* Member Header */}
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <img
                                            src={`https://github.com/${member.github}.png`}
                                            alt={member.name}
                                            className="w-16 h-16 rounded-full border-2 border-cyan-400"
                                        />
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{member.name}</h3>
                                            <a
                                                href={`https://github.com/${member.github}`}
                                                target="_blank"
                                                className="text-cyan-300 hover:text-cyan-200 flex items-center gap-1"
                                            >
                                                <Github className="w-4 h-4" />
                                                @{member.github}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">
                                            {member.gsocMerged + member.gsocOpen + member.gsocClosed}
                                        </div>
                                        <div className="text-neutral-400 text-sm">GSoC PRs</div>
                                    </div>
                                </div>

                                {/* Quick Stats */}
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    <div className="text-center p-3 bg-purple-500/10 rounded-lg">
                                        <div className="text-2xl font-bold text-purple-500">{member.gsocMerged}</div>
                                        <div className="text-xs text-neutral-400">Merged</div>
                                    </div>
                                    <div className="text-center p-3 bg-green-500/10 rounded-lg">
                                        <div className="text-2xl font-bold text-green-500">{member.gsocOpen}</div>
                                        <div className="text-xs text-neutral-400">Open</div>
                                    </div>
                                    <div className="text-center p-3 bg-red-500/10 rounded-lg">
                                        <div className="text-2xl font-bold text-red-500">{member.gsocClosed}</div>
                                        <div className="text-xs text-neutral-400">Closed</div>
                                    </div>
                                </div>

                                {/* Organization Breakdown */}
                                <div className="space-y-3">
                                    <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                                        <Star className="w-5 h-5 text-cyan-400" />
                                        Organizations Contributed To
                                    </h4>
                                    {member.orgBreakdown && member.orgBreakdown.map((org) => (
                                        <div
                                            key={org.org}
                                            className="glass rounded-xl p-4"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <a
                                                    href={`https://github.com/${org.org}`}
                                                    target="_blank"
                                                    className="text-xl font-semibold text-white hover:text-cyan-400 flex items-center gap-2"
                                                >
                                                    <img
                                                        src={`https://github.com/${org.org}.png`}
                                                        alt={org.org}
                                                        className="w-8 h-8 rounded-lg"
                                                    />
                                                    {org.org}
                                                </a>
                                                <div className="flex items-center gap-4 text-sm">
                                                    <span className="text-purple-500">✓ {org.merged}</span>
                                                    <span className="text-green-500">○ {org.open}</span>
                                                    <span className="text-red-500">✗ {org.closed}</span>
                                                    <span className="text-cyan-400 font-bold">Total: {org.total}</span>
                                                </div>
                                            </div>

                                            {/* PR List for this org */}
                                            <div className="space-y-2">
                                                {org.prs.map((pr) => (
                                                    <a
                                                        key={pr.url}
                                                        href={pr.url}
                                                        target="_blank"
                                                        className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors"
                                                    >
                                                        {pr.state === 'merged' && <GitMerge className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                                                        {pr.state === 'open' && <GitPullRequest className="w-4 h-4 text-green-500 flex-shrink-0" />}
                                                        {pr.state === 'closed' && <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                                                        <span className="truncate">{pr.title}</span>
                                                        <span className="text-neutral-600 flex-shrink-0">#{pr.number}</span>
                                                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* GSoC PR List */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-3xl font-bold text-white">All GSoC PRs</h2>
                        <select
                            value={activeMember}
                            onChange={(e) => setSelectedMember(e.target.value)}
                            className="bg-neutral-900 border border-neutral-700 text-white px-4 py-2 rounded-lg"
                        >
                            <option value="all">All Members</option>
                            {data.members.filter(m => m.gsocPRs.length > 0).map(m => (
                                <option key={m.github} value={m.github}>{m.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-4">
                        {filteredGsocPRs.map((pr, i) => (
                            <motion.a
                                key={pr.url}
                                href={pr.url}
                                target="_blank"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.4 + i * 0.03 }}
                                className="block glass hover:border-cyan-400/50 rounded-xl p-4 transition-all"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            {pr.state === 'merged' && <GitMerge className="w-5 h-5 text-purple-500" />}
                                            {pr.state === 'open' && <GitPullRequest className="w-5 h-5 text-green-500" />}
                                            {pr.state === 'closed' && <XCircle className="w-5 h-5 text-red-500" />}
                                            <span className={`text-xs px-2 py-1 rounded ${pr.state === 'merged' ? 'bg-purple-500/20 text-purple-400' :
                                                pr.state === 'open' ? 'bg-green-500/20 text-green-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                {pr.state.toUpperCase()}
                                            </span>
                                            <span className="text-neutral-500 text-sm">{pr.repo}#{pr.number}</span>
                                        </div>
                                        <h4 className="text-white font-medium">{pr.title}</h4>
                                    </div>
                                    <ExternalLink className="w-5 h-5 text-neutral-500" />
                                </div>
                            </motion.a>
                        ))}
                    </div>

                    {filteredGsocPRs.length === 0 && (
                        <p className="text-neutral-400 text-center py-8">No GSoC PRs found</p>
                    )}
                </motion.div>

                <div className="text-center text-neutral-500 text-sm mt-12">
                    Last updated: {new Date(data.lastUpdated).toLocaleString()}
                </div>
            </div>
        </section>
    );
}
