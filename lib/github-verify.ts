import { EvidenceError, parseGithubRef, type Evidence, type PRState } from "./pr-journey";

const API = "https://api.github.com";

function headers(authenticated = true): Record<string, string> {
    const h: Record<string, string> = {
        Accept: "application/vnd.github+json",
        "User-Agent": "DevForge-PR-Journey",
    };
    if (authenticated && process.env.GITHUB_TOKEN) h.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    return h;
}

/** True when GitHub is refusing because of a rate limit, not because of what the token may see. */
async function isRateLimited(response: Response): Promise<boolean> {
    if (response.status === 429) return true;
    if (response.status !== 403) return false;
    if (response.headers.get("x-ratelimit-remaining") === "0") return true;
    const body = await response.clone().text().catch(() => "");
    return /rate limit/i.test(body);
}

/**
 * GET with the server token, falling back to an anonymous request when GitHub
 * refuses the token. Everything the journey verifies is public, and a 401/403
 * on the token (expired, revoked, or blocked by an org's token policy) would
 * otherwise fail every submission while looking like a rate limit.
 */
export async function githubGet(url: string): Promise<Response> {
    const response = await fetch(url, { headers: headers(), cache: "no-store" });
    if (!process.env.GITHUB_TOKEN || (response.status !== 401 && response.status !== 403 && response.status !== 429)) {
        return response;
    }

    const limited = await isRateLimited(response);
    const detail = await response.clone().text().catch(() => "");
    console.error(
        `github-verify: token request got ${response.status}` +
            ` (ratelimit-remaining=${response.headers.get("x-ratelimit-remaining")}, rate-limited=${limited})` +
            ` for ${url}: ${detail.slice(0, 300)}`,
    );

    // Anonymous requests have their own (smaller) per-IP budget, so they are worth
    // one try whether the token was refused or rate-limited.
    const anonymous = await fetch(url, { headers: headers(false), cache: "no-store" });
    if (!anonymous.ok) {
        console.error(`github-verify: anonymous retry got ${anonymous.status} for ${url}`);
    }
    return anonymous;
}

interface GithubPR {
    html_url: string;
    number: number;
    title: string;
    state: string;
    merged_at: string | null;
    created_at: string;
    user: { login: string; id: number } | null;
}

/**
 * Reads the PR or issue behind a submitted link.
 *
 * Unauthenticated GitHub allows 60 requests an hour per IP, which a cohort of
 * students submitting on the same evening will exhaust immediately — set
 * GITHUB_TOKEN (the same one the PR-stats routes already use) and the ceiling
 * becomes 5000. The failure is reported honestly rather than silently accepting
 * unverified evidence, because unverified evidence is the whole thing this
 * feature exists to prevent.
 */
export async function verifyEvidence(url: string): Promise<Evidence> {
    const ref = parseGithubRef(url);
    if (!ref) {
        throw new EvidenceError(
            "That is not a GitHub pull request or issue link. It should look like " +
                "https://github.com/owner/repo/pull/123",
        );
    }

    // Issues and PRs share a numbering space; the issues endpoint answers for
    // both, and PRs carry `pull_request` on the issue representation. Asking the
    // right endpoint for each keeps `merged_at` available for PRs.
    const path =
        ref.kind === "pr"
            ? `${API}/repos/${ref.owner}/${ref.repo}/pulls/${ref.number}`
            : `${API}/repos/${ref.owner}/${ref.repo}/issues/${ref.number}`;

    const response = await githubGet(path);

    if (response.status === 404) {
        throw new EvidenceError(
            "GitHub returned 404 for that link. Check the URL, and note that a private repository cannot be verified.",
        );
    }
    if (await isRateLimited(response)) {
        throw new EvidenceError(
            "GitHub is rate-limiting us right now, so the link could not be checked. Try again in a few minutes.",
        );
    }
    if (!response.ok) {
        throw new EvidenceError(`GitHub answered ${response.status} for that link. Try again shortly.`);
    }

    const data = (await response.json()) as GithubPR;
    const author = data.user?.login;
    const authorId = data.user?.id;
    if (!author || !authorId) throw new EvidenceError("GitHub did not report an author for that link.");

    const state: PRState = data.merged_at ? "merged" : data.state === "closed" ? "closed" : "open";

    return {
        url: data.html_url,
        kind: ref.kind,
        repo: `${ref.owner}/${ref.repo}`,
        number: data.number ?? ref.number,
        title: data.title,
        author,
        authorId,
        state,
        reviewRounds: ref.kind === "pr" ? await countReviewRounds(ref.owner, ref.repo, ref.number) : 0,
        openedAt: data.created_at,
        verifiedAt: new Date().toISOString(),
    };
}

/**
 * A "round" is one submitted review, not one inline comment — five nitpicks in
 * a single review is one round, which is what milestone 9 means by it. A
 * failure here is not fatal: the count only gates milestone 9, so it degrades
 * to zero rather than blocking an otherwise valid submission.
 */
async function countReviewRounds(owner: string, repo: string, number: number): Promise<number> {
    try {
        const response = await githubGet(`${API}/repos/${owner}/${repo}/pulls/${number}/reviews?per_page=100`);
        if (!response.ok) return 0;
        const reviews = (await response.json()) as { state: string }[];
        return reviews.filter((r) => r.state !== "PENDING").length;
    } catch {
        return 0;
    }
}
