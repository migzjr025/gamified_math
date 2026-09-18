"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Search, Trophy, Star, Zap } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface AchievementItem {
  id: number; title: string; description: string; icon: string; rarity: string; points: number;
}

export default function AchievementsClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<AchievementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<AchievementItem | null>(null);
  const [form, setForm] = useState({ title: "", description: "", icon: "trophy", rarity: "common", points: 10 });

  async function load() { setLoading(true); const res = await fetch("/api/achievements"); setItems(await res.json()); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (edit) await fetch("/api/achievements", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...form }) });
    else await fetch("/api/achievements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setOpen(false); setEdit(null); setForm({ title: "", description: "", icon: "trophy", rarity: "common", points: 10 }); load();
  }
  async function remove(id: number) { await fetch("/api/achievements", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  const filtered = items.filter(s => s.title.toLowerCase().includes(q.toLowerCase()) || s.description.toLowerCase().includes(q.toLowerCase()));
  const colors = { common: "bg-slate-500", uncommon: "bg-teal-400", rare: "bg-violet-400", epic: "bg-amber-300" };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div><h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">Achievements</h1><p className="text-slate-400 mt-1">Gamified rewards for students.</p></div>
            <button onClick={() => { setEdit(null); setOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition"><Plus size={18}/> Add Badge</button>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search badges..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500" /></div>
          </div>
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=> <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div>
            : filtered.length === 0 ? <div className="text-center py-24 glass-card rounded-3xl"><Trophy size={48} className="mx-auto text-slate-600 mb-4" /><h3 className="text-xl font-extrabold text-white mb-2">No badges yet</h3><button onClick={() => { setEdit(null); setOpen(true); }} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition">Add Badge</button></div>
            : <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{filtered.map(a => (
              <div key={a.id} className="glass-card rounded-2xl p-6 hover:scale-[1.01] transition-all duration-200 relative group">
                <div className="flex items-start justify-between mb-4"><div className={`h-10 w-10 rounded-xl ${colors[a.rarity as keyof typeof colors] ?? "bg-slate-400"} flex items-center justify-center shadow-lg`}><Star size={20} className="text-white" /></div><div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setForm({...a}); setEdit(a); setOpen(true); }} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-violet-200" aria-label="Edit"><Pencil size={14} /></button><button onClick={() => remove(a.id)} className="p-2 rounded-lg bg-white/10 hover:bg-rose-500/30 text-rose-300" aria-label="Delete"><Trash2 size={14} /></button></div></div>
                <h3 className="text-lg font-extrabold text-white mb-1">{a.title}</h3>
                <p className="text-xs text-violet-200 font-semibold mb-2">{a.rarity} · {a.points} pts</p>
                <p className="text-sm text-slate-300 leading-relaxed">{a.description}</p>
              </div>
            ))}</div>}
          {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setEdit(null); }}>
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-extrabold text-white mb-6">{edit ? "Edit Badge" : "New Badge"}</h2>
              <div className="space-y-3">
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Title" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Description" rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                <div className="grid grid-cols-2 gap-3"><select value={form.rarity} onChange={e => setForm({...form, rarity: e.target.value})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">{["common","uncommon","rare","epic"].map(r => <option key={r} value={r} className="bg-slate-900">{r}</option>)}</select><input type="number" value={form.points} onChange={e => setForm({...form, points: Number(e.target.value)})} placeholder="Points" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" /></div>
                <input value={form.icon} onChange={e => setForm({...form, icon: e.target.value})} placeholder="Icon name (trophy)" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
              </div>
              <div className="mt-6 flex gap-3"><button onClick={() => { setOpen(false); setEdit(null); }} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Cancel</button><button onClick={save} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition">{edit ? "Save" : "Create"}</button></div>
            </div>
          </div>}
        </div>
      </main>
    </div>
  );
}
