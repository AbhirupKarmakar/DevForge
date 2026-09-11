import { Suspense } from "react";
import { EsocRecord } from "@/components/esoc-record";

export const metadata = {
    title: "ESoC 2026 | DevForge",
    description: "DevForge contributions to ESoC 2026",
};

export default function ESocPage() {
    return (
        <Suspense fallback={null}>
            <EsocRecord />
        </Suspense>
    );
}
