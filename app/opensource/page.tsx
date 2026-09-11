import { Suspense } from "react";
import { OpenSourceImpact } from "@/components/open-source-impact";

export const metadata = {
    title: "Open Source Impact | DevForge",
    description: "Analytics and leaderboards for DevForge's open source contributions, by year group",
};

export default function OpenSourcePage() {
    // The page reads the chosen year from the query string, which needs a
    // boundary; without it the whole route would opt out of prerendering.
    return (
        <Suspense fallback={null}>
            <OpenSourceImpact />
        </Suspense>
    );
}
