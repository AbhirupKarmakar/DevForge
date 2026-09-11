import { Suspense } from "react";
import { GsocStats } from "@/components/gsoc-stats";

export const metadata = {
    title: "GSoC Ready | DevForge",
    description: "PR bifurcation for Google Summer of Code - tracking merged, open, and closed PRs to GSoC eligible organizations",
};

export default function GsocPage() {
    return (
        <div className="bg-transparent text-white selection:bg-cyan-400 selection:text-black">
            {/* The year lives in the query string; reading it needs a boundary. */}
            <Suspense fallback={null}>
                <GsocStats />
            </Suspense>
        </div>
    );
}
