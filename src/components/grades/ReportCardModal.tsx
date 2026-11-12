"use client";

import React, { useState } from "react";
import { Sparkles, X, Calendar, BookOpen, Pencil, Trash2, Printer, AlertTriangle } from "lucide-react";
import { StudentGroup, GradeRow } from "./types";
import { formatGradeDateTime, getScoreRating, formatLaymanFeedback, getQuarterOrder } from "./utils";

interface ReportCardModalProps {
  activeStudent: StudentGroup;
  assessments: { id: number; title: string }[];
  onClose: () => void;
  onEditGrade: (grade: GradeRow) => void;
  onDeleteGrade: (grade: GradeRow) => void;
  onAddNewGrade: (studentId: number) => void;
  onBulkDeleteGrades?: (ids: number[]) => void;
}

export default function ReportCardModal({
  activeStudent,
  onClose,
  onEditGrade,
  onDeleteGrade,
  onAddNewGrade,
  onBulkDeleteGrades,
}: ReportCardModalProps) {
  const [selectedGradeIds, setSelectedGradeIds] = useState<number[]>([]);
  const [confirmBulkOpen, setConfirmBulkOpen] = useState(false);

  function toggleSelectGrade(id: number) {
    setSelectedGradeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const allIds = activeStudent.grades.map((g) => g.id);
    const allSelected = allIds.length > 0 && allIds.every((id) => selectedGradeIds.includes(id));
    if (allSelected) {
      setSelectedGradeIds([]);
    } else {
      setSelectedGradeIds(allIds);
    }
  }
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      onClick={onClose}
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
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs px-2.5 py-0.5 rounded-md bg-white/10 text-violet-300 font-mono font-bold">
                  {activeStudent.studentNumber}
                </span>
                <span className="text-xs text-slate-400">
                  {activeStudent.gradeLevel} • Section {activeStudent.section}
                </span>
                {activeStudent.lastRecordedDate && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-violet-300 font-medium pl-2 border-l border-white/10">
                    <Calendar size={12} className="text-violet-400 shrink-0" />
                    Latest record: {formatGradeDateTime(activeStudent.lastRecordedDate)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer print:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Performance & Curriculum Meter Banners */}
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
              onClick={() => onAddNewGrade(activeStudent.studentId)}
              className="px-3 py-1 rounded-lg bg-violet-600/30 hover:bg-violet-600 text-violet-200 hover:text-white border border-violet-400/30 text-xs font-bold transition cursor-pointer print:hidden"
            >
              + Log Another Grade
            </button>
          </div>

          {/* Bulk Selection Bar for Grades in Report Card */}
          {onBulkDeleteGrades && activeStudent.grades.length > 0 && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 border border-white/10 text-xs print:hidden">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none font-semibold">
                <input
                  type="checkbox"
                  checked={
                    activeStudent.grades.length > 0 &&
                    activeStudent.grades.every((g) => selectedGradeIds.includes(g.id))
                  }
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600"
                />
                <span>Select All ({activeStudent.grades.length})</span>
              </label>
              {selectedGradeIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedGradeIds([])}
                    className="px-2 py-1 rounded-lg text-[11px] text-slate-400 hover:text-white transition cursor-pointer"
                  >
                    Deselect
                  </button>
                  <button
                    onClick={() => setConfirmBulkOpen(true)}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition cursor-pointer shadow-sm"
                  >
                    <Trash2 size={12} />
                    <span>Delete Selected ({selectedGradeIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {activeStudent.grades.map((g) => {
            const rating = getScoreRating(g.score);
            const fb = formatLaymanFeedback(g.feedback);
            const order = getQuarterOrder(g.assessmentTitle, g.quarter);
            const isSelected = selectedGradeIds.includes(g.id);

            return (
              <div
                key={g.id}
                className={`p-5 rounded-2xl transition shadow-sm border ${
                  isSelected
                    ? "bg-violet-950/20 border-violet-500 ring-2 ring-violet-500/40"
                    : "bg-white/5 border-white/10 hover:border-violet-500/30"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    {onBulkDeleteGrades && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectGrade(g.id)}
                        className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600 shrink-0 print:hidden"
                        aria-label={`Select grade for ${g.assessmentTitle}`}
                      />
                    )}
                    <span className="w-8 h-8 rounded-lg bg-violet-500/20 text-violet-300 font-black text-xs flex items-center justify-center border border-violet-400/30 shrink-0">
                      {order === 4 ? "S" : `Q${order}`}
                    </span>
                    <div>
                      <h4 className="font-extrabold text-white text-base">{g.assessmentTitle}</h4>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                        <span className="text-[11px] text-slate-400">
                          {order === 4
                            ? "Summative Assessment (Water Temple)"
                            : `Quarter ${order} Curriculum Assessment`}
                        </span>
                        {(g.createdAt || g.updatedAt) && (
                          <>
                            <span className="text-slate-600">•</span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-violet-300 font-medium">
                              <Calendar size={11} className="text-violet-400 shrink-0" />
                              Recorded on {formatGradeDateTime(g.createdAt || g.updatedAt)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${rating.badgeClass}`}>
                      {rating.label}
                    </span>
                    <div className="flex items-center gap-1 ml-2 print:hidden">
                      <button
                        onClick={() => onEditGrade(g)}
                        className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer"
                        title="Edit Grade"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => onDeleteGrade(g)}
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

        {/* Modal Footer with Print and Done buttons */}
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
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg transition cursor-pointer"
          >
            Done
          </button>
        </div>

        {/* Bulk Delete Confirm Inside Report Card */}
        {confirmBulkOpen && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setConfirmBulkOpen(false)}
          >
            <div
              className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-xl font-black text-white mb-2">
                Delete {selectedGradeIds.length} Grade Records?
              </h3>
              <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                Are you sure you want to delete <strong className="text-white">{selectedGradeIds.length} grade records</strong> for this student? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmBulkOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onBulkDeleteGrades) {
                      onBulkDeleteGrades(selectedGradeIds);
                    }
                    setSelectedGradeIds([]);
                    setConfirmBulkOpen(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                >
                  Delete Selected
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
