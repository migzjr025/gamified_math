import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

export const GAME_API_KEY = process.env.GAME_API_KEY || "COGNITIVE-QUEST-MATATAG-2026";
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.GAME_API_KEY || "cognitive-quest-session-secret-matatag-2026";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
  grade?: string;
  isGameClient?: boolean;
}

/**
 * Signs a session payload with HMAC-SHA256.
 * Format: base64url(payload).base64url(signature)
 */
function signSessionPayload(payload: object): string {
  const jsonStr = JSON.stringify(payload);
  const dataB64 = Buffer.from(jsonStr, "utf-8").toString("base64url");
  const hmac = createHmac("sha256", SESSION_SECRET).update(dataB64).digest("base64url");
  return `${dataB64}.${hmac}`;
}

/**
 * Verifies a signed session token using constant-time comparison.
 * Supports transparent fallback to legacy raw JSON during session transition.
 */
function verifySessionToken<T>(token: string): T | null {
  if (!token || typeof token !== "string") return null;

  if (token.includes(".")) {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [dataB64, signature] = parts;
    if (!dataB64 || !signature) return null;

    const expectedSignature = createHmac("sha256", SESSION_SECRET).update(dataB64).digest("base64url");
    if (signature.length !== expectedSignature.length) return null;
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }

    try {
      const decoded = Buffer.from(dataB64, "base64url").toString("utf-8");
      return JSON.parse(decoded) as T;
    } catch {
      return null;
    }
  }

  // Fallback for legacy JSON sessions (allows active sessions to transition cleanly)
  try {
    return JSON.parse(token) as T;
  } catch {
    return null;
  }
}

export async function getSessionUser(req?: NextRequest | Request): Promise<SessionUser | null> {
  // 1. Check for valid Game API Key header (from desktop game client)
  try {
    let headerKey: string | null = null;
    if (req) {
      headerKey = req.headers.get("x-game-key") || req.headers.get("X-Game-Key");
    } else {
      const headerStore = await headers();
      headerKey = headerStore.get("x-game-key") || headerStore.get("X-Game-Key");
    }

    if (headerKey && headerKey.trim() === GAME_API_KEY) {
      const teacherId = Number(process.env.GAME_TEACHER_ID) || 1;
      return {
        id: teacherId,
        email: "game-client@matatag.edu.ph",
        name: "Cognitive Maze Game Client",
        role: "teacher",
        isGameClient: true,
      };
    }
  } catch {}

  // 2. Check session cookie
  const cookieStore = await cookies();
  const session = cookieStore.get("session");
  if (!session?.value) return null;

  const rawUser = verifySessionToken<SessionUser & { password?: string }>(session.value);
  if (!rawUser || typeof rawUser.id !== "number") {
    return null;
  }

  try {
    const dbUser = await db.select().from(users).where(eq(users.id, rawUser.id)).limit(1);
    if (dbUser.length === 0) {
      if (rawUser.email === "teacher@matatag.edu.ph" || rawUser.email === "admin@matatag.edu.ph") {
        const { password: _, ...cleanUser } = rawUser;
        return cleanUser as SessionUser;
      }
      return null;
    }
    const { password: _, ...cleanDbUser } = dbUser[0];
    return cleanDbUser as SessionUser;
  } catch {
    if (rawUser.email === "teacher@matatag.edu.ph" || rawUser.email === "admin@matatag.edu.ph") {
      const { password: _, ...cleanFallback } = rawUser;
      return cleanFallback as SessionUser;
    }
    return null;
  }
}

export async function requireAuth() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireAuth();
  if (user.role !== "admin") {
    redirect("/dashboard");
  }
  return user;
}

export async function createSession(user: { id: number; email: string; name: string; role: string }) {
  const cookieStore = await cookies();
  const token = signSessionPayload(user);
  cookieStore.set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session");
}
