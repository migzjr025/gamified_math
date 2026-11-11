import { ScoreRating } from "./types";

export function formatGradeDate(rawDate?: string | null): string {
  if (!rawDate) return "—";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function formatGradeDateTime(rawDate?: string | null): string {
  if (!rawDate) return "—";
  try {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "—";
  }
}

export function formatRelativeTime(rawDate?: string | null): string {
  if (!rawDate) return "";
  try {
    const d = new Date(rawDate);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 0) return "Just now";
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 30) return "";
    if (diffDays >= 1) return `${diffDays}d ago`;
    if (diffHours >= 1) return `${diffHours}h ago`;
    if (diffMin >= 1) return `${diffMin}m ago`;
    return "Just now";
  } catch {
    return "";
  }
}

export function normalizeStudentNumber(raw?: string | null, fallbackId: number = 1): string {
  if (!raw) return `2026-${String(fallbackId).padStart(3, "0")}`;
  let clean = raw.trim();
  if (/^s-/i.test(clean)) {
    clean = clean.replace(/^s-/i, "").trim();
  }
  if (/^\d{4}-\d{3,}$/.test(clean)) {
    return clean.replace(/^\d{4}-/, "2026-");
  }
  if (/^\d{1,3}$/.test(clean)) {
    return `2026-${clean.padStart(3, "0")}`;
  }
  return clean;
}

export function getQuarterOrder(title?: string, quarter?: string | number | null): number {
  const qStr = String(quarter || "").toLowerCase();
  if (qStr.includes("1") || qStr === "quarter 1") return 1;
  if (qStr.includes("2") || qStr === "quarter 2") return 2;
  if (qStr.includes("3") || qStr === "quarter 3") return 3;
  if (qStr.includes("summative") || qStr === "final") return 4;

  const t = (title || "").toLowerCase();
  if (t.includes("quarter 1") || t.includes("q1") || t.includes("unit 1")) return 1;
  if (t.includes("quarter 2") || t.includes("q2") || t.includes("unit 2")) return 2;
  if (t.includes("quarter 3") || t.includes("q3") || t.includes("unit 3")) return 3;
  if (t.includes("summative") || t.includes("water temple") || t.includes("final")) return 4;
  return 5;
}

export function getQuarterShortLabel(title?: string, quarter?: string | number | null): string {
  const ord = getQuarterOrder(title, quarter);
  if (ord === 1) return "Q1";
  if (ord === 2) return "Q2";
  if (ord === 3) return "Q3";
  if (ord === 4) return "Summative";
  return "Quiz";
}

export function getScoreRating(score: number): ScoreRating {
  if (score >= 90) {
    return {
      label: `${score}% • Excellent`,
      ratingText: "Outstanding mastery of lesson objectives.",
      badgeClass: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
      toneColor: "#10b981",
    };
  }
  if (score >= 75) {
    return {
      label: `${score}% • Good`,
      ratingText: "Solid understanding and consistent work.",
      badgeClass: "bg-teal-500/15 text-teal-300 border-teal-500/30",
      toneColor: "#14b8a6",
    };
  }
  if (score >= 60) {
    return {
      label: `${score}% • Passing`,
      ratingText: "Passed the assessment requirement.",
      badgeClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
      toneColor: "#f59e0b",
    };
  }
  return {
    label: `${score}% • Needs Practice`,
    ratingText: "Additional practice and teacher guidance needed.",
    badgeClass: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    toneColor: "#f43f5e",
  };
}

export function formatLaymanFeedback(feedback?: string | null): { preview: string; isGameSummary: boolean } {
  if (!feedback || !feedback.trim()) {
    return { preview: "Evaluated successfully", isGameSummary: false };
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
    preview: firstLine.length > 40 ? firstLine.slice(0, 37) + "..." : firstLine,
    isGameSummary: false,
  };
}
