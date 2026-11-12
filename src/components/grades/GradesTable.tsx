"use client";

import React from "react";
import { Award, Calendar, FileText } from "lucide-react";
import { StudentGroup } from "./types";
import {
  formatGradeDate,
  formatGradeDateTime,
  formatRelativeTime,
  getScoreRating,
  getQuarterShortLabel,
} from "./utils";

interface GradesTableProps {
  loading: boolean;
  studentGroups: StudentGroup[];
  filteredGroups: StudentGroup[];
  hasActiveFilters: boolean;
  onResetFilters: () => void;
  onSelectStudent: (studentId: number) => void;
  onLogFirstGrade: () => void;
  selectedStudentIds?: number[];
  onToggleSelectStudent?: (studentId: number) => void;
  onToggleSelectAll?: () => void;
}

export default function GradesTable({
  loading,
  studentGroups,
  filteredGroups,
  hasActiveFilters,
  onResetFilters,
  onSelectStudent,
  onLogFirstGrade,
  selectedStudentIds = [],
  onToggleSelectStudent,
  onToggleSelectAll,
}: GradesTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  if (filteredGroups.length === 0) {
    return (
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
            onClick={onResetFilters}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition cursor-pointer"
          >
            Reset Filters
          </button>
        ) : (
          <button
            onClick={onLogFirstGrade}
            className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition cursor-pointer"
          >
            Log First Grade
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-card rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/10 bg-white/[0.03]">
              {onToggleSelectAll && (
                <th className="py-4 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredGroups.length > 0 &&
                      filteredGroups.every((sg) => selectedStudentIds.includes(sg.studentId))
                    }
                    onChange={onToggleSelectAll}
                    className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600"
                    aria-label="Select all students in grades table"
                  />
                </th>
              )}
              <th className="py-4 px-6">Student</th>
              <th className="py-4 px-6">Curriculum Progress</th>
              <th className="py-4 px-6">Average Score</th>
              <th className="py-4 px-6">Date Recorded</th>
              <th className="py-4 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredGroups.map((sg) => {
              const isSelected = selectedStudentIds.includes(sg.studentId);
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
                  onClick={() => onSelectStudent(sg.studentId)}
                  className={`transition-all cursor-pointer group ${
                    isSelected
                      ? "bg-violet-950/25 hover:bg-violet-950/40"
                      : "hover:bg-white/[0.04]"
                  }`}
                >
                  {onToggleSelectStudent && (
                    <td
                      className="py-4 px-4 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelectStudent(sg.studentId)}
                        className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600"
                        aria-label={`Select student ${sg.studentName}`}
                      />
                    </td>
                  )}
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

                  {/* Progress Bar + Quarter Chips */}
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
                          const recordedDateStr =
                            g.createdAt || g.updatedAt
                              ? ` • Recorded: ${formatGradeDate(g.createdAt || g.updatedAt)}`
                              : "";
                          return (
                            <span
                              key={g.id}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold border ${r.badgeClass} shadow-sm`}
                              title={`${g.assessmentTitle}: ${g.score}%${recordedDateStr}`}
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

                  {/* Date Recorded */}
                  <td className="py-4 px-6 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 text-slate-200 text-xs">
                      <Calendar size={13} className="text-violet-400 shrink-0" />
                      <span className="font-semibold">{formatGradeDate(sg.lastRecordedDate)}</span>
                    </div>
                    {sg.lastRecordedDate && (
                      <div className="text-[11px] text-slate-400 mt-0.5 pl-4">
                        {formatRelativeTime(sg.lastRecordedDate) || formatGradeDateTime(sg.lastRecordedDate)}
                      </div>
                    )}
                  </td>

                  {/* Action Button */}
                  <td className="py-4 px-6 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(sg.studentId);
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
  );
}
