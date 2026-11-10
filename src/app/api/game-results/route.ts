import { NextRequest, NextResponse } from "next/server";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { gameResults, grades, students } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export async function GET(req?: NextRequest) {
  try {
    const sessionUser = req ? await getSessionUser(req) : await getSessionUser();
    const userId = sessionUser?.id || 1;
    const isTeacher = sessionUser && sessionUser.role === "teacher" && !(sessionUser as any).isGameClient;

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
      .innerJoin(students, eq(gameResults.studentId, students.id))
      .orderBy(gameResults.id);

    const data = isTeacher
      ? await query.where(eq(gameResults.userId, userId))
      : await query;

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
    const rawStudentId = Number(body.studentId);
    if (!Number.isFinite(rawStudentId) || rawStudentId <= 0) {
      return NextResponse.json({ error: "A valid positive studentId is required." }, { status: 400 });
    }

    const assessmentId = Number(body.assessmentId);
    if (!Number.isFinite(assessmentId) || assessmentId <= 0) {
      return NextResponse.json({ error: "A valid positive assessmentId is required." }, { status: 400 });
    }

    // Resolve student record to ensure valid foreign key in PostgreSQL
    let targetStudent = await db
      .select({ id: students.id, userId: students.userId, studentId: students.studentId })
      .from(students)
      .where(eq(students.id, rawStudentId))
      .limit(1);

    if (targetStudent.length === 0) {
      const studentCode = String(body.studentCode || body.student_id || body.studentNumber || "");
      if (studentCode) {
        targetStudent = await db
          .select({ id: students.id, userId: students.userId, studentId: students.studentId })
          .from(students)
          .where(eq(students.studentId, studentCode))
          .limit(1);
      }
      if (targetStudent.length === 0 && rawStudentId <= 20) {
        const paddedCode = `2026-${String(rawStudentId).padStart(3, "0")}`;
        targetStudent = await db
          .select({ id: students.id, userId: students.userId, studentId: students.studentId })
          .from(students)
          .where(eq(students.studentId, paddedCode))
          .limit(1);
      }
    }

    const resolvedStudentId = targetStudent.length > 0 ? targetStudent[0].id : rawStudentId;
    const effectiveUserId = targetStudent[0]?.userId || sessionUser?.id || 1;

    const totalQuestions = Number.isFinite(Number(body.totalQuestions)) ? Math.max(0, Number(body.totalQuestions)) : 5;
    const correctAnswers = Number.isFinite(Number(body.correctAnswers)) ? Math.max(0, Number(body.correctAnswers)) : 0;
    const score = Number.isFinite(Number(body.score)) ? Number(body.score) : correctAnswers;
    const percentage = Number.isFinite(Number(body.percentage))
      ? Math.max(0, Math.min(100, Number(body.percentage)))
      : totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

    const payload = {
      userId: effectiveUserId,
      studentId: resolvedStudentId,
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

export async function DELETE(req: NextRequest) {
  let body: any = {};
  try {
    body = await req.json();
  } catch {
    // Body is optional if query params are supplied
  }

  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get("id") || body?.id;
    const studentIdParam = searchParams.get("studentId") || body?.studentId;
    const cleanOrphaned = searchParams.get("cleanOrphaned") === "true" || body?.cleanOrphaned === true;

    if (cleanOrphaned) {
      try {
        const allStudents = await db.select({ id: students.id }).from(students);
        const validStudentIds = new Set(allStudents.map((s) => s.id));
        const allResults = await db
          .select({ id: gameResults.id, studentId: gameResults.studentId })
          .from(gameResults);
        const orphaned = allResults.filter((r) => !validStudentIds.has(r.studentId));

        for (const item of orphaned) {
          await db.delete(gameResults).where(eq(gameResults.id, item.id));
        }

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${orphaned.length} orphaned game results.`,
          deletedCount: orphaned.length,
        });
      } catch (cleanErr) {
        console.warn("Orphaned game results cleanup error:", cleanErr);
        return NextResponse.json({ success: true, deletedCount: 0 });
      }
    }

    if (studentIdParam) {
      const studentId = Number(studentIdParam);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        return NextResponse.json({ error: "A valid positive studentId is required." }, { status: 400 });
      }

      const whereClause = isAdmin
        ? eq(gameResults.studentId, studentId)
        : and(eq(gameResults.studentId, studentId), eq(gameResults.userId, userId));

      try {
        await db.delete(gameResults).where(whereClause);
      } catch (delErr) {
        console.warn("Game results delete by studentId error:", delErr);
      }
      return NextResponse.json({ success: true, deletedStudentId: studentId });
    }

    if (idParam) {
      const id = Number(idParam);
      if (!id || isNaN(id) || id <= 0) {
        return NextResponse.json({ error: "A valid positive game result id is required." }, { status: 400 });
      }

      const whereClause = isAdmin
        ? eq(gameResults.id, id)
        : and(eq(gameResults.id, id), eq(gameResults.userId, userId));

      try {
        await db.delete(gameResults).where(whereClause);
      } catch (delErr) {
        console.warn("Game results delete by id error:", delErr);
      }
      return NextResponse.json({ success: true, deletedId: id });
    }

    return NextResponse.json(
      { error: "Missing parameter: provide id, studentId, or cleanOrphaned=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Game results delete error:", error);
    return NextResponse.json({ error: "Failed to delete game result" }, { status: 500 });
  }
}


