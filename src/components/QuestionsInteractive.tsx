"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Search, BrainCircuit, Sparkles, BookOpen, Layers, Award, Filter } from "lucide-react";
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

const QUARTERS = ["Quarter 1", "Quarter 2", "Quarter 3", "Summative"] as const;
type QuarterType = typeof QUARTERS[number];

const defaultForm = {
  unitId: 1,
  gradeLevel: "Grade 2",
  quarter: "Quarter 1" as QuarterType,
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
  const [activeQuarterTab, setActiveQuarterTab] = useState<"All" | QuarterType>("All");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Question | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saveError, setSaveError] = useState<string | null>(null);
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
    setSaveError(null);
    const initialQuarter = activeQuarterTab === "All" ? "Quarter 1" : activeQuarterTab;
    setForm({
      ...defaultForm,
      quarter: initialQuarter,
      unitId: units[0]?.id ?? 1,
    });
    setOpen(true);
  }

  function handleOpenEdit(item: Question) {
    setSaveError(null);
    setEdit(item);
    setForm({
      unitId: item.unitId,
      gradeLevel: item.gradeLevel,
      quarter: (item.quarter as QuarterType) || "Quarter 1",
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

    if (units.length === 0) {
      setSaveError("No curriculum units exist. Please initialize units first.");
      return;
    }

    const payload = {
      ...form,
      unitId: Number(form.unitId),
      difficulty: Number(form.difficulty) || 1,
      prompt: form.prompt.trim(),
      optionA: form.optionA.trim(),
      optionB: form.optionB.trim(),
      optionC: form.optionC.trim(),
      optionD: form.optionD.trim(),
      explanation: form.explanation?.trim() || null,
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
    if (!confirm("Are you sure you want to delete this question?")) return;
    await fetch("/api/questions", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  }

  // Stats per Quarter
  const stats = useMemo(() => {
    const q1 = items.filter((i) => (i.quarter || "Quarter 1") === "Quarter 1").length;
    const q2 = items.filter((i) => i.quarter === "Quarter 2").length;
    const q3 = items.filter((i) => i.quarter === "Quarter 3").length;
    const summative = items.filter((i) => i.quarter === "Summative").length;
    return { q1, q2, q3, summative, total: items.length };
  }, [items]);

  // Filtered list
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const itemQuarter = item.quarter || "Quarter 1";
      const matchesQuarter = activeQuarterTab === "All" || itemQuarter === activeQuarterTab;
      const matchesGrade = selectedGradeFilter === "All" || item.gradeLevel === selectedGradeFilter;
      const searchTarget = `${item.prompt} ${item.unitTitle ?? ""} ${item.gradeLevel} ${item.optionA} ${item.optionB} ${item.optionC} ${item.optionD}`.toLowerCase();
      const matchesQuery = !q.trim() || searchTarget.includes(q.toLowerCase());
      return matchesQuarter && matchesGrade && matchesQuery;
    });
  }, [items, activeQuarterTab, selectedGradeFilter, q]);

  // Quarter Badge Colors
  const getQuarterBadge = (quarter?: string | null) => {
    const q = quarter || "Quarter 1";
    switch (q) {
      case "Quarter 1":
        return { label: "Quarter 1", bg: "bg-sky-500/15 text-sky-300 border-sky-500/30", icon: "🌱" };
      case "Quarter 2":
        return { label: "Quarter 2", bg: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30", icon: "🌿" };
      case "Quarter 3":
        return { label: "Quarter 3", bg: "bg-amber-500/15 text-amber-300 border-amber-500/30", icon: "🌻" };
      case "Summative":
        return { label: "Summative", bg: "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/40", icon: "🏆" };
      default:
        return { label: q, bg: "bg-slate-700 text-slate-200 border-slate-600", icon: "📘" };
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

          {/* Quick Quarter Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div
              onClick={() => setActiveQuarterTab("Quarter 1")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                activeQuarterTab === "Quarter 1"
                  ? "bg-sky-500/20 border-sky-400/50 shadow-lg shadow-sky-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">Quarter 1</span>
                <span className="text-lg">🌱</span>
              </div>
              <div className="text-2xl font-black text-white">{stats.q1}</div>
              <p className="text-xs text-slate-400 mt-1">Foundation & Numbers</p>
            </div>

            <div
              onClick={() => setActiveQuarterTab("Quarter 2")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                activeQuarterTab === "Quarter 2"
                  ? "bg-emerald-500/20 border-emerald-400/50 shadow-lg shadow-emerald-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Quarter 2</span>
                <span className="text-lg">🌿</span>
              </div>
              <div className="text-2xl font-black text-white">{stats.q2}</div>
              <p className="text-xs text-slate-400 mt-1">Operations & Patterns</p>
            </div>

            <div
              onClick={() => setActiveQuarterTab("Quarter 3")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                activeQuarterTab === "Quarter 3"
                  ? "bg-amber-500/20 border-amber-400/50 shadow-lg shadow-amber-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Quarter 3</span>
                <span className="text-lg">🌻</span>
              </div>
              <div className="text-2xl font-black text-white">{stats.q3}</div>
              <p className="text-xs text-slate-400 mt-1">Geometry & Data</p>
            </div>

            <div
              onClick={() => setActiveQuarterTab("Summative")}
              className={`p-4 rounded-2xl border transition cursor-pointer ${
                activeQuarterTab === "Summative"
                  ? "bg-fuchsia-500/25 border-fuchsia-400/50 shadow-lg shadow-fuchsia-950/50"
                  : "bg-white/5 border-white/10 hover:bg-white/10"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-fuchsia-300">Summative</span>
                <span className="text-lg">🏆</span>
              </div>
              <div className="text-2xl font-black text-white">{stats.summative}</div>
              <p className="text-xs text-slate-400 mt-1">Comprehensive Exam</p>
            </div>
          </div>

          {/* Quarter Tabs Filter Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pb-2 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setActiveQuarterTab("All")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeQuarterTab === "All"
                    ? "bg-white text-slate-950 shadow-md"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Layers size={14} /> All Quarters
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800 text-slate-200 font-mono">
                  {stats.total}
                </span>
              </button>

              <button
                onClick={() => setActiveQuarterTab("Quarter 1")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeQuarterTab === "Quarter 1"
                    ? "bg-sky-500 text-slate-950 shadow-md font-extrabold"
                    : "bg-white/5 text-slate-300 hover:bg-sky-500/10 hover:text-sky-300"
                }`}
              >
                🌱 Quarter 1
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-sky-200 font-mono">
                  {stats.q1}
                </span>
              </button>

              <button
                onClick={() => setActiveQuarterTab("Quarter 2")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeQuarterTab === "Quarter 2"
                    ? "bg-emerald-500 text-slate-950 shadow-md font-extrabold"
                    : "bg-white/5 text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-300"
                }`}
              >
                🌿 Quarter 2
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-emerald-200 font-mono">
                  {stats.q2}
                </span>
              </button>

              <button
                onClick={() => setActiveQuarterTab("Quarter 3")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeQuarterTab === "Quarter 3"
                    ? "bg-amber-500 text-slate-950 shadow-md font-extrabold"
                    : "bg-white/5 text-slate-300 hover:bg-amber-500/10 hover:text-amber-300"
                }`}
              >
                🌻 Quarter 3
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-amber-200 font-mono">
                  {stats.q3}
                </span>
              </button>

              <button
                onClick={() => setActiveQuarterTab("Summative")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition flex items-center gap-2 cursor-pointer ${
                  activeQuarterTab === "Summative"
                    ? "bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white shadow-md font-extrabold"
                    : "bg-white/5 text-slate-300 hover:bg-fuchsia-500/10 hover:text-fuchsia-200"
                }`}
              >
                🏆 Summative Exam
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-800/80 text-fuchsia-200 font-mono">
                  {stats.summative}
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
                No questions found for {activeQuarterTab === "All" ? "your filter" : activeQuarterTab}
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
                Add curriculum questions to this quarter to feed the student learning game.
              </p>
              <button
                onClick={handleOpenAdd}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:brightness-110 transition cursor-pointer"
              >
                Add Question to {activeQuarterTab === "All" ? "Question Bank" : activeQuarterTab}
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((item) => {
                const qBadge = getQuarterBadge(item.quarter);
                return (
                  <div
                    key={item.id}
                    className="glass-card rounded-2xl p-5 hover:border-violet-500/30 transition-all duration-200 relative group border border-white/10"
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
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
                          onClick={() => remove(item.id)}
                          className="p-2.5 rounded-xl bg-white/10 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                          aria-label="Delete Question"
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
                      Assign to Quarter 1, Quarter 2, Quarter 3, or Summative Exam to feed the game.
                    </p>
                  </div>
                  <span className="text-2xl">
                    {form.quarter === "Quarter 1" ? "🌱" : form.quarter === "Quarter 2" ? "🌿" : form.quarter === "Quarter 3" ? "🌻" : "🏆"}
                  </span>
                </div>

                {saveError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm">
                    {saveError}
                  </div>
                )}

                <div className="space-y-4">
                  
                  {/* Quarter & Grade Level */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Quarter Period <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.quarter}
                        onChange={(e) => setForm({ ...form, quarter: e.target.value as QuarterType })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer font-medium"
                      >
                        <option value="Quarter 1" className="bg-slate-900 text-white">🌱 Quarter 1</option>
                        <option value="Quarter 2" className="bg-slate-900 text-white">🌿 Quarter 2</option>
                        <option value="Quarter 3" className="bg-slate-900 text-white">🌻 Quarter 3</option>
                        <option value="Summative" className="bg-slate-900 text-white">🏆 Summative Assessment</option>
                      </select>
                    </div>

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
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-white font-bold shadow-lg shadow-violet-900/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
                  >
                    {edit ? "Save Changes" : `Create for ${form.quarter}`}
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
