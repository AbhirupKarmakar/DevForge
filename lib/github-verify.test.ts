import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { verifyEvidence } from "./github-verify";

const PR_URL = "https://github.com/NST-DEVFORGE/workbook/pull/7";
const pr = {
    html_url: PR_URL,
    number: 7,
    title: "Sign the workbook",
    state: "closed",
    merged_at: "2026-09-21T10:00:00Z",
    created_at: "2026-09-21T09:00:00Z",
    user: { login: "student", id: 42 },
};

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", ...headers } });

/** Routes by URL and by whether the request carried the server token. */
function mockGithub(withToken: () => Response, anonymous: () => Response) {
    const calls: { url: string; authed: boolean }[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (url: string, init?: RequestInit) => {
            const authed = Boolean((init?.headers as Record<string, string>)?.Authorization);
            calls.push({ url, authed });
            if (url.endsWith("/reviews?per_page=100")) return json([{ state: "APPROVED" }]);
            return authed ? withToken() : anonymous();
        }),
    );
    return calls;
}

describe("verifyEvidence", () => {
    beforeEach(() => {
        vi.stubEnv("GITHUB_TOKEN", "test-token");
        vi.spyOn(console, "error").mockImplementation(() => {});
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
    });

    it("uses the token when GitHub accepts it", async () => {
        const calls = mockGithub(() => json(pr), () => json({}, 500));
        const evidence = await verifyEvidence(PR_URL);
        expect(evidence).toMatchObject({ author: "student", state: "merged", reviewRounds: 1 });
        expect(calls.every((c) => c.authed)).toBe(true);
    });

    it("falls back to an anonymous request when an org blocks the token", async () => {
        const blocked = { message: "`NST-DEVFORGE` forbids access via a fine-grained personal access token" };
        const calls = mockGithub(() => json(blocked, 403, { "x-ratelimit-remaining": "4990" }), () => json(pr));
        const evidence = await verifyEvidence(PR_URL);
        expect(evidence.state).toBe("merged");
        expect(calls.some((c) => !c.authed)).toBe(true);
        expect(console.error).toHaveBeenCalledWith(expect.stringContaining("forbids access"));
    });

    it("falls back when the token has expired (401)", async () => {
        mockGithub(() => json({ message: "Bad credentials" }, 401), () => json(pr));
        await expect(verifyEvidence(PR_URL)).resolves.toMatchObject({ author: "student" });
    });

    it("tries anonymously when the token is rate-limited", async () => {
        mockGithub(() => json({ message: "API rate limit exceeded" }, 403, { "x-ratelimit-remaining": "0" }), () => json(pr));
        await expect(verifyEvidence(PR_URL)).resolves.toMatchObject({ author: "student" });
    });

    it("reports a rate limit only when both requests are rate-limited", async () => {
        const limited = () => json({ message: "API rate limit exceeded" }, 403, { "x-ratelimit-remaining": "0" });
        mockGithub(limited, limited);
        await expect(verifyEvidence(PR_URL)).rejects.toThrow(/rate-limiting/);
    });

    it("does not call a permissions problem a rate limit", async () => {
        const forbidden = () => json({ message: "Resource not accessible" }, 403, { "x-ratelimit-remaining": "4990" });
        mockGithub(forbidden, forbidden);
        await expect(verifyEvidence(PR_URL)).rejects.toThrow(/answered 403/);
    });

    it("makes a single anonymous request when no token is configured", async () => {
        vi.stubEnv("GITHUB_TOKEN", "");
        const calls = mockGithub(() => json({}, 500), () => json(pr));
        await verifyEvidence(PR_URL);
        expect(calls.filter((c) => !c.url.endsWith("per_page=100"))).toEqual([{ url: expect.any(String), authed: false }]);
    });
});
