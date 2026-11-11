"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, Sparkles, X } from "lucide-react";
import { ToastMessage } from "./types";

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: number) => void;
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
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
            onClick={() => onDismiss(toast.id)}
            className="p-1 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
