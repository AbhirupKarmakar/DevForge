"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Inbox, RefreshCw, Undo2 } from "lucide-react";
import { milestones } from "@/data/pr-workbook";
import type { JourneyEntry } from "@/lib/pr-journey";

interface PendingRow {
    /** Journey record id — a GitHub account, not a club USN. */
    id: string;
    name: string;
    github: string;
    avatar: string;
    entry: JourneyEntry;
}

export function JourneyQueue() {
    const [rows, setRows] = useState<PendingRow[] | null>(null);
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/pr-journey/review")
            .then((r) => r.json())
            .then((data) => setRows(data.pending ?? []))
            .catch(() => setRows([]));
    }, []);

    async function decide(row: PendingRow, decision: "sign-off" | "changes-requested") {
        const key = `${row.id}:${row.entry.n}`;
        setBusy(key);
        setError(null);
        try {
            const response = await fetch("/api/pr-journey/review", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: row.id, n: row.entry.n, decision, note: notes[key] }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message ?? "That did not go through.");
                return;
            }
            setRows((prev) => prev?.filter((r) => `${r.id}:${r.entry.n}` !== key) ?? null);
        } finally {
            setBusy(null);
        }
    }

    /** Confirms the PR is still where the student said it was, at the moment of sign-off. */
    async function recheck(row: PendingRow) {
        const key = `${row.id}:${row.entry.n}`;
        setBusy(key);
        try {
            const response = await fetch(`/api/pr-journey/${row.entry.n}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: row.id }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.message ?? "Could not re-check that link.");
                return;
            }
            setRows((prev) => prev?.map((r) => (`${r.id}:${r.entry.n}` === key ? { ...r, entry: data.entry } : r)) ?? null);
        } finally {
            setBusy(null);
        }
    }

    if (rows === null) return <p className="text-neutral-500 text-sm">Loading the queue…</p>;

    if (rows.length === 0) {
        return (
            <div className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-8 text-center">
                <Inbox size={28} className="text-neutral-700 mx-auto mb-3" />
                <p className="text-neutral-400">Nothing waiting. The queue is empty.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {error && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/25 rounded-xl px-3 py-2">
                    {error}
                </p>
            )}

            {rows.map((row) => {
                const key = `${row.id}:${row.entry.n}`;
                const spec = milestones.find((m) => m.n === row.entry.n);
                const { evidence, reflection } = row.entry;

                return (
                    <div key={key} className="bg-neutral-900/40 border border-neutral-800 rounded-2xl p-5">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={row.avatar} alt="" width={22} height={22} className="rounded-full border border-neutral-700" />
                            <span className="font-semibold text-white">{row.name}</span>
                            <a
                                href={`https://github.com/${row.github}`}
                                target="_blank"
                                rel="noreferrer"
                                className="font-mono text-xs text-neutral-500 hover:text-cyan-300"
                            >
                                @{row.github}
                            </a>
                            <span className="font-mono text-xs text-neutral-500">
                                PR {String(row.entry.n).padStart(2, "0")} · {spec?.title}
                            </span>
                        </div>

                        <a
                            href={evidence.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-mono text-cyan-300 hover:underline mb-1"
                        >
                            {evidence.repo}#{evidence.number} <ExternalLink size={12} />
                        </a>
                        <p className="text-sm text-neutral-400 mb-1">{evidence.title}</p>
                        <p className="text-xs font-mono text-neutral-600 mb-4">
                            @{evidence.author} · {evidence.state} · {evidence.reviewRounds} review rounds ·{" "}
                            {reflection.hours}h · {reflection.rounds} rounds reported · checked{" "}
                            {new Date(evidence.verifiedAt).toLocaleString()}
                        </p>

                        <div className="space-y-3 mb-4">
                            <Quote label="What I tried" body={reflection.tried} />
                            <Quote label="What broke" body={reflection.broke} />
                            <Quote label="What the reviewer said" body={reflection.reviewerSaid} />
                            <Quote label="What I would do differently" body={reflection.differently} />
                        </div>

                        <textarea
                            value={notes[key] ?? ""}
                            onChange={(e) => setNotes((prev) => ({ ...prev, [key]: e.target.value }))}
                            rows={2}
                            placeholder="A note — required if you are sending it back"
                            className="w-full bg-neutral-950 border border-neutral-800 focus:border-cyan-400/50 rounded-xl px-3 py-2 text-sm text-white placeholder:text-neutral-600 outline-none transition-colors mb-3"
                        />

                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => decide(row, "sign-off")}
                                disabled={busy === key}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-300 bg-cyan-400/10 border border-cyan-400/25 hover:border-cyan-400/60 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
                            >
                                <CheckCircle2 size={15} /> Sign off
                            </button>
                            <button
                                onClick={() => recheck(row)}
                                disabled={busy === key}
                                className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-cyan-300 disabled:opacity-50 border border-neutral-800 hover:border-neutral-700 rounded-xl px-4 py-2 transition-colors"
                            >
                                <RefreshCw size={15} /> Re-check
                            </button>
                            <button
                                onClick={() => decide(row, "changes-requested")}
                                disabled={busy === key}
                                className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/25 hover:border-amber-500/60 disabled:opacity-50 rounded-xl px-4 py-2 transition-colors"
                            >
                                <Undo2 size={15} /> Send back
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function Quote({ label, body }: { label: string; body: string }) {
    return (
        <div>
            <div className="text-[11px] uppercase tracking-wider text-neutral-600 mb-1">{label}</div>
            <p className="text-sm text-neutral-300 leading-relaxed border-l-2 border-neutral-800 pl-3 whitespace-pre-wrap">
                {body}
            </p>
        </div>
    );
}
