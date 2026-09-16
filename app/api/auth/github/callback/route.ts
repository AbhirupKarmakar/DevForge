import { NextResponse, type NextRequest } from "next/server";
import {
    GITHUB_SESSION_COOKIE,
    OAUTH_STATE_COOKIE,
    SESSION_COOKIE_OPTIONS,
    STATE_COOKIE_OPTIONS,
    callbackUrl,
    identityFromCode,
    safeNext,
    signGithubSession,
    statesMatch,
} from "@/lib/github-auth";

export const runtime = "nodejs";

/**
 * GitHub sends the browser back here with a one-time code.
 *
 * The state check is the part that matters: without it, anyone could craft a
 * callback link that signs a victim into the attacker's GitHub identity, and
 * whatever the victim then submitted would land on the attacker's record.
 */
export async function GET(request: NextRequest) {
    const params = request.nextUrl.searchParams;

    let saved: { state?: string; next?: string } = {};
    try {
        saved = JSON.parse(request.cookies.get(OAUTH_STATE_COOKIE)?.value ?? "{}");
    } catch {
        // A mangled cookie is treated exactly like a missing one.
    }

    const next = safeNext(saved.next);
    const finish = (outcome: "ok" | "failed" | "denied") => {
        const url = new URL(next, request.nextUrl.origin);
        if (outcome !== "ok") url.searchParams.set("github", outcome);
        const response = NextResponse.redirect(url);
        // The state is single-use; clear it whether or not sign-in worked.
        response.cookies.set(OAUTH_STATE_COOKIE, "", { ...STATE_COOKIE_OPTIONS, maxAge: 0 });
        return response;
    };

    // The person pressed "Cancel" on GitHub's consent screen.
    if (params.get("error") === "access_denied") return finish("denied");

    const code = params.get("code");
    if (!code || !statesMatch(saved.state, params.get("state"))) return finish("failed");

    try {
        const identity = await identityFromCode(code, callbackUrl(request.nextUrl.origin));
        const response = finish("ok");
        response.cookies.set(GITHUB_SESSION_COOKIE, signGithubSession(identity), SESSION_COOKIE_OPTIONS);
        return response;
    } catch (error) {
        console.error("[github-auth] callback failed:", error);
        return finish("failed");
    }
}
