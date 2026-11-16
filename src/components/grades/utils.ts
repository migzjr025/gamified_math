import { ScoreRating, TermType, SummativeType } from "./types";

export const TERMS: TermType[] = ["Term 1", "Term 2", "Term 3", "Remedial"];
export const SUMMATIVES: SummativeType[] = ["1st Summative", "2nd Summative", "3rd Summative", "4th Summative"];

export function normalizePeriodLabel(quarter?: string | number | null): string {
  const raw = String(quarter || "").trim();
  if (!raw) return "Term 1 - 1st Summative";

  const lower = raw.toLowerCase();
  if (lower === "quarter 1") return "Term 1 - 1st Summative";
  if (lower === "quarter 2") return "Term 2 - 1st Summative";
  if (lower === "quarter 3") return "Term 3 - 1st Summative";
  if (lower === "summative" || lower === "water temple" || lower === "remedial") return "Remedial";

  if (lower === "term 1") return "Term 1 - 1st Summative";
  if (lower === "term 2") return "Term 2 - 1st Summative";
  if (lower === "term 3") return "Term 3 - 1st Summative";

  const match = raw.match(/Term\s*([1-3])\s*[-–—:]\s*([1-4])(?:st|nd|rd|th)?\s*Summative/i);
  if (match) {
    const tNum = match[1];
    const sNum = match[2];
    const suffix = sNum === "1" ? "1st" : sNum === "2" ? "2nd" : sNum === "3" ? "3rd" : "4th";
    return `Term ${tNum} - ${suffix} Summative`;
  }

  return raw;
}

export function parseTermAndSummative(quarter?: string | number | null): {
  term: TermType;
  summative: SummativeType | "Remedial";
  isRemedial: boolean;
  shortBadge: string;
  slotKey: string;
} {
  const norm = normalizePeriodLabel(quarter);
  if (norm === "Remedial") {
    return {
      term: "Remedial",
      summative: "Remedial",
      isRemedial: true,
      shortBadge: "Remedial",
      slotKey: "remedial",
    };
  }

  const match = norm.match(/Term\s*([1-3])\s*[-–—:]\s*([1-4])(?:st|nd|rd|th)?\s*Summative/i);
  if (match) {
    const tNum = match[1] as "1" | "2" | "3";
    const sNum = match[2] as "1" | "2" | "3" | "4";
    const term = `Term ${tNum}` as TermType;
    const suffix = sNum === "1" ? "1st" : sNum === "2" ? "2nd" : sNum === "3" ? "3rd" : "4th";
    const summative = `${suffix} Summative` as SummativeType;
    return {
      term,
      summative,
      isRemedial: false,
      shortBadge: `T${tNum}-${suffix}`,
      slotKey: `t${tNum}_s${sNum}`,
    };
  }

  return {
    term: "Term 1",
    summative: "1st Summative",
    isRemedial: false,
    shortBadge: "T1-1st",
    slotKey: "t1_s1",
  };
}

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
  const parsed = parseTermAndSummative(quarter);
  if (parsed.isRemedial) return 13;

  const slotMap: Record<string, number> = {
    t1_s1: 1,
    t1_s2: 2,
    t1_s3: 3,
    t1_s4: 4,
    t2_s1: 5,
    t2_s2: 6,
    t2_s3: 7,
    t2_s4: 8,
    t3_s1: 9,
    t3_s2: 10,
    t3_s3: 11,
    t3_s4: 12,
  };

  if (slotMap[parsed.slotKey]) {
    return slotMap[parsed.slotKey];
  }

  // Fallback checking title
  const t = (title || "").toLowerCase();
  if (t.includes("remedial") || t.includes("summative assessment") || t.includes("water temple")) return 13;
  if (t.includes("term 1") || t.includes("quarter 1") || t.includes("q1")) return 1;
  if (t.includes("term 2") || t.includes("quarter 2") || t.includes("q2")) return 5;
  if (t.includes("term 3") || t.includes("quarter 3") || t.includes("q3")) return 9;

  return 14;
}

export function getQuarterShortLabel(title?: string, quarter?: string | number | null): string {
  const parsed = parseTermAndSummative(quarter);
  if (parsed.isRemedial) return "Remedial";
  if (parsed.shortBadge) return parsed.shortBadge;

  const ord = getQuarterOrder(title, quarter);
  if (ord <= 4) return `T1-${ord}st`;
  if (ord <= 8) return `T2-${ord - 4}th`;
  if (ord <= 12) return `T3-${ord - 8}th`;
  if (ord === 13) return "Remedial";
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

export function formatLaymanFeedback(feedback?: string | null): {
  preview: string;
  isGameSummary: boolean;
  cleanFeedback: string;
  missedCount?: number;
  remediatedCount?: number;
  slotKey?: string;
} {
  if (!feedback || !feedback.trim()) {
    return { preview: "Evaluated successfully", isGameSummary: false, cleanFeedback: "" };
  }
  const raw = feedback.trim();

  // Extract structured tags
  let slotKey: string | undefined;
  let missedCount: number | undefined;
  let remediatedCount: number | undefined;

  const slotMatch = raw.match(/\[SLOT:([a-z0-9_]+)\]/i);
  if (slotMatch) slotKey = slotMatch[1].toLowerCase();

  const missedMatch = raw.match(/\[MISSED:([^\]]*)\]/i);
  if (missedMatch) {
    const ids = missedMatch[1].split(",").map(s => s.trim()).filter(Boolean);
    missedCount = ids.length;
  }

  const remediatedMatch = raw.match(/\[REMEDIATED:([^\]]*)\]/i);
  if (remediatedMatch) {
    const ids = remediatedMatch[1].split(",").map(s => s.trim()).filter(Boolean);
    remediatedCount = ids.length;
  }

  // Strip tags for clean teacher-facing text
  const cleanFeedback = raw
    .replace(/\[SLOT:[^\]]+\]/gi, "")
    .replace(/\[MISSED:[^\]]*\]/gi, "")
    .replace(/\[REMEDIATED:[^\]]*\]/gi, "")
    .trim();

  const gameMatch = cleanFeedback.match(/Answered (\d+) of (\d+) questions correctly/i);
  if (gameMatch) {
    const correct = Number(gameMatch[1]);
    const total = Number(gameMatch[2]);
    return {
      preview: correct === total ? `Perfect (${correct}/${total} correct)` : `${correct} of ${total} correct`,
      isGameSummary: true,
      cleanFeedback,
      missedCount,
      remediatedCount,
      slotKey,
    };
  }

  const firstLine = cleanFeedback.split("\n")[0] || "Evaluated successfully";
  return {
    preview: firstLine.length > 40 ? firstLine.slice(0, 37) + "..." : firstLine,
    isGameSummary: false,
    cleanFeedback,
    missedCount,
    remediatedCount,
    slotKey,
  };
}
