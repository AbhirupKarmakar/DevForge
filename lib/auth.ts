import { randomInt } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 12;
const TOKEN_TTL = "7d";
const ISSUER = "devforge";

export const AUTH_COOKIE = "devforge-auth-token";

export interface SessionClaims {
    usn: string;
    name: string;
    role: MemberRole;
}

export type MemberRole = "member" | "mentor" | "admin";
export type MemberStatus = "pending" | "approved" | "rejected";

/**
 * Required, with no fallback. A default secret would let anyone mint admin
 * tokens against a deployment where the variable was simply forgotten.
 */
export function secret(): string {
    const value = process.env.JWT_SECRET;
    if (!value || value.length < 32) {
        throw new Error(
            "JWT_SECRET is missing or too short (need >= 32 chars). Generate one with:\n" +
                `  node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`,
        );
    }
    return value;
}

export async function hashPassword(plain: string): Promise<string> {
    return bcrypt.hash(plain, SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
    if (!hash) return false;
    return bcrypt.compare(plain, hash);
}

const POOLS = {
    lower: "abcdefghijkmnopqrstuvwxyz", // no l
    upper: "ABCDEFGHJKLMNPQRSTUVWXYZ", // no I, O
    digit: "23456789", // no 0, 1
    symbol: "!@#$%^&*-_",
};

/**
 * Cryptographically random, with one character guaranteed from each pool.
 * Look-alike characters are excluded because these get read out of an email
 * and typed by hand.
 */
export function generatePassword(length = 14): string {
    const all = Object.values(POOLS).join("");
    const chars = Object.values(POOLS).map((pool) => pool[randomInt(pool.length)]);

    while (chars.length < length) chars.push(all[randomInt(all.length)]);

    // Fisher-Yates, so the guaranteed characters aren't pinned to the front.
    for (let i = chars.length - 1; i > 0; i--) {
        const j = randomInt(i + 1);
        [chars[i], chars[j]] = [chars[j], chars[i]];
    }
    return chars.join("");
}

export function signSession(claims: SessionClaims): string {
    return jwt.sign(claims, secret(), { expiresIn: TOKEN_TTL, issuer: ISSUER });
}

export function verifySession(token: string | undefined): SessionClaims | null {
    if (!token) return null;
    try {
        return jwt.verify(token, secret(), { issuer: ISSUER }) as SessionClaims;
    } catch {
        return null;
    }
}
