"use client";

import Link from "next/link";
import { Award, BookOpen, Users, Zap, TrendingUp, Star, Trophy, ArrowRight } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface DashboardInteractiveProps {
  userName: string;
  role?: string;
  totalStudents: number;
  totalGrades: number;
  avgScore: number;
  totalUnits: number;
  recentGrades: Array<{
    score: number;
    studentName: string;
    assessmentTitle: string;
    createdAt: string;
  }>;
  topStudents: Array<{
    idStr: string;
    name: string;
    avg: number;
  }>;
}

export default function DashboardInteractive({
  userName,
  role,
  totalStudents,
  totalGrades,
  avgScore,
  totalUnits,
  recentGrades,
  topStudents,
}: DashboardInteractiveProps) {
  return (
    <div className="min-h-screen flex">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-8 lg:py-10">
          {/* Hero header */}
          <header className="mb-10 animate-fade-up">
            <div className="flex items-center gap-2 text-violet-300 text-sm font-medium mb-2">
              <Award size={16} /> <span>Game Dashboard</span>
            </div>
            <h2 className="text-4xl lg:text-5xl font-extrabold leading-[1.1] tracking-tight bg-gradient-to-r from-white via-violet-100 to-amber-200 bg-clip-text text-transparent mb-3">
              Welcome back, <span className="text-violet-300">{userName}</span>
            </h2>
            <p className="text-slate-400 text-base lg:text-lg max-w-2xl">
              Track student progress through the Matatag Math curriculum. Every grade unlocks new levels, achievements, and rewards.
            </p>
          </header>

          {/* Stats row */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10 animate-fade-up animate-delay-1">
            {[
              { label: "Students", value: String(totalStudents ?? 0), icon: Users, color: "from-violet-500 to-violet-700", sub: "Active learners" },
              { label: "Grades Logged", value: String(totalGrades ?? 0), icon: Zap, color: "from-amber-400 to-amber-600", sub: "Assessments graded" },
              { label: "Avg Score", value: (Number.isFinite(avgScore) ? avgScore : 0).toFixed(1) + "%", icon: TrendingUp, color: "from-teal-400 to-teal-600", sub: "Class average" },
              { label: "Curriculum Units", value: String(totalUnits ?? 0), icon: BookOpen, color: "from-rose-400 to-rose-600", sub: "Matatag units" },
            ].map((s) => (
              <Link key={s.label} href={s.label === "Students" ? "/students" : s.label === "Grades Logged" ? "/grades" : s.label === "Curriculum Units" ? "/units" : "/dashboard"} className="glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-lg`}>
                    <s.icon size={20} className="text-white" />
                  </div>
                  <ArrowRight size={16} className="text-slate-500 group-hover:text-white transition" />
                </div>
                <p className="text-3xl font-extrabold text-white mb-1">{s.value}</p>
                <p className="text-sm font-semibold text-slate-200">{s.label}</p>
                <p className="text-xs text-slate-500">{s.sub}</p>
              </Link>
            ))}
          </section>

          {/* Main content grid */}
          <div className="grid lg:grid-cols-3 gap-6 animate-fade-up animate-delay-2">
            {/* Recent grades */}
            <section className="lg:col-span-2 glass-card rounded-2xl p-6 lg:p-8">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-xl font-extrabold text-white">Recent Grades</h3>
                  <p className="text-sm text-slate-400">Latest student assessments</p>
                </div>
                <Link href="/grades" className="text-sm font-semibold text-violet-300 hover:text-violet-200 flex items-center gap-1">View all <ArrowRight size={14} /></Link>
              </div>
              <div className="divide-y divide-white/10">
                {recentGrades.length === 0 ? (
                  <div className="py-10 text-center text-slate-400">No grades logged yet.</div>
                ) : (
                  recentGrades.map((g, idx) => (
                    <div key={`${g.studentName || "student"}-${idx}`} className="flex items-center gap-4 py-4 hover:bg-white/5 rounded-xl px-2 -mx-2 transition">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-xs font-extrabold shadow-md shrink-0">
                        {(g.studentName || "Student").split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "ST"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">{g.studentName || "Anonymous Learner"}</p>
                        <p className="text-xs text-slate-400 truncate">{g.assessmentTitle || "Quiz"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                          (g.score ?? 0) >= 85 ? "bg-teal-400/15 text-teal-200" : (g.score ?? 0) >= 70 ? "bg-amber-400/15 text-amber-200" : "bg-rose-400/15 text-rose-200"
                        }`}>
                          <Trophy size={12} /> {g.score}%
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Top students + achievements */}
            <aside className="space-y-6">
              <section className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Trophy size={20} className="text-amber-300" />
                  <h3 className="text-lg font-extrabold text-white">Top Learners</h3>
                </div>
                <div className="space-y-4">
                  {topStudents.length === 0 ? (
                    <p className="text-sm text-slate-400">No grades yet.</p>
                  ) : (
                    topStudents.map((s, i) => (
                      <div key={s.idStr} className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-extrabold shadow-md ${i === 0 ? "bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950" : i === 1 ? "bg-gradient-to-br from-slate-200 to-slate-400 text-slate-800" : "bg-gradient-to-br from-amber-700 to-amber-900 text-amber-100"}`}>
                          {i + 1}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                          <p className="text-xs text-slate-400">{Number(s.avg ?? 0).toFixed(0)}% avg</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="glass-card rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Star size={20} className="text-violet-300" />
                  <h3 className="text-lg font-extrabold text-white">Unlocked Badges</h3>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Explorer", color: "bg-violet-500", desc: "First unit" },
                    { label: "Pattern Pro", color: "bg-teal-500", desc: "Project done" },
                    { label: "Data Wizard", color: "bg-rose-500", desc: "Data test" },
                  ].map((b) => (
                    <div key={b.label} className="bg-white/5 border border-white/10 rounded-xl p-3 hover:bg-white/10 transition">
                      <div className={`h-7 w-7 rounded-lg ${b.color} mb-2 shadow-md`} />
                      <p className="text-xs font-bold text-white">{b.label}</p>
                      <p className="text-[10px] text-slate-400">{b.desc}</p>
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

