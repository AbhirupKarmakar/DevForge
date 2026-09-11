import { Suspense } from "react";
import { GSSoCHallOfFame } from "@/components/gssoc-hall-of-fame";

export const metadata = {
    title: "GSSoC Hall of Fame | DevForge",
    description: "GSSoC ranks, scores and live GitHub PR stats for DevForge members",
};

export default function GSSoCPage() {
    return (
        <Suspense fallback={null}>
            <GSSoCHallOfFame />
        </Suspense>
    );
}
