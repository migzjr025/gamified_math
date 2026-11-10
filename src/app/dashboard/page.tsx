import { requireAuth } from "@/lib/auth";
import DashboardInteractive from "@/components/DashboardInteractive";
import { db } from "@/db";
import { students, grades, assessments, units } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireAuth();

  let totalStudents = 0;
  let totalGrades = 0;
  let avgScore = 0;
  let totalUnits = 0;
  let recentGrades: Array<{ score: number; studentName: string; assessmentTitle: string; createdAt: string }> = [];
  let topStudents: Array<{ idStr: string; name: string; avg: number }> = [];

  const isAdmin = user.role === "admin";
  const userId = user.id;

  try {
    const totalStudentsRes = isAdmin
      ? await db.select({ count: sql<number>`count(*)` }).from(students)
      : await db.select({ count: sql<number>`count(*)` }).from(students).where(sql`${students.userId} = ${userId} or ${students.userId} is null`);

    const totalGradesRes = isAdmin
      ? await db.select({ count: sql<number>`count(*)` }).from(grades)
      : await db.select({ count: sql<number>`count(*)` }).from(grades).where(sql`${grades.userId} = ${userId} or ${grades.userId} is null or ${grades.userId} = 1`);

    const avgScoreRes = isAdmin
      ? await db.select({ avg: sql<number>`avg(score)` }).from(grades)
      : await db.select({ avg: sql<number>`avg(score)` }).from(grades).where(sql`${grades.userId} = ${userId} or ${grades.userId} is null or ${grades.userId} = 1`);

    const totalUnitsRes = await db.select({ count: sql<number>`count(*)` }).from(units);

    totalStudents = Number(totalStudentsRes[0]?.count ?? 0);
    totalGrades = Number(totalGradesRes[0]?.count ?? 0);
    avgScore = totalGrades > 0 && avgScoreRes[0]?.avg != null && !isNaN(Number(avgScoreRes[0]?.avg))
      ? Number(Number(avgScoreRes[0]?.avg).toFixed(1))
      : 0;
    totalUnits = Number(totalUnitsRes[0]?.count ?? 0);

    const recentGradesQuery = isAdmin
      ? db.select().from(grades).orderBy(sql`${grades.id} desc`).limit(8)
      : db.select().from(grades).where(sql`${grades.userId} = ${userId} or ${grades.userId} is null or ${grades.userId} = 1`).orderBy(sql`${grades.id} desc`).limit(8);

    const recentGradesRaw = await recentGradesQuery;
    recentGrades = await Promise.all(recentGradesRaw.map(async (g) => {
      const s = await db.select({ fullName: students.fullName }).from(students).where(sql`${students.id} = ${g.studentId}`).limit(1);
      const a = await db.select({ title: assessments.title }).from(assessments).where(sql`${assessments.id} = ${g.assessmentId}`).limit(1);
      return { score: g.score, studentName: s[0]?.fullName ?? "Unknown", assessmentTitle: a[0]?.title ?? "Unknown", createdAt: g.createdAt ? new Date(g.createdAt).toISOString() : "Unknown" };
    }));

    const allStudents = isAdmin
      ? await db.select().from(students)
      : await db.select().from(students).where(sql`${students.userId} = ${userId} or ${students.userId} is null`);

    const allGradesMap = isAdmin
      ? await db.select({ studentId: grades.studentId, score: grades.score }).from(grades)
      : await db.select({ studentId: grades.studentId, score: grades.score }).from(grades).where(sql`${grades.userId} = ${userId} or ${grades.userId} is null or ${grades.userId} = 1`);

    const studentAvg = new Map<number, { name: string; avg: number; idStr: string }>();
    for (const s of allStudents) {
      const scores = allGradesMap.filter((g) => g.studentId === s.id).map((g) => g.score ?? 0);
      const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      studentAvg.set(s.id, { name: s.fullName, avg, idStr: s.studentId });
    }
    topStudents = Array.from(studentAvg.values())
      .filter((s) => s.avg > 0)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 3);
  } catch (error) {
    console.warn("Dashboard data unavailable", error);
  }

  return (
    <DashboardInteractive
      userName={user.name}
      role={user.role}
      totalStudents={totalStudents}
      totalGrades={totalGrades}
      avgScore={avgScore}
      totalUnits={totalUnits}
      recentGrades={recentGrades}
      topStudents={topStudents}
    />
  );
}
