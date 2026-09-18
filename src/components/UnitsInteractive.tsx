"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, Trash2, Pencil, Search, BookOpen, Sparkles, Layers, Filter, AlertCircle } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface Unit {
  id: number;
  code: string;
  title: string;
  gradeLevel: string;
  quarter?: string | null;
  description: string;
  difficulty: number;
  orderIndex: number;
}

const QUARTERS = ["Quarter 1", "Quarter 2", "Quarter 3", "Summative"] as const;
type QuarterType = typeof QUARTERS[number];

const defaultForm = {
  code: "",
  title: "",
  gradeLevel: "Grade 2",
  quarter: "Quarter 1" as QuarterType,
  description: "",
  difficulty: 1,
  orderIndex: 1,
};

export default function UnitsClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [activeQuarterTab, setActiveQuarterTab] = useState<"All" | QuarterType>("All");
  const [selectedGradeFilter, setSelectedGradeFilter] = useState<string>("All");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Unit | null>(null);
  const [form, setForm] = useState(defaultForm);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/units");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to load units", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleOpenAdd() {
    setEdit(null);
    setSaveError(null);
    const initialQuarter = activeQuarterTab === "All" ? "Quarter 1" : activeQuarterTab;
    const nextOrder = items.length + 1;
    setForm({
      ...defaultForm,
      quarter: initialQuarter,
      orderIndex: nextOrder,
      code: `M2-Q${initialQuarter === "Quarter 1" ? 1 : initialQuarter === "Quarter 2" ? 2 : initialQuarter === "Quarter 3" ? 3 : 4}-U${nextOrder}`,
    });
    setOpen(true);
  }

  function handleOpenEdit(unit: Unit) {
    setEdit(unit);
    setSaveError(null);
    setForm({
      code: unit.code,
      title: unit.title,
      gradeLevel: unit.gradeLevel,
      quarter: (unit.quarter as QuarterType) || "Quarter 1",
      description: unit.description,
      difficulty: unit.difficulty,
      orderIndex: unit.orderIndex,
    });
    setOpen(true);
  }

  async function save() {
    setSaveError(null);
    if (!form.title.trim()) {
      setSaveError("Please enter a unit title.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code: form.code.trim() || `U-${Date.now().toString().slice(-4)}`,
        title: form.title.trim(),
        gradeLevel: form.gradeLevel,
        quarter: form.quarter,
        description: form.description.trim() || `${form.title.trim()} module for ${form.gradeLevel}.`,
        difficulty: Number(form.difficulty) || 1,
        orderIndex: Number(form.orderIndex) || 1,
      };

      const res = edit
        ? await fetch("/api/units", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: edit.id, ...payload }),
          })
        : await fetch("/api/units", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

      const data = await res.json();
      if (!res.ok) {
        setSaveError(data.error || "Failed to save unit. Please try again.");
        return;
      }

      setOpen(false);
      setEdit(null);
      setForm(defaultForm);
      await load();
    } catch (e: any) {
      setSaveError(e?.message || "Failed to save unit due to a network error.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!confirm("Are you sure you want to delete this curriculum unit? This will also remove associated questions.")) {
      return;
    }
    try {
      const res = await fetch("/api/units", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        await load();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete unit.");
      }
    } catch (e: any) {
      alert("Error deleting unit: " + e?.message);
    }
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      await load();
    } catch (e) {
      console.error(e);
    } finally {
      setSeeding(false);
    }
  }

  // Stats
  const stats = useMemo(() => {
    const q1 = items.filter((u) => (u.quarter || "Quarter 1") === "Quarter 1").length;
    const q2 = items.filter((u) => u.quarter === "Quarter 2").length;
    const q3 = items.filter((u) => u.quarter === "Quarter 3").length;
    const summative = items.filter((u) => u.quarter === "Summative").length;
    return { q1, q2, q3, summative, total: items.length };
  }, [items]);

  // Filtered
  const filtered = useMemo(() => {
    return items.filter((item) => {
      const itemQuarter = item.quarter || "Quarter 1";
      const matchesQuarter = activeQuarterTab === "All" || itemQuarter === activeQuarterTab;
      const matchesGrade = selectedGradeFilter === "All" || item.gradeLevel === selectedGradeFilter;
      const query = q.toLowerCase().trim();
      const matchesQuery =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.code.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query);
      return matchesQuarter && matchesGrade && matchesQuery;
    });
  }, [items, activeQuarterTab, selectedGradeFilter, q]);

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
                <Sparkles size={12} /> Curriculum Framework
              </div>
              <h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-transparent">
                Curriculum Units
              </h1>
              <p className="text-slate-400 mt-1 text-sm md:text-base">
                Manage learning units categorized by Quarter 1, Quarter 2, Quarter 3, and Summative assessments.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-white font-bold shadow-xl shadow-violet-900/40 hover:scale-[1.02] active:scale-[0.98] transition cursor-pointer"
              >
                <Plus size={18} /> Add Unit
              </button>
            </div>
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
              <p className="text-xs text-slate-400 mt-1">Review & Exam Modules</p>
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
                🏆 Summative
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
                placeholder="Search units by title, code, or description..."
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

          {/* Units Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-44 rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 glass-card rounded-3xl border border-white/10 p-8">
              <BookOpen size={48} className="mx-auto text-slate-600 mb-4" />
              <h3 className="text-xl font-extrabold text-white mb-2">
                No units found for {activeQuarterTab === "All" ? "your filter" : activeQuarterTab}
              </h3>
              <p className="text-slate-400 mb-6 max-w-md mx-auto text-sm">
                Add a new curriculum unit or initialize the standard Matatag units.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <button
                  onClick={handleOpenAdd}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold hover:brightness-110 transition cursor-pointer"
                >
                  Add Unit
                </button>
                <button
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                  className="px-6 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-200 font-bold hover:bg-amber-500/30 transition cursor-pointer"
                >
                  {seeding ? "Initializing..." : "Reset / Seed Standard Units"}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((u) => {
                const qBadge = getQuarterBadge(u.quarter);
                return (
                  <div
                    key={u.id}
                    className="glass-card rounded-2xl p-6 border border-white/10 hover:border-violet-500/40 hover:scale-[1.01] transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges & Actions */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-md border flex items-center gap-1 ${qBadge.bg}`}>
                            <span>{qBadge.icon}</span> {qBadge.label}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-violet-200 bg-violet-500/20 border border-violet-500/30 px-2 py-0.5 rounded-md">
                            {u.code}
                          </span>
                        </div>

                        {/* ALWAYS VISIBLE ACTION BUTTONS */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-slate-900/60 p-1 rounded-xl border border-white/10">
                          <button
                            onClick={() => handleOpenEdit(u)}
                            className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer"
                            title="Edit Unit"
                            aria-label="Edit Unit"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => remove(u.id)}
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer"
                            title="Delete Unit"
                            aria-label="Delete Unit"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>

                      {/* Title & Info */}
                      <h3 className="text-lg font-bold text-white mb-1.5 leading-snug">
                        {u.title}
                      </h3>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-3">
                        <span className="bg-white/5 px-2 py-0.5 rounded border border-white/5 font-semibold text-slate-300">
                          {u.gradeLevel}
                        </span>
                        <span>•</span>
                        <span>Diff: Level {u.difficulty}</span>
                        <span>•</span>
                        <span>Order #{u.orderIndex}</span>
                      </div>

                      <p className="text-sm text-slate-300 line-clamp-3 leading-relaxed">
                        {u.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500 font-medium">
                      <span>Curriculum Unit #{u.id}</span>
                      <span className="text-violet-400">Ready for Quizzes</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add / Edit Modal */}
          {open && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
              onClick={() => { setOpen(false); setEdit(null); setSaveError(null); }}
            >
              <div
                className="bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border border-white/15 rounded-3xl p-6 md:p-8 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-extrabold text-white">
                      {edit ? "Edit Unit" : "New Curriculum Unit"}
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Units are used to categorize math questions, quizzes, and assessments.
                    </p>
                  </div>
                  <span className="text-2xl">
                    {form.quarter === "Quarter 1" ? "🌱" : form.quarter === "Quarter 2" ? "🌿" : form.quarter === "Quarter 3" ? "🌻" : "🏆"}
                  </span>
                </div>

                {saveError && (
                  <div className="mb-5 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-400" />
                    <span>{saveError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Unit Title <span className="text-rose-400">*</span>
                    </label>
                    <input
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="e.g. Number and Number Sense"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500"
                    />
                  </div>

                  {/* Quarter & Grade Level */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Quarter Period <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={form.quarter}
                        onChange={(e) => setForm({ ...form, quarter: e.target.value as QuarterType })}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer"
                      >
                        <option value="Quarter 1" className="bg-slate-900">🌱 Quarter 1</option>
                        <option value="Quarter 2" className="bg-slate-900">🌿 Quarter 2</option>
                        <option value="Quarter 3" className="bg-slate-900">🌻 Quarter 3</option>
                        <option value="Summative" className="bg-slate-900">🏆 Summative</option>
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
                        <option value="Grade 1" className="bg-slate-900">Grade 1</option>
                        <option value="Grade 2" className="bg-slate-900">Grade 2</option>
                      </select>
                    </div>
                  </div>

                  {/* Code & Order Index */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Unit Code <span className="text-slate-500">(e.g. M3-U1)</span>
                      </label>
                      <input
                        value={form.code}
                        onChange={(e) => setForm({ ...form, code: e.target.value })}
                        placeholder="e.g. M3-U1"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Order Index & Difficulty
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={1}
                          value={form.orderIndex}
                          onChange={(e) => setForm({ ...form, orderIndex: Number(e.target.value) })}
                          placeholder="Order"
                          className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                          title="Order in curriculum"
                        />
                        <input
                          type="number"
                          min={1}
                          max={5}
                          value={form.difficulty}
                          onChange={(e) => setForm({ ...form, difficulty: Number(e.target.value) })}
                          placeholder="Diff (1-5)"
                          className="w-full px-3 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                          title="Difficulty Level (1-5)"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Description / Learning Competencies
                    </label>
                    <textarea
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Summary of competencies and skills covered in this unit..."
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white placeholder:text-slate-500"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="mt-8 flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setOpen(false); setEdit(null); setSaveError(null); }}
                    className="flex-1 py-3.5 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-violet-600 via-indigo-600 to-violet-500 text-white font-bold shadow-lg shadow-violet-900/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition cursor-pointer"
                  >
                    {saving ? "Saving..." : edit ? "Save Changes" : "Create Unit"}
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
