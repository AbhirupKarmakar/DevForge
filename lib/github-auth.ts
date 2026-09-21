import { randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { secret } from "./auth";
import { AuthError } from "./session";

/**
 * GitHub sign-in, for the 10 PR Journey.
 *
 * The journey is open to anyone, not only club members, so it cannot hang off
 * the club's USN-and-password login. It signs people in with GitHub instead,
 * which also happens to be the stronger identity for this particular job: every
 * milestone is a claim about a GitHub account, and OAuth proves the person
 * submitting owns that account rather than trusting a username they typed or
 * one copied from a spreadsheet.
 *
 * Only identity is kept. No scope is requested, the access token is used once
 * to read the public profile and then dropped, and nothing about the account is
 * stored beyond id, login, name and avatar.
 *
 * The session is a separate cookie with its own issuer and audience, so a
 * GitHub session can never be replayed as a club session or the other way
 * round, even though both are signed with the same JWT_SECRET.
 */

export const GITHUB_SESSION_COOKIE = "devforge-gh-session";
export const OAUTH_STATE_COOKIE = "devforge-gh-oauth";

const ISSUER = "devforge-github";
const AUDIENCE = "pr-journey";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const STATE_TTL_SECONDS = 10 * 60;

export interface GithubIdentity {
    /** GitHub's numeric user id. Stable across username changes, so records key on it. */
    id: number;
    login: string;
    name: string;
    avatar: string;
}

export function oauthConfig(): { clientId: string; clientSecret: string } | null {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    return clientId && clientSecret ? { clientId, clientSecret } : null;
}

export const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // Lax, not strict: the callback is a top-level navigation back from
    // github.com, and strict would drop the state cookie on exactly that hop.
    sameSite: "lax" as const,
};

export const SESSION_COOKIE_OPTIONS = { ...cookieBase, path: "/", maxAge: SESSION_TTL_SECONDS };
export const STATE_COOKIE_OPTIONS = { ...cookieBase, path: "/api/auth/github", maxAge: STATE_TTL_SECONDS };

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

export function signGithubSession(identity: GithubIdentity): string {
    return jwt.sign({ ...identity }, secret(), {
        expiresIn: SESSION_TTL_SECONDS,
        issuer: ISSUER,
        audience: AUDIENCE,
    });
}

export function verifyGithubSession(token: string | undefined): GithubIdentity | null {
    if (!token) return null;
    try {
        const claims = jwt.verify(token, secret(), { issuer: ISSUER, audience: AUDIENCE }) as GithubIdentity;
        return Number.isInteger(claims.id) && typeof claims.login === "string"
            ? { id: claims.id, login: claims.login, name: claims.name, avatar: claims.avatar }
            : null;
    } catch {
        return null;
    }
}

/** The signed-in GitHub identity, or null. Never throws. */
export async function getGithubSession(): Promise<GithubIdentity | null> {
    const store = await cookies();
    return verifyGithubSession(store.get(GITHUB_SESSION_COOKIE)?.value);
}

export async function requireGithubUser(): Promise<GithubIdentity> {
    const identity = await getGithubSession();
    if (!identity) throw new AuthError(401, "Sign in with GitHub to continue");
    return identity;
}

/* ------------------------------------------------------------------ */
/* OAuth                                                               */
/* ------------------------------------------------------------------ */

export function newState(): string {
    return randomBytes(24).toString("base64url");
}

/** Constant-time, so the comparison leaks nothing about how much of a forged state matched. */
export function statesMatch(expected: string | undefined, received: string | null): boolean {
    if (!expected || !received) return false;
    const a = Buffer.from(expected);
    const b = Buffer.from(received);
    return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Where to send someone after sign-in. Only same-site paths survive: an
 * open redirect on an OAuth callback is the textbook way to turn "sign in with
 * GitHub" into a phishing link.
 */
export function safeNext(next: string | null | undefined, fallback = "/learn/open-source"): string {
    if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
    // Browsers strip tabs and newlines from URLs, so "/\t/evil.com" would become
    // "//evil.com" — a protocol-relative redirect off-site.
    if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
    return next;
}

export function callbackUrl(origin: string): string {
    return new URL("/api/auth/github/callback", origin).toString();
}

export function authorizeUrl(clientId: string, state: string, redirectUri: string): string {
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", state);
    // No scope: the default grants read access to public profile data, which
    // is all identity needs. Asking for more would make people hesitate at the
    // consent screen for a permission we never use.
    url.searchParams.set("allow_signup", "true");
    return url.toString();
}

export class OAuthError extends Error {}

/** Trades the one-time code for a token, reads the profile, and discards the token. */
export async function identityFromCode(code: string, redirectUri: string): Promise<GithubIdentity> {
    const config = oauthConfig();
    if (!config) throw new OAuthError("GitHub sign-in is not configured.");

    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            redirect_uri: redirectUri,
        }),
        cache: "no-store",
    });
    const token = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string; error?: string };
    if (!token.access_token) throw new OAuthError(`GitHub did not issue a token: ${token.error ?? tokenResponse.status}`);

    const userResponse = await fetch("https://api.github.com/user", {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${token.access_token}`,
            "User-Agent": "DevForge-PR-Journey",
        },
        cache: "no-store",
    });
    if (!userResponse.ok) throw new OAuthError(`GitHub profile lookup failed with ${userResponse.status}.`);

    const user = (await userResponse.json()) as { id: number; login: string; name: string | null; avatar_url: string };
    return { id: user.id, login: user.login, name: user.name ?? user.login, avatar: user.avatar_url };
}
