"use client";

import React, { useState, useMemo } from "react";
import {
  Award,
  Sparkles,
  Printer,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Shapes,
  Coins,
  Sun,
  Clock,
  ChevronRight,
  BookOpen,
  ArrowUpRight,
} from "lucide-react";
import { StudentGroup, GradeRow } from "./grades/types";

interface CompetencyMatrixViewProps {
  students: StudentGroup[];
  onSelectStudent: (studentId: number) => void;
  availableGrades: string[];
  availableSections: string[];
}

interface QuarterDefinition {
  quarterIndex: number;
  shortLabel: string;
  title: string;
  theme: string;
  competencyCode: string;
  competencies: string[];
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  borderClass: string;
}

const MATATAG_QUARTERS: QuarterDefinition[] = [
  {
    quarterIndex: 1,
    shortLabel: "Q1",
    title: "2D & 3D Shapes and Spatial Patterns",
    theme: "Forest of Shapes",
    competencyCode: "M2GE-IIIa-1",
    competencies: [
      "Identifies 2D shapes (circle, square, triangle, diamond, star)",
      "Distinguishes 2D from 3D objects (cube, sphere, cylinder, cone)",
      "Recognizes repeating geometric sequences & symmetry lines",
    ],
    icon: Shapes,
    accentColor: "from-blue-500 to-indigo-600",
    borderClass: "border-indigo-500/30",
  },
  {
    quarterIndex: 2,
    shortLabel: "Q2",
    title: "Philippine Money & Real-World Addition",
    theme: "Barangay Fiesta Market",
    competencyCode: "M2NS-IIf-38",
    competencies: [
      "Recognizes coins & bills up to ₱100 in denominations",
      "Adds and subtracts numbers with regrouping in context",
      "Solves routine word problems involving currency transactions",
    ],
    icon: Coins,
    accentColor: "from-amber-500 to-yellow-600",
    borderClass: "border-amber-500/30",
  },
  {
    quarterIndex: 3,
    shortLabel: "Q3",
    title: "Fractions, Linear Measurement & Geometry",
    theme: "Sun Temple Exploration",
    competencyCode: "M2NS-IIIb-72",
    competencies: [
      "Understands unit fractions (1/2, 1/3, 1/4) of whole objects & sets",
      "Compares and estimates lengths using standard metric units (cm, m)",
      "Determines geometric symmetry & basic area tiling",
    ],
    icon: Sun,
    accentColor: "from-emerald-500 to-teal-600",
    borderClass: "border-emerald-500/30",
  },
  {
    quarterIndex: 4,
    shortLabel: "Q4",
    title: "Time, Calendar & Data Interpretation",
    theme: "Clocktower Castle (Summative)",
    competencyCode: "M2ME-IVa-1",
    competencies: [
      "Reads and writes time on analog & digital clocks (hour & half hour)",
      "Calculates elapsed time in days, weeks, and calendar months",
      "Interprets basic pictographs and bar tables with scales",
    ],
    icon: Clock,
    accentColor: "from-violet-500 to-purple-600",
    borderClass: "border-violet-500/30",
  },
];

function getGradeForQuarter(grades: GradeRow[], quarterIndex: number): GradeRow | undefined {
  return grades.find((g) => {
    const qStr = String(g.quarter || "").toLowerCase();
    const t = (g.assessmentTitle || "").toLowerCase();

    if (quarterIndex === 1) {
      return qStr.includes("1") || qStr === "quarter 1" || t.includes("quarter 1") || t.includes("q1") || t.includes("shapes");
    }
    if (quarterIndex === 2) {
      return qStr.includes("2") || qStr === "quarter 2" || t.includes("quarter 2") || t.includes("q2") || t.includes("market") || t.includes("fiesta");
    }
    if (quarterIndex === 3) {
      return qStr.includes("3") || qStr === "quarter 3" || t.includes("quarter 3") || t.includes("q3") || t.includes("temple");
    }
    if (quarterIndex === 4) {
      return (
        qStr.includes("4") ||
        qStr.includes("summative") ||
        qStr === "final" ||
        t.includes("summative") ||
        t.includes("quarter 4") ||
        t.includes("water") ||
        t.includes("clocktower")
      );
    }
    return false;
  });
}

function getMasteryTier(score: number): {
  level: "mastered" | "developing" | "support";
  label: string;
  badgeClass: string;
  tileBg: string;
  tileBorder: string;
  textColor: string;
} {
  if (score >= 85) {
    return {
      level: "mastered",
      label: "Mastered",
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-400/40",
      tileBg: "bg-emerald-500/15 hover:bg-emerald-500/25",
      tileBorder: "border-emerald-500/40",
      textColor: "text-emerald-300",
    };
  }
  if (score >= 75) {
    return {
      level: "developing",
      label: "Developing",
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-400/40",
      tileBg: "bg-amber-500/15 hover:bg-amber-500/25",
      tileBorder: "border-amber-500/40",
      textColor: "text-amber-300",
    };
  }
  return {
    level: "support",
    label: "Needs Support",
    badgeClass: "bg-rose-500/20 text-rose-300 border-rose-400/40",
    tileBg: "bg-rose-500/15 hover:bg-rose-500/25",
    tileBorder: "border-rose-500/40",
    textColor: "text-rose-300",
  };
}

export default function CompetencyMatrixView({
  students,
  onSelectStudent,
  availableGrades,
  availableSections,
}: CompetencyMatrixViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGrade, setSelectedGrade] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedTier, setSelectedTier] = useState<"all" | "mastered" | "developing" | "support">("all");
  const [activeQuarterFilter, setActiveQuarterFilter] = useState<number | "all">("all");

  // Filtered Students for the Heatmap
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchesName = s.studentName.toLowerCase().includes(q);
        const matchesId = s.studentNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesId) return false;
      }
      // Grade filter
      if (selectedGrade !== "all" && s.gradeLevel !== selectedGrade) return false;
      // Section filter
      if (selectedSection !== "all" && s.section !== selectedSection) return false;

      // Tier filter
      if (selectedTier !== "all") {
        const tier = getMasteryTier(s.averageScore).level;
        if (tier !== selectedTier) return false;
      }

      return true;
    });
  }, [students, searchTerm, selectedGrade, selectedSection, selectedTier]);

  // Overall Class Statistics
  const overallStats = useMemo(() => {
    if (students.length === 0) {
      return {
        classAverage: 0,
        masteredCount: 0,
        developingCount: 0,
        supportCount: 0,
        masteredPercent: 0,
        developingPercent: 0,
        supportPercent: 0,
      };
    }

    const avg = Math.round(students.reduce((sum, s) => sum + s.averageScore, 0) / students.length);
    let mastered = 0;
    let developing = 0;
    let support = 0;

    students.forEach((s) => {
      const tier = getMasteryTier(s.averageScore).level;
      if (tier === "mastered") mastered++;
      else if (tier === "developing") developing++;
      else support++;
    });

    return {
      classAverage: avg,
      masteredCount: mastered,
      developingCount: developing,
      supportCount: support,
      masteredPercent: Math.round((mastered / students.length) * 100),
      developingPercent: Math.round((developing / students.length) * 100),
      supportPercent: Math.round((support / students.length) * 100),
    };
  }, [students]);

  // Per-Quarter Aggregated Performance
  const quarterStats = useMemo(() => {
    return MATATAG_QUARTERS.map((qDef) => {
      const gradesInQuarter: number[] = [];
      let mastered = 0;
      let developing = 0;
      let support = 0;

      students.forEach((s) => {
        const grade = getGradeForQuarter(s.grades, qDef.quarterIndex);
        if (grade) {
          const score = Number(grade.score);
          gradesInQuarter.push(score);
          if (score >= 85) mastered++;
          else if (score >= 75) developing++;
          else support++;
        }
      });

      const avg = gradesInQuarter.length > 0
        ? Math.round(gradesInQuarter.reduce((a, b) => a + b, 0) / gradesInQuarter.length)
        : 0;

      const totalEvaluated = gradesInQuarter.length;
      return {
        ...qDef,
        averageScore: avg,
        totalEvaluated,
        masteredCount: mastered,
        developingCount: developing,
        supportCount: support,
        masteredPercent: totalEvaluated > 0 ? Math.round((mastered / totalEvaluated) * 100) : 0,
      };
    });
  }, [students]);

  // Print trigger
  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-8 animate-fade-up">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-indigo-300 text-xs font-bold mb-2">
            <Sparkles size={14} className="text-indigo-400" />
            <span>Matatag Mathematics Curriculum Grade 2</span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-white">
            Class Competency Matrix & Mastery Heatmap
          </h2>
          <p className="text-slate-400 text-sm mt-1 max-w-2xl">
            Interactive visual matrix mapping student progression across Quarters 1–4. Click any tile or student to open their detailed diagnostic report.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto print:hidden">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-sm transition cursor-pointer shadow-md hover:scale-[1.02]"
            title="Print formal DepEd Competency Matrix report"
          >
            <Printer size={16} className="text-indigo-400" />
            <span>Print DepEd Matrix</span>
          </button>
        </div>
      </div>

      {/* 2. Class Mastery Distribution KPI Cards (Visual Generative UI) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Class Mastery Index with SVG Progress Ring */}
        <div className="glass-card rounded-2xl p-5 border border-white/10 flex items-center justify-between shadow-xl">
          <div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Class Mastery Index
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-white">{overallStats.classAverage}%</span>
              <span className="text-xs font-bold text-emerald-400">
                {overallStats.classAverage >= 85 ? "High Mastery" : overallStats.classAverage >= 75 ? "Developing" : "Needs Support"}
              </span>
            </div>
            <span className="text-[11px] text-slate-400 mt-1 block">Across {students.length} evaluated students</span>
          </div>
          {/* Circular SVG Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-14 h-14 transform -rotate-90">
              <circle cx="28" cy="28" r="22" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" fill="transparent" />
              <circle
                cx="28"
                cy="28"
                r="22"
                stroke="#10b981"
                strokeWidth="4.5"
                fill="transparent"
                strokeDasharray={2 * Math.PI * 22}
                strokeDashoffset={2 * Math.PI * 22 * (1 - Math.min(100, overallStats.classAverage) / 100)}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <Award size={18} className="absolute text-emerald-400" />
          </div>
        </div>

        {/* KPI 2: Mastered Tier */}
        <div
          onClick={() => setSelectedTier(selectedTier === "mastered" ? "all" : "mastered")}
          className={`glass-card rounded-2xl p-5 border transition-all cursor-pointer ${
            selectedTier === "mastered"
              ? "border-emerald-500/60 ring-2 ring-emerald-500/30 bg-emerald-500/10"
              : "border-white/10 hover:border-emerald-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-emerald-300">Mastered (85%+)</span>
            <CheckCircle2 size={16} className="text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{overallStats.masteredCount}</span>
            <span className="text-xs font-semibold text-slate-400">pupils ({overallStats.masteredPercent}%)</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${overallStats.masteredPercent}%` }} />
          </div>
        </div>

        {/* KPI 3: Developing Tier */}
        <div
          onClick={() => setSelectedTier(selectedTier === "developing" ? "all" : "developing")}
          className={`glass-card rounded-2xl p-5 border transition-all cursor-pointer ${
            selectedTier === "developing"
              ? "border-amber-500/60 ring-2 ring-amber-500/30 bg-amber-500/10"
              : "border-white/10 hover:border-amber-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-amber-300">Developing (75–84%)</span>
            <TrendingUp size={16} className="text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{overallStats.developingCount}</span>
            <span className="text-xs font-semibold text-slate-400">pupils ({overallStats.developingPercent}%)</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${overallStats.developingPercent}%` }} />
          </div>
        </div>

        {/* KPI 4: Needs Support Tier */}
        <div
          onClick={() => setSelectedTier(selectedTier === "support" ? "all" : "support")}
          className={`glass-card rounded-2xl p-5 border transition-all cursor-pointer ${
            selectedTier === "support"
              ? "border-rose-500/60 ring-2 ring-rose-500/30 bg-rose-500/10"
              : "border-white/10 hover:border-rose-500/30"
          }`}
        >
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-bold text-rose-300">Needs Support (&lt;75%)</span>
            <AlertTriangle size={16} className="text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-black text-white">{overallStats.supportCount}</span>
            <span className="text-xs font-semibold text-slate-400">pupils ({overallStats.supportPercent}%)</span>
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-3">
            <div className="h-full bg-rose-500 rounded-full" style={{ width: `${overallStats.supportPercent}%` }} />
          </div>
        </div>
      </div>

      {/* 3. Matatag Quarter Curriculum Competency Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quarterStats.map((q) => {
          const Icon = q.icon;
          const isSelected = activeQuarterFilter === q.quarterIndex;

          return (
            <div
              key={q.quarterIndex}
              onClick={() => setActiveQuarterFilter(isSelected ? "all" : q.quarterIndex)}
              className={`glass-card rounded-2xl p-5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? `ring-2 ring-indigo-400/50 bg-indigo-500/10 ${q.borderClass}`
                  : `border-white/10 hover:border-white/20`
              }`}
            >
              <div>
                {/* Quarter Header */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${q.accentColor} flex items-center justify-center shadow-md text-white`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <span className="text-[11px] font-mono font-bold text-indigo-300 uppercase tracking-wider block">
                        {q.shortLabel} • {q.theme}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">{q.competencyCode}</span>
                    </div>
                  </div>
                  <span className="text-lg font-black text-white">{q.averageScore}%</span>
                </div>

                <h4 className="font-extrabold text-white text-sm leading-snug mb-2 line-clamp-2">{q.title}</h4>

                {/* Competencies bullets */}
                <ul className="space-y-1 mb-4 text-xs text-slate-300">
                  {q.competencies.map((comp, idx) => (
                    <li key={idx} className="flex items-start gap-1.5 text-[11px] text-slate-400 leading-tight">
                      <span className="text-indigo-400 mt-0.5">•</span>
                      <span>{comp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stacked Mini Mastery Bar */}
              <div className="pt-3 border-t border-white/10">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                  <span>Class Mastery</span>
                  <span className="font-bold text-white">{q.masteredPercent}% High</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden flex">
                  {q.totalEvaluated > 0 ? (
                    <>
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${(q.masteredCount / q.totalEvaluated) * 100}%` }}
                        title={`${q.masteredCount} Mastered`}
                      />
                      <div
                        className="bg-amber-500 h-full"
                        style={{ width: `${(q.developingCount / q.totalEvaluated) * 100}%` }}
                        title={`${q.developingCount} Developing`}
                      />
                      <div
                        className="bg-rose-500 h-full"
                        style={{ width: `${(q.supportCount / q.totalEvaluated) * 100}%` }}
                        title={`${q.supportCount} Needs Support`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-800 h-full" />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Interactive Class Mastery Heatmap Table */}
      <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
        {/* Filter Controls Row */}
        <div className="p-4 border-b border-white/10 bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-3 print:hidden">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter by student name or student ID..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 placeholder:text-slate-500"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Grade Filter */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">Grade:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All</option>
                {availableGrades.map((g) => (
                  <option key={g} value={g} className="bg-slate-900">{g}</option>
                ))}
              </select>
            </div>

            {/* Section Filter */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">Section:</span>
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All</option>
                {availableSections.map((sec) => (
                  <option key={sec} value={sec} className="bg-slate-900">{sec}</option>
                ))}
              </select>
            </div>

            {/* Mastery Filter */}
            <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs">
              <span className="text-slate-400">Status:</span>
              <select
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value as any)}
                className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
              >
                <option value="all" className="bg-slate-900">All Statuses</option>
                <option value="mastered" className="bg-slate-900">Mastered (85%+)</option>
                <option value="developing" className="bg-slate-900">Developing (75–84%)</option>
                <option value="support" className="bg-slate-900">Needs Support (&lt;75%)</option>
              </select>
            </div>

            {/* Reset */}
            {(searchTerm || selectedGrade !== "all" || selectedSection !== "all" || selectedTier !== "all") && (
              <button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedGrade("all");
                  setSelectedSection("all");
                  setSelectedTier("all");
                  setActiveQuarterFilter("all");
                }}
                className="px-2.5 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 text-xs font-bold transition cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Heatmap Grid Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/[0.03]">
                <th className="py-3.5 px-6">Learner Profile</th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Shapes size={13} className="text-indigo-400" />
                    <span>Q1: Shapes</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Coins size={13} className="text-amber-400" />
                    <span>Q2: Money</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Sun size={13} className="text-emerald-400" />
                    <span>Q3: Fractions</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">
                  <span className="inline-flex items-center gap-1">
                    <Clock size={13} className="text-purple-400" />
                    <span>Q4: Time (Summative)</span>
                  </span>
                </th>
                <th className="py-3.5 px-4 text-center">Mastery Level</th>
                <th className="py-3.5 px-6 text-right print:hidden">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No students found matching your selected filters.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const initials = student.studentName
                    .split(" ")
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase();

                  const overallTier = getMasteryTier(student.averageScore);

                  return (
                    <tr
                      key={student.studentNumber}
                      onClick={() => onSelectStudent(student.studentId)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Learner Info */}
                      <td className="py-3.5 px-6">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-md shrink-0 ring-1 ring-white/10"
                            style={{ backgroundColor: student.avatarColor || "#6366f1" }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div className="font-extrabold text-white group-hover:text-indigo-300 transition-colors">
                              {student.studentName}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                              <span className="font-mono text-[11px] text-slate-300 font-bold">{student.studentNumber}</span>
                              <span>•</span>
                              <span>{student.gradeLevel} - {student.section}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Q1..Q4 Heatmap Cells */}
                      {[1, 2, 3, 4].map((qIdx) => {
                        const grade = getGradeForQuarter(student.grades, qIdx);

                        if (!grade) {
                          return (
                            <td key={qIdx} className="py-3.5 px-4 text-center">
                              <span className="inline-block px-3 py-1.5 rounded-xl bg-white/[0.03] text-slate-500 border border-white/5 text-xs font-mono">
                                —
                              </span>
                            </td>
                          );
                        }

                        const tier = getMasteryTier(grade.score);
                        return (
                          <td key={qIdx} className="py-3.5 px-4 text-center">
                            <div
                              className={`inline-flex flex-col items-center justify-center min-w-[70px] py-1.5 px-2.5 rounded-xl border ${tier.tileBg} ${tier.tileBorder} shadow-sm transition hover:scale-105`}
                              title={`${grade.assessmentTitle || `Quarter ${qIdx}`}: ${grade.score}% (${tier.label})`}
                            >
                              <span className={`text-xs font-black ${tier.textColor}`}>{grade.score}%</span>
                              <span className="text-[10px] text-slate-400 font-medium">{tier.label}</span>
                            </div>
                          </td>
                        );
                      })}

                      {/* Overall Standing Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold border ${overallTier.badgeClass}`}>
                          {overallTier.level === "mastered" && <CheckCircle2 size={12} />}
                          {overallTier.level === "developing" && <TrendingUp size={12} />}
                          {overallTier.level === "support" && <AlertTriangle size={12} />}
                          <span>{student.averageScore}% • {overallTier.label}</span>
                        </span>
                      </td>

                      {/* View Report Card Button */}
                      <td className="py-3.5 px-6 text-right print:hidden">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectStudent(student.studentId);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-600 transition"
                        >
                          <span>Report</span>
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. DepEd Print Header (Only visible when printing) */}
      <div className="hidden print:block text-slate-900 mt-8 pt-4 border-t-2 border-slate-900">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest font-bold">Republic of the Philippines • Department of Education</p>
          <h1 className="text-lg font-black mt-1">MATATAG MATHEMATICS GRADE 2 COMPETENCY & MASTERY MATRIX</h1>
          <p className="text-xs text-slate-600">Cognitive Quest Evaluation System • School Year 2026–2027</p>
        </div>
        <div className="flex justify-between text-xs font-semibold px-2 mb-4">
          <span>Total Evaluated Students: {students.length}</span>
          <span>Class Mastery Rate: {overallStats.classAverage}%</span>
          <span>Date Generated: {new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}</span>
        </div>
      </div>
    </div>
  );
}

