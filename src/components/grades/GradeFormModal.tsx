"use client";

import React from "react";
import { AlertTriangle, Calendar } from "lucide-react";
import { GradeRow, StudentMeta } from "./types";
import { formatGradeDateTime } from "./utils";

interface GradeFormModalProps {
  open: boolean;
  edit: GradeRow | null;
  form: {
    studentId: number;
    assessmentId: number;
    score: number;
    pointsEarned: number;
    feedback: string;
  };
  setForm: React.Dispatch<
    React.SetStateAction<{
      studentId: number;
      assessmentId: number;
      score: number;
      pointsEarned: number;
      feedback: string;
    }>
  >;
  students: StudentMeta[];
  assessments: { id: number; title: string }[];
  saving: boolean;
  formError: string;
  onClose: () => void;
  onSave: () => void;
}

export default function GradeFormModal({
  open,
  edit,
  form,
  setForm,
  students,
  assessments,
  saving,
  formError,
  onClose,
  onSave,
}: GradeFormModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-2xl font-extrabold text-white mb-6">
          {edit ? "Edit Grade & Remarks" : "Log New Grade"}
        </h2>

        {edit && (edit.createdAt || edit.updatedAt) && (
          <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-white/10 bg-white/5 text-slate-300 text-xs">
            <Calendar size={14} className="text-violet-400 shrink-0" />
            <span>
              Grade originally recorded on:{" "}
              <strong className="text-white">{formatGradeDateTime(edit.createdAt || edit.updatedAt)}</strong>
            </span>
          </div>
        )}

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
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : edit ? "Save Changes" : "Log Grade"}
          </button>
        </div>
      </div>
    </div>
  );
}
