import { NextResponse } from "next/server";
import { GITHUB_SESSION_COOKIE, SESSION_COOKIE_OPTIONS } from "@/lib/github-auth";

export const runtime = "nodejs";

/** Signs out of GitHub on this site only. The club session, if any, is untouched. */
export async function POST() {
    const response = NextResponse.json({ ok: true });
    response.cookies.set(GITHUB_SESSION_COOKIE, "", { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
    return response;
}
