import { NextRequest, NextResponse } from "next/server";
import { eq, and, or, isNull } from "drizzle-orm";
import { db } from "@/db";
import { grades, students, assessments, units } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const DEMO_GRADES = [
  {
    id: 328,
    userId: 1,
    studentId: 8,
    assessmentId: 9,
    score: 60,
    pointsEarned: 60,
    feedback: "Completed Quarter 1. Answered 3 of 5 questions correctly on the first attempt.",
    createdAt: "2026-11-08T15:55:03.063Z",
    updatedAt: "2026-11-08T15:55:03.063Z",
    studentName: "Sofia Lim",
    studentNumber: "2026-008",
    assessmentTitle: "Cognitive Maze - Quarter 1 Assessment",
    quarter: "Quarter 1",
  },
  {
    id: 329,
    userId: 1,
    studentId: 8,
    assessmentId: 10,
    score: 20,
    pointsEarned: 20,
    feedback: "Completed Quarter 2 (Barangay Geometry). Answered 1 of 5 questions correctly on the first attempt.",
    createdAt: "2026-11-08T15:56:45.670Z",
    updatedAt: "2026-11-08T15:56:45.670Z",
    studentName: "Sofia Lim",
    studentNumber: "2026-008",
    assessmentTitle: "Cognitive Maze - Quarter 2 Assessment",
    quarter: "Quarter 2",
  },
  {
    id: 330,
    userId: 1,
    studentId: 8,
    assessmentId: 11,
    score: 20,
    pointsEarned: 20,
    feedback: "Completed Quarter 3 (Math Explorations). Answered 1 of 5 questions correctly on the first attempt.",
    createdAt: "2026-11-08T16:28:27.444Z",
    updatedAt: "2026-11-08T16:28:27.444Z",
    studentName: "Sofia Lim",
    studentNumber: "2026-008",
    assessmentTitle: "Cognitive Maze - Quarter 3 Assessment",
    quarter: "Quarter 3",
  },
  {
    id: 331,
    userId: 1,
    studentId: 8,
    assessmentId: 12,
    score: 0,
    pointsEarned: 0,
    feedback: "Completed Summative Assessment (Water Temple). Answered 0 of 1 questions correctly on the first attempt.",
    createdAt: "2026-11-08T16:29:02.975Z",
    updatedAt: "2026-11-08T16:29:02.975Z",
    studentName: "Sofia Lim",
    studentNumber: "2026-008",
    assessmentTitle: "Cognitive Maze - Summative Assessment",
    quarter: "Summative",
  },
  {
    id: 332,
    userId: 1,
    studentId: 4,
    assessmentId: 9,
    score: 100,
    pointsEarned: 100,
    feedback: "Completed Quarter 1. Answered 5 of 5 questions correctly on the first attempt.",
    createdAt: "2026-11-08T14:30:00.000Z",
    updatedAt: "2026-11-08T14:30:00.000Z",
    studentName: "Ana Mendoza",
    studentNumber: "2026-004",
    assessmentTitle: "Cognitive Maze - Quarter 1 Assessment",
    quarter: "Quarter 1",
  },
];

const globalForGrades = globalThis as typeof globalThis & {
  __inMemoryGrades?: any[];
};

function getFallbackGrades(): any[] {
  if (!globalForGrades.__inMemoryGrades) {
    globalForGrades.__inMemoryGrades = [...DEMO_GRADES];
  }
  return globalForGrades.__inMemoryGrades;
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const isTeacher = sessionUser && sessionUser.role === "teacher" && !(sessionUser as any).isGameClient;

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
        studentNumber: students.studentId,
        assessmentTitle: assessments.title,
        quarter: units.quarter,
      })
      .from(grades)
      .innerJoin(students, eq(grades.studentId, students.id))
      .leftJoin(assessments, eq(grades.assessmentId, assessments.id))
      .leftJoin(units, eq(assessments.unitId, units.id));

    const data = isTeacher
      ? await query.where(
          or(
            eq(grades.userId, userId),
            isNull(grades.userId),
            eq(students.userId, userId),
            isNull(students.userId)
          )
        )
      : await query;

    return NextResponse.json(data);
  } catch (error) {
    console.warn("Grades DB offline, returning demo grades list");
    return NextResponse.json(getFallbackGrades());
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
    if (!rawStudentId || isNaN(rawStudentId) || rawStudentId <= 0) {
      return NextResponse.json({ error: "A valid positive studentId is required." }, { status: 400 });
    }

    const assessmentId = Number(body.assessmentId);
    if (!assessmentId || isNaN(assessmentId) || assessmentId <= 0) {
      return NextResponse.json({ error: "A valid positive assessmentId is required." }, { status: 400 });
    }

    // Resolve student record to ensure valid foreign key
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

    const score = Number.isFinite(Number(body.score)) ? Math.max(0, Math.min(100, Number(body.score))) : 0;
    const pointsEarned = Number.isFinite(Number(body.pointsEarned)) ? Number(body.pointsEarned) : score;

    const payload = {
      ...body,
      studentId: resolvedStudentId,
      assessmentId,
      score,
      pointsEarned,
      feedback: String(body.feedback || ""),
      userId: effectiveUserId,
    };

    try {
      const existingGrade = await db
        .select()
        .from(grades)
        .where(and(eq(grades.studentId, payload.studentId), eq(grades.assessmentId, payload.assessmentId)))
        .limit(1);

      if (existingGrade.length > 0) {
        if (payload.score >= Number(existingGrade[0].score)) {
          const updated = await db
            .update(grades)
            .set({
              score: payload.score,
              pointsEarned: payload.pointsEarned,
              feedback: payload.feedback || existingGrade[0].feedback,
              updatedAt: new Date(),
            })
            .where(eq(grades.id, existingGrade[0].id))
            .returning();
          return NextResponse.json(updated[0]);
        }
        return NextResponse.json(existingGrade[0]);
      }

      const result = await db.insert(grades).values(payload).returning();
      return NextResponse.json(result[0]);
    } catch (dbErr) {
      console.warn("Grades DB offline on create, saving to memory fallback list");
      const list = getFallbackGrades();
      const nextId = list.reduce((max, g) => Math.max(max, Number(g.id) || 0), 0) + 1;
      const newGrade = {
        id: nextId,
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      list.push(newGrade);
      return NextResponse.json(newGrade);
    }
  } catch (error) {
    console.error("Grades create error", error);
    return NextResponse.json({ error: "Failed to create grade" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON request body." }, { status: 400 });
  }

  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const id = Number(body.id);

    if (!id || isNaN(id) || id <= 0) {
      return NextResponse.json({ error: "A valid Grade ID is required." }, { status: 400 });
    }

    const { id: _id, ...rest } = body;
    const whereClause = isAdmin
      ? eq(grades.id, id)
      : and(eq(grades.id, id), eq(grades.userId, userId));

    try {
      const result = await db.update(grades).set(rest).where(whereClause).returning();
      return NextResponse.json(result[0] || { id, ...rest });
    } catch {
      console.warn("Grades DB offline on update, updating memory fallback list");
      const list = getFallbackGrades();
      const idx = list.findIndex(g => g.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...rest, id };
        return NextResponse.json(list[idx]);
      }
      return NextResponse.json({ id, ...rest });
    }
  } catch (error) {
    console.error("Grades update error", error);
    return NextResponse.json({ error: "Failed to update grade" }, { status: 500 });
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
        const allGrades = await db.select({ id: grades.id, studentId: grades.studentId }).from(grades);
        const orphaned = allGrades.filter((g) => !validStudentIds.has(g.studentId));

        for (const item of orphaned) {
          await db.delete(grades).where(eq(grades.id, item.id));
        }

        return NextResponse.json({
          success: true,
          message: `Cleaned up ${orphaned.length} orphaned grades.`,
          deletedCount: orphaned.length,
        });
      } catch (cleanErr) {
        console.warn("Orphaned grades cleanup error:", cleanErr);
        return NextResponse.json({ success: true, deletedCount: 0 });
      }
    }

    if (studentIdParam) {
      const studentId = Number(studentIdParam);
      if (!studentId || isNaN(studentId) || studentId <= 0) {
        return NextResponse.json({ error: "A valid positive studentId is required." }, { status: 400 });
      }

      const whereClause = isAdmin
        ? eq(grades.studentId, studentId)
        : and(eq(grades.studentId, studentId), eq(grades.userId, userId));

      try {
        await db.delete(grades).where(whereClause);
      } catch (delErr) {
        console.warn("Grades delete by studentId error:", delErr);
      }

      if (globalForGrades.__inMemoryGrades) {
        globalForGrades.__inMemoryGrades = globalForGrades.__inMemoryGrades.filter(
          (g) => g.studentId !== studentId
        );
      }

      return NextResponse.json({ success: true, deletedStudentId: studentId });
    }

    if (idParam) {
      const id = Number(idParam);
      if (!id || isNaN(id) || id <= 0) {
        return NextResponse.json({ error: "A valid Grade ID is required." }, { status: 400 });
      }

      const whereClause = isAdmin
        ? eq(grades.id, id)
        : and(eq(grades.id, id), eq(grades.userId, userId));

      try {
        await db.delete(grades).where(whereClause);
      } catch {
        console.warn("Grades DB offline on delete, removing from memory fallback list");
      }

      const list = getFallbackGrades();
      globalForGrades.__inMemoryGrades = list.filter((g) => g.id !== id);

      return NextResponse.json({ success: true, deletedId: id });
    }

    return NextResponse.json(
      { error: "Missing parameter: provide id, studentId, or cleanOrphaned=true" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Grades delete error", error);
    return NextResponse.json({ error: "Failed to delete grade" }, { status: 500 });
  }
}

