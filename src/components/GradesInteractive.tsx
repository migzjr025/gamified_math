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

function getScoreRating(score: number): { label: string; badgeClass: string; ratingText: string } {
  if (score >= 90) {
    return {
      label: `${score}% • Excellent`,
      ratingText: "Outstanding work! Full mastery of topics.",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    };
  }
  if (score >= 75) {
    return {
      label: `${score}% • Good`,
      ratingText: "Great job! Solid understanding of the lesson.",
      badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
    };
  }
  if (score >= 60) {
    return {
      label: `${score}% • Passing`,
      ratingText: "Passed! A quick review of missed items is recommended.",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    };
  }
  return {
    label: `${score}% • Needs Practice`,
    ratingText: "Needs more practice and teacher guidance.",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  };
}

function formatLaymanFeedback(feedback?: string | null): { preview: string; isGameSummary: boolean } {
  if (!feedback || !feedback.trim()) {
    return { preview: "No remarks yet", isGameSummary: false };
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
    preview: firstLine.length > 38 ? firstLine.slice(0, 35) + "..." : firstLine,
    isGameSummary: false,
  };
}

export default function GradesClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<{ id: number; fullName: string }[]>([]);
  const [assessments, setAssessments] = useState<{ id: number; title: string }[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<GradeRow | null>(null);
  const [selectedRemarks, setSelectedRemarks] = useState<{ studentName: string; assessmentTitle: string; score: number; feedback: string } | null>(null);
  const [form, setForm] = useState({ studentId: 1, assessmentId: 1, score: 85, pointsEarned: 85, feedback: "" });

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

      const parsedStudents = Array.isArray(dataS) ? dataS.map((s: any) => ({ id: s.id, fullName: s.fullName })) : [];
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
      setFetchError("Unable to load grades or related records. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

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
      load();
    } catch {
      setFormError("Network error while saving grade. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this grade record?")) {
      return;
    }
    try {
      const res = await fetch("/api/grades", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || "Failed to delete grade record.");
      }
      load();
    } catch {
      alert("Network error while deleting grade.");
    }
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
                Student Grades & Feedback
              </h1>
              <p className="text-slate-400 mt-1">
                View quiz scores, progress remarks, and teacher feedback in plain language.
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
                      <th className="py-4 px-4">Quiz / Activity</th>
                      <th className="py-4 px-4">Score & Rating</th>
                      <th className="py-4 px-4">Teacher Remarks</th>
                      <th className="py-4 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filtered.map((g) => {
                      const rating = getScoreRating(g.score);
                      const feedbackInfo = formatLaymanFeedback(g.feedback);
                      return (
                        <tr key={g.id} className="hover:bg-white/5 transition">
                          <td className="py-4 px-4 font-bold text-white whitespace-nowrap">
                            {g.studentName ?? "Unknown Student"}
                          </td>
                          <td className="py-4 px-4 text-slate-300 whitespace-nowrap">
                            {g.assessmentTitle ?? "Matatag Math Quiz"}
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-extrabold border ${rating.badgeClass}`}
                            >
                              {rating.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            {g.feedback ? (
                              <button
                                onClick={() =>
                                  setSelectedRemarks({
                                    studentName: g.studentName ?? "Student",
                                    assessmentTitle: g.assessmentTitle ?? "Quiz",
                                    score: g.score,
                                    feedback: g.feedback ?? "",
                                  })
                                }
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/30 border border-violet-400/30 text-xs font-semibold text-violet-200 transition cursor-pointer max-w-sm truncate group"
                                title="Click to view full notes"
                              >
                                <FileText size={13} className="text-violet-400 shrink-0" />
                                <span className="font-semibold text-slate-100">{feedbackInfo.preview}</span>
                                <span className="text-[11px] text-violet-300 group-hover:text-white underline ml-1">View Details →</span>
                              </button>
                            ) : (
                              <span className="text-xs text-slate-500 italic">No notes</span>
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
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Remarks & Feedback Viewer Modal */}
          {selectedRemarks && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => setSelectedRemarks(null)}
            >
              <div
                className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 border border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-xl shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-start justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-2">
                      <Sparkles size={13} /> Student Feedback & Remarks
                    </div>
                    <h2 className="text-2xl font-black text-white">{selectedRemarks.studentName}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {selectedRemarks.assessmentTitle}
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
                  {/* Rating summary pill */}
                  {(() => {
                    const rating = getScoreRating(selectedRemarks.score);
                    return (
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
                        <div>
                          <span className="text-xs text-slate-400 block mb-0.5">Quiz Score</span>
                          <span className="text-2xl font-black text-white">{selectedRemarks.score}%</span>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${rating.badgeClass}`}>
                            {rating.label.split("•")[1]?.trim() || "Completed"}
                          </span>
                          <span className="text-xs text-slate-400 block mt-1">{rating.ratingText}</span>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                      Teacher & Quiz Notes
                    </label>
                    <div className="p-5 rounded-2xl bg-black/40 border border-white/10 text-sm text-slate-200 whitespace-pre-wrap leading-relaxed font-sans">
                      {selectedRemarks.feedback}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setSelectedRemarks(null)}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    Close
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
                          {s.fullName}
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
        </div>
      </main>
    </div>
  );
}
