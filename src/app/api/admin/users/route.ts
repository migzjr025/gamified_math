import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, desc, asc } from "drizzle-orm";
import { getSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

async function checkAdmin() {
  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.role !== "admin") {
    return null;
  }
  return sessionUser;
}

export async function GET(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const allUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        grade: users.grade,
        approved: users.approved,
        emailVerified: users.emailVerified,
        firstLoginCompleted: users.firstLoginCompleted,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(asc(users.approved), desc(users.createdAt));

    return NextResponse.json({ success: true, users: allUsers });
  } catch (error: any) {
    console.error("Admin GET users error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch users." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const { name, email, password, role, grade, approved } = await req.json();

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();

    if (!cleanName || !cleanEmail || !password || !role) {
      return NextResponse.json({ success: false, error: "Name, email, password, and role are required." }, { status: 400 });
    }

    const existing = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
    if (existing.length > 0) {
      return NextResponse.json({ success: false, error: "An account with that email already exists." }, { status: 409 });
    }

    const created = await db
      .insert(users)
      .values({
        name: cleanName,
        email: cleanEmail,
        password: hashPassword(password),
        role: role as "teacher" | "student" | "admin",
        grade: grade || "",
        approved: approved !== undefined ? Boolean(approved) : true,
        emailVerified: true,
        firstLoginCompleted: true,
      })
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        grade: users.grade,
        approved: users.approved,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    return NextResponse.json({ success: true, user: created[0], message: "User created successfully." });
  } catch (error: any) {
    console.error("Admin POST user error:", error);
    return NextResponse.json({ success: false, error: "Failed to create user." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const { id, name, email, role, grade, approved, password } = await req.json();

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanName = (name || "").trim();

    const updateData: any = {};
    if (cleanName) updateData.name = cleanName;
    if (cleanEmail) updateData.email = cleanEmail;
    if (role) updateData.role = role;
    if (grade !== undefined) updateData.grade = grade;
    if (approved !== undefined) updateData.approved = Boolean(approved);
    if (password && password.trim().length > 0) {
      updateData.password = hashPassword(password.trim());
    }

    const updated = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, Number(id)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        grade: users.grade,
        approved: users.approved,
        emailVerified: users.emailVerified,
        createdAt: users.createdAt,
      });

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated[0], message: "User updated successfully." });
  } catch (error: any) {
    console.error("Admin PUT user error:", error);
    return NextResponse.json({ success: false, error: "Failed to update user." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const { id, approved } = await req.json();

    if (!id || approved === undefined) {
      return NextResponse.json({ success: false, error: "User ID and approval state are required." }, { status: 400 });
    }

    const updated = await db
      .update(users)
      .set({ approved: Boolean(approved) })
      .where(eq(users.id, Number(id)))
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        approved: users.approved,
      });

    if (updated.length === 0) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: updated[0],
      message: updated[0].approved ? "User account approved successfully." : "User account deactivated."
    });
  } catch (error: any) {
    console.error("Admin PATCH user error:", error);
    return NextResponse.json({ success: false, error: "Failed to update user status." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const admin = await checkAdmin();
    if (!admin) {
      return NextResponse.json({ success: false, error: "Unauthorized. Administrator privileges required." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "User ID is required." }, { status: 400 });
    }

    const targetId = Number(id);

    if (admin.id === targetId) {
      return NextResponse.json({ success: false, error: "You cannot delete your own logged-in administrator account." }, { status: 400 });
    }

    const deleted = await db.delete(users).where(eq(users.id, targetId)).returning({ id: users.id, name: users.name, email: users.email });

    if (deleted.length === 0) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `User "${deleted[0].name}" (${deleted[0].email}) deleted successfully.` });
  } catch (error: any) {
    console.error("Admin DELETE user error:", error);
    return NextResponse.json({ success: false, error: "Failed to delete user." }, { status: 500 });
  }
}
