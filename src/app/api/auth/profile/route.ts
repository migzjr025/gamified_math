import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { getSessionUser, createSession } from "@/lib/auth";
import { verifyPassword, hashPassword } from "@/lib/password";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUsers = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
    if (dbUsers.length === 0) {
      return NextResponse.json({
        id: sessionUser.id,
        name: sessionUser.name,
        email: sessionUser.email,
        role: sessionUser.role,
        grade: "Grade 1-2",
        emailVerified: true,
      });
    }

    const user = dbUsers[0];
    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      grade: user.grade || "Grade 1-2",
      emailVerified: user.emailVerified,
      firstLoginCompleted: user.firstLoginCompleted,
      createdAt: user.createdAt,
    });
  } catch (error: any) {
    console.error("Profile fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, currentPassword, newPassword, grade } = body;

    const dbUsers = await db.select().from(users).where(eq(users.id, sessionUser.id)).limit(1);
    if (dbUsers.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const currentUser = dbUsers[0];
    const updates: Record<string, any> = {};

    if (name && name.trim()) {
      updates.name = name.trim();
    }

    if (grade !== undefined) {
      updates.grade = grade.trim();
    }

    if (email && email.trim() && email.trim().toLowerCase() !== currentUser.email.toLowerCase()) {
      const cleanEmail = email.trim().toLowerCase();
      // Check if email already in use
      const existing = await db
        .select()
        .from(users)
        .where(and(eq(users.email, cleanEmail), ne(users.id, currentUser.id)))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json({ error: "This email is already in use by another account." }, { status: 409 });
      }
      updates.email = cleanEmail;
    }

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: "Current password is required to set a new password." }, { status: 400 });
      }

      if (!verifyPassword(currentPassword, currentUser.password)) {
        return NextResponse.json({ error: "Current password does not match our records." }, { status: 400 });
      }

      if (newPassword.length < 6) {
        return NextResponse.json({ error: "New password must be at least 6 characters long." }, { status: 400 });
      }

      updates.password = hashPassword(newPassword);
    }

    if (Object.keys(updates).length > 0) {
      const result = await db.update(users).set(updates).where(eq(users.id, currentUser.id)).returning();
      const updated = result[0];

      // Refresh session
      await createSession({
        id: updated.id,
        email: updated.email,
        name: updated.name,
        role: updated.role,
      });

      return NextResponse.json({
        success: true,
        message: "Profile updated successfully!",
        user: {
          id: updated.id,
          name: updated.name,
          email: updated.email,
          role: updated.role,
          grade: updated.grade,
        },
      });
    }

    return NextResponse.json({ success: true, message: "No changes detected." });
  } catch (error: any) {
    console.error("Profile update error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update profile." }, { status: 500 });
  }
}
