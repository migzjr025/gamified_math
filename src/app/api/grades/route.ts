import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { grades, students, assessments } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const query = db
      .select({
        id: grades.id,
        userId: grades.userId,
        studentId: grades.studentId,
        assessmentId: grades.assessmentId,
        score: grades.score,
        pointsEarned: grades.pointsEarned,
        feedback: grades.feedback,
        createdAt: grades.createdAt,
        updatedAt: grades.updatedAt,
        studentName: students.fullName,
        assessmentTitle: assessments.title,
      })
      .from(grades)
      .leftJoin(students, eq(grades.studentId, students.id))
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id));

    const data = isAdmin
      ? await query
      : await query.where(eq(grades.userId, userId));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Grades fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const body = await req.json();

    const result = await db.insert(grades).values({
      ...body,
      userId,
    }).returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Grades create error", error);
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
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
      ? eq(grades.id, id)
      : and(eq(grades.id, id), eq(grades.userId, userId));

    const result = await db.update(grades).set(rest).where(whereClause).returning();
    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Grades update error", error);
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const body = await req.json();

    const whereClause = isAdmin
      ? eq(grades.id, body.id)
      : and(eq(grades.id, body.id), eq(grades.userId, userId));

    await db.delete(grades).where(whereClause);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Grades delete error", error);
    return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
  }
}

