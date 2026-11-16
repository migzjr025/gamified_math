"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Search, BrainCircuit, Sparkles, BookOpen, Layers, Award, Filter, AlertTriangle } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface Question {
  id: number;
  unitId: number;
  gradeLevel: string;
  quarter?: string | null;
  difficulty: number;
  prompt: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation?: string | null;
  isActive: boolean;
  unitTitle?: string;
}

interface UnitOption {
  id: number;
  title: string;
  quarter?: string | null;
  gradeLevel?: string | null;
}

export const TERMS = ["Term 1", "Term 2", "Term 3", "Remedial"] as const;
export type TermType = typeof TERMS[number];

export const SUMMATIVES = ["1st Summative", "2nd Summative", "3rd Summative", "4th Summative"] as const;
export type SummativeType = typeof SUMMATIVES[number];

export function parseQuarterSlot(quarter?: string | null): {
  term: TermType;
  summative: SummativeType | "Remedial";
  isRemedial: boolean;
  label: string;
  slotKey: string;
} {
  const norm = String(quarter || "").trim();
  if (!norm || norm === "Quarter 1" || norm === "Term 1") {
    return { term: "Term 1", summative: "1st Summative", isRemedial: false, label: "Term 1 - 1st Summative", slotKey: "t1_s1" };
  }
  if (norm === "Quarter 2" || norm === "Term 2") {
    return { term: "Term 2", summative: "1st Summative", isRemedial: false, label: "Term 2 - 1st Summative", slotKey: "t2_s1" };
  }
  if (norm === "Quarter 3" || norm === "Term 3") {
    return { term: "Term 3", summative: "1st Summative", isRemedial: false, label: "Term 3 - 1st Summative", slotKey: "t3_s1" };
  }
  if (norm === "Summative" || norm === "Remedial") {
    return { term: "Remedial", summative: "Remedial", isRemedial: true, label: "Remedial", slotKey: "remedial" };
  }
  const m = norm.match(/Term\s*([1-3])\s*[-–—:]\s*([1-4])(?:st|nd|rd|th)?\s*Summative/i);
  if (m) {
    const s = m[2] === "1" ? "1st" : m[2] === "2" ? "2nd" : m[2] === "3" ? "3rd" : "4th";
    return {
      term: `Term ${m[1]}` as TermType,
      summative: `${s} Summative` as SummativeType,
      isRemedial: false,
      label: `Term ${m[1]} - ${s} Summative`,
      slotKey: `t${m[1]}_s${m[2]}`,
    };
  }
  return { term: "Term 1", summative: "1st Summative", isRemedial: false, label: "Term 1 - 1st Summative", slotKey: "t1_s1" };
}

const defaultForm = {
  unitId: 1,
  gradeLevel: "Grade 2",
  selectedTerm: "Term 1" as TermType,
  selectedSummative: "1st Summative" as SummativeType,
  difficulty: 1,
  prompt: "",
  optionA: "",
  optionB: "",
  optionC: "",
  optionD: "",
  correctAnswer: "A",
  explanation: "",
  isActive: true,
};

export default function QuestionsInteractive({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<Question[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeTermTab, setActiveTermTab] = useState<"All" | TermType>("All");
  const [activeSummativeFilter, setActiveSummativeFilter] = useState<"All" | SummativeType>("All");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Question | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Question | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkDeleteTarget, setBulkDeleteTarget] = useState<number[] | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [seedingUnits, setSeedingUnits] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [questionsRes, unitsRes] = await Promise.all([
        fetch("/api/questions"),
        fetch("/api/units"),
      ]);
      const questions = questionsRes.ok ? await questionsRes.json() : [];
      const unitsData = unitsRes.ok ? await unitsRes.json() : [];
      setItems(Array.isArray(questions) ? questions : []);
      setUnits(Array.isArray(unitsData) ? unitsData : []);
      if (Array.isArray(unitsData) && unitsData.length > 0) {
        setForm((current) => ({ ...current, unitId: unitsData[0].id }));
      }
    } catch (e) {
      console.error("Failed to load questions", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSeedDefaults() {
    setSeedingUnits(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSeedingUnits(false);
    }
  }

  function handleOpenAdd() {
    setEdit(null);
    const initialTerm = activeTermTab === "All" ? "Term 1" : activeTermTab;
    const initialSummative = activeSummativeFilter === "All" ? "1st Summative" : activeSummativeFilter;
    const targetSlot = initialTerm === "Remedial" ? "Remedial" : `${initialTerm} - ${initialSummative}`;
    const count = items.filter((i) => parseQuarterSlot(i.quarter).label === targetSlot).length;

    if (count >= 10) {
      setSaveError(
        `Limit Reached: ${targetSlot} already has ${count}/10 questions. You cannot exceed 10 questions for this slot.`
      );
    } else {
      setSaveError(null);
    }

    setForm({
      ...defaultForm,
      selectedTerm: initialTerm,
      selectedSummative: initialSummative,
      unitId: units[0]?.id ?? 1,
    });
    setOpen(true);
  }

  function handleOpenEdit(item: Question) {
    setSaveError(null);
    setEdit(item);
    const slot = parseQuarterSlot(item.quarter);
    setForm({
      unitId: item.unitId,
      gradeLevel: item.gradeLevel,
      selectedTerm: slot.term,
      selectedSummative: slot.isRemedial ? "1st Summative" : (slot.summative as SummativeType),
      difficulty: item.difficulty,
      prompt: item.prompt,
      optionA: item.optionA,
      optionB: item.optionB,
      optionC: item.optionC,
      optionD: item.optionD,
      correctAnswer: item.correctAnswer,
      explanation: item.explanation ?? "",
      isActive: item.isActive,
    });
    setOpen(true);
  }

  async function save() {
    setSaveError(null);
    if (!form.prompt.trim()) {
      setSaveError("Please enter a question prompt.");
      return;
    }

    const targetSlotLabel = form.selectedTerm === "Remedial" ? "Remedial" : `${form.selectedTerm} - ${form.selectedSummative}`;

    // Error handler: Prevent exceeding 10 questions per Summative slot
    const existingInTargetSlot = items.filter(
      (i) => parseQuarterSlot(i.quarter).label === targetSlotLabel && (!edit || i.id !== edit.id)
    );
    if (existingInTargetSlot.length >= 10) {
      setSaveError(
        `Question Limit Exceeded: ${targetSlotLabel} already has 10 questions (maximum allowed is 10). You cannot add more than 10 questions to this slot.`
      );
      return;
    }

    const payload = {
      unitId: Number(form.unitId),
      gradeLevel: form.gradeLevel,
      quarter: targetSlotLabel,
      difficulty: Number(form.difficulty) || 1,
      prompt: form.prompt.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      correctAnswer: form.correctAnswer,
      explanation: form.explanation?.trim() || null,
      isActive: form.isActive,
    };

    try {
      const res = edit
        ? await fetch("/api/questions", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...payload }) })
        : await fetch("/api/questions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save question");
        return;
      }

      setOpen(false);
      setEdit(null);
      setForm(defaultForm);
      load();
    } catch (e: any) {
      setSaveError(e.message || "Failed to save question due to network or server error.");
    }
  }

  async function remove(id: number) {
    await fetch("/api/questions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSelectedIds((prev) => prev.filter((item) => item !== id));
    load();
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map((item) => item.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  }

  async function bulkRemove(ids: number[]) {
    setBulkDeleting(true);
    try {
      await fetch("/api/questions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setBulkDeleteTarget(null);
      await load();
    } finally {
      setBulkDeleting(false);
    }
  }

  // Stats per Term & Summative Slots
  const stats = useMemo(() => {
    const slotCounts: Record<string, number> = {};
    let t1Total = 0;
    let t2Total = 0;
    let t3Total = 0;
    let remedialTotal = 0;

    items.forEach((item) => {
      const slot = parseQuarterSlot(item.quarter);
      slotCounts[slot.slotKey] = (slotCounts[slot.slotKey] || 0) + 1;
      if (slot.term === "Term 1") t1Total++;
      else if (slot.term === "Term 2") t2Total++;
      else if (slot.term === "Term 3") t3Total++;
      else if (slot.term === "Remedial") remedialTotal++;
    });

    return {
      t1Total,
      t2Total,
      t3Total,
      remedialTotal,
      t1_s1: slotCounts["t1_s1"] || 0,
      t1_s2: slotCounts["t1_s2"] || 0,
      t1_s3: slotCounts["t1_s3"] || 0,
      t1_s4: slotCounts["t1_s4"] || 0,
      t2_s1: slotCounts["t2_s1"] || 0,
      t2_s2: slotCounts["t2_s2"] || 0,
      t2_s3: slotCounts["t2_s3"] || 0,
      t2_s4: slotCounts["t2_s4"] || 0,
      t3_s1: slotCounts["t3_s1"] || 0,
      t3_s2: slotCounts["t3_s2"] || 0,
      t3_s3: slotCounts["t3_s3"] || 0,
      t3_s4: slotCounts["t3_s4"] || 0,
      total: items.length,
    };
  }, [items]);

  // Filtered list
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const slot = parseQuarterSlot(item.quarter);
      const matchesTerm = activeTermTab === "All" || slot.term === activeTermTab;
      const matchesSummative =
        activeTermTab === "Remedial" ||
        activeSummativeFilter === "All" ||
        slot.summative === activeSummativeFilter;
      const matchesGrade = selectedGradeFilter === "All" || item.gradeLevel === selectedGradeFilter;
      const searchTarget = `${item.prompt} ${item.unitTitle ?? ""} ${item.gradeLevel} ${item.optionA} ${item.optionB} ${item.optionC} ${item.optionD}`.toLowerCase();
      const matchesQuery = !q.trim() || searchTarget.includes(q.toLowerCase());
      return matchesTerm && matchesSummative && matchesGrade && matchesQuery;
    });
  }, [items, activeTermTab, activeSummativeFilter, selectedGradeFilter, q]);

  // Real-time capacity check for the modal form's selected slot (Limit: 10)
  const currentFormSlotLabel = form.selectedTerm === "Remedial" ? "Remedial" : `${form.selectedTerm} - ${form.selectedSummative}`;
  const selectedQuarterCount = useMemo(() => {
    return items.filter(
      (i) => parseQuarterSlot(i.quarter).label === currentFormSlotLabel && (!edit || i.id !== edit.id)
    ).length;
  }, [items, currentFormSlotLabel, edit]);

  const isQuarterOverLimit = selectedQuarterCount >= 10;

  // Quarter Badge Colors
  const getQuarterBadge = (quarter?: string | null) => {
    const slot = parseQuarterSlot(quarter);
    if (slot.isRemedial) {
      return { label: "Remedial", bg: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40", icon: "💧" };
    }
    switch (slot.term) {
      case "Term 1":
        return { label: slot.label, bg: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: "🌱" };
      case "Term 2":
        return { label: slot.label, bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "🌿" };
      case "Term 3":
        return { label: slot.label, bg: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: "🌻" };
      default:
        return { label: slot.label, bg: "bg-slate-700 text-slate-200 border-slate-600", icon: "📘" };
    }
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles size={12} /> Game Question Bank
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-transparent">
                Matatag Math Questions
              </h1>
              <p className="text-slate-400 mt-1 text-sm md:text-base">
                Organized by 3 Quarters + Summative Assessments to feed the interactive game.
              </p>
            </div>
            <button
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-white font-bold shadow-xl shadow-violet-900/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
            >
              <Plus size={18} /> Add Question
            </button>
          </div>

          {/* Quick Term & Summative Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Term 1 Card */}
            <div
              onClick={() => { setActiveTermTab("Term 1"); setActiveSummativeFilter("All"); }}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTermTab === "Term 1"
                  ? "bg-sky-500/20 border-sky-400/50 shadow-lg shadow-sky-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Term 1</span>
                  <span className="text-lg">🌱</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-white">
                    {stats.t1Total} <span className="text-xs font-normal text-slate-400">/ 40</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Foundation & Numbers</p>
              </div>

              {/* Summative Slot Capacity Pills */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">1st</div>
                  <div className={`text-xs font-bold ${stats.t1_s1 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t1_s1}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">2nd</div>
                  <div className={`text-xs font-bold ${stats.t1_s2 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t1_s2}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">3rd</div>
                  <div className={`text-xs font-bold ${stats.t1_s3 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t1_s3}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">4th</div>
                  <div className={`text-xs font-bold ${stats.t1_s4 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t1_s4}/10</div>
                </div>
              </div>
            </div>

            {/* Term 2 Card */}
            <div
              onClick={() => { setActiveTermTab("Term 2"); setActiveSummativeFilter("All"); }}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTermTab === "Term 2"
                  ? "bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Term 2</span>
                  <span className="text-lg">🌿</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-white">
                    {stats.t2Total} <span className="text-xs font-normal text-slate-400">/ 40</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Operations & Patterns</p>
              </div>

              {/* Summative Slot Capacity Pills */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">1st</div>
                  <div className={`text-xs font-bold ${stats.t2_s1 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t2_s1}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">2nd</div>
                  <div className={`text-xs font-bold ${stats.t2_s2 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t2_s2}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">3rd</div>
                  <div className={`text-xs font-bold ${stats.t2_s3 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t2_s3}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">4th</div>
                  <div className={`text-xs font-bold ${stats.t2_s4 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t2_s4}/10</div>
                </div>
              </div>
            </div>

            {/* Term 3 Card */}
            <div
              onClick={() => { setActiveTermTab("Term 3"); setActiveSummativeFilter("All"); }}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTermTab === "Term 3"
                  ? "bg-amber-500/20 border-amber-400/50 shadow-lg shadow-amber-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Term 3</span>
                  <span className="text-lg">🌻</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-white">
                    {stats.t3Total} <span className="text-xs font-normal text-slate-400">/ 40</span>
                  </div>
                </div>
                <p className="text-xs text-slate-400 mt-1">Geometry & Data</p>
              </div>

              {/* Summative Slot Capacity Pills */}
              <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t border-white/10">
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">1st</div>
                  <div className={`text-xs font-bold ${stats.t3_s1 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t3_s1}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">2nd</div>
                  <div className={`text-xs font-bold ${stats.t3_s2 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t3_s2}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">3rd</div>
                  <div className={`text-xs font-bold ${stats.t3_s3 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t3_s3}/10</div>
                </div>
                <div className="text-center p-1 rounded-lg bg-white/5">
                  <div className="text-[10px] text-slate-400">4th</div>
                  <div className={`text-xs font-bold ${stats.t3_s4 >= 10 ? "text-amber-400" : "text-slate-200"}`}>{stats.t3_s4}/10</div>
                </div>
              </div>
            </div>

            {/* Remedial Card */}
            <div
              onClick={() => { setActiveTermTab("Remedial"); setActiveSummativeFilter("All"); }}
              className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between ${
                activeTermTab === "Remedial"
                  ? "bg-fuchsia-500/25 border-fuchsia-400/50 shadow-lg shadow-fuchsia-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-300">Remedial</span>
                  <span className="text-lg">💧</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-black text-white">
                    {stats.remedialTotal} <span className="text-xs font-normal text-slate-400">/ 10</span>
                  </div>
                  {stats.remedialTotal >= 10 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Full
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">Targeted Review for Missed Questions</p>
              </div>
              <div className="mt-3 pt-3 border-t border-white/10 text-[11px] text-slate-400">
                Pulls dynamic mistakes from Terms 1–3
              </div>
            </div>
          </div>

          {/* Two-Row Filter Navigation */}
          <div className="space-y-3 mb-6 pb-2 border-b border-white/10">
            {/* Row 1: Terms */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveTermTab("All")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTermTab === "All"
                      ? "bg-white text-slate-950 shadow-md"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <Layers size={14} /> All Terms
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono">
                    {stats.total}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTermTab("Term 1")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTermTab === "Term 1"
                      ? "bg-sky-500 text-slate-950 shadow-md font-extrabold"
                      : "bg-white/5 text-slate-300 hover:bg-sky-500/10 hover:text-sky-300"
                  }`}
                >
                  🌱 Term 1
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-sky-200 font-mono">
                    {stats.t1Total}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTermTab("Term 2")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTermTab === "Term 2"
                      ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                      : "bg-white/5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                  }`}
                >
                  🌿 Term 2
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-emerald-200 font-mono">
                    {stats.t2Total}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTermTab("Term 3")}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTermTab === "Term 3"
                      ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                      : "bg-white/5 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300"
                  }`}
                >
                  🌻 Term 3
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-amber-200 font-mono">
                    {stats.t3Total}
                  </span>
                </button>

                <button
                  onClick={() => { setActiveTermTab("Remedial"); setActiveSummativeFilter("All"); }}
                  className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                    activeTermTab === "Remedial"
                      ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-md font-extrabold"
                      : "bg-white/5 text-slate-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
                  }`}
                >
                  💧 Remedial
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-fuchsia-200 font-mono">
                    {stats.remedialTotal}
                  </span>
                </button>
              </div>

              {/* Grade Level Dropdown Filter */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Filter size={12} /> Grade:
                </span>
                <select
                  value={selectedGradeFilter}
                  onChange={(e) => setSelectedGradeFilter(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer"
                >
                  <option value="All" className="bg-slate-900">All Grades</option>
                  <option value="Grade 1" className="bg-slate-900">Grade 1</option>
                  <option value="Grade 2" className="bg-slate-900">Grade 2</option>
                </select>
              </div>
            </div>

            {/* Row 2: Summative Test Filter (Visible for Terms 1-3 or All) */}
            {activeTermTab !== "Remedial" && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs font-semibold text-slate-400">Summative:</span>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => setActiveSummativeFilter("All")}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                      activeSummativeFilter === "All"
                        ? "bg-violet-600 text-white"
                        : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    All Tests
                  </button>
                  {SUMMATIVES.map((s) => (
                    <button
                      key={s}
                      onClick={() => setActiveSummativeFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                        activeSummativeFilter === s
                          ? "bg-violet-600 text-white"
                          : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search questions by prompt, options, or unit..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500"
              />
            </div>
            {q && (
              <button
                onClick={() => setQ("")}
                className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-white/5 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* No units warning banner */}
          {!loading && units.length === 0 && (
            <div className="mb-6 p-5 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <h4 className="text-amber-200 font-bold flex items-center gap-2">
                  <BookOpen size={16} /> No Curriculum Units Found in Database
                </h4>
                <p className="text-sm text-slate-300 mt-1">
                  Questions must belong to a curriculum unit. You can initialize the standard Matatag units right now.
                </p>
              </div>
              <button
                onClick={handleSeedDefaults}
                disabled={seedingUnits}
                className="px-5 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm hover:bg-amber-400 disabled:opacity-50 transition shrink-0 cursor-pointer"
              >
                {seedingUnits ? "Initializing Units..." : "Initialize Curriculum Units"}
              </button>
            </div>
          )}

          {/* Batch Selection & Action Bar */}
          {!loading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl glass-card border border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2.5 text-xs font-semibold text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && filtered.every((item) => selectedIds.includes(item.id))}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600"
                  />
                  <span>
                    Select All in this view ({filtered.length})
                  </span>
                </label>
                {selectedIds.length > 0 && (
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30">
                    {selectedIds.length} selected
                  </span>
                )}
              </div>

              {selectedIds.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedIds([])}
                    className="px-3 py-1.5 rounded-xl border border-white/10 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition cursor-pointer"
                  >
                    Deselect All
                  </button>
                  <button
                    onClick={() => setBulkDeleteTarget(selectedIds)}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition cursor-pointer"
                  >
                    <Trash2 size={13} />
                    <span>Delete Selected ({selectedIds.length})</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Questions List */}
          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-3xl border border-white/10">
              <BrainCircuit size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-extrabold text-white mb-2">
                No questions found for {activeTermTab === "All" ? "your filter" : activeTermTab}
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
                Add curriculum questions to this slot to feed the student learning game.
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:brightness-110 transition cursor-pointer"
              >
                Add Question to {activeTermTab === "All" ? "Question Bank" : activeTermTab}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => {
                const isSelected = selectedIds.includes(item.id);
                const qBadge = getQuarterBadge(item.quarter);
                return (
                  <div
                    key={item.id}
                    className={`glass-card rounded-2xl p-5 transition-all duration-200 relative group border ${
                      isSelected
                        ? "border-violet-500 ring-2 ring-violet-500/40 bg-violet-950/20"
                        : "border-white/10 hover:border-violet-500/30"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div className="flex items-start gap-3.5 flex-1">
                        {/* Question Select Checkbox */}
                        <div className="pt-1 shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            className="w-4 h-4 rounded text-violet-600 bg-white/10 border-white/20 focus:ring-violet-500 cursor-pointer accent-violet-600"
                            aria-label={`Select question ${item.id}`}
                          />
                        </div>
                        <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          {/* Quarter Badge */}
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border flex items-center gap-1 ${qBadge.bg}`}>
                            <span>{qBadge.icon}</span> {qBadge.label}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-violet-500/15 text-violet-200 px-2 py-1 rounded-md border border-violet-500/20">
                            {item.gradeLevel}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-slate-800 text-slate-300 px-2 py-1 rounded-md border border-white/5">
                            {item.unitTitle ?? "Unit"}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-amber-500/15 text-amber-200 px-2 py-1 rounded-md border border-amber-500/20">
                            Level {item.difficulty}
                          </span>

                          {item.isActive && (
                            <span className="text-[10px] font-bold uppercase tracking-[0.12em] bg-emerald-500/15 text-emerald-300 px-2 py-1 rounded-md border border-emerald-500/20">
                              Active in Game
                            </span>
                          )}
                        </div>

                        <p className="text-base font-semibold text-white leading-relaxed mb-3">
                          {item.prompt}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-slate-300">
                          <div className={`p-2.5 rounded-xl border ${item.correctAnswer === "A" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold" : "bg-white/5 border-white/5"}`}>
                            <span className="font-bold text-slate-400 mr-2">A.</span> {item.optionA}
                          </div>
                          <div className={`p-2.5 rounded-xl border ${item.correctAnswer === "B" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold" : "bg-white/5 border-white/5"}`}>
                            <span className="font-bold text-slate-400 mr-2">B.</span> {item.optionB}
                          </div>
                          <div className={`p-2.5 rounded-xl border ${item.correctAnswer === "C" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold" : "bg-white/5 border-white/5"}`}>
                            <span className="font-bold text-slate-400 mr-2">C.</span> {item.optionC}
                          </div>
                          <div className={`p-2.5 rounded-xl border ${item.correctAnswer === "D" ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-200 font-semibold" : "bg-white/5 border-white/5"}`}>
                            <span className="font-bold text-slate-400 mr-2">D.</span> {item.optionD}
                          </div>
                        </div>

                        {item.explanation && (
                          <p className="mt-3 text-xs text-slate-400 bg-white/5 p-2.5 rounded-lg border border-white/5">
                            <span className="font-semibold text-violet-300">💡 Explanation:</span> {item.explanation}
                          </p>
                        )}
                      </div>
                    </div>

                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-2.5 rounded-xl bg-white/10 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer"
                          aria-label="Edit Question"
                        >
                          <Pencil size={15} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                          aria-label="Delete Question"
                          title="Delete Question"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add / Edit Question Modal */}
          {open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
              onClick={() => { setOpen(false); setEdit(null); setSaveError(null); }}
            >
              <div
                className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {edit ? "Edit Question" : "New Curriculum Question"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Assign to Term 1–3 Summatives or Remedial Stage to feed the game.
                    </p>
                  </div>
                  <span className="text-2xl">
                    {form.selectedTerm === "Term 1" ? "🌱" : form.selectedTerm === "Term 2" ? "🌿" : form.selectedTerm === "Term 3" ? "🌻" : "💧"}
                  </span>
                </div>

                {saveError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm">
                    {saveError}
                  </div>
                )}

                <div className="space-y-4">
                  
                  {/* Term & Summative Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Term / Stage <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.selectedTerm}
                        onChange={(e) => setForm({ ...form, selectedTerm: e.target.value as TermType })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer font-medium"
                      >
                        <option value="Term 1" className="bg-slate-900 text-white">🌱 Term 1</option>
                        <option value="Term 2" className="bg-slate-900 text-white">🌿 Term 2</option>
                        <option value="Term 3" className="bg-slate-900 text-white">🌻 Term 3</option>
                        <option value="Remedial" className="bg-slate-900 text-white">💧 Remedial Stage</option>
                      </select>
                    </div>

                    {form.selectedTerm !== "Remedial" ? (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Summative Test Slot <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={form.selectedSummative}
                          onChange={(e) => setForm({ ...form, selectedSummative: e.target.value as SummativeType })}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer font-medium"
                        >
                          <option value="1st Summative" className="bg-slate-900 text-white">1st Summative</option>
                          <option value="2nd Summative" className="bg-slate-900 text-white">2nd Summative</option>
                          <option value="3rd Summative" className="bg-slate-900 text-white">3rd Summative</option>
                          <option value="4th Summative" className="bg-slate-900 text-white">4th Summative</option>
                        </select>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Remedial Target
                        </label>
                        <div className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-xs text-fuchsia-300 font-semibold">
                          💧 Dynamic Missed-Items Review
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Real-time Slot Capacity Meter */}
                  <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Slot Capacity ({currentFormSlotLabel}):</span>
                      <span className={`font-bold ${selectedQuarterCount >= 10 ? "text-rose-400" : "text-emerald-300"}`}>
                        {selectedQuarterCount} / 10 questions {selectedQuarterCount >= 10 ? "(Slot Full)" : ""}
                      </span>
                    </div>
                    {isQuarterOverLimit && (
                      <div className="mt-2 p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-start gap-2 text-rose-200 text-xs">
                        <AlertTriangle size={15} className="text-rose-400 shrink-0 mt-0.5" />
                        <span>
                          <strong>Limit Reached:</strong> {currentFormSlotLabel} already contains 10 questions. You cannot exceed 10 questions for this slot.
                        </span>
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-1">
                      💡 Tip: In the game, tests unlock in order (1st → 2nd → 3rd → 4th). Add questions to 1st Summative first for best flow.
                    </div>
                  </div>

                  {/* Grade Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Grade Level <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.gradeLevel}
                        onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer"
                      >
                        {["Grade 1", "Grade 2"].map((g) => (
                          <option key={g} value={g} className="bg-slate-900">{g}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Unit & Difficulty */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Curriculum Unit <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.unitId}
                        onChange={(e) => setForm({ ...form, unitId: Number(e.target.value) })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer"
                      >
                        {units.length === 0 ? (
                          <option value={0} className="bg-slate-900">No units available</option>
                        ) : (
                          units.map((unit) => (
                            <option key={unit.id} value={unit.id} className="bg-slate-900">
                              {unit.title}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Difficulty (1 to 5)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={form.difficulty}
                        onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                        placeholder="Difficulty (1-5)"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                      />
                    </div>
                  </div>

                  {/* Question Prompt */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Question Prompt <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      value={form.prompt}
                      onChange={(e) => setForm({ ...form, prompt: e.target.value })}
                      placeholder="e.g. What is the sum of 48 and 27?"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Multiple Choice Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(["optionA", "optionB", "optionC", "optionD"] as const).map((field) => (
                      <div key={field}>
                        <label className="block text-xs font-semibold text-slate-300 mb-1">
                          Option {field.replace("option", "")} <span className="text-rose-400">*</span>
                        </label>
                        <input
                          value={form[field]}
                          onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                          placeholder={`Enter option ${field.replace("option", "")}`}
                          className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Correct Answer & Explanation */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Correct Answer Choice <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.correctAnswer}
                        onChange={(e) => setForm({ ...form, correctAnswer: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400/40 cursor-pointer"
                      >
                        {["A", "B", "C", "D"].map((option) => (
                          <option key={option} value={option} className="bg-slate-900 text-white">
                            Option {option} is Correct
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Explanation (Optional)
                      </label>
                      <input
                        value={form.explanation ?? ""}
                        onChange={(e) => setForm({ ...form, explanation: e.target.value })}
                        placeholder="Why this answer is correct..."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <label className="flex items-center gap-3 text-sm text-slate-300 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                      className="h-4 w-4 rounded border-white/20 bg-slate-900 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <span>Active and available to be drawn in student quizzes</span>
                  </label>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 flex gap-3">
                  <button
                    onClick={() => { setOpen(false); setEdit(null); setSaveError(null); }}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={save}
                    disabled={Boolean(isQuarterOverLimit)}
                    className={`flex-1 py-3.5 rounded-xl font-bold shadow-lg transition ${
                      isQuarterOverLimit
                        ? "bg-slate-800 text-slate-500 border border-white/10 cursor-not-allowed opacity-60"
                        : "bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-white shadow-violet-900/40 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    }`}
                  >
                    {edit ? "Save Changes" : isQuarterOverLimit ? "Limit Reached (10/10)" : `Create for ${currentFormSlotLabel}`}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {deleteTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => setDeleteTarget(null)}
            >
              <div
                className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">Delete Question?</h3>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                  Are you sure you want to delete this question? This action cannot be undone.
                </p>
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 text-xs text-violet-200 mb-6 line-clamp-3">
                  &ldquo;{deleteTarget.prompt}&rdquo;
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setDeleteTarget(null)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      const id = deleteTarget.id;
                      setDeleteTarget(null);
                      remove(id);
                    }}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer"
                  >
                    Delete Question
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* BULK DELETE CONFIRMATION MODAL */}
          {bulkDeleteTarget && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => !bulkDeleting && setBulkDeleteTarget(null)}
            >
              <div
                className="bg-slate-900 border border-rose-500/30 rounded-3xl p-6 w-full max-w-md shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
                  <AlertTriangle size={24} />
                </div>
                <h3 className="text-xl font-black text-white mb-2">
                  Delete {bulkDeleteTarget.length} Questions?
                </h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                  Are you sure you want to delete these <strong className="text-white">{bulkDeleteTarget.length} questions</strong>? They will be permanently removed from the question bank. This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setBulkDeleteTarget(null)}
                    disabled={bulkDeleting}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => bulkRemove(bulkDeleteTarget)}
                    disabled={bulkDeleting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {bulkDeleting ? (
                      <span>Deleting...</span>
                    ) : (
                      <>
                        <Trash2 size={15} />
                        <span>Delete {bulkDeleteTarget.length} Questions</span>
                      </>
                    )}
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
