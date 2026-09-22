import { describe, expect, it } from "vitest";
import { EvidenceError, validateReflection } from "./pr-journey";

function words(n: number): string {
    return Array.from({ length: n }, (_, i) => `w${i}`).join(" ");
}

function reflection(over: Partial<Record<"tried" | "broke" | "differently", number>> = {}) {
    return {
        tried: words(over.tried ?? 5),
        broke: words(over.broke ?? 5),
        reviewerSaid: "The reviewer asked for a smaller diff.",
        differently: words(over.differently ?? 5),
        hours: 2,
        rounds: 1,
        status: "open" as const,
    };
}

describe("validateReflection", () => {
    it("names the field that is over its word cap", () => {
        const cases = [
            { field: "tried" as const, count: 101, label: "What I tried", cap: 100 },
            { field: "broke" as const, count: 101, label: "What broke", cap: 100 },
            { field: "differently" as const, count: 61, label: "What I would do differently", cap: 60 },
        ];

        for (const { field, count, label, cap } of cases) {
            expect(() => validateReflection(reflection({ [field]: count }))).toThrow(
                new EvidenceError(`"${label}" is capped at ${cap} words — yours is ${count}. Cut it down.`),
            );
        }
    });
});
