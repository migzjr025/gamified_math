"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Search, Zap, TrendingUp, Sparkles, FileText, CheckCircle2, AlertTriangle, Lightbulb, X } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface GradeRow {
  id: number;
  studentId: number;
  assessmentId: number;
  score: number;
  pointsEarned: number;
  feedback?: string | null;
  studentName?: string;
  assessmentTitle?: string;
  assessmentType?: string;
  unitTitle?: string;
}

export default function GradesClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<{ id: number; fullName: string }[]>([]);
  const [assessments, setAssessments] = useState<{ id: number; title: string }[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<GradeRow | null>(null);
  const [selectedRemarks, setSelectedRemarks] = useState<{ studentName: string; assessmentTitle: string; score: number; feedback: string } | null>(null);
  const [form, setForm] = useState({ studentId: 1, assessmentId: 1, score: 85, pointsEarned: 85, feedback: "" });

  async function load() {
    setLoading(true);
    const [resG, resS, resA] = await Promise.all([
      fetch("/api/grades"),
      fetch("/api/students"),
      fetch("/api/assessments"),
    ]);
    setItems(await resG.json());
    setStudents((await resS.json()).map((s: any) => ({ id: s.id, fullName: s.fullName })));
    setAssessments((await resA.json()).map((a: any) => ({ id: a.id, title: a.title })));
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (edit) {
      await fetch("/api/grades", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: edit.id, ...form }),
      });
    } else {
      await fetch("/api/grades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
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
    load();
  }

  async function remove(id: number) {
    await fetch("/api/grades", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  const filtered = items.filter(
    (s) =>
      (s.studentName ?? "").toLowerCase().includes(q.toLowerCase()) ||
      (s.assessmentTitle ?? "").toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">
                Grades & Diagnostic Remarks
              </h1>
              <p className="text-slate-400 mt-1">
                Student scores, strengths, weaknesses, and pedagogical feedback.
              </p>
            </div>
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
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition cursor-pointer"
            >
              <Plus size={18} /> Log Grade
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by student or assessment..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white"
              />
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 glass-card rounded-3xl border border-white/10">
              <Zap size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-extrabold text-white mb-2">No grade records found</h3>
              <p className="text-slate-400 mb-6">Log grades manually or have students play the challenge game.</p>
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
                className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition cursor-pointer"
              >
                Log First Grade
              </button>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/5">
                      <th className="py-4 px-4">Student</th>
                      <th className="py-4 px-4">Assessment / Task</th>
                      <th className="py-4 px-4">Score</th>
                      <th className="py-4 px-4">Diagnostic Remarks & Advice</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((g) => (
                      <tr key={g.id} className="hover:bg-white/5 transition">
                        <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                          {g.studentName ?? "Unknown Student"}
                        </td>
                        <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                          {g.assessmentTitle ?? "Matatag Math Assessment"}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                              g.score >= 85
                                ? "bg-teal-400/15 text-teal-200 border border-teal-500/20"
                                : g.score >= 70
                                ? "bg-amber-400/15 text-amber-200 border border-amber-500/20"
                                : "bg-rose-400/15 text-rose-200 border border-rose-500/20"
                            }`}
                          >
                            <TrendingUp size={12} />
                            {g.score}%
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          {g.feedback ? (
                            <button
                              onClick={() =>
                                setSelectedRemarks({
                                  studentName: g.studentName ?? "Student",
                                  assessmentTitle: g.assessmentTitle ?? "Assessment",
                                  score: g.score,
                                  feedback: g.feedback ?? "",
                                })
                              }
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 border border-violet-400/30 text-xs font-semibold text-violet-200 transition cursor-pointer max-w-sm truncate"
                            >
                              <FileText size={13} className="text-violet-400 shrink-0" />
                              <span className="truncate">{g.feedback.split("\n")[0] || "View Diagnostic Breakdown"}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-500 italic">No remarks recorded</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
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
                              className="p-2 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer"
                              title="Edit Grade"
                              aria-label="Edit"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              onClick={() => remove(g.id)}
                              className="p-2 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                              title="Delete Grade"
                              aria-label="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Diagnostic Remarks Viewer Modal */}
          {selectedRemarks && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedRemarks(null)}
            >
              <div
                className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-2">
                      <Sparkles size={13} /> Diagnostic Evaluation
                    </div>
                    <h2 className="text-2xl font-black text-white">{selectedRemarks.studentName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedRemarks.assessmentTitle} · Score:{" "}
                      <span className="font-bold text-violet-300">{selectedRemarks.score}%</span>
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedRemarks(null)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/10 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                    {selectedRemarks.feedback}
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedRemarks(null)}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm transition cursor-pointer"
                  >
                    Close Remarks
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Add / Edit Grade Modal */}
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
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 mb-1">Assessment / Task</label>
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
                    <label className="block text-xs font-bold text-slate-400 mb-1">Teacher Remarks / Diagnostic Advice</label>
                    <textarea
                      value={form.feedback}
                      onChange={(e) => setForm({ ...form, feedback: e.target.value })}
                      placeholder="Enter strengths, focus areas, or pedagogical advice..."
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
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition cursor-pointer"
                  >
                    {edit ? "Save Changes" : "Log Grade"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
