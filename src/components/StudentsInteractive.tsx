"use client";
import { useState, useEffect, ChangeEvent } from "react";
import { Plus, Trash2, Pencil, Search, Users, Upload, Download, FileSpreadsheet, CheckCircle2, AlertCircle, Calendar } from "lucide-react";
import * as XLSX from "xlsx";
import SidebarNav from "@/components/SidebarNav";

interface Student {
  id: number;
  studentId: string;
  fullName: string;
  birthday?: string | null;
  age: number | null;
  gradeLevel: string;
  section: string;
  gender: string;
  avatarColor: string;
}

const DEFAULT_FORM = {
  studentId: "",
  fullName: "",
  birthday: "",
  age: "",
  gradeLevel: "Grade 2",
  section: "A",
  gender: "Male",
  avatarColor: "#6366f1",
};

function calculateAge(birthdayStr?: string | null): number | null {
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

function formatBirthday(dateStr?: string | null): string {
  if (!dateStr) return "";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, month, day);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

const STUDENT_ID_REGEX = /^\d{4}-\d{3,}$/;

function cleanStudentId(id: string): string {
  return (id || "").replace(/^s-/i, "").trim();
}

function normalizeStudentId(rawId: string | null | undefined, fallbackIndex: number = 0): string {
  let id = String(rawId || "").trim();
  if (!id) {
    return `2026-${String(fallbackIndex + 1).padStart(3, "0")}`;
  }
  // Strip S- or s- prefix
  if (/^s-/i.test(id)) {
    id = id.replace(/^s-/i, "").trim();
  }
  // If it's pure digits like "1", "11", "12" -> convert to 2026-001, 2026-011, 2026-012
  if (/^\d{1,3}$/.test(id)) {
    return `2026-${id.padStart(3, "0")}`;
  }
  // If it's 2024-001 -> modernize to 2026-001
  if (/^\d{4}-\d{3,}$/.test(id)) {
    return id.replace(/^\d{4}-/, "2026-");
  }
  return id;
}

function getNextStudentId(existingStudents: Student[]): string {
  const currentYear = new Date().getFullYear();
  let maxNum = 0;
  for (const s of existingStudents) {
    const cleaned = cleanStudentId(s.studentId || "");
    const match = cleaned.match(/(\d{4})-(\d+)/);
    if (match) {
      const yr = parseInt(match[1], 10);
      const num = parseInt(match[2], 10);
      if (yr === currentYear && num > maxNum) {
        maxNum = num;
      }
    }
  }
  const nextNum = String(maxNum + 1).padStart(3, "0");
  return `${currentYear}-${nextNum}`;
}

function normalizeHeader(value: string) {
  return (value || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildStudentFromRow(row: Record<string, any>): Partial<Student> | null {
  const entries = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));

  let studentId = normalizeStudentId(String(entries.studentid ?? entries.student_id ?? entries.id ?? entries.learnerid ?? entries.studentnumber ?? ""));
  const fullName = String(entries.fullname ?? entries.full_name ?? entries.studentname ?? entries.name ?? entries.learnername ?? "").trim();
  
  const bdayRaw = String(entries.birthday ?? entries.birthdate ?? entries.dob ?? entries.dateofbirth ?? "").trim();
  let birthday: string | null = null;
  if (bdayRaw) {
    if (!isNaN(Number(bdayRaw)) && Number(bdayRaw) > 20000) {
      const parsedDate = new Date((Number(bdayRaw) - 25569) * 86400 * 1000);
      if (!isNaN(parsedDate.getTime())) {
        birthday = parsedDate.toISOString().split("T")[0];
      }
    } else {
      const parsedDate = new Date(bdayRaw);
      if (!isNaN(parsedDate.getTime())) {
        birthday = parsedDate.toISOString().split("T")[0];
      } else {
        birthday = bdayRaw;
      }
    }
  }

  const ageValue = String(entries.age ?? entries.studentage ?? "").trim();
  const parsedAge = ageValue ? Number(ageValue) : null;
  let age = parsedAge !== null && Number.isInteger(parsedAge) && parsedAge >= 0 ? parsedAge : null;
  if (age === null && birthday) {
    age = calculateAge(birthday);
  }

  const gradeLevel = String(entries.gradelevel ?? entries.grade_level ?? entries.grade ?? "Grade 2").trim() || "Grade 2";
  const section = String(entries.section ?? entries.classsection ?? "A").trim() || "A";
  const genderRaw = String(entries.gender ?? entries.sex ?? "Other").trim();
  const gender = ["male", "female", "other"].includes(genderRaw.toLowerCase()) ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase() : genderRaw || "Other";
  const avatarColor = String(entries.avatarcolor ?? entries.avatar_color ?? entries.color ?? "#6366f1").trim() || "#6366f1";

  if (!fullName) return null;

  return { studentId, fullName, birthday, age, gradeLevel, section, gender, avatarColor };
}

function findStudentForGrade(
  grade: { studentId: number; studentNumber?: string | null; studentName?: string | null },
  studentList: Student[]
): Student | undefined {
  // 1. Match by numeric database ID
  let match = studentList.find((s) => s.id === grade.studentId);
  if (match) return match;

  // 2. Match by normalized student ID (e.g. 2026-008 vs S-2024-008)
  const normGradeNum = normalizeStudentId(grade.studentNumber);
  if (normGradeNum) {
    match = studentList.find((s) => normalizeStudentId(s.studentId) === normGradeNum);
    if (match) return match;
  }

  // 3. Match by student full name (case insensitive)
  if (grade.studentName) {
    const cleanName = grade.studentName.trim().toLowerCase();
    match = studentList.find((s) => s.fullName.trim().toLowerCase() === cleanName);
    if (match) return match;
  }

  return undefined;
}

function categorizeGradeQuarter(title?: string | null, quarter?: string | null): "Quarter 1" | "Quarter 2" | "Quarter 3" | "Summative" | null {
  const qStr = String(quarter || "").trim().toLowerCase();
  if (qStr === "summative" || qStr.includes("summative") || qStr === "final") return "Summative";
  if (qStr.includes("1") || qStr === "quarter 1") return "Quarter 1";
  if (qStr.includes("2") || qStr === "quarter 2") return "Quarter 2";
  if (qStr.includes("3") || qStr === "quarter 3") return "Quarter 3";

  const t = String(title || "").toLowerCase();
  if (t.includes("summative") || t.includes("water temple") || t.includes("final")) return "Summative";
  if (t.includes("quarter 1") || t.includes("q1") || t.includes("unit 1")) return "Quarter 1";
  if (t.includes("quarter 2") || t.includes("q2") || t.includes("unit 2")) return "Quarter 2";
  if (t.includes("quarter 3") || t.includes("q3") || t.includes("unit 3")) return "Quarter 3";

  return null;
}

export default function StudentsClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Student | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [importLoading, setImportLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [formError, setFormError] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/students");
      const data = await res.json();
      if (Array.isArray(data)) {
        setItems(data.map((s, idx) => ({
          ...s,
          studentId: normalizeStudentId(s.studentId, idx),
        })));
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setFormError("");
    const studentId = form.studentId.trim();
    if (!studentId) {
      setFormError("Student ID is required.");
      return;
    }
    if (!STUDENT_ID_REGEX.test(studentId)) {
      setFormError("Invalid format! Must follow YYYY-001 (e.g. 2026-001)");
      return;
    }
    if (!form.fullName.trim()) {
      setFormError("Student full name is required.");
      return;
    }

    const isDuplicate = items.some(
      (s) => s.studentId === studentId && (edit ? s.id !== edit.id : true)
    );
    if (isDuplicate) {
      setFormError(`Student ID "${studentId}" is already assigned to another student.`);
      return;
    }

    const computedAge = calculateAge(form.birthday);
    const payload = {
      ...form,
      studentId,
      fullName: form.fullName.trim(),
      birthday: form.birthday.trim() || null,
      age: computedAge !== null ? computedAge : (form.age ? Number(form.age) : null),
    };

    try {
      const res = edit
        ? await fetch("/api/students", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...payload }) })
        : await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to save student.");
        return;
      }

      setOpen(false);
      setEdit(null);
      setForm(DEFAULT_FORM);
      setFormError("");
      load();
    } catch {
      setFormError("Network or server error while saving student.");
    }
  }

  async function remove(id: number) {
    await fetch("/api/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  async function exportExcel() {
    try {
      setExportLoading(true);
      const response = await fetch("/api/grades");
      if (!response.ok) throw new Error("Could not load grades");
      const gradeRows: Array<{
        studentId: number;
        studentName: string | null;
        studentNumber: string | null;
        assessmentTitle: string | null;
        score: number;
        feedback: string | null;
        quarter: string | null;
      }> = await response.json();

      // Map: student.id -> Map<"Quarter 1" | "Quarter 2" | "Quarter 3" | "Summative", number[]>
      const studentQuarterScores = new Map<number, Map<string, number[]>>();
      const allStudentScores = new Map<number, number[]>();

      for (const grade of gradeRows) {
        const student = findStudentForGrade(grade, items);
        if (!student) continue;

        const period = categorizeGradeQuarter(grade.assessmentTitle, grade.quarter);
        if (!period) continue;

        const byQuarter = studentQuarterScores.get(student.id) ?? new Map<string, number[]>();
        const scores = byQuarter.get(period) ?? [];
        scores.push(Number(grade.score));
        byQuarter.set(period, scores);
        studentQuarterScores.set(student.id, byQuarter);

        const allScores = allStudentScores.get(student.id) ?? [];
        allScores.push(Number(grade.score));
        allStudentScores.set(student.id, allScores);
      }

      const summaryRows = items.map((student) => {
        const scoresMap = studentQuarterScores.get(student.id);
        const allScores = allStudentScores.get(student.id) ?? [];
        const resolvedAge = student.age ?? calculateAge(student.birthday);

        const getAvg = (period: string) => {
          const list = scoresMap?.get(period) ?? [];
          return list.length ? Number((list.reduce((sum, v) => sum + v, 0) / list.length).toFixed(1)) : null;
        };

        const q1Avg = getAvg("Quarter 1");
        const q2Avg = getAvg("Quarter 2");
        const q3Avg = getAvg("Quarter 3");
        const summativeAvg = getAvg("Summative");

        const generalAvg = allScores.length
          ? Number((allScores.reduce((sum, v) => sum + v, 0) / allScores.length).toFixed(1))
          : null;

        let status = "No Grades Recorded";
        if (generalAvg !== null) {
          if (generalAvg >= 90) status = "Mastered";
          else if (generalAvg >= 75) status = "Passing";
          else status = "Needs Practice";
        }

        return {
          Name: student.fullName,
          Birthday: student.birthday ? formatBirthday(student.birthday) : "",
          Age: resolvedAge ?? "",
          Gender: student.gender,
          Grade: student.gradeLevel,
          Section: student.section,
          "Student ID": student.studentId,
          "Quarter 1 Score (%)": q1Avg !== null ? q1Avg : "—",
          "Quarter 2 Score (%)": q2Avg !== null ? q2Avg : "—",
          "Quarter 3 Score (%)": q3Avg !== null ? q3Avg : "—",
          "Summative Assessment (%)": summativeAvg !== null ? summativeAvg : "—",
          "Average Score (%)": generalAvg !== null ? generalAvg : "—",
          "Evaluation Status": status,
        };
      });

      const reportRows = gradeRows.map((grade) => {
        const student = findStudentForGrade(grade, items);
        const resolvedAge = student?.age ?? calculateAge(student?.birthday);
        const period = categorizeGradeQuarter(grade.assessmentTitle, grade.quarter);
        const displayQuarter = period === "Summative"
          ? "Summative Assessment"
          : (period || grade.quarter || "Assessment");

        return {
          Name: student?.fullName ?? grade.studentName ?? "Unknown Student",
          "Student ID": student?.studentId ?? normalizeStudentId(grade.studentNumber),
          Birthday: student?.birthday ? formatBirthday(student?.birthday) : "",
          Age: resolvedAge ?? "",
          Gender: student?.gender ?? "",
          Grade: student?.gradeLevel ?? "Grade 2",
          Section: student?.section ?? "A",
          Period: displayQuarter,
          Assessment: grade.assessmentTitle ?? "Quiz",
          "Score (%)": Number(grade.score),
          Feedback: grade.feedback ?? "Completed",
        };
      });

      const workbook = XLSX.utils.book_new();

      const wsSummary = XLSX.utils.json_to_sheet(summaryRows, {
        header: [
          "Name",
          "Birthday",
          "Age",
          "Gender",
          "Grade",
          "Section",
          "Student ID",
          "Quarter 1 Score (%)",
          "Quarter 2 Score (%)",
          "Quarter 3 Score (%)",
          "Summative Assessment (%)",
          "Average Score (%)",
          "Evaluation Status",
        ],
      });
      wsSummary["!cols"] = [
        { wch: 22 },
        { wch: 14 },
        { wch: 6 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 14 },
        { wch: 20 },
        { wch: 20 },
        { wch: 20 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(workbook, wsSummary, "Student Summary");

      const wsReport = XLSX.utils.json_to_sheet(reportRows, {
        header: [
          "Name",
          "Student ID",
          "Birthday",
          "Age",
          "Gender",
          "Grade",
          "Section",
          "Period",
          "Assessment",
          "Score (%)",
          "Feedback",
        ],
      });
      wsReport["!cols"] = [
        { wch: 22 },
        { wch: 14 },
        { wch: 14 },
        { wch: 6 },
        { wch: 10 },
        { wch: 12 },
        { wch: 10 },
        { wch: 22 },
        { wch: 36 },
        { wch: 12 },
        { wch: 60 },
      ];
      XLSX.utils.book_append_sheet(workbook, wsReport, "Quarterly Report");

      XLSX.writeFile(workbook, "student-quarterly-report.xlsx");
    } catch (error) {
      console.error("Excel export failed", error);
      setImportMessage({ type: "error", text: "The student report could not be exported. Please try again." });
    } finally {
      setExportLoading(false);
    }
  }

  async function handleExcelImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setImportLoading(true);
      setImportMessage(null);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: "" });

      if (!rows.length) {
        setImportMessage({ type: "error", text: "The uploaded file has no rows to import." });
        setImportLoading(false);
        event.target.value = "";
        return;
      }

      const parsedStudents = rows
        .map(buildStudentFromRow)
        .filter((student): student is Partial<Student> => Boolean(student));

      if (!parsedStudents.length) {
        setImportMessage({ type: "error", text: "No valid student rows were found. Include a Name column; Birthday, Age, Gender, Grade, and Section are also supported. Student IDs are optional." });
        setImportLoading(false);
        event.target.value = "";
        return;
      }

      let imported = 0;
      let failed = 0;

      for (const student of parsedStudents) {
        const res = await fetch("/api/students", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId: student.studentId,
            fullName: student.fullName,
            birthday: student.birthday,
            age: student.age,
            gradeLevel: student.gradeLevel || "Grade 2",
            section: student.section || "A",
            gender: student.gender || "Other",
            avatarColor: student.avatarColor || "#6366f1",
          }),
        });

        if (res.ok) {
          imported += 1;
        } else {
          failed += 1;
        }
      }

      if (imported > 0) {
        await load();
      }

      setImportMessage({
        type: failed > 0 ? "error" : "success",
        text: failed > 0
          ? `Imported ${imported} student(s), but ${failed} row(s) could not be added.`
          : `Imported ${imported} student(s) successfully from ${file.name}.`,
      });
    } catch (error) {
      console.error("Excel import failed", error);
      setImportMessage({ type: "error", text: "The spreadsheet could not be processed. Please check the file format and columns." });
    } finally {
      setImportLoading(false);
      event.target.value = "";
    }
  }

  const filtered = items.filter((s) => s.fullName.toLowerCase().includes(q.toLowerCase()) || s.studentId.includes(q));

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">Students</h1>
              <p className="text-slate-400 mt-1">Manage learner profiles and progress.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={exportExcel} disabled={exportLoading || loading} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 font-bold hover:bg-emerald-500/20 transition disabled:opacity-50">
                <Download size={18} /> {exportLoading ? "Exporting..." : "Export Excel"}
              </button>
              <label className="inline-flex cursor-pointer items-center gap-2 px-5 py-3 rounded-xl border border-violet-400/40 bg-violet-500/10 text-violet-100 font-bold shadow-xl shadow-violet-900/20 hover:bg-violet-500/20 transition">
                <Upload size={18} />
                {importLoading ? "Importing..." : "Import Excel"}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} disabled={importLoading} />
              </label>
              <button onClick={() => { setEdit(null); setFormError(""); setForm({ ...DEFAULT_FORM, studentId: getNextStudentId(items) }); setOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition">
                <Plus size={18} /> Add Student
              </button>
            </div>
          </div>

          {importMessage && (
            <div className={`mb-6 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm ${importMessage.type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-rose-500/30 bg-rose-500/10 text-rose-200"}`}>
              {importMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{importMessage.text}</span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search students..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500" />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 glass-card rounded-3xl">
              <Users size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-extrabold text-white mb-2">No students found</h3>
              <p className="text-slate-400 mb-6">Add your first student manually or import from Excel.</p>
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <button onClick={() => { setEdit(null); setFormError(""); setForm({ ...DEFAULT_FORM, studentId: getNextStudentId(items) }); setOpen(true); }} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition">Add Student</button>
                <label className="inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-400/40 bg-violet-500/10 text-violet-100 font-bold hover:bg-violet-500/20 transition">
                  <FileSpreadsheet size={16} /> Import Excel
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} disabled={importLoading} />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => {
                const studentAge = s.age ?? calculateAge(s.birthday);
                return (
                  <div key={s.id} className="glass-card rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200 relative group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-extrabold shadow-lg" style={{ backgroundColor: s.avatarColor + "33", color: s.avatarColor }}>
                        {s.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => {
                          setForm({
                            studentId: normalizeStudentId(s.studentId),
                            fullName: s.fullName,
                            birthday: s.birthday ? s.birthday.split("T")[0] : "",
                            age: studentAge !== null && studentAge !== undefined ? studentAge.toString() : "",
                            gradeLevel: s.gradeLevel,
                            section: s.section,
                            gender: s.gender,
                            avatarColor: s.avatarColor,
                          });
                          setEdit(s);
                          setFormError("");
                          setOpen(true);
                        }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-violet-200" aria-label="Edit"><Pencil size={14} /></button>
                        <button onClick={() => remove(s.id)} className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300" aria-label="Delete"><Trash2 size={14} /></button>
                      </div>
                    </div>
                    <h3 className="text-lg font-extrabold text-white mb-0.5 truncate">{s.fullName}</h3>
                    <p className="text-xs text-violet-300 font-semibold mb-2">{normalizeStudentId(s.studentId)} · {s.gradeLevel} · {s.section}</p>
                    <div className="flex items-center flex-wrap gap-2 text-xs text-slate-400">
                      <span className="bg-white/5 px-2 py-0.5 rounded-md">{s.gender}</span>
                      {s.birthday && (
                        <span className="bg-white/5 px-2 py-0.5 rounded-md text-slate-300 flex items-center gap-1.5" title="Birthday">
                          <Calendar size={12} className="text-violet-400" />
                          <span>{formatBirthday(s.birthday)}</span>
                        </span>
                      )}
                      {studentAge !== null && (
                        <span className="bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <span>Age {studentAge}</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setEdit(null); }}>
              <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-extrabold text-white mb-6">{edit ? "Edit Student" : "New Student"}</h2>
                {formError && (
                  <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0 text-rose-400" />
                    <span className="font-medium">{formError}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <div>
                    {(() => {
                      const trimmedId = form.studentId.trim();
                      const isFormatInvalid = Boolean(trimmedId && !STUDENT_ID_REGEX.test(trimmedId));
                      const duplicateStudent = trimmedId
                        ? items.find((s) => s.studentId.toLowerCase() === trimmedId.toLowerCase() && (edit ? s.id !== edit.id : true))
                        : null;
                      const hasError = isFormatInvalid || Boolean(duplicateStudent);

                      return (
                        <>
                          <div className="flex items-center justify-between px-1 mb-1">
                            <label className="block text-xs font-medium text-slate-400">Student ID</label>
                            <span className={`text-[11px] font-mono font-medium ${
                              hasError ? "text-rose-400" : "text-violet-300"
                            }`}>
                              Format: 2026-001
                            </span>
                          </div>
                          <input
                            value={form.studentId}
                            onChange={e => {
                              const val = e.target.value;
                              setForm({ ...form, studentId: val });
                              if (formError) setFormError("");
                            }}
                            placeholder="e.g. 2026-001"
                            className={`w-full px-4 py-3 rounded-xl bg-white/5 border text-sm font-mono focus:outline-none focus:ring-2 transition ${
                              hasError
                                ? "border-rose-500/60 focus:ring-rose-400/40 text-rose-200"
                                : "border-white/10 focus:ring-violet-400/40 text-white"
                            }`}
                          />
                          {isFormatInvalid && (
                            <p className="mt-1 px-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                              <AlertCircle size={12} />
                              Invalid format! Must follow YYYY-001 (e.g. 2026-001)
                            </p>
                          )}
                          {!isFormatInvalid && duplicateStudent && (
                            <p className="mt-1 px-1 text-[11px] text-rose-400 flex items-center gap-1 font-medium">
                              <AlertCircle size={12} />
                              Student ID &quot;{trimmedId}&quot; is already assigned to {duplicateStudent.fullName}.
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 px-1">Full Name</label>
                    <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Calendar size={13} className="text-violet-400" />
                        <span>Birthday</span>
                      </label>
                      {calculateAge(form.birthday) !== null ? (
                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-fade-in flex items-center gap-1">
                          <span>Age:</span>
                          <strong className="text-white">{calculateAge(form.birthday)}</strong>
                          <span>{calculateAge(form.birthday) === 1 ? "year old" : "years old"}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Select birthday to calculate age</span>
                      )}
                    </div>
                    <input
                      type="date"
                      max={new Date().toISOString().split("T")[0]}
                      value={form.birthday}
                      onChange={e => {
                        const bday = e.target.value;
                        const computed = calculateAge(bday);
                        setForm({
                          ...form,
                          birthday: bday,
                          age: computed !== null ? computed.toString() : "",
                        });
                      }}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-400/40 [color-scheme:dark]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 px-1">Grade Level</label>
                      <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                        {["Grade 1","Grade 2","Grade 3","Grade 4","Grade 5"].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 px-1">Section</label>
                      <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                        {["A","B","C","D"].map(s => <option key={s} value={s} className="bg-slate-900">Section {s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 px-1">Gender</label>
                      <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                        {["Male","Female","Other"].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1 px-1">Avatar Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={form.avatarColor.startsWith("#") ? form.avatarColor : "#6366f1"}
                          onChange={e => setForm({ ...form, avatarColor: e.target.value })}
                          className="h-11 w-12 rounded-xl border border-white/10 bg-white/5 p-1 cursor-pointer"
                        />
                        <input
                          value={form.avatarColor}
                          onChange={e => setForm({ ...form, avatarColor: e.target.value })}
                          placeholder="#6366f1"
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => { setOpen(false); setEdit(null); }} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Cancel</button>
                  <button onClick={save} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition">{edit ? "Save" : "Create"}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
