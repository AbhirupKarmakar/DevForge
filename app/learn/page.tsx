"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, ExternalLink, CheckCircle2, Circle, Presentation, Flag, Sun, ArrowUpRight, GitPullRequest } from "lucide-react";
import { learningTracks } from "@/data/learning-tracks";
import { starterRepos } from "@/data/open-source-starters";
import { useLearnProgress } from "@/lib/use-learn-progress";

const KIND_LABELS: Record<string, string> = {
    practice: "Practice ground",
    repo: "Active repo",
    guide: "Guide",
    discovery: "Discovery",
};

const LEVEL_STYLES: Record<string, string> = {
    Beginner: "bg-green-500/10 text-green-400 border-green-500/20",
    Intermediate: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Advanced: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function LearnPage() {
    const [activeSlug, setActiveSlug] = useState(learningTracks[0].slug);
    const { done, toggle, hydrated } = useLearnProgress();
    const activeTrack = learningTracks.find((t) => t.slug === activeSlug)!;

    const totalNodes = activeTrack.modules.reduce((acc, m) => acc + m.nodes.length, 0);
    const completedNodes = activeTrack.modules
        .flatMap((m) => m.nodes)
        .filter((n) => done.has(`${activeTrack.slug}::${n.title}`)).length;

    return (
        <div className="min-h-screen bg-transparent text-white pt-24 pb-16">
            <div className="max-w-5xl mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-16"
                >
                    <div className="inline-flex items-center justify-center p-4 bg-blue-500/10 text-blue-500 rounded-full mb-8 border border-blue-500/20">
                        <BookOpen size={32} />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                        Learning <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Tracks</span>
                    </h1>
                    <p className="text-xl text-neutral-400 max-w-2xl mx-auto">
                        Where our own workshops sit alongside the resources we&apos;d point you to anyway.
                    </p>
                </motion.div>

                {/* GSoC Playbook banner */}
                <Link
                    href="/learn/gsoc"
                    className="flex items-center gap-4 bg-gradient-to-r from-cyan-400/15 to-transparent border border-cyan-400/30 hover:border-cyan-400/60 rounded-2xl p-5 mb-4 transition-colors group"
                >
                    <div className="w-12 h-12 rounded-xl bg-cyan-400/15 flex items-center justify-center flex-shrink-0">
                        <Sun className="text-cyan-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">The GSoC Playbook</div>
                        <div className="text-sm text-neutral-400">Timeline, tools, copy-paste prompts, and the 5-step formula — from students who got selected.</div>
                    </div>
                    <ArrowUpRight className="text-neutral-500 group-hover:text-cyan-400 transition-colors flex-shrink-0" size={20} />
                </Link>

                {/* 10 PR Journey banner */}
                <Link
                    href="/learn/open-source"
                    className="flex items-center gap-4 bg-gradient-to-r from-blue-500/15 to-transparent border border-blue-500/30 hover:border-blue-500/60 rounded-2xl p-5 mb-12 transition-colors group"
                >
                    <div className="w-12 h-12 rounded-xl bg-blue-500/15 flex items-center justify-center flex-shrink-0">
                        <GitPullRequest className="text-blue-400" size={24} />
                    </div>
                    <div className="flex-1">
                        <div className="font-bold text-white group-hover:text-blue-300 transition-colors">The 10 PR Journey</div>
                        <div className="text-sm text-neutral-400">Ten pull requests, in order — from one we review ourselves to one a real project keeps.</div>
                    </div>
                    <ArrowUpRight className="text-neutral-500 group-hover:text-blue-400 transition-colors flex-shrink-0" size={20} />
                </Link>

                {/* Track picker */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
                    {learningTracks.map((track) => {
                        const isActive = track.slug === activeSlug;
                        return (
                            <button
                                key={track.slug}
                                onClick={() => setActiveSlug(track.slug)}
                                className={`text-left p-5 rounded-2xl border transition-colors ${
                                    isActive
                                        ? "bg-neutral-900 border-blue-500/50"
                                        : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-lg font-bold text-white">{track.title}</h3>
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${LEVEL_STYLES[track.level]}`}>
                                        {track.level}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-500">{track.description}</p>
                            </button>
                        );
                    })}
                </div>

                {/* Active track */}
                <motion.div
                    key={activeTrack.slug}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-10"
                >
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-white">{activeTrack.title}</h2>
                        {hydrated && (
                            <span className="text-sm text-neutral-500 font-mono tabular-nums">
                                {completedNodes} / {totalNodes} complete
                            </span>
                        )}
                    </div>

                    {activeTrack.modules.map((module) => (
                        <div key={module.title}>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-neutral-500 mb-4">{module.title}</h3>
                            <div className="space-y-2">
                                {module.nodes.map((node) => {
                                    const nodeId = `${activeTrack.slug}::${node.title}`;
                                    const isDone = done.has(nodeId);

                                    if (node.type === "milestone") {
                                        return (
                                            <div
                                                key={node.title}
                                                className="flex items-center gap-3 p-4 rounded-xl bg-cyan-400/10 border border-cyan-400/20 text-cyan-200"
                                            >
                                                <Flag size={18} />
                                                <span className="font-semibold">{node.title}</span>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div
                                            key={node.title}
                                            className="flex items-start gap-3 p-4 rounded-xl glass hover:border-neutral-700 transition-colors"
                                        >
                                            <button
                                                onClick={() => toggle(nodeId)}
                                                className="mt-0.5 text-neutral-600 hover:text-cyan-400 transition-colors flex-shrink-0"
                                                aria-label={isDone ? "Mark incomplete" : "Mark complete"}
                                            >
                                                {isDone ? <CheckCircle2 className="text-cyan-400" size={20} /> : <Circle size={20} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className={`font-medium ${isDone ? "text-neutral-500 line-through" : "text-white"}`}>
                                                        {node.title}
                                                    </span>
                                                    {node.type === "lecture" && (
                                                        <span className="inline-flex items-center gap-1 text-xs text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
                                                            <Presentation size={11} /> Club lecture
                                                        </span>
                                                    )}
                                                </div>
                                                {node.presenter && (
                                                    <p className="text-xs text-neutral-500 mt-0.5">Led by {node.presenter}</p>
                                                )}
                                                {node.description && (
                                                    <p className="text-sm text-neutral-400 mt-1">{node.description}</p>
                                                )}
                                            </div>
                                            {node.url && (
                                                <a
                                                    href={node.url}
                                                    target={node.url.startsWith("http") ? "_blank" : undefined}
                                                    rel={node.url.startsWith("http") ? "noopener noreferrer" : undefined}
                                                    className="flex-shrink-0 text-neutral-500 hover:text-cyan-400 transition-colors"
                                                    aria-label={`Open resource: ${node.title}`}
                                                >
                                                    <ExternalLink size={16} />
                                                </a>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </motion.div>

                {/* Real starter repos */}
                <section id="starter-repos" className="mt-20 scroll-mt-28">
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-2">
                            <GitPullRequest size={22} className="text-cyan-400" /> Your first PRs — real, active repos
                        </h2>
                        <p className="text-neutral-400 max-w-2xl">
                            Not toy projects. Pick one, set it up locally (expect it to take a few days — that struggle is the lesson), then take a labeled beginner issue.
                        </p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        {starterRepos.map((repo) => (
                            <a
                                key={repo.url}
                                href={repo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block glass hover:border-cyan-400/40 rounded-2xl p-5 transition-colors group"
                            >
                                <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="font-bold text-white group-hover:text-cyan-300 transition-colors">{repo.name}</span>
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500 bg-white/5 border border-white/10 rounded-full px-2 py-0.5 flex-shrink-0">
                                        {KIND_LABELS[repo.kind]}
                                    </span>
                                </div>
                                <p className="text-sm text-neutral-400 leading-relaxed">{repo.why}</p>
                            </a>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
