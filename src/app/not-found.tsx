"use client";

import Link from "next/link";
import { Compass, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50 p-6">
      <div className="max-w-md w-full glass-card rounded-3xl p-8 border border-white/10 text-center shadow-2xl relative overflow-hidden">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 mb-6 shadow-lg shadow-violet-950/50">
          <Compass size={32} />
        </div>

        <span className="inline-block px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 font-mono text-xs font-bold mb-3">
          404 Not Found
        </span>

        <h2 className="text-2xl font-extrabold text-white mb-2">Page not found</h2>
        <p className="text-sm text-slate-400 mb-8 leading-relaxed">
          The curriculum page or resource you are looking for does not exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard"
            className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-900/30 hover:scale-[1.02] transition"
          >
            <Home size={16} />
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

