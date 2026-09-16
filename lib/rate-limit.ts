import type { NextRequest } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { club, COLLECTIONS, unguardedDb } from "./firebase/collections";

/**
 * Firestore-backed so the window is shared across instances. An in-process
 * counter is close to useless on Vercel: each concurrent function instance
 * keeps its own map, so an attacker gets `limit x instances` attempts.
 */
export interface RateLimit {
    limit: number;
    windowMs: number;
}

export const RATE_LIMITS = {
    /** Login is the brute-force target; keep it tight. */
    login: { limit: 5, windowMs: 15 * 60_000 },
    passwordChange: { limit: 10, windowMs: 15 * 60_000 },
    write: { limit: 60, windowMs: 60_000 },
    /**
     * Journey submissions and re-checks. Each one spends GitHub API calls on the
     * site's shared token, and since anyone with a GitHub account can sign in,
     * one person looping on submit could starve everyone else's checks.
     */
    journeyCheck: { limit: 20, windowMs: 15 * 60_000 },
} as const satisfies Record<string, RateLimit>;

export interface RateLimitResult {
    ok: boolean;
    remaining: number;
    retryAfterSeconds: number;
}

/**
 * Vercel sets x-forwarded-for; the leftmost entry is the client. Falling back
 * to a constant means a missing header throttles everyone together rather than
 * silently disabling the limit.
 */
export function clientIp(request: NextRequest | Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0]!.trim();
    return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/** Fixed window, incremented in a transaction so concurrent requests can't both read a stale count. */
export async function checkRateLimit(
    bucket: string,
    identifier: string,
    { limit, windowMs }: RateLimit,
): Promise<RateLimitResult> {
    // Colons keep buckets readable in the console; identifiers may contain them (IPv6), so encode.
    const key = `${bucket}:${encodeURIComponent(identifier)}`;
    const ref = club(COLLECTIONS.rateLimits).doc(key);
    const now = Date.now();

    return unguardedDb().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        const data = snap.exists ? (snap.data() as { count: number; windowStart: number }) : null;
        const expired = !data || now - data.windowStart >= windowMs;

        const count = expired ? 1 : data.count + 1;
        const windowStart = expired ? now : data.windowStart;

        if (count > limit) {
            return {
                ok: false,
                remaining: 0,
                retryAfterSeconds: Math.ceil((windowStart + windowMs - now) / 1000),
            };
        }

        tx.set(ref, {
            count,
            windowStart,
            // Lets a Firestore TTL policy on `expiresAt` reap old buckets.
            expiresAt: new Date(windowStart + windowMs),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return { ok: true, remaining: limit - count, retryAfterSeconds: 0 };
    });
}

/** Clears a bucket, call after a successful login so one bad day doesn't lock someone out. */
export async function resetRateLimit(bucket: string, identifier: string): Promise<void> {
    await club(COLLECTIONS.rateLimits).doc(`${bucket}:${encodeURIComponent(identifier)}`).delete();
}
