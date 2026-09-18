import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { gameResults, grades, students } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const query = db
      .select({
        id: gameResults.id,
        userId: gameResults.userId,
        studentId: gameResults.studentId,
        assessmentId: gameResults.assessmentId,
        gradeLevel: gameResults.gradeLevel,
        score: gameResults.score,
        totalQuestions: gameResults.totalQuestions,
        correctAnswers: gameResults.correctAnswers,
        percentage: gameResults.percentage,
        feedback: gameResults.feedback,
        createdAt: gameResults.createdAt,
        studentName: students.fullName,
      })
      .from(gameResults)
      .leftJoin(students, eq(gameResults.studentId, students.id))
      .orderBy(gameResults.id);

    const data = isAdmin
      ? await query
      : await query.where(eq(gameResults.userId, userId));

    return NextResponse.json(data);
  } catch (error) {
    console.error("Game results fetch error", error);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    const userId = sessionUser?.id || 1;
    const body = await req.json();

    const payload = {
      userId,
      studentId: Number(body.studentId),
      assessmentId: Number(body.assessmentId),
      gradeLevel: body.gradeLevel,
      score: Number(body.score),
      totalQuestions: Number(body.totalQuestions),
      correctAnswers: Number(body.correctAnswers),
      percentage: Number(body.percentage),
      feedback: body.feedback || "",
    };

    const result = await db.insert(gameResults).values(payload).returning();

    await db.insert(grades).values({
      userId,
      studentId: payload.studentId,
      assessmentId: payload.assessmentId,
      score: payload.percentage,
      pointsEarned: payload.percentage,
      feedback: payload.feedback,
    });

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Game result create error", error);
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
  }
}

