import { describe, expect, it } from "vitest";
import { COHORTS, DEFAULT_COHORT, cohortFromParam, cohortLabel, isCohortId } from "./cohorts";

describe("isCohortId", () => {
    it("accepts the two known cohorts", () => {
        expect(isCohortId("first-year")).toBe(true);
        expect(isCohortId("second-year")).toBe(true);
    });

    it.each([["unknown value", "third-year"], ["empty string", ""], ["null", null], ["undefined", undefined]])(
        "rejects %s",
        (_, input) => {
            expect(isCohortId(input)).toBe(false);
        },
    );
});

describe("cohortFromParam", () => {
    it("resolves known ids to themselves", () => {
        expect(cohortFromParam("first-year").id).toBe("first-year");
        expect(cohortFromParam("second-year").id).toBe("second-year");
    });

    it("uses the first element of an array", () => {
        expect(cohortFromParam(["first-year", "second-year"]).id).toBe("first-year");
        expect(cohortFromParam(["second-year", "first-year"]).id).toBe("second-year");
    });

    it.each([
        ["unknown value", "third-year"],
        ["null", null],
        ["undefined", undefined],
        ["empty array", []],
        ["array starting with an unknown value", ["nope", "first-year"]],
    ])("falls back to the default cohort for %s", (_, input) => {
        expect(cohortFromParam(input).id).toBe(DEFAULT_COHORT);
    });
});

describe("cohortLabel", () => {
    it("returns the label for each cohort", () => {
        for (const cohort of COHORTS) {
            expect(cohortLabel(cohort.id)).toBe(cohort.label);
        }
    });

    it("falls back to the id when the cohort is not listed", () => {
        expect(cohortLabel("third-year" as never)).toBe("third-year");
    });
});
