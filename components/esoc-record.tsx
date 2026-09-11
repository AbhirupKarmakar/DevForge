"use client";

import { motion } from "framer-motion";
import { Globe2, GitBranch, GitMerge, Users, Activity, ExternalLink } from "lucide-react";
import prData from "@/pr-data-report.json";
import esocStats from "@/data/esoc-stats.json";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CohortUnavailable, YearSwitcher } from "@/components/ui/year-switcher";
import { cohortFromParam } from "@/lib/cohorts";

export function EsocRecord() {
    const searchParams = useSearchParams();
    const cohort = cohortFromParam(searchParams.get("year"));

    // ESoC 2026 was run by the founding batch. There is no first-year round to
    // show, and a page of zeroes would read as "they contributed nothing"
    // rather than "they were not in this programme".
    if (cohort.id !== "second-year") {
        return (
            <CohortUnavailable
                title="ESoC 2026"
                reason={`ESoC 2026 ran with the founding batch. No ${cohort.label} students took part, so there is nothing to show here yet.`}
            />
        );
    }

    // Map ESoC stats to member profiles and filter by ESoC-only contributions
    const members = esocStats.members.map((esocM: any) => {
        const prM = prData.members.find(m => m.github.toLowerCase() === esocM.github.toLowerCase());
        return {
            name: prM?.name || esocM.name,
            github: esocM.github,
            avatar: prM?.avatar || `https://github.com/${esocM.github}.png`,
            esocPRs: esocM.esocPRs
        };
    })
    .filter(m => m.esocPRs.merged > 0 || m.esocPRs.open > 0) // Only show active ESoC contributors
    .sort((a, b) => b.esocPRs.merged - a.esocPRs.merged);

    const totalContributors = members.length;
    const totalMergedPRs = members.reduce((sum, member) => sum + member.esocPRs.merged, 0);
    const totalOpenPRs = members.reduce((sum, member) => sum + member.esocPRs.open, 0);

    return (
        <div className="min-h-screen pt-24 pb-16 relative">
            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 text-blue-500 rounded-full mb-8 border border-blue-500/20 shadow-xl shadow-blue-500/10">
                        <Globe2 size={32} />
                    </div>
                    <div className="mb-8 flex justify-center"><YearSwitcher /></div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-600">ESoC</span> 2026
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-3xl mx-auto">
                        European Summer of Code Participants and Global Contributions.
                    </p>
                </motion.div>

                {/* Top Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16 max-w-3xl mx-auto">
                    {[
                        { title: "Total Contributors", value: totalContributors, icon: <Users className="text-blue-500" /> },
                        { title: "Merged PRs", value: totalMergedPRs, icon: <GitMerge className="text-purple-500" /> },
                        { title: "Open PRs", value: totalOpenPRs, icon: <GitBranch className="text-green-500" /> }
                    ].map((metric, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            whileHover={{ scale: 1.05, y: -5 }}
                            transition={{ delay: i * 0.1 }}
                            className="glass border border-blue-900/30 p-6 rounded-3xl text-center shadow-lg hover:border-blue-500/30 transition-colors"
                        >
                            <div className="flex justify-center mb-4">{metric.icon}</div>
                            <div className="text-4xl font-bold text-white mb-2">{metric.value}</div>
                            <div className="text-neutral-500 font-medium uppercase tracking-wider text-xs">{metric.title}</div>
                        </motion.div>
                    ))}
                </div>

                {/* All Members Grid */}
                <div>
                    <h3 className="text-3xl font-bold text-white text-center mb-12 flex justify-center items-center gap-3">
                        <Activity className="text-blue-500" /> Member Contributions
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {members.map((member, i) => (
                            <motion.div
                                key={member.github}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ scale: 1.02 }}
                                className="glass border border-blue-900/20 p-6 rounded-3xl hover:border-blue-500/50 transition-all group relative overflow-hidden flex flex-col"
                            >
                                <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors" />
                                
                                <div className="flex items-center gap-4 mb-6 relative z-10">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-neutral-800 group-hover:border-blue-500 transition-colors">
                                        <img 
                                            src={member.avatar || `https://github.com/${member.github}.png`} 
                                            alt={member.name} 
                                            className="w-full h-full object-cover" 
                                        />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white leading-tight">{member.name}</h4>
                                        <a href={`https://github.com/${member.github}`} target="_blank" rel="noreferrer" className="text-neutral-500 text-sm hover:text-blue-400 transition-colors flex items-center gap-1">
                                            @{member.github} <ExternalLink size={12} />
                                        </a>
                                    </div>
                                </div>

                                <div className="mt-auto space-y-3 relative z-10">
                                    <div className="bg-black/50 border border-neutral-800 rounded-xl p-3 flex justify-between items-center group-hover:border-blue-900/50 transition-colors">
                                        <span className="text-neutral-400 text-sm flex items-center gap-2">
                                            <GitMerge size={16} className="text-purple-500" /> ESoC Merged
                                        </span>
                                        <span className="font-bold text-white text-lg">{member.esocPRs.merged}</span>
                                    </div>
                                    <div className="bg-black/50 border border-neutral-800 rounded-xl p-3 flex justify-between items-center group-hover:border-blue-900/50 transition-colors">
                                        <span className="text-neutral-400 text-sm flex items-center gap-2">
                                            <GitBranch size={16} className="text-green-500" /> ESoC Open
                                        </span>
                                        <span className="font-bold text-white text-lg">{member.esocPRs.open}</span>
                                    </div>
                                    
                                    {member.esocPRs.orgs && member.esocPRs.orgs.length > 0 && (
                                        <div className="pt-2 border-t border-neutral-800/50">
                                            <div className="text-xs text-neutral-500 mb-2 uppercase tracking-wider font-semibold">Organizations</div>
                                            <div className="flex flex-wrap gap-2">
                                                {member.esocPRs.orgs.map((org: any, idx: number) => (
                                                    <div key={idx} className="bg-blue-900/20 border border-blue-500/20 rounded-md px-2 py-1 flex items-center gap-1">
                                                        <span className="text-blue-400 text-xs font-medium">{org.name}</span>
                                                        <span className="text-neutral-400 text-[10px] ml-1">
                                                            {org.merged > 0 && <span className="text-purple-500" title="Merged">{org.merged} merged</span>}
                                                            {org.merged > 0 && org.open > 0 && <span> </span>}
                                                            {org.open > 0 && <span className="text-green-500" title="Open">{org.open} open</span>}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
