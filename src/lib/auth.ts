import { cookies, headers } from "next/headers";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";

export const GAME_API_KEY = process.env.GAME_API_KEY || "COGNITIVE-QUEST-MATATAG-2026";

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
  grade?: string;
  isGameClient?: boolean;
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
  try {
    const user = JSON.parse(session.value);
    const dbUser = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
    if (dbUser.length === 0) {
      if (user.email === "teacher@matatag.edu.ph" || user.email === "admin@matatag.edu.ph") {
        const { password: _, ...cleanUser } = user;
        return cleanUser as SessionUser;
      }
      return null;
    }
    const { password: _, ...cleanDbUser } = dbUser[0];
    return cleanDbUser as SessionUser;
  } catch {
    try {
      const fallbackUser = JSON.parse(session.value);
      if (fallbackUser.email === "teacher@matatag.edu.ph" || fallbackUser.email === "admin@matatag.edu.ph") {
        const { password: _, ...cleanFallback } = fallbackUser;
        return cleanFallback as SessionUser;
      }
      return null;
    } catch {
      return null;
    }
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
  cookieStore.set("session", JSON.stringify(user), {
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
