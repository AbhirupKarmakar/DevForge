import { NextResponse } from "next/server";
import { club, COLLECTIONS } from "@/lib/firebase/collections";
import { authErrorResponse } from "@/lib/session";
import { requireGithubUser } from "@/lib/github-auth";
import { emptyJourney, journeyId, type JourneyRecord } from "@/lib/pr-journey";

export const runtime = "nodejs";

/**
 * The signed-in person's own journey. Returns an empty record rather than a 404
 * for someone who has not started — "not started" is a state of the journey,
 * not an error — and does not write one: signing in and looking around should
 * not create a document.
 */
export async function GET() {
    try {
        const me = await requireGithubUser();
        const snap = await club<JourneyRecord>(COLLECTIONS.prJourney).doc(journeyId(me.id)).get();

        return NextResponse.json({
            ok: true,
            identity: me,
            journey: snap.exists ? snap.data() : emptyJourney(me),
        });
    } catch (error) {
        return authErrorResponse(error);
    }
}
