"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Search,
  Sparkles,
  FileText,
  AlertTriangle,
  X,
  BookOpen,
  Award,
  Calendar,
  CheckCircle2,
  GraduationCap,
  Download,
  Printer,
  Filter,
  RotateCcw,
  Check,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import SidebarNav from "@/components/SidebarNav";

interface GradeRow {
  id: number;
  studentId: number;
  assessmentId: number;
  score: number;
  pointsEarned: number;
  feedback?: string | null;
  studentName?: string;
  studentNumber?: string;
  assessmentTitle?: string;
  assessmentType?: string;
  unitTitle?: string;
  quarter?: string | number | null;
  createdAt?: string | null;
}

interface StudentMeta {
  id: number;
  studentId: string;
  fullName: string;
  gradeLevel?: string;
  section?: string;
  gender?: string;
  avatarColor?: string;
}

interface StudentGroup {
  studentId: number;
  studentName: string;
  studentNumber: string;
  gradeLevel: string;
  section: string;
  avatarColor: string;
  grades: GradeRow[];
  averageScore: number;
  completionCount: number;
  completionPercent: number;
}

interface ToastMessage {
  id: number;
  text: string;
  type: "success" | "error" | "info";
}

function normalizeStudentNumber(raw?: string | null, fallbackId: number = 1): string {
  if (!raw) return `2026-${String(fallbackId).padStart(3, "0")}`;
  let clean = raw.trim();
  if (/^s-/i.test(clean)) {
    clean = clean.replace(/^s-/i, "").trim();
  }
  if (/^\d{4}-\d{3,}$/.test(clean)) {
    return clean.replace(/^\d{4}-/, "2026-");
  }
  if (/^\d{1,3}$/.test(clean)) {
    return `2026-${clean.padStart(3, "0")}`;
  }
  return clean;
}

function getQuarterOrder(title?: string, quarter?: string | number | null): number {
  const qStr = String(quarter || "").toLowerCase();
  if (qStr.includes("1") || qStr === "quarter 1") return 1;
  if (qStr.includes("2") || qStr === "quarter 2") return 2;
  if (qStr.includes("3") || qStr === "quarter 3") return 3;
  if (qStr.includes("summative") || qStr === "final") return 4;

  const t = (title || "").toLowerCase();
  if (t.includes("quarter 1") || t.includes("q1") || t.includes("unit 1")) return 1;
  if (t.includes("quarter 2") || t.includes("q2") || t.includes("unit 2")) return 2;
  if (t.includes("quarter 3") || t.includes("q3") || t.includes("unit 3")) return 3;
  if (t.includes("summative") || t.includes("water temple") || t.includes("final")) return 4;
  return 5;
}

function getScoreRating(score: number): { label: string; badgeClass: string; ratingText: string; toneColor: string } {
  if (score >= 90) {
    return {
      label: `${score}% • Excellent`,
      ratingText: "Outstanding mastery of lesson objectives.",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      toneColor: "#10b981",
    };
  }
  if (score >= 75) {
    return {
      label: `${score}% • Good`,
      ratingText: "Solid understanding and consistent work.",
      badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      toneColor: "#14b8a6",
    };
  }
  if (score >= 60) {
    return {
      label: `${score}% • Passing`,
      ratingText: "Passed the assessment requirement.",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      toneColor: "#f59e0b",
    };
  }
  return {
    label: `${score}% • Needs Practice`,
    ratingText: "Additional practice and teacher guidance needed.",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    toneColor: "#f43f5e",
  };
}

function formatLaymanFeedback(feedback?: string | null): { preview: string; isGameSummary: boolean } {
  if (!feedback || !feedback.trim()) {
    return { preview: "Evaluated successfully", isGameSummary: false };
  }
  const trimmed = feedback.trim();
  const gameMatch = trimmed.match(/Answered (\d+) of (\d+) questions correctly/i);
  if (gameMatch) {
    const correct = Number(gameMatch[1]);
    const total = Number(gameMatch[2]);
    return {
      preview: correct === total ? `Perfect (${correct}/${total} correct)` : `${correct} of ${total} correct`,
      isGameSummary: true,
    };
  }

  const firstLine = trimmed.split("\n")[0];
  return {
    preview: firstLine.length > 40 ? firstLine.slice(0, 37) + "..." : firstLine,
    isGameSummary: false,
  };
}

function getQuarterShortLabel(title?: string, quarter?: string | number | null): string {
  const ord = getQuarterOrder(title, quarter);
  if (ord === 1) return "Q1";
  if (ord === 2) return "Q2";
  if (ord === 3) return "Q3";
  if (ord === 4) return "Summative";
  return "Quiz";
}

export default function GradesClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<StudentMeta[]>([]);
  const [assessments, setAssessments] = useState<{ id: number; title: string }[]>([]);

  // Search & Filter controls (Feature 3)
  const [q, setQ] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  // Modals & Action States
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<GradeRow | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeRow | null>(null);

  // In-App Toast System (Feature 5)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  function showToast(text: string, type: "success" | "error" | "info" = "success") {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3800);
  }

  const [form, setForm] = useState({
    studentId: 1,
    assessmentId: 1,
    score: 85,
    pointsEarned: 85,
    feedback: "",
  });

  async function load() {
    setLoading(true);
    setFetchError("");
    try {
      const [resG, resS, resA] = await Promise.all([
        fetch("/api/grades"),
        fetch("/api/students"),
        fetch("/api/assessments"),
      ]);

      const dataG = resG.ok ? await resG.json() : [];
      const dataS = resS.ok ? await resS.json() : [];
      const dataA = resA.ok ? await resA.json() : [];

      const parsedStudents: StudentMeta[] = Array.isArray(dataS)
        ? dataS.map((s: any) => ({
            id: s.id,
            studentId: normalizeStudentNumber(s.studentId, s.id),
            fullName: s.fullName,
            gradeLevel: s.gradeLevel,
            section: s.section,
            gender: s.gender,
            avatarColor: s.avatarColor,
          }))
        : [];
      const parsedAssessments = Array.isArray(dataA) ? dataA.map((a: any) => ({ id: a.id, title: a.title })) : [];

      setItems(Array.isArray(dataG) ? dataG : []);
      setStudents(parsedStudents);
      setAssessments(parsedAssessments);

      if (parsedStudents.length > 0 && parsedAssessments.length > 0) {
        setForm((prev) => ({
          ...prev,
          studentId: parsedStudents[0].id,
          assessmentId: parsedAssessments[0].id,
        }));
      }
    } catch (err: any) {
      console.error("Grades load failed:", err);
      setFetchError("Unable to load grades. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // Group grades strictly for students who have evaluated activities (No 0-grade rows)
  const studentGroups = useMemo<StudentGroup[]>(() => {
    const studentMetaMap = new Map<number, StudentMeta>();
    const studentByName = new Map<string, StudentMeta>();
    students.forEach((s) => {
      studentMetaMap.set(s.id, s);
      studentByName.set(s.fullName.trim().toLowerCase(), s);
    });

    const grouped = new Map<string, { meta: Partial<StudentGroup>; grades: GradeRow[] }>();

    items.forEach((g) => {
      const cleanName = (g.studentName || `Student #${g.studentId}`).trim();
      const lookupMeta = studentMetaMap.get(g.studentId) || studentByName.get(cleanName.toLowerCase());

      // If registered students are loaded, exclude any orphaned records from deleted students
      if (students.length > 0 && !lookupMeta) {
        return;
      }

      const canonicalName = lookupMeta?.fullName || cleanName;
      const canonicalKey = canonicalName.toLowerCase();
      const canonicalId = lookupMeta?.id || g.studentId;
      const canonicalNumber = normalizeStudentNumber(lookupMeta?.studentId || g.studentNumber, canonicalId);
      const gradeLevel = lookupMeta?.gradeLevel || "Grade 2";
      const section = lookupMeta?.section || "A";
      const avatarColor = lookupMeta?.avatarColor || "#6366f1";

      if (!grouped.has(canonicalKey)) {
        grouped.set(canonicalKey, {
          meta: {
            studentId: canonicalId,
            studentName: canonicalName,
            studentNumber: canonicalNumber,
            gradeLevel,
            section,
            avatarColor,
          },
          grades: [],
        });
      }

      grouped.get(canonicalKey)!.grades.push(g);
    });

    const result: StudentGroup[] = [];

    grouped.forEach((entry) => {
      if (entry.grades.length === 0) return; // Only students with grades

      const sortedGrades = [...entry.grades].sort((a, b) => {
        return getQuarterOrder(a.assessmentTitle, a.quarter) - getQuarterOrder(b.assessmentTitle, b.quarter);
      });

      const avg = sortedGrades.length > 0
        ? Math.round(sortedGrades.reduce((sum, g) => sum + Number(g.score || 0), 0) / sortedGrades.length)
        : 0;

      const quarterGrades = sortedGrades.filter((g) => getQuarterOrder(g.assessmentTitle, g.quarter) <= 3);
      const quarterCount = quarterGrades.length;
      const percent = Math.min(100, Math.round((quarterCount / 3) * 100));

      result.push({
        studentId: entry.meta.studentId || 1,
        studentName: entry.meta.studentName || "Student",
        studentNumber: entry.meta.studentNumber || "2026-001",
        gradeLevel: entry.meta.gradeLevel || "Grade 2",
        section: entry.meta.section || "A",
        avatarColor: entry.meta.avatarColor || "#6366f1",
        grades: sortedGrades,
        averageScore: avg,
        completionCount: quarterCount,
        completionPercent: percent,
      });
    });

    return result.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [items, students]);

  // Extract available Grade and Section options for filter dropdowns (Feature 3)
  const availableGrades = useMemo(() => {
    const set = new Set<string>();
    studentGroups.forEach((g) => {
      if (g.gradeLevel) set.add(g.gradeLevel);
    });
    return Array.from(set).sort();
  }, [studentGroups]);

  const availableSections = useMemo(() => {
    const set = new Set<string>();
    studentGroups.forEach((g) => {
      if (g.section) set.add(g.section);
    });
    return Array.from(set).sort();
  }, [studentGroups]);

  // Filtered Student Groups by Search + Grade + Section + Rating
  const filteredGroups = useMemo(() => {
    return studentGroups.filter((g) => {
      // Search term
      if (q.trim()) {
        const term = q.trim().toLowerCase();
        const matchesName = g.studentName.toLowerCase().includes(term);
        const matchesId = g.studentNumber.toLowerCase().includes(term);
        const matchesQuiz = g.grades.some((item) => (item.assessmentTitle || "").toLowerCase().includes(term));
        if (!matchesName && !matchesId && !matchesQuiz) return false;
      }

      // Grade level filter
      if (filterGrade !== "all" && g.gradeLevel !== filterGrade) {
        return false;
      }

      // Section filter
      if (filterSection !== "all" && g.section !== filterSection) {
        return false;
      }

      // Rating filter
      if (filterRating !== "all") {
        if (filterRating === "excellent" && g.averageScore < 90) return false;
        if (filterRating === "good" && (g.averageScore < 75 || g.averageScore >= 90)) return false;
        if (filterRating === "passing" && (g.averageScore < 60 || g.averageScore >= 75)) return false;
        if (filterRating === "needs_practice" && g.averageScore >= 60) return false;
      }

      return true;
    });
  }, [studentGroups, q, filterGrade, filterSection, filterRating]);

  // Active student for the Report Card modal
  const activeStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return studentGroups.find((g) => g.studentId === selectedStudentId) || null;
  }, [studentGroups, selectedStudentId]);

  // Feature 2: Master Excel Export
  function exportExcel() {
    if (studentGroups.length === 0) {
      showToast("No student grades available to export.", "error");
      return;
    }

    try {
      const rows = studentGroups.map((sg) => {
        const q1 = sg.grades.find((g) => getQuarterOrder(g.assessmentTitle, g.quarter) === 1);
        const q2 = sg.grades.find((g) => getQuarterOrder(g.assessmentTitle, g.quarter) === 2);
        const q3 = sg.grades.find((g) => getQuarterOrder(g.assessmentTitle, g.quarter) === 3);
        const summative = sg.grades.find((g) => getQuarterOrder(g.assessmentTitle, g.quarter) === 4);
        const rating = getScoreRating(sg.averageScore);

        return {
          "Student ID": sg.studentNumber,
          "Student Name": sg.studentName,
          "Grade Level": sg.gradeLevel,
          "Section": sg.section,
          "Curriculum Completed": `${sg.completionCount} of 3 Quarters (${sg.completionPercent}%)`,
          "Quarter 1 (%)": q1 ? Number(q1.score) : "—",
          "Quarter 2 (%)": q2 ? Number(q2.score) : "—",
          "Quarter 3 (%)": q3 ? Number(q3.score) : "—",
          "Summative Assessment (%)": summative ? Number(summative.score) : "—",
          "Average Score (%)": Number(sg.averageScore),
          "Evaluation Status": rating.label.split("•")[1]?.trim() || "Evaluated",
          "Remarks & Feedback": sg.grades.map((g) => `${g.assessmentTitle}: ${g.feedback || "Completed"}`).join(" | "),
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      // Auto column widths (12 columns: ID, Name, Grade, Section, Curriculum, Q1, Q2, Q3, Summative, Avg, Status, Remarks)
      const colWidths = [
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 14 },
        { wch: 14 },
        { wch: 14 },
        { wch: 24 },
        { wch: 18 },
        { wch: 18 },
        { wch: 60 },
      ];
      ws["!cols"] = colWidths;

      XLSX.utils.book_append_sheet(wb, ws, "Master Grades 2026");
      const filename = `Matatag_Math_Master_Grades_${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, filename);

      showToast(`Master grades successfully exported as ${filename}`, "success");
    } catch (err) {
      console.error("Export failed:", err);
      showToast("Failed to generate Excel export.", "error");
    }
  }

  async function save() {
    setFormError("");
    if (!form.studentId) {
      setFormError("Please select a student.");
      return;
    }
    if (!form.assessmentId) {
      setFormError("Please select an assessment.");
      return;
    }
    if (isNaN(Number(form.score)) || form.score < 0 || form.score > 100) {
      setFormError("Score must be a valid percentage between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      const res = edit
        ? await fetch("/api/grades", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: edit.id, ...form }),
          })
        : await fetch("/api/grades", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(form),
          });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || "Failed to save grade record.");
        return;
      }

      setOpen(false);
      setEdit(null);
      setForm({
        studentId: students[0]?.id ?? 1,
        assessmentId: assessments[0]?.id ?? 1,
        score: 85,
        pointsEarned: 85,
        feedback: "",
      });
      await load();
      showToast(edit ? "Grade updated successfully!" : "Grade logged successfully!", "success");
    } catch {
      setFormError("Network error while saving grade. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function executeDelete(id: number) {
    try {
      const res = await fetch("/api/grades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data?.error || "Failed to delete grade record.", "error");
        return;
      }
      setDeleteTarget(null);
      await load();
      showToast("Grade record deleted successfully.", "info");
    } catch {
      showToast("Network error while deleting grade.", "error");
    }
  }

  const hasActiveFilters = filterGrade !== "all" || filterSection !== "all" || filterRating !== "all" || q.trim() !== "";

  function resetFilters() {
    setQ("");
    setFilterGrade("all");
    setFilterSection("all");
    setFilterRating("all");
  }

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/15 border border-violet-400/20 text-violet-300 text-xs font-bold mb-2">
                <GraduationCap size={14} /> Student Gradebook
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-transparent">
                Student Grades & Performance
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Evaluated student activities and curriculum progress. Click any student row to view all quarter assessments.
              </p>
            </div>

            {/* Header Action Buttons (Feature 2) */}
            <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
              <button
                onClick={exportExcel}
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-white font-bold text-sm transition cursor-pointer shadow-md hover:scale-[1.02]"
                title="Download complete grades matrix as an Excel file"
              >
                <Download size={16} className="text-emerald-400" />
                <span>Export Master (Excel)</span>
              </button>

              <button
                onClick={() => {
                  setEdit(null);
                  setForm({
                    studentId: students[0]?.id ?? 1,
                    assessmentId: assessments[0]?.id ?? 1,
                    score: 85,
                    pointsEarned: 85,
                    feedback: "",
                  });
                  setOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl shadow-violet-950/50 hover:scale-[1.02] transition cursor-pointer"
              >
                <Plus size={18} /> Log Grade
              </button>
            </div>
          </div>

          {fetchError && (
            <div className="mb-6 flex items-center justify-between gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                <span className="text-sm">{fetchError}</span>
              </div>
              <button
                onClick={load}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          {/* Search & Fast Filters Row (Feature 3) */}
          <div className="glass-card rounded-2xl p-4 border border-white/10 mb-6 space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search student name, ID (e.g. 2026-008), or assessment..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white transition"
                />
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Grade Level Dropdown */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400 font-medium">Grade:</span>
                  <select
                    value={filterGrade}
                    onChange={(e) => setFilterGrade(e.target.value)}
                    className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">All Grades</option>
                    {availableGrades.map((g) => (
                      <option key={g} value={g} className="bg-slate-900">{g}</option>
                    ))}
                  </select>
                </div>

                {/* Section Dropdown */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400 font-medium">Section:</span>
                  <select
                    value={filterSection}
                    onChange={(e) => setFilterSection(e.target.value)}
                    className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">All Sections</option>
                    {availableSections.map((sec) => (
                      <option key={sec} value={sec} className="bg-slate-900">Section {sec}</option>
                    ))}
                  </select>
                </div>

                {/* Rating Dropdown */}
                <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs">
                  <span className="text-slate-400 font-medium">Rating:</span>
                  <select
                    value={filterRating}
                    onChange={(e) => setFilterRating(e.target.value)}
                    className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="all" className="bg-slate-900">All Ratings</option>
                    <option value="excellent" className="bg-slate-900">Excellent (90%+)</option>
                    <option value="good" className="bg-slate-900">Good (75-89%)</option>
                    <option value="passing" className="bg-slate-900">Passing (60-74%)</option>
                    <option value="needs_practice" className="bg-slate-900">Needs Practice (&lt;60%)</option>
                  </select>
                </div>

                {/* Reset Filters button */}
                {hasActiveFilters && (
                  <button
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 text-violet-200 border border-violet-400/30 text-xs font-bold transition cursor-pointer"
                    title="Reset all active filters"
                  >
                    <RotateCcw size={12} /> Clear
                  </button>
                )}
              </div>
            </div>

            {/* Quick summary stats */}
            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
              <span>
                Showing <strong className="text-white">{filteredGroups.length}</strong> of{" "}
                <strong className="text-slate-300">{studentGroups.length}</strong> students with recorded grades
              </span>
              <span className="text-[11px] text-slate-500 hidden sm:inline">
                Click any student row to view full report & printable grade slip
              </span>
            </div>
          </div>

          {/* Loading or Empty State */}
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-3xl border border-white/10 p-8">
              <div className="w-16 h-16 rounded-2xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-400">
                <Award size={32} />
              </div>
              <h3 className="text-xl font-extrabold text-white mb-2">No students match current filters</h3>
              <p className="text-slate-400 text-sm max-w-md mx-auto mb-6">
                {hasActiveFilters
                  ? "Try resetting your search filters to see all evaluated students."
                  : "Students will appear here automatically once they complete a quiz in the Cognitive Maze desktop game."}
              </p>
              {hasActiveFilters ? (
                <button
                  onClick={resetFilters}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition cursor-pointer"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  onClick={() => {
                    setEdit(null);
                    setForm({
                      studentId: students[0]?.id ?? 1,
                      assessmentId: assessments[0]?.id ?? 1,
                      score: 85,
                      pointsEarned: 85,
                      feedback: "",
                    });
                    setOpen(true);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition cursor-pointer"
                >
                  Log First Grade
                </button>
              )}
            </div>
          ) : (
            /* Clean Modern Grades Table */
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/[0.03]">
                      <th className="py-4 px-6">Student</th>
                      <th className="py-4 px-6">Curriculum Progress (Feature 4)</th>
                      <th className="py-4 px-6">Average Score</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredGroups.map((sg) => {
                      const avgRating = getScoreRating(sg.averageScore);
                      const initials = sg.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase();

                      return (
                        <tr
                          key={sg.studentNumber}
                          onClick={() => setSelectedStudentId(sg.studentId)}
                          className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                        >
                          {/* Student Profile */}
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3.5">
                              <div
                                className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md shrink-0 ring-2 ring-white/10"
                                style={{ backgroundColor: sg.avatarColor || "#6366f1" }}
                              >
                                {initials}
                              </div>
                              <div>
                                <div className="font-extrabold text-white text-base group-hover:text-violet-300 transition-colors">
                                  {sg.studentName}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-violet-500/20 text-violet-300 font-mono font-bold border border-violet-400/30">
                                    {sg.studentNumber}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                    {sg.gradeLevel} • Section {sg.section}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Feature 4: Progress Bar + Quarter Chips */}
                          <td className="py-4 px-6 min-w-[280px]">
                            <div className="space-y-2">
                              {/* Progress bar */}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-slate-300 font-semibold">
                                  {sg.completionCount} of 3 Quarters Completed
                                </span>
                                <span
                                  className="font-bold text-[11px]"
                                  style={{ color: sg.completionPercent === 100 ? "#10b981" : "#f59e0b" }}
                                >
                                  {sg.completionPercent}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    sg.completionPercent === 100
                                      ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                                      : "bg-gradient-to-r from-amber-500 to-violet-400"
                                  }`}
                                  style={{ width: `${sg.completionPercent}%` }}
                                />
                              </div>

                              {/* Quarter Chips */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {sg.grades.map((g) => {
                                  const r = getScoreRating(g.score);
                                  const qLabel = getQuarterShortLabel(g.assessmentTitle, g.quarter);
                                  return (
                                    <span
                                      key={g.id}
                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${r.badgeClass} shadow-sm`}
                                      title={`${g.assessmentTitle}: ${g.score}%`}
                                    >
                                      <span>{qLabel}:</span>
                                      <span>{g.score}%</span>
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </td>

                          {/* Average Score & Rating */}
                          <td className="py-4 px-6">
                            <div className="inline-flex flex-col">
                              <span
                                className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-black border ${avgRating.badgeClass}`}
                              >
                                {avgRating.label}
                              </span>
                              <span className="text-[11px] text-slate-400 mt-1 max-w-[170px] truncate">
                                {avgRating.ratingText}
                              </span>
                            </div>
                          </td>

                          {/* Action Button */}
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStudentId(sg.studentId);
                              }}
                              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600/15 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-400/30 text-xs font-bold transition shadow-sm cursor-pointer"
                            >
                              <FileText size={14} />
                              <span>View Report Card →</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STUDENT REPORT CARD MODAL + PRINTABLE PDF SLIP (Feature 2 & 4) */}
          {/* ========================================================= */}
          {activeStudent && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
              onClick={() => setSelectedStudentId(null)}
            >
              <div
                id="printable-report-card"
                className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-4 mb-6 pb-5 border-b border-white/10">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg shrink-0 ring-2 ring-white/15"
                      style={{ backgroundColor: activeStudent.avatarColor || "#6366f1" }}
                    >
                      {activeStudent.studentName
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 text-[11px] font-bold mb-1 border border-violet-400/30">
                        <Sparkles size={12} /> Student Progress Report Card
                      </div>
                      <h2 className="text-2xl font-black text-white">{activeStudent.studentName}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-violet-300 font-mono font-bold">
                          {activeStudent.studentNumber}
                        </span>
                        <span className="text-xs text-slate-400">
                          {activeStudent.gradeLevel} • Section {activeStudent.section}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer print:hidden"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Performance & Curriculum Meter Banners (Feature 4) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                  {/* Average Score Banner */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                    <span className="text-xs text-slate-400 block mb-1">Overall Class Average</span>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-black text-white">{activeStudent.averageScore}%</span>
                      {(() => {
                        const r = getScoreRating(activeStudent.averageScore);
                        return (
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${r.badgeClass}`}>
                            {r.label.split("•")[1]?.trim() || "Evaluated"}
                          </span>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Curriculum Progress Banner */}
                  <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-slate-400">Curriculum Completion</span>
                      <span className="font-bold text-white">
                        {activeStudent.completionCount} / 3 Quarters ({activeStudent.completionPercent}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden my-2">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                        style={{ width: `${activeStudent.completionPercent}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {activeStudent.completionPercent === 100
                        ? "All 3 quarters finished in Cognitive Maze!"
                        : `${Math.max(0, 3 - activeStudent.completionCount)} quarter(s) remaining`}
                    </span>
                  </div>
                </div>

                {/* Quarter Cards List */}
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <BookOpen size={14} className="text-violet-400" />
                      Quarter Evaluations (Q1 to Q3 & Summative)
                    </div>
                    <button
                      onClick={() => {
                        setEdit(null);
                        setForm({
                          studentId: activeStudent.studentId,
                          assessmentId: assessments[0]?.id ?? 1,
                          score: 85,
                          pointsEarned: 85,
                          feedback: "",
                        });
                        setOpen(true);
                      }}
                      className="px-3 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-400/30 text-xs font-bold transition cursor-pointer print:hidden"
                    >
                      + Log Another Grade
                    </button>
                  </div>

                  {activeStudent.grades.map((g) => {
                    const rating = getScoreRating(g.score);
                    const fb = formatLaymanFeedback(g.feedback);
                    const order = getQuarterOrder(g.assessmentTitle, g.quarter);

                    return (
                      <div
                        key={g.id}
                        className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-violet-500/30 transition shadow-sm"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 font-black text-xs flex items-center justify-center border border-violet-400/30 shrink-0">
                              {order === 4 ? "S" : `Q${order}`}
                            </span>
                            <div>
                              <h4 className="font-extrabold text-white text-base">{g.assessmentTitle}</h4>
                              <span className="text-[11px] text-slate-400">
                                {order === 4
                                  ? "Summative Assessment (Water Temple)"
                                  : `Quarter ${order} Curriculum Assessment`}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${rating.badgeClass}`}>
                              {rating.label}
                            </span>
                            <div className="flex items-center gap-1 ml-2 print:hidden">
                              <button
                                onClick={() => {
                                  setForm({
                                    studentId: g.studentId,
                                    assessmentId: g.assessmentId,
                                    score: g.score,
                                    pointsEarned: g.pointsEarned,
                                    feedback: g.feedback ?? "",
                                  });
                                  setEdit(g);
                                  setOpen(true);
                                }}
                                className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer"
                                title="Edit Grade"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                onClick={() => setDeleteTarget(g)}
                                className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                                title="Delete Grade"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Remarks & Feedback */}
                        <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-400">Questions Answered:</span>
                            <span className="font-semibold text-slate-200">{fb.preview}</span>
                          </div>
                          {g.feedback && (
                            <div className="pt-2 border-t border-white/5 text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
                              {g.feedback}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Modal Footer with Print and Done buttons (Feature 2) */}
                <div className="mt-8 flex items-center justify-between gap-3 pt-4 border-t border-white/10 print:hidden">
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition cursor-pointer"
                    title="Print student evaluation card"
                  >
                    <Printer size={15} />
                    <span>Print Report Card (PDF)</span>
                  </button>

                  <button
                    onClick={() => setSelectedStudentId(null)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* IN-APP CONFIRMATION MODAL FOR DELETIONS (Feature 5) */}
          {/* ========================================================= */}
          {deleteTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            >
              <div
                className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Delete Grade Record?</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Are you sure you want to remove the grade for{" "}
                  <strong className="text-white">{deleteTarget.assessmentTitle || "this assessment"}</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeDelete(deleteTarget.id)}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    Delete Grade
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* ADD / EDIT GRADE MODAL */}
          {/* ========================================================= */}
          {open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={() => {
                setOpen(false);
                setEdit(null);
              }}
            >
              <div
                className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className="text-2xl font-extrabold text-white mb-6">
                  {edit ? "Edit Grade & Remarks" : "Log New Grade"}
                </h2>

                {formError && (
                  <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-200 text-xs">
                    <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Student</label>
                    <select
                      value={form.studentId}
                      onChange={(e) => setForm({ ...form, studentId: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white font-medium"
                    >
                      {students.map((s) => (
                        <option key={s.id} value={s.id} className="bg-slate-900">
                          {s.fullName} ({s.studentId || `ID: ${s.id}`})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Quiz / Activity</label>
                    <select
                      value={form.assessmentId}
                      onChange={(e) => setForm({ ...form, assessmentId: Number(e.target.value) })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white font-medium"
                    >
                      {assessments.map((a) => (
                        <option key={a.id} value={a.id} className="bg-slate-900">
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Score Percentage (%)</label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={form.score}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          score: Number(e.target.value),
                          pointsEarned: Number(e.target.value),
                        })
                      }
                      placeholder="Score %"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Teacher Remarks & Feedback</label>
                    <textarea
                      value={form.feedback}
                      onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                      placeholder="Enter strengths, areas for improvement, or encouraging notes..."
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                    />
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setOpen(false);
                      setEdit(null);
                    }}
                    className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? "Saving..." : edit ? "Save Changes" : "Log Grade"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* FLOATING TOAST CONTAINER (Feature 5) */}
          {/* ========================================================= */}
          {toasts.length > 0 && (
            <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
              {toasts.map((toast) => (
                <div
                  key={toast.id}
                  className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl shadow-2xl border backdrop-blur-xl animate-fade-up ${
                    toast.type === "success"
                      ? "bg-slate-900/90 border-emerald-500/40 text-emerald-200"
                      : toast.type === "error"
                      ? "bg-slate-900/90 border-rose-500/40 text-rose-200"
                      : "bg-slate-900/90 border-violet-500/40 text-violet-200"
                  }`}
                >
                  {toast.type === "success" ? (
                    <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  ) : toast.type === "error" ? (
                    <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                  ) : (
                    <Sparkles size={18} className="text-violet-400 shrink-0" />
                  )}
                  <span className="text-xs font-semibold flex-1 text-white">{toast.text}</span>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
