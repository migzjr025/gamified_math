"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { GradeRow } from "./types";

interface DeleteConfirmDialogProps {
  target: GradeRow | null;
  onClose: () => void;
  onConfirm: (id: number) => void;
}

export default function DeleteConfirmDialog({
  target,
  onClose,
  onConfirm,
}: DeleteConfirmDialogProps) {
  if (!target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      onClick={onClose}
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
          <strong className="text-white">{target.assessmentTitle || "this assessment"}</strong>? This action cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(target.id)}
            className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
          >
            Delete Grade
          </button>
        </div>
      </div>
    </div>
  );
}
