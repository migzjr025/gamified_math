import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const data = isAdmin
      ? await db.select().from(students)
      : await db.select().from(students).where(eq(students.userId, userId));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Students fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const age = body.age === null || body.age === undefined || body.age === "" ? null : Number(body.age);

    if (!fullName) {
      return NextResponse.json({ error: "Student name is required." }, { status: 400 });
    }
    if (age !== null && (!Number.isInteger(age) || age < 0)) {
      return NextResponse.json({ error: "Age must be a non-negative whole number." }, { status: 400 });
    }

    const result = await db.insert(students).values({
      ...body,
      studentId: String(body.studentId || `STU-${randomUUID()}`).trim(),
      fullName,
      age,
      userId,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Students create error", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const body = await req.json();
    const { id, ...rest } = body;
    if ("age" in rest) {
      const age = rest.age === null || rest.age === undefined || rest.age === "" ? null : Number(rest.age);
      if (age !== null && (!Number.isInteger(age) || age < 0)) {
        return NextResponse.json({ error: "Age must be a non-negative whole number." }, { status: 400 });
      }
      rest.age = age;
    }

    const whereClause = isAdmin
      ? eq(students.id, id)
      : and(eq(students.id, id), eq(students.userId, userId));

    const result = await db.update(students).set(rest).where(whereClause).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Students update error", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const body = await req.json();

    const whereClause = isAdmin
      ? eq(students.id, body.id)
      : and(eq(students.id, body.id), eq(students.userId, userId));

    await db.delete(students).where(whereClause);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Students delete error", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

