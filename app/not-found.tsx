import Link from "next/link";
import { ArrowLeft, Compass } from "lucide-react";

export const metadata = { title: "Page not found" };

export default function NotFound() {
    return (
        <main className="min-h-screen bg-transparent text-white px-4 pt-32 pb-16">
            <div className="max-w-md mx-auto text-center">
                <div className="inline-flex items-center justify-center p-4 bg-cyan-400/10 text-cyan-400 rounded-full mb-6 border border-cyan-400/20">
                    <Compass size={28} />
                </div>
                <h1 className="text-4xl font-bold mb-3 tracking-tight">
                    Page <span className="text-cyan-400">not found</span>
                </h1>
                <p className="text-neutral-400 mb-8">
                    The page you&rsquo;re looking for doesn&rsquo;t exist or may have moved.
                </p>
                <nav className="flex flex-wrap items-center justify-center gap-3" aria-label="Helpful links">
                    <Link
                        href="/"
                        className="inline-flex items-center gap-2 rounded-md border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-medium text-cyan-300 transition-colors hover:bg-cyan-400/20"
                    >
                        <ArrowLeft size={16} />
                        Home
                    </Link>
                    <Link
                        href="/learn"
                        className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-cyan-400/30 hover:text-cyan-300"
                    >
                        Learn
                    </Link>
                    <Link
                        href="/events"
                        className="rounded-md border border-white/10 px-4 py-2 text-sm font-medium text-neutral-300 transition-colors hover:border-cyan-400/30 hover:text-cyan-300"
                    >
                        Events
                    </Link>
                </nav>
            </div>
        </main>
    );
}