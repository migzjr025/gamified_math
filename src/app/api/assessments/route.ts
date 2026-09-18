import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { assessments, units } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const query = db
      .select({
        id: assessments.id,
        userId: assessments.userId,
        title: assessments.title,
        unitId: assessments.unitId,
        type: assessments.type,
        totalPoints: assessments.totalPoints,
        dueDate: assessments.dueDate,
        createdAt: assessments.createdAt,
        updatedAt: assessments.updatedAt,
        unitTitle: units.title,
      })
      .from(assessments)
      .leftJoin(units, eq(assessments.unitId, units.id));

    const data = isAdmin
      ? await query
      : await query.where(eq(assessments.userId, userId));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Assessments fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const body = await req.json();

    const result = await db.insert(assessments).values({
      ...body,
      userId,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Assessments create error", error);
    return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
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
      ? eq(assessments.id, id)
      : and(eq(assessments.id, id), eq(assessments.userId, userId));

    const result = await db.update(assessments).set(rest).where(whereClause).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Assessments update error", error);
    return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const body = await req.json();

    const whereClause = isAdmin
      ? eq(assessments.id, body.id)
      : and(eq(assessments.id, body.id), eq(assessments.userId, userId));

    await db.delete(assessments).where(whereClause);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Assessments delete error", error);
    return NextResponse.json({ error: "Failed to delete assessment" }, { status: 500 });
  }
}

