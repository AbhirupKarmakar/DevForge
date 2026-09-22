"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Trophy, Star, ExternalLink, Globe, Loader2, GitMerge, GitPullRequest, RefreshCw } from "lucide-react";
import gssocSnapshot from "@/data/gssoc-snapshot.json";
import { useSearchParams } from "next/navigation";
import { CohortUnavailable, YearSwitcher } from "@/components/ui/year-switcher";
import { cohortFromParam } from "@/lib/cohorts";

const MEMBERS = [
    { name: "Nishtha Agarwal",   id: "fee316f8-c062-41ac-a554-14b82a81fff0", github: "nishtha-agarwal-211" },
    { name: "Unnati Jaiswal",    id: "5459dca0-e005-4eb4-a490-043675e73368", github: "unnati-jaiswal24" },
    { name: "Dhruv Mehta",       id: "",                                       github: "dhhhhruv" },
    { name: "Mahaveer Jain",     id: "d3079ef9-79e4-4887-82eb-e19c6af2fc67", github: "Mahaveerjain-18" },
    { name: "Lay Shah",          id: "06b49d9c-675c-4561-a811-47377baadf15", github: "Layyzyyy" },
    { name: "Sahitya Singh",     id: "05ba7e81-1388-4c3b-9711-6815a70fa5be", github: "sahitya0xsingh" },
    { name: "Rachana Adhikary",  id: "b7e82800-0328-4d3b-a0b4-ad0304422f35", github: "adhikaryrachana00428-hash" },
    { name: "Shreya Agrawal",    id: "43062cc4-7298-4ece-911e-3763d51f7ec3", github: "Shreyaagrawal29" },
    { name: "Ravi Sharma",       id: "",                                       github: "ravisharma-09" },
    { name: "Navya Krushi",      id: "dfb5b428-3bb1-436b-b85d-279ec7c5ba7d", github: "2102508725-hash" },
    { name: "Vikas Sharma",      id: "f6b54245-97ff-40b1-9111-ceca0afaf551", github: "sharmavikas18" },
    { name: "Anushka Gupta",     id: "aece9a98-45a0-405f-a57d-8bbfd882890a", github: "anushkag6393" },
    { name: "Abhinav",           id: "",                                       github: "Abhi-lab645" },
    { name: "Shivansh Goel",     id: "88544453-fc84-4c5f-a6b6-98890980e7ae", github: "SHIVANSH-ux-ys" },
];

// Build a lookup map from snapshot JSON
const snapshotMap = Object.fromEntries(
    gssocSnapshot.members.map(m => [m.github.toLowerCase(), m])
);

interface LiveData {
    rank?: number;
    score?: number;
    merged: number;
    open: number;
    loading: boolean;
}

function getRankBadge(rank?: number) {
    if (!rank) return "Contributor";
    if (rank <= 100) return "Top 100";
    if (rank <= 500) return "Top 500";
    if (rank <= 15000) return "Top 15k";
    return "Contributor";
}

function MemberCard({ member, liveData }: { member: typeof MEMBERS[0]; liveData: LiveData }) {
    const badge = getRankBadge(liveData.rank);
    const badgeColor =
        badge === "Top 100" ? "text-cyan-300 bg-cyan-400/10 border-cyan-400/30" :
        badge === "Top 500" ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
        badge === "Top 15k" ? "text-blue-400 bg-blue-500/10 border-blue-500/30" :
        "text-neutral-400 bg-neutral-800 border-neutral-700";

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-subtle rounded-3xl p-6 hover:border-cyan-400/50 transition-all duration-300 group backdrop-blur-sm relative overflow-hidden flex flex-col"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-400/5 rounded-bl-full -z-10 group-hover:bg-cyan-400/10 transition-colors" />

            {/* Header */}
            <div className="flex justify-between items-start mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-neutral-800 group-hover:border-cyan-400 transition-colors flex-shrink-0">
                        <img
                            src={`https://github.com/${member.github}.png`}
                            alt={member.name}
                            className="w-full h-full object-cover bg-neutral-800"
                        />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white leading-tight">{member.name}</h3>
                        <a
                            href={`https://github.com/${member.github}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-neutral-500 hover:text-white transition-colors flex items-center gap-1 text-xs mt-0.5"
                        >
                            @{member.github} <ExternalLink size={10} />
                        </a>
                    </div>
                </div>
                <div className="flex flex-col gap-1.5 items-end shrink-0">
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1 ${badgeColor}`}>
                        <Star size={10} fill="currentColor" /> {badge}
                    </div>
                    {liveData.rank && (
                        <div className="bg-neutral-900 text-neutral-300 px-2.5 py-1 rounded-full text-xs font-bold border border-neutral-700 flex items-center gap-1">
                            <Globe size={10} /> #{liveData.rank.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Score */}
            <div className="mb-4 p-3 rounded-2xl bg-black/50 border border-neutral-800/50 group-hover:border-cyan-400/20 transition-colors text-center">
                <div className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-1">GSSoC Score</div>
                {liveData.score !== undefined ? (
                    <div className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-violet-400">
                        {liveData.score.toLocaleString()}
                    </div>
                ) : (
                    <div className="text-2xl font-bold text-neutral-600">—</div>
                )}
            </div>

            {/* PR Stats - Live from GitHub */}
            <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-transparent/50 p-3 rounded-2xl text-center border border-neutral-800/50 group-hover:border-purple-500/30 transition-colors">
                    <GitMerge className="mx-auto text-purple-400 mb-1" size={16} />
                    <div className="text-xl font-bold text-white">
                        {liveData.loading ? <Loader2 size={14} className="animate-spin mx-auto text-neutral-600" /> : liveData.merged}
                    </div>
                    <div className="text-xs text-neutral-500">Merged PRs</div>
                </div>
                <div className="bg-transparent/50 p-3 rounded-2xl text-center border border-neutral-800/50 group-hover:border-green-500/30 transition-colors">
                    <GitPullRequest className="mx-auto text-green-400 mb-1" size={16} />
                    <div className="text-xl font-bold text-white">
                        {liveData.loading ? <Loader2 size={14} className="animate-spin mx-auto text-neutral-600" /> : liveData.open}
                    </div>
                    <div className="text-xs text-neutral-500">Open PRs</div>
                </div>
            </div>

            {/* Profile CTA */}
            <div className="mt-auto">
                {member.id ? (
                    <a
                        href={`https://gssoc.girlscript.tech/profile/${member.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-2.5 bg-neutral-800/50 hover:bg-cyan-400 hover:text-black text-center rounded-xl font-bold transition-colors duration-300 border border-neutral-700 hover:border-cyan-400 text-sm"
                    >
                        View GSSoC Profile →
                    </a>
                ) : (
                    <a
                        href={`https://github.com/${member.github}`}
                        target="_blank"
                        rel="noreferrer"
                        className="block w-full py-2.5 bg-neutral-800/50 hover:bg-neutral-700 text-center rounded-xl font-bold transition-colors duration-300 border border-neutral-700 text-sm"
                    >
                        View GitHub →
                    </a>
                )}
            </div>
        </motion.div>
    );
}

export function GSSoCHallOfFame() {
    const searchParams = useSearchParams();
    const cohort = cohortFromParam(searchParams.get("year"));

    const [searchTerm, setSearchTerm] = useState("");
    const [filterRank, setFilterRank] = useState("All");
    const [ghData, setGhData] = useState<Record<string, { merged: number; open: number; loading: boolean }>>(() =>
        Object.fromEntries(MEMBERS.map(m => [m.github, { merged: 0, open: 0, loading: true }]))
    );

    useEffect(() => {
        MEMBERS.forEach(async (member) => {
            try {
                const res = await fetch(`/api/github-stats?username=${member.github}`);
                const data = res.ok ? await res.json() : { merged: 0, open: 0 };
                setGhData(prev => ({
                    ...prev,
                    [member.github]: { merged: data.merged, open: data.open, loading: false }
                }));
            } catch {
                setGhData(prev => ({
                    ...prev,
                    [member.github]: { merged: 0, open: 0, loading: false }
                }));
            }
        });
    }, []);

    // Merge snapshot data (rank/score) with live GitHub data
    const members = MEMBERS.map(m => {
        const snap = snapshotMap[m.github.toLowerCase()];
        const gh = ghData[m.github];
        return {
            ...m,
            rank: snap?.rank,
            score: snap?.score,
            merged: gh?.merged ?? 0,
            open: gh?.open ?? 0,
            loading: gh?.loading ?? true,
        };
    }).sort((a, b) => {
        if (a.rank && b.rank) return a.rank - b.rank;
        if (a.rank) return -1;
        if (b.rank) return 1;
        return 0;
    });

    const filteredMembers = members.filter(m => {
        const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.github.toLowerCase().includes(searchTerm.toLowerCase());
        const badge = getRankBadge(m.rank);
        const matchesRank = filterRank === "All" || badge === filterRank;
        return matchesSearch && matchesRank;
    });

    const loadedCount = Object.values(ghData).filter(d => !d.loading).length;
    const totalMerged = Object.values(ghData).reduce((a, d) => a + d.merged, 0);

    // The roster of GSSoC participants above is the founding batch's. Returned
    // after the hooks, never before, so the hook order cannot change between
    // renders when somebody switches year.
    if (cohort.id !== "second-year") {
        return (
            <CohortUnavailable
                title="GSSoC Hall of Fame"
                reason={`This leaderboard covers the founding batch's GSSoC round. No ${cohort.label} students are registered for it yet.`}
            />
        );
    }

    return (
        <div className="min-h-screen bg-transparent text-white selection:bg-cyan-400 selection:text-black pt-24 pb-16 relative">
            <div className="max-w-7xl mx-auto px-4 relative z-10">

                {/* Header */}
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
                    <div className="inline-flex items-center justify-center p-3 bg-yellow-500/20 text-yellow-500 rounded-2xl mb-6">
                        <Trophy size={40} />
                    </div>
                    <div className="mb-8 flex justify-center"><YearSwitcher /></div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        GSSoC <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-cyan-400">Hall of Fame</span>
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto mb-6">
                        GSSoC ranks &amp; scores from the official leaderboard. GitHub PR stats fetched live.
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
                        <div className="flex items-center gap-2 glass-subtle px-4 py-2 rounded-full">
                            <div className={`w-2 h-2 rounded-full ${loadedCount === MEMBERS.length ? 'bg-green-500' : 'bg-cyan-400 animate-pulse'}`} />
                            <span className="text-neutral-400">{loadedCount}/{MEMBERS.length} GitHub profiles loaded</span>
                        </div>
                        <div className="flex items-center gap-2 glass-subtle px-4 py-2 rounded-full">
                            <GitMerge size={14} className="text-purple-400" />
                            <span className="text-neutral-400">{totalMerged} total merged PRs</span>
                        </div>
                        <a
                            href="https://gssoc.girlscript.tech/leaderboard"
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 bg-cyan-400/10 border border-cyan-400/30 text-cyan-300 px-4 py-2 rounded-full hover:bg-cyan-400/20 transition-colors"
                        >
                            <RefreshCw size={14} /> View GSSoC Leaderboard
                        </a>
                    </div>

                    {/* Snapshot info */}
                    <p className="text-xs text-neutral-600 mt-4">
                        GSSoC scores last synced: {gssocSnapshot.lastUpdated} · <a href="https://gssoc.girlscript.tech/leaderboard" target="_blank" rel="noreferrer" className="text-cyan-500 hover:text-cyan-300 underline">Update from leaderboard</a>
                    </p>
                </motion.div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-12 items-center justify-between glass p-4 rounded-2xl">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                        <input
                            type="text"
                            placeholder="Search by name or GitHub handle…"
                            className="w-full bg-black border border-neutral-800 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-cyan-400 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Filter className="text-neutral-500 shrink-0" size={20} />
                        <select
                            className="bg-transparent border border-neutral-800 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-cyan-400 appearance-none w-full md:w-48"
                            value={filterRank}
                            onChange={(e) => setFilterRank(e.target.value)}
                        >
                            <option value="All">All Ranks</option>
                            <option value="Top 100">Top 100</option>
                            <option value="Top 500">Top 500</option>
                            <option value="Top 15k">Top 15k</option>
                            <option value="Contributor">Contributor</option>
                        </select>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMembers.map((member) => (
                        <MemberCard
                            key={member.github}
                            member={member}
                            liveData={{
                                rank: member.rank,
                                score: member.score,
                                merged: member.merged,
                                open: member.open,
                                loading: member.loading,
                            }}
                        />
                    ))}
                </div>

                {filteredMembers.length === 0 && (
                    <div className="text-center py-20">
                        <p className="text-neutral-500 text-xl">No contributors found matching your criteria.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
