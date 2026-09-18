"use client";
import { useState, useEffect, ChangeEvent } from "react";
import { Plus, Trash2, Pencil, Search, Users, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import * as XLSX from "xlsx";
import SidebarNav from "@/components/SidebarNav";

interface Student {
  id: number;
  studentId: string;
  fullName: string;
  gradeLevel: string;
  section: string;
  gender: string;
  avatarColor: string;
}

const DEFAULT_FORM = {
  studentId: "",
  fullName: "",
  gradeLevel: "Grade 2",
  section: "A",
  gender: "Male",
  avatarColor: "#6366f1",
};

function normalizeHeader(value: string) {
  return (value || "").toString().trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function buildStudentFromRow(row: Record<string, any>): Partial<Student> | null {
  const entries = Object.fromEntries(Object.entries(row).map(([key, value]) => [normalizeHeader(key), value]));

  const studentId = String(entries.studentid ?? entries.student_id ?? entries.id ?? entries.learnerid ?? entries.studentnumber ?? "").trim();
  const fullName = String(entries.fullname ?? entries.full_name ?? entries.studentname ?? entries.name ?? entries.learnername ?? "").trim();
  const gradeLevel = String(entries.gradelevel ?? entries.grade_level ?? entries.grade ?? "Grade 2").trim() || "Grade 2";
  const section = String(entries.section ?? entries.classsection ?? "A").trim() || "A";
  const genderRaw = String(entries.gender ?? entries.sex ?? "Other").trim();
  const gender = ["male", "female", "other"].includes(genderRaw.toLowerCase()) ? genderRaw.charAt(0).toUpperCase() + genderRaw.slice(1).toLowerCase() : genderRaw || "Other";
  const avatarColor = String(entries.avatarcolor ?? entries.avatar_color ?? entries.color ?? "#6366f1").trim() || "#6366f1";

  if (!studentId || !fullName) return null;

  return { studentId, fullName, gradeLevel, section, gender, avatarColor };
}

export default function StudentsClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Student | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [importLoading, setImportLoading] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/students");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    const payload = { ...form, studentId: form.studentId.trim(), fullName: form.fullName.trim() };
    if (!payload.studentId || !payload.fullName) return;

    if (edit) {
      await fetch("/api/students", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...payload }) });
    } else {
      await fetch("/api/students", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    }
    setOpen(false); setEdit(null); setForm(DEFAULT_FORM);
    load();
  }

  async function remove(id: number) {
    await fetch("/api/students", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
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
        setImportMessage({ type: "error", text: "No valid student rows were found. Use columns like Student ID, Full Name, Grade Level, Section, Gender." });
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
              <label className="inline-flex cursor-pointer items-center gap-2 px-5 py-3 rounded-xl border border-violet-400/40 bg-violet-500/10 text-violet-100 font-bold shadow-xl shadow-violet-900/20 hover:bg-violet-500/20 transition">
                <Upload size={18} />
                {importLoading ? "Importing..." : "Import Excel"}
                <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} disabled={importLoading} />
              </label>
              <button onClick={() => { setEdit(null); setOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition">
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
                <button onClick={() => { setEdit(null); setOpen(true); }} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition">Add Student</button>
                <label className="inline-flex cursor-pointer items-center gap-2 px-5 py-2.5 rounded-xl border border-violet-400/40 bg-violet-500/10 text-violet-100 font-bold hover:bg-violet-500/20 transition">
                  <FileSpreadsheet size={16} /> Import Excel
                  <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleExcelImport} disabled={importLoading} />
                </label>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((s) => (
                <div key={s.id} className="glass-card rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200 relative group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="h-12 w-12 rounded-full flex items-center justify-center text-sm font-extrabold shadow-lg" style={{ backgroundColor: s.avatarColor + "33", color: s.avatarColor }}>
                      {s.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setForm({ ...s }); setEdit(s); setOpen(true); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-violet-200" aria-label="Edit"><Pencil size={14} /></button>
                      <button onClick={() => remove(s.id)} className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300" aria-label="Delete"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-white mb-0.5 truncate">{s.fullName}</h3>
                  <p className="text-xs text-violet-300 font-semibold mb-2">{s.studentId} · {s.gradeLevel} · {s.section}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span className="bg-white/5 px-2 py-0.5 rounded-md">{s.gender}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {open && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setEdit(null); }}>
              <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
                <h2 className="text-2xl font-extrabold text-white mb-6">{edit ? "Edit Student" : "New Student"}</h2>
                <div className="space-y-3">
                  <input value={form.studentId} onChange={e => setForm({ ...form, studentId: e.target.value })} placeholder="Student ID" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                  <input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Full Name" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.gradeLevel} onChange={e => setForm({ ...form, gradeLevel: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                      {["Grade 2","Grade 3","Grade 4","Grade 5"].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                    </select>
                    <select value={form.section} onChange={e => setForm({ ...form, section: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                      {["A","B","C"].map(s => <option key={s} value={s} className="bg-slate-900">Section {s}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">
                      {["Male","Female","Other"].map(g => <option key={g} value={g} className="bg-slate-900">{g}</option>)}
                    </select>
                    <input value={form.avatarColor} onChange={e => setForm({ ...form, avatarColor: e.target.value })} placeholder="#6366f1" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
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
