import { Suspense } from "react";
import { PRStats } from "@/components/pr-stats";

export const metadata = {
    title: "PR Statistics | DevForge",
    description: "Track merged pull requests and achievements of DevForge club members",
};

export default function PRStatsPage() {
    return (
        <div className="bg-transparent text-white selection:bg-cyan-400 selection:text-black">
            {/* The year lives in the query string, and reading it needs a boundary
                so the rest of the page can still be prerendered. */}
            <Suspense fallback={null}>
                <PRStats />
            </Suspense>
        </div>
    );
}
