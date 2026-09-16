import { NextResponse, type NextRequest } from "next/server";
import {
    OAUTH_STATE_COOKIE,
    STATE_COOKIE_OPTIONS,
    authorizeUrl,
    callbackUrl,
    newState,
    oauthConfig,
    safeNext,
} from "@/lib/github-auth";

export const runtime = "nodejs";

/** Starts GitHub sign-in: remembers where to return, then hands off to github.com. */
export async function GET(request: NextRequest) {
    const next = safeNext(request.nextUrl.searchParams.get("next"));
    const config = oauthConfig();

    if (!config) {
        // A link that silently goes nowhere is worse than one that says why.
        const back = new URL(next, request.nextUrl.origin);
        back.searchParams.set("github", "unconfigured");
        return NextResponse.redirect(back);
    }

    const state = newState();
    const response = NextResponse.redirect(
        authorizeUrl(config.clientId, state, callbackUrl(request.nextUrl.origin)),
    );
    response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({ state, next }), STATE_COOKIE_OPTIONS);
    return response;
}
