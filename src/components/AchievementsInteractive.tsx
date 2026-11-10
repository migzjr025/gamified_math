"use client";
import { useEffect, useState } from "react";
import { Search, Trophy, Medal, Crown, Target, TrendingUp, Users } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface Student {
  id: number;
  studentId: string;
  fullName: string;
  gradeLevel: string;
  section: string;
}

interface GameResult {
  studentId: number;
  assessmentId: number;
  score: number;
  correctAnswers: number;
  percentage: number;
}

interface LeaderboardEntry extends Student {
  totalPoints: number;
  gamesPlayed: number;
  averageScore: number;
}

export default function AchievementsClient({ userName, role }: { userName: string; role?: string }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [results, setResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const [studentsResponse, resultsResponse] = await Promise.all([
          fetch("/api/students"),
          fetch("/api/game-results"),
        ]);
        if (!studentsResponse.ok || !resultsResponse.ok) throw new Error("Leaderboard data unavailable");
        const [studentRows, resultRows] = await Promise.all([
          studentsResponse.json(),
          resultsResponse.json(),
        ]);
        setStudents(Array.isArray(studentRows) ? studentRows : []);
        setResults(Array.isArray(resultRows) ? resultRows : []);
      } catch (error) {
        console.error("Leaderboard load failed", error);
      } finally {
        setLoading(false);
      }
    }

    void loadLeaderboard();
  }, []);

  const activeStudentIds = new Set(students.map((s) => s.id));
  const activeResults = results.filter((r) => activeStudentIds.has(r.studentId));

  // Deduplicate and aggregate best score per assessment/stage (matching game leaderboard logic)
  const bestByStudentAssessment = new Map<number, Map<number, GameResult>>();
  for (const result of activeResults) {
    const assMap = bestByStudentAssessment.get(result.studentId) ?? new Map<number, GameResult>();
    const existing = assMap.get(result.assessmentId);
    if (!existing || Number(result.score ?? 0) > Number(existing.score ?? 0)) {
      assMap.set(result.assessmentId, result);
    }
    bestByStudentAssessment.set(result.studentId, assMap);
  }

  const totals = new Map<number, { points: number; correct: number; percentage: number; plays: number }>();
  for (const [studentId, assMap] of bestByStudentAssessment.entries()) {
    let points = 0;
    let correct = 0;
    let percentageSum = 0;
    let count = 0;
    for (const res of assMap.values()) {
      points += Number(res.score ?? 0);
      correct += Number(res.correctAnswers ?? 0);
      percentageSum += Number(res.percentage ?? 0);
      count += 1;
    }
    totals.set(studentId, {
      points,
      correct,
      percentage: count > 0 ? percentageSum / count : 0,
      plays: count,
    });
  }

  const leaderboard: LeaderboardEntry[] = students
    .map((student) => {
      const total = totals.get(student.id) ?? { points: 0, correct: 0, percentage: 0, plays: 0 };
      return {
        ...student,
        totalPoints: total.points,
        gamesPlayed: total.plays,
        averageScore: total.plays ? total.percentage / total.plays : 0,
      };
    })
    .sort((a, b) => b.totalPoints - a.totalPoints || b.averageScore - a.averageScore || a.fullName.localeCompare(b.fullName));

  const filtered = leaderboard.filter((student) =>
    `${student.fullName} ${student.studentId} ${student.gradeLevel} ${student.section}`
      .toLowerCase()
      .includes(query.toLowerCase()),
  );
  const topThree = leaderboard.slice(0, 3);
  const totalPlays = activeResults.length;
  const classAverage = totalPlays
    ? activeResults.reduce((sum, result) => sum + Number(result.percentage ?? 0), 0) / totalPlays
    : 0;
  const rankStyle = [
    "border-amber-300/40 bg-amber-300/10 text-amber-200",
    "border-slate-300/30 bg-slate-300/10 text-slate-200",
    "border-orange-400/30 bg-orange-400/10 text-orange-200",
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
            <div>
              <div className="flex items-center gap-2 text-amber-300 text-sm font-semibold mb-2">
                <Trophy size={16} /> Student standings
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">Leaderboard</h1>
              <p className="text-slate-400 mt-1">Ranked by total correct answers across game rounds.</p>
            </div>
            <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
              <div className="min-w-24 border-l border-white/15 pl-3">
                <Users size={16} className="text-violet-300 mb-2" />
                <p className="text-xl font-extrabold text-white">{leaderboard.length}</p>
                <p className="text-xs text-slate-400">Students</p>
              </div>
              <div className="min-w-24 border-l border-white/15 pl-3">
                <Target size={16} className="text-teal-300 mb-2" />
                <p className="text-xl font-extrabold text-white">{totalPlays}</p>
                <p className="text-xs text-slate-400">Game rounds</p>
              </div>
              <div className="min-w-24 border-l border-white/15 pl-3">
                <TrendingUp size={16} className="text-amber-300 mb-2" />
                <p className="text-xl font-extrabold text-white">{classAverage.toFixed(0)}%</p>
                <p className="text-xs text-slate-400">Avg. score</p>
              </div>
            </div>
          </header>

          {!loading && topThree.length > 0 && (
            <section aria-label="Top three students" className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
              {topThree.map((student, index) => {
                const place = index + 1;
                const Icon = place === 1 ? Crown : Medal;
                return (
                  <div key={student.id} className={`relative flex items-center gap-4 border p-5 ${place === 1 ? "md:-translate-y-2 border-amber-300/40 bg-amber-300/10" : "border-white/10 bg-white/[0.04]"}`}>
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center border ${rankStyle[index]}`}>
                      <Icon size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs uppercase font-bold text-slate-400">#{place} place</p>
                      <h2 className="truncate text-lg font-extrabold text-white">{student.fullName}</h2>
                      <p className="text-xs text-slate-400">{student.gradeLevel} · Section {student.section}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-2xl font-black text-amber-200">{student.totalPoints}</p>
                      <p className="text-[11px] text-slate-400">points</p>
                    </div>
                  </div>
                );
              })}
            </section>
          )}

          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <h2 className="text-lg font-bold text-white">All students</h2>
              <div className="relative w-full sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300/30 placeholder:text-slate-500" />
              </div>
            </div>
            <div className="overflow-x-auto border-y border-white/10">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase text-slate-400 border-b border-white/10">
                    <th className="py-3 px-3 w-20">Rank</th>
                    <th className="py-3 px-3">Student</th>
                    <th className="py-3 px-3">Class</th>
                    <th className="py-3 px-3 text-right">Points</th>
                    <th className="py-3 px-3 text-right">Rounds</th>
                    <th className="py-3 px-3 text-right">Avg. score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loading ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">Loading leaderboard...</td></tr>
                  ) : filtered.length === 0 ? (
                    <tr><td colSpan={6} className="py-12 text-center text-slate-400">{query ? "No students match your search." : "No students to rank yet."}</td></tr>
                  ) : filtered.map((student) => {
                    const rank = leaderboard.findIndex((entry) => entry.id === student.id) + 1;
                    return (
                      <tr key={student.id} className="hover:bg-white/[0.04]">
                        <td className="py-4 px-3 font-extrabold text-amber-200">{String(rank).padStart(2, "0")}</td>
                        <td className="py-4 px-3">
                          <p className="font-bold text-white">{student.fullName}</p>
                          <p className="text-xs text-slate-500">{student.studentId}</p>
                        </td>
                        <td className="py-4 px-3 text-slate-300">{student.gradeLevel} · {student.section}</td>
                        <td className="py-4 px-3 text-right font-extrabold text-white">{student.totalPoints}</td>
                        <td className="py-4 px-3 text-right text-slate-300">{student.gamesPlayed}</td>
                        <td className="py-4 px-3 text-right font-semibold text-teal-200">{student.averageScore.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
