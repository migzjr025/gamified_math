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
    console.warn("Game results fetch error (offline fallback):", error);
    return NextResponse.json([]);
  }
}

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;

    const studentId = Number(body.studentId);
    if (!Number.isFinite(studentId) || studentId <= 0) {
      return NextResponse.json({ error: "A valid positive studentId is required." }, { status: 400 });
    }

    const assessmentId = Number(body.assessmentId);
    if (!Number.isFinite(assessmentId) || assessmentId <= 0) {
      return NextResponse.json({ error: "A valid positive assessmentId is required." }, { status: 400 });
    }

    const totalQuestions = Number.isFinite(Number(body.totalQuestions)) ? Math.max(0, Number(body.totalQuestions)) : 5;
    const correctAnswers = Number.isFinite(Number(body.correctAnswers)) ? Math.max(0, Number(body.correctAnswers)) : 0;
    const score = Number.isFinite(Number(body.score)) ? Number(body.score) : correctAnswers;
    const percentage = Number.isFinite(Number(body.percentage))
      ? Math.max(0, Math.min(100, Number(body.percentage)))
      : totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const payload = {
      userId,
      studentId,
      assessmentId,
      gradeLevel: String(body.gradeLevel || "Grade 2"),
      score,
      totalQuestions,
      correctAnswers,
      percentage,
      feedback: String(body.feedback || ""),
    };

    try {
      const result = await db.insert(gameResults).values(payload).returning();

      // Server-Side Best Score Upsert into grades
      try {
        const existingGrades = await db
          .select()
          .from(grades)
          .where(and(eq(grades.studentId, payload.studentId), eq(grades.assessmentId, payload.assessmentId)))
          .limit(1);

        if (existingGrades.length > 0) {
          const currentBest = Number(existingGrades[0].score) || 0;
          // If new attempt is better or equal, upgrade the grade with latest points and feedback
          if (payload.percentage >= currentBest) {
            await db
              .update(grades)
              .set({
                score: payload.percentage,
                pointsEarned: payload.percentage,
                feedback: payload.feedback || existingGrades[0].feedback,
                updatedAt: new Date(),
              })
              .where(eq(grades.id, existingGrades[0].id));
          }
        } else {
          // First evaluated attempt for this assessment
          await db.insert(grades).values({
            userId,
            studentId: payload.studentId,
            assessmentId: payload.assessmentId,
            score: payload.percentage,
            pointsEarned: payload.percentage,
            feedback: payload.feedback,
          });
        }
      } catch (gradeErr) {
        console.warn("Grades best-score upsert secondary error:", gradeErr);
      }

      return NextResponse.json(result[0]);
    } catch (dbErr) {
      console.warn("Game results DB offline, saving to fallback store:", dbErr);

      // In-memory fallback upsert
      const globalForGrades = globalThis as typeof globalThis & {
        __inMemoryGrades?: any[];
      };
      if (globalForGrades.__inMemoryGrades) {
        const list = globalForGrades.__inMemoryGrades;
        const existing = list.find(g => g.studentId === payload.studentId && g.assessmentId === payload.assessmentId);
        if (existing) {
          if (payload.percentage >= (Number(existing.score) || 0)) {
            existing.score = payload.percentage;
            existing.pointsEarned = payload.percentage;
            existing.feedback = payload.feedback || existing.feedback;
            existing.updatedAt = new Date().toISOString();
          }
        } else {
          list.push({
            id: list.reduce((max, g) => Math.max(max, Number(g.id) || 0), 0) + 1,
            userId,
            studentId: payload.studentId,
            assessmentId: payload.assessmentId,
            score: payload.percentage,
            pointsEarned: payload.percentage,
            feedback: payload.feedback,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        }
      }

      return NextResponse.json({
        id: Date.now(),
        ...payload,
        createdAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error("Game result create error", error);
    return NextResponse.json({ error: "Failed to save game result" }, { status: 500 });
  }
}

