"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Trophy, Star, ExternalLink, GitMerge, Users, GitBranch, Globe2, Activity, Medal, Award, Github } from "lucide-react";
import prData from "@/pr-data-report.json";
import gssocSnapshot from "@/data/gssoc-snapshot.json";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ContributionHeatmap } from "@/components/ui/contribution-heatmap";
import { FreshnessNote, YearSwitcher } from "@/components/ui/year-switcher";
import { cohortFromParam } from "@/lib/cohorts";

interface Milestone {
    name: string;
    count: number;
    emoji: string;
}

interface NextMilestone extends Milestone {
    progress: number;
}

interface MemberStats {
    name: string;
    github: string;
    role: string;
    avatar: string;
    prCount: number;
    totalPRs: number;
    milestones: Milestone[];
    nextMilestone: NextMilestone | null;
}

interface GraphStats {
    monthlyData: { month: string; count: number }[];
    orgData: { org: string; count: number }[];
    totalMergedPRs: number;
}

export function OpenSourceImpact() {
    const [prStatsMembers, setPrStatsMembers] = useState<MemberStats[]>([]);
    const [loadingStats, setLoadingStats] = useState(true);
    const [graphStats, setGraphStats] = useState<GraphStats | null>(null);
    const [loadingGraphs, setLoadingGraphs] = useState(true);
    const [statsMeta, setStatsMeta] = useState<{ source: "live" | "snapshot"; generatedAt: string | null } | null>(null);

    const searchParams = useSearchParams();
    const cohort = cohortFromParam(searchParams.get("year"));
    // Everything above the Hall of Fame is drawn from pr-data-report.json and the
    // GSSoC snapshot, both of which are records of the founding batch alone.
    // Showing them under a first-year heading would label one cohort's work as
    // another's, so they are second-year only until equivalent records exist.
    const isSecondYear = cohort.id === "second-year";

    useEffect(() => {
        async function fetchStats() {
            try {
                const response = await fetch(`/api/pr-stats?year=${cohort.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setPrStatsMembers([...data.members].sort((a, b) => b.prCount - a.prCount));
                    setStatsMeta({ source: data.source, generatedAt: data.generatedAt });
                }
            } catch (error) {
                console.error("Failed to fetch PR stats", error);
            } finally {
                setLoadingStats(false);
            }
        }

        async function fetchGraphStats() {
            try {
                const response = await fetch('/api/graph-stats');
                if (response.ok) {
                    const data = await response.json();
                    setGraphStats(data);
                }
            } catch (error) {
                console.error("Failed to fetch graph stats", error);
            } finally {
                setLoadingGraphs(false);
            }
        }

        fetchStats();
        fetchGraphStats();
    }, [cohort.id]);


    // Build top GSSoC achievers sorted by rank (from real snapshot)
    const topGSSoC = [...gssocSnapshot.members]
        .sort((a, b) => a.rank - b.rank)
        .slice(0, 4);

    // Build top contributors by merging pr-data-report and gssoc-snapshot
    const allMembersMap = new Map();
    
    prData.members.forEach(m => {
        allMembersMap.set(m.github?.toLowerCase() || m.name?.toLowerCase(), m);
    });

    // Name mapping for GSSoC-only members (snapshot only has github handles)
    const gssocNameMap: Record<string, string> = {
        'zenowinged': 'Dhruv Mehta',
        'mahaveerjain-18': 'Mahaveer Jain',
        'layyzyyy': 'Lay Shah',
        'adhikaryrachana00428-hash': 'Rachana Adhikary',
        'shreyaagrawal29': 'Shreya Agrawal',
        'ravisharma-09': 'Ravi Sharma',
        '2102508725-hash': 'Navya Krushi',
        'anushkag6393': 'Anushka Gupta',
        'abhi-lab645': 'Abhinav',
        'shivansh-ux-ys': 'Shivansh Goel',
    };

    gssocSnapshot.members.forEach(m => {
        const anyM = m as any;
        const key = m.github?.toLowerCase();
        if (key && !allMembersMap.has(key)) {
            allMembersMap.set(key, {
                name: gssocNameMap[key] || anyM.name || m.github,
                github: m.github,
                avatar: `https://github.com/${m.github}.png`,
                allPRs: { merged: anyM.merged_prs || anyM.prs || 0 }
            });
        }
    });

    const topContributors = Array.from(allMembersMap.values())
        .sort((a, b) => (b.allPRs?.merged || 0) - (a.allPRs?.merged || 0));

    // Use live total from graph-stats API; fall back to pr-stats API total while loading
    const liveTotalPRs = graphStats?.totalMergedPRs;
    const totalContributors = topContributors.length;

    const findMember = (nameQuery: string, fallback: any) => 
        prData.members.find(m => m.name?.toLowerCase().includes(nameQuery.toLowerCase())) || fallback;

    const nishtha = findMember("Nishtha", { name: "Nishtha Agarwal", allPRs: { merged: 69 }, avatar: "https://github.com/nishtha-agarwal-211.png", github: "nishtha-agarwal-211" });
    const dhiraj = findMember("Dhiraj", { name: "Dhiraj Rathod", allPRs: { merged: 28 }, avatar: "https://github.com/dhiraj-143r.png", github: "dhiraj-143r" });
    const nithyaraj = findMember("Nithyaraj", { name: "Nithyaraj", allPRs: { merged: 10 }, avatar: "/nithyaraj.png", github: "nithyarajmudhaliyar" });

    const podiumData = [
        { 
            name: dhiraj.name, 
            place: 2, 
            quality: 18, 
            merged: dhiraj.allPRs.merged, 
            avatar: dhiraj.avatar || `https://github.com/${dhiraj.github}.png`, 
            color: "text-neutral-300", 
            bg: "bg-neutral-800", 
            ring: "ring-neutral-400" 
        },
        { 
            name: nishtha.name, 
            place: 1, 
            quality: 20, 
            merged: nishtha.allPRs.merged, 
            avatar: nishtha.avatar || `https://github.com/${nishtha.github}.png`, 
            color: "text-yellow-400", 
            bg: "bg-yellow-900/20", 
            ring: "ring-yellow-500" 
        },
        { 
            name: nithyaraj.name, 
            place: 3, 
            quality: 8, 
            merged: nithyaraj.allPRs.merged, 
            avatar: "/nithyaraj.png", 
            color: "text-cyan-500", 
            bg: "bg-cyan-800/20", 
            ring: "ring-cyan-500" 
        }
    ];

    // Live graph data from /api/graph-stats — real GitHub merged PR counts
    // Jan–Jun 2026 monthly activity fetched per member, aggregated across all accounts
    const monthlyData = graphStats?.monthlyData ?? [
        { month: 'Jan', count: 0 }, { month: 'Feb', count: 0 }, { month: 'Mar', count: 0 },
        { month: 'Apr', count: 0 }, { month: 'May', count: 0 }, { month: 'Jun', count: 0 },
    ];
    const months = monthlyData.map(d => d.month);
    const monthCounts = monthlyData.map(d => d.count);
    const maxCount = Math.max(...monthCounts, 1);

    // Top 5 orgs — real merged PR counts fetched from GitHub for every member account
    const topOrgs = graphStats?.orgData ?? [
        { org: 'openSUSE',      count: 0 },
        { org: 'OpenFoodFacts', count: 0 },
        { org: 'JSONSchema',    count: 0 },
        { org: 'Zulip',        count: 0 },
        { org: 'MIT App',      count: 0 },
    ];
    const maxOrgCount = Math.max(...topOrgs.map(o => o.count), 1);




    return (
        <div className="min-h-screen pt-24 pb-16 relative">
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-cyan-400/10 text-cyan-400 rounded-full mb-8 border border-cyan-400/20">
                        <Globe2 size={32} />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        Open Source <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400">Impact</span>
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
                        Real-time analytics and visualizations of our growing open source footprint across the globe.
                    </p>
                    <div className="mt-8 flex flex-col items-center gap-3">
                        <YearSwitcher />
                        <p className="text-sm text-neutral-400">{cohort.label} — {cohort.blurb}</p>
                        <FreshnessNote source={statsMeta?.source} generatedAt={statsMeta?.generatedAt} />
                    </div>
                </motion.div>

                {isSecondYear && (<>
                {/* Top Metrics */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
                    {[
                        { title: "Total Contributors", value: `${totalContributors}+`, icon: <Users size={24} className="text-blue-500" /> },
                        { title: "Total PRs", value: loadingGraphs ? '...' : `${liveTotalPRs ?? 188}`, icon: <GitBranch size={24} className="text-purple-500" /> },
                        { title: "Quality PRs", value: "60+", icon: <Activity className="text-green-500" size={24} /> },
                        { title: "Open Source Orgs", value: "8+", icon: <Globe2 className="text-cyan-400" size={24} /> }
                    ].map((metric, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass p-6 rounded-3xl text-center backdrop-blur-sm shadow-xl hover:border-cyan-400/30 transition-colors cursor-default"
                        >
                            <div className="flex justify-center mb-4">{metric.icon}</div>
                            <div className="text-4xl font-bold text-white mb-2">{metric.value}</div>
                            <div className="text-neutral-500 font-medium uppercase tracking-wider text-sm">{metric.title}</div>
                        </motion.div>
                    ))}
                </div>

                {/* Graphs Section */}
                <div className="grid lg:grid-cols-2 gap-6 mb-24">
                    {/* Activity Graph Bar */}
                    <div className="glass-subtle p-8 rounded-3xl backdrop-blur-md hover:border-cyan-400/20 transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Activity className="text-cyan-400" /> Monthly Activity
                            </h3>
                            <div className="flex items-center gap-2">
                                {loadingGraphs ? (
                                    <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse inline-block" /> Fetching...
                                    </span>
                                ) : (
                                    <span className="text-xs text-green-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live
                                    </span>
                                )}
                                <div className="text-sm text-neutral-400">Merged PRs</div>
                            </div>
                        </div>
                        {loadingGraphs ? (
                            <div className="flex items-end justify-between h-48 gap-2">
                                {[40, 55, 35, 65, 50, 75].map((h, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full">
                                        <div className="w-full flex justify-center h-full items-end">
                                            <div
                                                className="w-full max-w-[3rem] bg-neutral-800 rounded-t-xl animate-pulse"
                                                style={{ height: `${h}%` }}
                                            />
                                        </div>
                                        <div className="w-6 h-2 bg-neutral-800 rounded animate-pulse mt-4" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-end justify-between h-48 gap-2">
                                {monthCounts.map((count, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full group">
                                        <div className="w-full relative flex justify-center h-full items-end">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(count / maxCount) * 100}%` }}
                                                transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                                                className="w-full max-w-[3rem] bg-gradient-to-t from-cyan-500/20 to-cyan-400/80 rounded-t-xl relative group-hover:from-cyan-400/40 group-hover:to-cyan-300 transition-colors cursor-pointer"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-neutral-800 shadow-xl z-20">
                                                    {count} PRs
                                                </div>
                                            </motion.div>
                                        </div>
                                        <span className="text-neutral-400 text-xs font-medium mt-4">{months[i]}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Organizations Graph */}
                    <div className="glass-subtle p-8 rounded-3xl backdrop-blur-md hover:border-blue-500/20 transition-colors">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-bold flex items-center gap-2">
                                <Globe2 className="text-blue-500" /> Top Organizations
                            </h3>
                            <div className="flex items-center gap-2">
                                {loadingGraphs ? (
                                    <span className="text-xs text-neutral-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse inline-block" /> Fetching...
                                    </span>
                                ) : (
                                    <span className="text-xs text-green-500 flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" /> Live
                                    </span>
                                )}
                                <div className="text-sm text-neutral-400">PRs per Org</div>
                            </div>
                        </div>
                        {loadingGraphs ? (
                            <div className="flex items-end justify-between h-48 gap-2">
                                {[80, 60, 45, 30, 20].map((h, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full">
                                        <div className="w-full flex justify-center h-full items-end">
                                            <div
                                                className="w-full max-w-[3rem] bg-neutral-800 rounded-t-xl animate-pulse"
                                                style={{ height: `${h}%` }}
                                            />
                                        </div>
                                        <div className="w-10 h-2 bg-neutral-800 rounded animate-pulse mt-4" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex items-end justify-between h-48 gap-2">
                                {topOrgs.map(({ org, count }, i) => (
                                    <div key={i} className="flex flex-col items-center flex-1 h-full group">
                                        <div className="w-full relative flex justify-center h-full items-end">
                                            <motion.div
                                                initial={{ height: 0 }}
                                                animate={{ height: `${(count / maxOrgCount) * 100}%` }}
                                                transition={{ duration: 1, delay: i * 0.1, type: "spring" }}
                                                className="w-full max-w-[3rem] bg-gradient-to-t from-blue-600/20 to-blue-500/80 rounded-t-xl relative group-hover:from-blue-500/40 group-hover:to-blue-400 transition-colors cursor-pointer"
                                            >
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 rounded-lg text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-neutral-800 shadow-xl z-20">
                                                    {count} PRs
                                                </div>
                                            </motion.div>
                                        </div>
                                        <span className="text-neutral-400 text-xs font-medium mt-4 truncate w-full text-center" title={org}>{org}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Contribution matrix — real per-member, per-org PR counts from GSoC + ESoC records */}
                <div className="mb-24">
                    <div className="glass-subtle p-8 rounded-3xl backdrop-blur-md">
                        <div className="mb-6">
                            <h3 className="text-2xl font-bold flex items-center gap-2 mb-2">
                                <Globe2 className="text-cyan-400" /> Who Contributed Where
                            </h3>
                            <p className="text-sm text-neutral-500">
                                Real PR counts per member, per organization — from recorded GSoC and ESoC contributions. Not every contributor has org-level detail available yet.
                            </p>
                        </div>
                        <ContributionHeatmap />
                    </div>
                </div>

                {/* Podium */}
                <div className="mb-24 mt-16">
                    <h3 className="text-3xl font-bold mb-12 text-center flex items-center justify-center gap-3">
                        <Trophy className="text-yellow-500" /> Top Open Source Contributors
                    </h3>
                    <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-end">
                        {podiumData.map((user, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 50 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.2 }}
                                className={`flex flex-col items-center glass rounded-3xl p-8 backdrop-blur-md relative ${user.place === 1 ? 'md:-translate-y-8 z-10 shadow-2xl shadow-yellow-500/10 border-yellow-500/20' : ''}`}
                            >
                                <Medal className={`mb-4 ${user.color}`} size={32} />
                                <div className={`text-5xl font-black mb-6 ${user.color}`}>{user.place}</div>
                                
                                <div className={`w-32 h-32 rounded-full p-1 ring-4 ${user.ring} mb-6`}>
                                    <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                                </div>
                                
                                <h4 className="text-2xl font-bold text-white mb-1 text-center">{user.name}</h4>
                                <div className="text-cyan-400 font-medium mb-8">Member</div>
                                
                                <div className="w-full space-y-4">
                                    <div className="text-center">
                                        <div className="text-3xl font-bold text-white mb-1">{user.quality}</div>
                                        <div className="text-neutral-500 text-sm uppercase tracking-wider">Quality PRs</div>
                                    </div>
                                    <div className="w-full h-px bg-neutral-800" />
                                    <div className="text-center">
                                        <div className="text-2xl font-bold text-blue-400 mb-1">{user.merged}</div>
                                        <div className="text-neutral-500 text-sm uppercase tracking-wider">Total Merged</div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>



                </>)}

                {!isSecondYear && (
                    <div className="mb-16 glass-subtle rounded-3xl p-8 text-center backdrop-blur-md">
                        <p className="text-neutral-300">
                            The charts, contribution matrix and podium above cover the founding batch only.
                        </p>
                        <p className="mt-2 text-sm text-neutral-500">
                            They are built from GSSoC and ESoC records that do not exist for this year group yet.
                            The leaderboard below is real and counted from GitHub.
                        </p>
                    </div>
                )}

                {/* Hall of Fame List */}
                <div className="mb-16">
                    <h3 className="text-3xl font-bold text-white text-center mb-12">
                        Open Source <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400">Hall of Fame</span>
                    </h3>
                    
                    {loadingStats ? (
                        <div className="flex justify-center py-12">
                            <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {prStatsMembers.map((member, index) => (
                                <motion.div
                                    key={member.github}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: index * 0.1 }}
                                    whileHover={{ y: -10 }}
                                    className="group"
                                >
                                    <div className="relative glass rounded-2xl p-6 overflow-hidden hover:border-cyan-400/50 transition-all duration-300 h-full">
                                        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                        <div className="relative">
                                            {/* Profile */}
                                            <div className="flex items-center gap-4 mb-6">
                                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-400/30">
                                                    <img src={member.avatar} alt={member.name} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-xl font-bold text-white">{member.name}</h3>
                                                    <p className="text-sm text-cyan-400">{member.role}</p>
                                                </div>
                                            </div>

                                            {/* PR Count */}
                                            <div className="space-y-3 mb-6">
                                                <div className="text-center py-4 bg-gradient-to-br from-cyan-400/10 to-purple-500/10 rounded-xl border border-cyan-400/50">
                                                    <div className="text-4xl font-bold text-cyan-400 mb-1">{member.prCount}</div>
                                                    <p className="text-neutral-400 text-sm">Quality PRs</p>
                                                </div>
                                                <div className="text-center py-3 bg-neutral-800/30 rounded-xl border border-neutral-700">
                                                    <div className="text-2xl font-semibold text-blue-400 mb-1">{member.totalPRs}</div>
                                                    <p className="text-neutral-500 text-xs">Total Merged</p>
                                                </div>
                                            </div>

                                            {/* Milestones */}
                                            <div className="mb-6">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <Award className="w-4 h-4 text-cyan-400" />
                                                    <h4 className="text-sm font-semibold text-neutral-300">Achievements</h4>
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {member.milestones.map((milestone) => (
                                                        <div
                                                            key={milestone.name}
                                                            className={`${milestone.count === 15
                                                                ? 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-blue-500/50 ring-2 ring-blue-500/30'
                                                                : milestone.count === 25
                                                                    ? 'bg-gradient-to-r from-cyan-400/20 to-purple-500/20 border-cyan-400/50 ring-2 ring-cyan-400/30'
                                                                    : 'bg-neutral-800/50 border-cyan-400/30'
                                                                } border rounded-lg px-3 py-1 text-xs`}
                                                        >
                                                            <span className="mr-1">{milestone.emoji}</span>
                                                            <span className={
                                                                milestone.count === 15
                                                                    ? 'text-blue-400 font-semibold'
                                                                    : milestone.count === 25
                                                                        ? 'text-cyan-300 font-semibold'
                                                                        : 'text-neutral-400'
                                                            }>
                                                                {milestone.name}
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {member.github === 'geetxnshgoyal' && (
                                                        <a
                                                            href="https://summerofcode.withgoogle.com/programs/2026/projects/yJH1saNZ"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="bg-gradient-to-r from-cyan-400/20 to-cyan-500/20 border border-cyan-400/50 ring-2 ring-cyan-400/30 rounded-lg px-3 py-1 text-xs inline-flex items-center gap-1.5 hover:from-cyan-400/30 hover:to-cyan-500/30 transition-all duration-200"
                                                        >
                                                            <span>☀️</span>
                                                            <span className="text-cyan-300 font-semibold">GSoC&apos;26</span>
                                                            <ExternalLink className="w-3 h-3 text-cyan-300" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Next Milestone */}
                                            {member.nextMilestone && (
                                                <div className="mb-6">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs text-neutral-400">
                                                            Next: {member.nextMilestone.emoji} {member.nextMilestone.name}
                                                        </span>
                                                        <span className="text-xs text-cyan-400 font-semibold">
                                                            {member.prCount} / {member.nextMilestone.count}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-500"
                                                            style={{ width: `${member.nextMilestone.progress}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* GitHub Link */}
                                            <a
                                                href={`https://github.com/${member.github}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2 bg-neutral-800/50 hover:bg-neutral-800 border border-neutral-700 hover:border-cyan-400/50 rounded-lg transition-all duration-200 text-neutral-400 hover:text-cyan-400"
                                            >
                                                <Github className="w-4 h-4" />
                                                <span className="text-sm">View Profile</span>
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
