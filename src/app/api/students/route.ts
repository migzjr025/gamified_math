import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { students } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

function computeAge(birthdayStr?: string | null): number | null {
  if (!birthdayStr) return null;
  const birthDate = new Date(birthdayStr);
  if (isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

const DEMO_STUDENTS = [
  { id: 1, studentId: "2026-001", fullName: "Juan Dela Cruz", birthday: "2018-05-14", age: 8, gradeLevel: "Grade 2", section: "A", gender: "Male", avatarColor: "#f97316" },
  { id: 2, studentId: "2026-002", fullName: "Maria Santos", birthday: "2018-09-20", age: 8, gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#ec4899" },
  { id: 3, studentId: "2026-003", fullName: "Pedro Garcia", birthday: "2018-02-11", age: 8, gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#3b82f6" },
  { id: 4, studentId: "2026-004", fullName: "Ana Mendoza", birthday: "2018-11-05", age: 7, gradeLevel: "Grade 2", section: "B", gender: "Female", avatarColor: "#10b981" },
  { id: 5, studentId: "2026-005", fullName: "Carlos Reyes", birthday: "2019-04-18", age: 7, gradeLevel: "Grade 1", section: "A", gender: "Male", avatarColor: "#8b5cf6" },
  { id: 6, studentId: "2026-006", fullName: "Elena Ramos", birthday: "2019-08-30", age: 7, gradeLevel: "Grade 1", section: "A", gender: "Female", avatarColor: "#f43f5e" },
  { id: 7, studentId: "2026-007", fullName: "Jose Villanueva", birthday: "2018-07-22", age: 8, gradeLevel: "Grade 2", section: "B", gender: "Male", avatarColor: "#14b8a6" },
  { id: 8, studentId: "2026-008", fullName: "Sofia Lim", birthday: "2018-12-14", age: 7, gradeLevel: "Grade 2", section: "A", gender: "Female", avatarColor: "#eab308" },
];

export interface InMemStudent {
  id: number;
  studentId: string;
  fullName: string;
  birthday?: string | null;
  age?: number | null;
  gradeLevel: string;
  section: string;
  gender: string;
  avatarColor: string;
  userId?: number;
}

const globalForStudents = globalThis as typeof globalThis & {
  __inMemoryStudents?: InMemStudent[];
};

function getFallbackStudents(): InMemStudent[] {
  if (!globalForStudents.__inMemoryStudents) {
    globalForStudents.__inMemoryStudents = [...DEMO_STUDENTS];
  }
  return globalForStudents.__inMemoryStudents;
}

function normalizeStudentId(rawId: string | null | undefined, fallbackIndex: number = 0): string {
  let id = String(rawId || "").trim();
  if (!id) {
    return `2026-${String(fallbackIndex + 1).padStart(3, "0")}`;
  }
  // Strip S- or s- prefix (e.g. S-2024-001 -> 2024-001)
  if (/^s-/i.test(id)) {
    id = id.replace(/^s-/i, "").trim();
  }
  // If it's pure digits like "1", "11", "12" -> convert to 2026-001, 2026-011, 2026-012
  if (/^\d{1,3}$/.test(id)) {
    return `2026-${id.padStart(3, "0")}`;
  }
  // If it has a year prefix (e.g. 2024-001), modernize to 2026-001
  if (/^\d{4}-\d{3,}$/.test(id)) {
    return id.replace(/^\d{4}-/, "2026-");
  }
  return id;
}

export async function GET(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";

    const data = isAdmin
      ? await db.select().from(students)
      : await db.select().from(students).where(eq(students.userId, userId));

    const enriched = data.map((s, idx) => ({
      ...s,
      studentId: normalizeStudentId(s.studentId, idx),
      age: s.age ?? computeAge(s.birthday),
    }));

    // Auto-migrate legacy IDs in the database so they persist permanently
    for (const s of data) {
      const normalized = normalizeStudentId(s.studentId);
      if (normalized !== s.studentId) {
        db.update(students).set({ studentId: normalized }).where(eq(students.id, s.id)).catch(() => {});
      }
    }

    return NextResponse.json(enriched.length > 0 ? enriched : getFallbackStudents());
  } catch (error) {
    console.warn("Students DB offline, using demo fallback data");
    return NextResponse.json(getFallbackStudents());
  }
}

export async function POST(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const body = await req.json();
    const fullName = String(body.fullName || "").trim();
    const birthday = body.birthday ? String(body.birthday).trim() : null;
    let age = body.age === null || body.age === undefined || body.age === "" ? null : Number(body.age);

    if (birthday && (age === null || isNaN(age))) {
      age = computeAge(birthday);
    }

    if (!fullName) {
      return NextResponse.json({ error: "Student name is required." }, { status: 400 });
    }
    if (age !== null && (!Number.isInteger(age) || age < 0)) {
      return NextResponse.json({ error: "Age must be a non-negative whole number." }, { status: 400 });
    }

    const { id: _ignoreId, ...insertData } = body;

    let studentId = String(body.studentId || "").trim();

    if (!studentId) {
      const currentYear = new Date().getFullYear();
      try {
        const existingList = await db.select({ studentId: students.studentId }).from(students);
        let maxSeq = 0;
        for (const item of existingList) {
          const m = item.studentId?.match(/(\d{4})-(\d+)/);
          if (m && parseInt(m[1], 10) === currentYear) {
            const seq = parseInt(m[2], 10);
            if (seq > maxSeq) maxSeq = seq;
          }
        }
        studentId = `${currentYear}-${String(maxSeq + 1).padStart(3, "0")}`;
      } catch {
        studentId = `${currentYear}-001`;
      }
    }

    const STUDENT_ID_REGEX = /^\d{4}-\d{3,}$/;
    if (!STUDENT_ID_REGEX.test(studentId)) {
      return NextResponse.json({
        error: "Invalid format! Must follow YYYY-001 (e.g. 2026-001)",
      }, { status: 400 });
    }

    try {
      const duplicateCheck = await db.select().from(students).where(eq(students.studentId, studentId)).limit(1);
      if (duplicateCheck.length > 0) {
        return NextResponse.json({
          error: `Student ID "${studentId}" is already registered.`,
        }, { status: 409 });
      }

      const result = await db.insert(students).values({
        ...insertData,
        studentId,
        fullName,
        birthday,
        age,
        userId,
      }).returning();

      return NextResponse.json(result[0]);
    } catch (dbErr: any) {
      if (dbErr?.code === "23505" || String(dbErr?.message || "").toLowerCase().includes("unique")) {
        return NextResponse.json({
          error: `Student ID "${studentId}" is already registered.`,
        }, { status: 409 });
      }
      const list = getFallbackStudents();
      if (list.some((s) => s.studentId.toLowerCase() === studentId.toLowerCase())) {
        return NextResponse.json({
          error: `Student ID "${studentId}" is already registered.`,
        }, { status: 409 });
      }
      const nextId = list.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
      const newStudent: InMemStudent = {
        id: nextId,
        studentId,
        fullName,
        birthday,
        age,
        userId,
        gradeLevel: body.gradeLevel || "Grade 2",
        section: body.section || "A",
        gender: body.gender || "Male",
        avatarColor: body.avatarColor || "#6366f1",
      };
      list.push(newStudent);
      console.warn("Students DB offline during create, saved into memory fallback list:", newStudent.studentId);
      return NextResponse.json(newStudent);
    }
  } catch (error) {
    console.error("Students create error", error);
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    const userId = sessionUser?.id || 1;
    const isAdmin = sessionUser?.role === "admin";
    const body = await req.json();
    const { id, ...rest } = body;

    if (rest.studentId) {
      rest.studentId = String(rest.studentId).trim();
      const STUDENT_ID_REGEX = /^\d{4}-\d{3,}$/;
      if (!STUDENT_ID_REGEX.test(rest.studentId)) {
        return NextResponse.json({
          error: "Invalid format! Must follow YYYY-001 (e.g. 2026-001)",
        }, { status: 400 });
      }
      try {
        const duplicateCheck = await db.select().from(students).where(eq(students.studentId, rest.studentId)).limit(1);
        if (duplicateCheck.length > 0 && duplicateCheck[0].id !== id) {
          return NextResponse.json({
            error: `Student ID "${rest.studentId}" is already assigned to another student.`,
          }, { status: 409 });
        }
      } catch (checkErr: any) {
        if (checkErr?.code === "23505" || String(checkErr?.message || "").toLowerCase().includes("unique")) {
          return NextResponse.json({
            error: `Student ID "${rest.studentId}" is already assigned to another student.`,
          }, { status: 409 });
        }
        const list = getFallbackStudents();
        if (list.some((s) => s.studentId === rest.studentId && s.id !== id)) {
          return NextResponse.json({
            error: `Student ID "${rest.studentId}" is already assigned to another student.`,
          }, { status: 409 });
        }
      }
    }

    if (rest.birthday !== undefined) {
      rest.birthday = rest.birthday ? String(rest.birthday).trim() : null;
      if (rest.age === null || rest.age === undefined || rest.age === "") {
        rest.age = computeAge(rest.birthday);
      }
    }

    if ("age" in rest && rest.age !== null && rest.age !== undefined && rest.age !== "") {
      const parsedAge = Number(rest.age);
      if (!Number.isInteger(parsedAge) || parsedAge < 0) {
        return NextResponse.json({ error: "Age must be a non-negative whole number." }, { status: 400 });
      }
      rest.age = parsedAge;
    }

    const whereClause = isAdmin
      ? eq(students.id, id)
      : and(eq(students.id, id), eq(students.userId, userId));

    try {
      const result = await db.update(students).set(rest).where(whereClause).returning();
      return NextResponse.json(result[0] || { id, ...rest });
    } catch (dbErr: any) {
      if (dbErr?.code === "23505" || String(dbErr?.message || "").toLowerCase().includes("unique")) {
        return NextResponse.json({
          error: `Student ID "${rest.studentId}" is already assigned to another student.`,
        }, { status: 409 });
      }
      console.warn("Students DB offline during update, updating memory fallback list");
      const list = getFallbackStudents();
      const idx = list.findIndex((s) => s.id === id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...rest, id };
        return NextResponse.json(list[idx]);
      }
      return NextResponse.json({ id, ...rest });
    }
  } catch (error) {
    console.error("Students update error", error);
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const sessionUser = await getSessionUser(req);
    if (!sessionUser || (sessionUser as any).isGameClient) {
      return NextResponse.json({
        error: "Unauthorized. Teacher or administrator credentials required to delete student profiles.",
      }, { status: 401 });
    }
    const userId = sessionUser.id;
    const isAdmin = sessionUser.role === "admin";
    const body = await req.json();

    const whereClause = isAdmin
      ? eq(students.id, body.id)
      : and(eq(students.id, body.id), eq(students.userId, userId));

    try {
      await db.delete(students).where(whereClause);
    } catch {
      console.warn("Students DB offline during delete, removing from memory fallback list");
      const targetId = Number(body.id);
      globalForStudents.__inMemoryStudents = getFallbackStudents().filter((s) => s.id !== targetId);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Students delete error", error);
    return NextResponse.json({ error: "Failed to delete student" }, { status: 500 });
  }
}

