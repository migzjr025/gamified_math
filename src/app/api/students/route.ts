import { NextRequest, NextResponse } from "next/server";
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

    const result = await db.insert(students).values({
      ...body,
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

