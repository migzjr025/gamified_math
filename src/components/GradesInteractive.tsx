"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Plus,
  Search,
  Download,
  GraduationCap,
  RotateCcw,
  AlertTriangle,
  Trash2,
} from "lucide-react";
import SidebarNav from "@/components/SidebarNav";
import { GradeRow, StudentMeta, StudentGroup, ToastMessage } from "./grades/types";
import {
  normalizeStudentNumber,
  getQuarterOrder,
  getScoreRating,
  formatGradeDate,
} from "./grades/utils";
import ReportCardModal from "./grades/ReportCardModal";
import GradeFormModal from "./grades/GradeFormModal";
import DeleteConfirmDialog from "./grades/DeleteConfirmDialog";
import ToastContainer from "./grades/ToastContainer";
import GradesTable from "./grades/GradesTable";

export default function GradesClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<StudentMeta[]>([]);
  const [assessments, setAssessments] = useState<{ id: number; title: string }[]>([]);

  // Search & Filter controls
  const [q, setQ] = useState("");
  const [filterGrade, setFilterGrade] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [filterRating, setFilterRating] = useState("all");

  // Modals & Action States
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<GradeRow | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GradeRow | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [bulkDeleteTargetStudentIds, setBulkDeleteTargetStudentIds] = useState<number[] | null>(null);
  const [bulkDeletingGrades, setBulkDeletingGrades] = useState(false);

  // In-App Toast System
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
      if (entry.grades.length === 0) return;

      const sortedGrades = [...entry.grades].sort((a, b) => {
        return getQuarterOrder(a.assessmentTitle, a.quarter) - getQuarterOrder(b.assessmentTitle, b.quarter);
      });

      const avg =
        sortedGrades.length > 0
          ? Math.round(sortedGrades.reduce((sum, g) => sum + Number(g.score || 0), 0) / sortedGrades.length)
          : 0;

      const quarterGrades = sortedGrades.filter((g) => getQuarterOrder(g.assessmentTitle, g.quarter) <= 3);
      const quarterCount = quarterGrades.length;
      const percent = Math.min(100, Math.round((quarterCount / 3) * 100));

      let latestDate: string | null = null;
      for (const g of sortedGrades) {
        const d = g.updatedAt || g.createdAt;
        if (d && (!latestDate || new Date(d).getTime() > new Date(latestDate).getTime())) {
          latestDate = d;
        }
      }

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
        lastRecordedDate: latestDate,
      });
    });

    return result.sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [items, students]);

  // Extract available Grade and Section options for filter dropdowns
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
      if (q.trim()) {
        const term = q.trim().toLowerCase();
        const matchesName = g.studentName.toLowerCase().includes(term);
        const matchesId = g.studentNumber.toLowerCase().includes(term);
        const matchesQuiz = g.grades.some((item) => (item.assessmentTitle || "").toLowerCase().includes(term));
        if (!matchesName && !matchesId && !matchesQuiz) return false;
      }

      if (filterGrade !== "all" && g.gradeLevel !== filterGrade) {
        return false;
      }

      if (filterSection !== "all" && g.section !== filterSection) {
        return false;
      }

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

  // Master Excel Export (Dynamic XLSX import)
  async function exportExcel() {
    if (studentGroups.length === 0) {
      showToast("No student grades available to export.", "error");
      return;
    }

    try {
      const XLSX = await import("xlsx");
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
          "Q1 Recorded Date": q1?.createdAt ? formatGradeDate(q1.createdAt) : "—",
          "Quarter 2 (%)": q2 ? Number(q2.score) : "—",
          "Q2 Recorded Date": q2?.createdAt ? formatGradeDate(q2.createdAt) : "—",
          "Quarter 3 (%)": q3 ? Number(q3.score) : "—",
          "Q3 Recorded Date": q3?.createdAt ? formatGradeDate(q3.createdAt) : "—",
          "Summative Assessment (%)": summative ? Number(summative.score) : "—",
          "Summative Recorded Date": summative?.createdAt ? formatGradeDate(summative.createdAt) : "—",
          "Average Score (%)": Number(sg.averageScore),
          "Evaluation Status": rating.label.split("•")[1]?.trim() || "Evaluated",
          "Last Grade Recorded": formatGradeDate(sg.lastRecordedDate),
          "Remarks & Feedback": sg.grades.map((g) => `${g.assessmentTitle}: ${g.feedback || "Completed"}`).join(" | "),
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(rows);

      const colWidths = [
        { wch: 14 },
        { wch: 22 },
        { wch: 14 },
        { wch: 10 },
        { wch: 24 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 14 },
        { wch: 16 },
        { wch: 24 },
        { wch: 22 },
        { wch: 18 },
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

  function toggleSelectStudent(studentId: number) {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  }

  function toggleSelectAllStudents() {
    const visibleStudentIds = filteredGroups.map((sg) => sg.studentId);
    const allSelected = visibleStudentIds.length > 0 && visibleStudentIds.every((id) => selectedStudentIds.includes(id));
    if (allSelected) {
      setSelectedStudentIds((prev) => prev.filter((id) => !visibleStudentIds.includes(id)));
    } else {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, ...visibleStudentIds])));
    }
  }

  async function executeBulkDeleteStudentGrades(studentIds: number[]) {
    setBulkDeletingGrades(true);
    try {
      const res = await fetch("/api/grades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data?.error || "Failed to delete selected grades.", "error");
        return;
      }
      setSelectedStudentIds((prev) => prev.filter((id) => !studentIds.includes(id)));
      setBulkDeleteTargetStudentIds(null);
      await load();
      showToast(`Deleted grade records for ${studentIds.length} student(s).`, "info");
    } catch {
      showToast("Network error while deleting grades.", "error");
    } finally {
      setBulkDeletingGrades(false);
    }
  }

  async function executeBulkDeleteGradeIds(ids: number[]) {
    try {
      const res = await fetch("/api/grades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) {
        const data = await res.json();
        showToast(data?.error || "Failed to delete selected grades.", "error");
        return;
      }
      await load();
      showToast(`Deleted ${ids.length} grade record(s).`, "info");
    } catch {
      showToast("Network error while deleting grades.", "error");
    }
  }

  const hasActiveFilters =
    filterGrade !== "all" || filterSection !== "all" || filterRating !== "all" || q.trim() !== "";

  function resetFilters() {
    setQ("");
    setFilterGrade("all");
    setFilterSection("all");
    setFilterRating("all");
  }

  function handleOpenNewGrade(defaultStudentId?: number) {
    setEdit(null);
    setForm({
      studentId: defaultStudentId ?? (students[0]?.id ?? 1),
      assessmentId: assessments[0]?.id ?? 1,
      score: 85,
      pointsEarned: 85,
      feedback: "",
    });
    setOpen(true);
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

            {/* Header Action Buttons */}
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
                onClick={() => handleOpenNewGrade()}
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

          {/* Search & Fast Filters Row */}
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

          {/* Batch Selection & Action Bar */}
          {!loading && filteredGroups.length > 0 && selectedStudentIds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl glass-card border border-white/10 bg-white/[0.02] mb-4">
              <div className="flex items-center gap-3">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                  {selectedStudentIds.length} student{selectedStudentIds.length > 1 ? "s" : ""} selected
                </span>
                <span className="text-xs text-slate-400">
                  Select students to bulk-delete their recorded grades and results
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedStudentIds([])}
                  className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                >
                  Deselect All
                </button>
                <button
                  onClick={() => setBulkDeleteTargetStudentIds(selectedStudentIds)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>Delete Grades for Selected ({selectedStudentIds.length})</span>
                </button>
              </div>
            </div>
          )}

          {/* Grades Table */}
          <GradesTable
            loading={loading}
            studentGroups={studentGroups}
            filteredGroups={filteredGroups}
            hasActiveFilters={hasActiveFilters}
            onResetFilters={resetFilters}
            onSelectStudent={(studentId) => setSelectedStudentId(studentId)}
            onLogFirstGrade={() => handleOpenNewGrade()}
            selectedStudentIds={selectedStudentIds}
            onToggleSelectStudent={toggleSelectStudent}
            onToggleSelectAll={toggleSelectAllStudents}
          />

          {/* Student Report Card Modal & Printable PDF Slip */}
          {activeStudent && (
            <ReportCardModal
              activeStudent={activeStudent}
              assessments={assessments}
              onClose={() => setSelectedStudentId(null)}
              onAddNewGrade={(studentId) => handleOpenNewGrade(studentId)}
              onEditGrade={(g) => {
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
              onDeleteGrade={(g) => setDeleteTarget(g)}
              onBulkDeleteGrades={(ids) => executeBulkDeleteGradeIds(ids)}
            />
          )}

          {/* In-App Confirmation Modal for Deletions */}
          <DeleteConfirmDialog
            target={deleteTarget}
            onClose={() => setDeleteTarget(null)}
            onConfirm={(id) => executeDelete(id)}
          />

          {/* BULK DELETE CONFIRMATION MODAL FOR STUDENT GRADES */}
          {bulkDeleteTargetStudentIds && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => !bulkDeletingGrades && setBulkDeleteTargetStudentIds(null)}
            >
              <div
                className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  Delete Grades for {bulkDeleteTargetStudentIds.length} Students?
                </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete all recorded grades and quiz evaluation results for the <strong className="text-white">{bulkDeleteTargetStudentIds.length} selected students</strong>? This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkDeleteTargetStudentIds(null)}
                    disabled={bulkDeletingGrades}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => executeBulkDeleteStudentGrades(bulkDeleteTargetStudentIds)}
                    disabled={bulkDeletingGrades}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {bulkDeletingGrades ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 size={15} />
                        <span>Delete Grades ({bulkDeleteTargetStudentIds.length})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add / Edit Grade Modal */}
          <GradeFormModal
            open={open}
            edit={edit}
            form={form}
            setForm={setForm}
            students={students}
            assessments={assessments}
            saving={saving}
            formError={formError}
            onClose={() => {
              setOpen(false);
              setEdit(null);
            }}
            onSave={save}
          />

          {/* Floating Toast Container */}
          <ToastContainer
            toasts={toasts}
            onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))}
          />
        </div>
      </main>
    </div>
  );
}
