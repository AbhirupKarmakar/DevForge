import { describe, expect, it } from "vitest";
import { safeNext, statesMatch } from "./github-auth";

describe("safeNext", () => {
    it("keeps same-site paths", () => {
        expect(safeNext("/dashboard/journey")).toBe("/dashboard/journey");
        expect(safeNext("/learn/open-source?m=3#top")).toBe("/learn/open-source?m=3#top");
    });

    it("falls back when there is nothing to use", () => {
        expect(safeNext(null)).toBe("/learn/open-source");
        expect(safeNext(undefined, "/home")).toBe("/home");
        expect(safeNext("")).toBe("/learn/open-source");
    });

    it.each([
        ["absolute URL", "https://evil.com"],
        ["protocol-relative", "//evil.com"],
        ["backslash trick", "/\\evil.com"],
        ["tab smuggled between slashes", "/\t/evil.com"],
        ["newline smuggled between slashes", "/\n/evil.com"],
        ["relative path", "dashboard"],
    ])("rejects %s", (_, input) => {
        expect(safeNext(input)).toBe("/learn/open-source");
    });
});

describe("statesMatch", () => {
    it("matches identical states", () => {
        expect(statesMatch("abc123", "abc123")).toBe(true);
    });

    it("rejects different or missing states", () => {
        expect(statesMatch("abc123", "abc124")).toBe(false);
        expect(statesMatch("abc123", "abc")).toBe(false);
        expect(statesMatch(undefined, "abc123")).toBe(false);
        expect(statesMatch("abc123", null)).toBe(false);
    });
});
