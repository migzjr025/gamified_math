"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Search, ClipboardCheck, AlertTriangle } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface Assessment {
  id: number; title: string; unitId: number; type: string; totalPoints: number; dueDate: string | null; unitTitle?: string; unitCode?: string;
}

export default function AssessmentsClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [units, setUnits] = useState<{id:number; title:string; code:string}[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<Assessment | null>(null);
  const [form, setForm] = useState({ title: "", unitId: 1, type: "quiz", totalPoints: 100, dueDate: "" });

  async function load() {
    setLoading(true);
    setFetchError("");
    try {
      const [resA, resU] = await Promise.all([fetch("/api/assessments"), fetch("/api/units")]);
      const dataA = resA.ok ? await resA.json() : [];
      const dataU = resU.ok ? await resU.json() : [];

      const parsedUnits = Array.isArray(dataU) ? dataU : [];
      setItems(Array.isArray(dataA) ? dataA : []);
      setUnits(parsedUnits);

      if (parsedUnits.length > 0) {
        setForm(prev => ({ ...prev, unitId: parsedUnits[0].id }));
      }
    } catch (err) {
      console.error("Assessments load failed:", err);
      setFetchError("Unable to load assessments. Please check your connection and retry.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save() {
    setFormError("");
    if (!form.title.trim()) {
      setFormError("Assessment title is required.");
      return;
    }
    if (isNaN(Number(form.totalPoints)) || Number(form.totalPoints) <= 0) {
      setFormError("Total points must be a positive number.");
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, title: form.title.trim(), totalPoints: Number(form.totalPoints), dueDate: form.dueDate || null };
      const res = edit
        ? await fetch("/api/assessments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...payload }) })
        : await fetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || "Failed to save assessment.");
        return;
      }

      setOpen(false);
      setEdit(null);
      setForm({ title: "", unitId: units[0]?.id ?? 1, type: "quiz", totalPoints: 100, dueDate: "" });
      load();
    } catch {
      setFormError("Network error while saving assessment. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    if (!window.confirm("Are you sure you want to delete this assessment?")) return;
    try {
      const res = await fetch("/api/assessments", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || "Failed to delete assessment.");
      }
      load();
    } catch {
      alert("Network error while deleting assessment.");
    }
  }

  const filtered = items.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || s.unitTitle?.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div><h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">Assessments</h1><p className="text-slate-400 mt-1">Grading events for the curriculum.</p></div>
            <button onClick={() => { setEdit(null); setForm({ title: "", unitId: units[0]?.id ?? 1, type: "quiz", totalPoints: 100, dueDate: "" }); setOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition"><Plus size={18}/> New Assessment</button>
          </div>
          {fetchError && (
            <div className="mb-6 flex items-center justify-between gap-3 p-4 rounded-2xl border border-rose-500/30 bg-rose-500/10 text-rose-200">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-rose-400 shrink-0" />
                <span className="text-sm">{fetchError}</span>
              </div>
              <button
                onClick={load}
                className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold transition shrink-0"
              >
                Retry
              </button>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search assessments..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500" /></div>
          </div>
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=> <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div>
            : filtered.length === 0 ? <div className="text-center py-24 glass-card rounded-3xl"><ClipboardCheck size={48} className="mx-auto text-slate-600 mb-4" /><h3 className="text-xl font-extrabold text-white mb-2">No assessments yet</h3><button onClick={() => { setEdit(null); setForm({ title: "", unitId: units[0]?.id ?? 1, type: "quiz", totalPoints: 100, dueDate: "" }); setOpen(true); }} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition">Add Assessment</button></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(a => (
              <div key={a.id} className="glass-card rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200 relative group">
                <div className="flex items-start justify-between mb-3"><span className="text-xs font-extrabold text-amber-300 bg-amber-400/15 px-2 py-0.5 rounded-md">{a.type}</span><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setForm({ ...a, dueDate: a.dueDate ? new Date(a.dueDate).toISOString().slice(0,10) : "" }); setEdit(a); setOpen(true); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-violet-200" aria-label="Edit"><Pencil size={14} /></button><button onClick={() => remove(a.id)} className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300" aria-label="Delete"><Trash2 size={14} /></button></div></div>
                <h3 className="text-lg font-extrabold text-white mb-1 truncate">{a.title}</h3>
                <p className="text-xs text-slate-400 mb-3">{a.unitTitle ?? "Unknown Unit"} ({a.unitCode ?? ""}) · {a.totalPoints} pts</p>
                <p className="text-sm text-slate-300">Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "Not set"}</p>
              </div>
            ))}</div>}
          {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setEdit(null); }}>
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-extrabold text-white mb-6">{edit ? "Edit Assessment" : "New Assessment"}</h2>
              {formError && (
                <div className="mb-4 flex items-center gap-2 p-3 rounded-xl border border-rose-500/40 bg-rose-500/15 text-rose-200 text-xs">
                  <AlertTriangle size={15} className="text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                <select value={form.unitId} onChange={e => setForm({...form, unitId: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">{units.map(u => <option key={u.id} value={u.id} className="bg-slate-900">{u.code} — {u.title}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">{["quiz","test","activity","project"].map(t => <option key={t} value={t} className="bg-slate-900">{t}</option>)}</select><input type="number" value={form.totalPoints} onChange={e => setForm({...form, totalPoints: Number(e.target.value)})} placeholder="Points" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" /></div>
                <input type="date" value={form.dueDate} onChange={e => setForm({...form, dueDate: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
              </div>
              <div className="mt-6 flex gap-3">
                <button onClick={() => { setOpen(false); setEdit(null); }} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Cancel</button>
                <button onClick={save} disabled={saving} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition disabled:opacity-50 disabled:cursor-not-allowed">
                  {saving ? "Saving..." : edit ? "Save" : "Create"}
                </button>
              </div>
            </div>
          </div>}
        </div>
      </main>
    </div>
  );
}
