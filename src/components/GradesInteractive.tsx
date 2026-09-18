"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Pencil, Search, Zap, TrendingUp } from "lucide-react";
import SidebarNav from "@/components/SidebarNav";

interface GradeRow {
  id: number; studentId: number; assessmentId: number; score: number; pointsEarned: number; feedback?: string; studentName?: string; assessmentTitle?: string; assessmentType?: string; unitTitle?: string;
}

export default function GradesClient({ userName, role }: { userName: string; role?: string }) {
  const [items, setItems] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<{id:number; fullName:string}[]>([]);
  const [assessments, setAssessments] = useState<{id:number; title:string}[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<GradeRow | null>(null);
  const [form, setForm] = useState({ studentId: 1, assessmentId: 1, score: 85, pointsEarned: 85, feedback: "" });

  async function load() { setLoading(true); const [resG, resS, resA] = await Promise.all([fetch("/api/grades"), fetch("/api/students"), fetch("/api/assessments")]); setItems(await resG.json()); setStudents((await resS.json()).map((s: any) => ({id: s.id, fullName: s.fullName}))); setAssessments((await resA.json()).map((a: any) => ({id: a.id, title: a.title}))); setLoading(false); }
  useEffect(() => { load(); }, []);

  async function save() {
    if (edit) await fetch("/api/grades", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: edit.id, ...form }) });
    else await fetch("/api/grades", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    setOpen(false); setEdit(null); setForm({ studentId: students[0]?.id ?? 1, assessmentId: assessments[0]?.id ?? 1, score: 85, pointsEarned: 85, feedback: "" }); load();
  }
  async function remove(id: number) { await fetch("/api/grades", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); load(); }

  const filtered = items.filter(s => (s.studentName ?? "").toLowerCase().includes(q.toLowerCase()) || (s.assessmentTitle ?? "").toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 text-slate-50">
      <SidebarNav userName={userName} role={role} />
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div><h1 className="text-3xl lg:text-4xl font-extrabold bg-gradient-to-r from-white to-violet-200 bg-clip-text text-transparent">Grades</h1><p className="text-slate-400 mt-1">Score tracking and feedback.</p></div>
            <button onClick={() => { setEdit(null); setForm({ studentId: students[0]?.id ?? 1, assessmentId: assessments[0]?.id ?? 1, score: 85, pointsEarned: 85, feedback: "" }); setOpen(true); }} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-xl shadow-violet-900/30 hover:scale-[1.03] transition"><Plus size={18}/> Log Grade</button>
          </div>
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={q} onChange={e => setQ(e.target.value)} placeholder="Search grades..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500" /></div>
          </div>
          {loading ? <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=> <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />)}</div>
            : filtered.length === 0 ? <div className="text-center py-24 glass-card rounded-3xl"><Zap size={48} className="mx-auto text-slate-600 mb-4" /><h3 className="text-xl font-extrabold text-white mb-2">No grades yet</h3><button onClick={() => { setEdit(null); setForm({ studentId: students[0]?.id ?? 1, assessmentId: assessments[0]?.id ?? 1, score: 85, pointsEarned: 85, feedback: "" }); setOpen(true); }} className="px-5 py-2.5 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-500 transition">Log Grade</button></div>
            : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs font-extrabold text-slate-400 uppercase tracking-wider border-b border-white/10"><th className="py-3 px-3">Student</th><th className="py-3 px-3">Assessment</th><th className="py-3 px-3">Score</th><th className="py-3 px-3">Feedback</th><th className="py-3 px-3 text-right">Actions</th></tr></thead><tbody className="divide-y divide-white/5">{filtered.map(g => (
              <tr key={g.id} className="hover:bg-white/5 transition"><td className="py-3 px-3 font-semibold text-white whitespace-nowrap">{g.studentName ?? "Unknown"}</td><td className="py-3 px-3 text-slate-300 whitespace-nowrap">{g.assessmentTitle ?? "Unknown"}</td><td className="py-3 px-3"><div className="flex items-center gap-2"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-extrabold ${g.score >= 85 ? "bg-teal-400/15 text-teal-200" : g.score >= 70 ? "bg-amber-400/15 text-amber-200" : "bg-rose-400/15 text-rose-200"}`}><TrendingUp size={10} />{g.score}%</span></div></td><td className="py-3 px-3 text-slate-400 max-w-xs truncate">{g.feedback ?? "—"}</td><td className="py-3 px-3 text-right"><div className="flex items-center justify-end gap-1.5"><button onClick={() => { setForm({ studentId: g.studentId, assessmentId: g.assessmentId, score: g.score, pointsEarned: g.pointsEarned, feedback: g.feedback ?? "" }); setEdit(g); setOpen(true); }} className="p-1.5 rounded-lg bg-violet-600/20 hover:bg-violet-600 text-violet-200 hover:text-white transition cursor-pointer" title="Edit Grade" aria-label="Edit"><Pencil size={14} /></button><button onClick={() => remove(g.id)} className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white transition cursor-pointer" title="Delete Grade" aria-label="Delete"><Trash2 size={14} /></button></div></td></tr>
            ))}</tbody></table></div>}
          {open && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => { setOpen(false); setEdit(null); }}>
            <div className="bg-gradient-to-b from-slate-900 to-indigo-950 border border-white/10 rounded-3xl p-8 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
              <h2 className="text-2xl font-extrabold text-white mb-6">{edit ? "Edit Grade" : "Log Grade"}</h2>
              <div className="space-y-3">
                <select value={form.studentId} onChange={e => setForm({...form, studentId: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">{students.map(s => <option key={s.id} value={s.id} className="bg-slate-900">{s.fullName}</option>)}</select>
                <select value={form.assessmentId} onChange={e => setForm({...form, assessmentId: Number(e.target.value)})} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40">{assessments.map(a => <option key={a.id} value={a.id} className="bg-slate-900">{a.title}</option>)}</select>
                <input type="number" min={0} max={100} value={form.score} onChange={e => setForm({...form, score: Number(e.target.value), pointsEarned: Number(e.target.value)})} placeholder="Score %" className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
                <textarea value={form.feedback} onChange={e => setForm({...form, feedback: e.target.value})} placeholder="Feedback (optional)" rows={3} className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40" />
              </div>
              <div className="mt-6 flex gap-3"><button onClick={() => { setOpen(false); setEdit(null); }} className="flex-1 py-3 rounded-xl border border-white/10 text-sm font-semibold text-slate-300 hover:bg-white/5 transition">Cancel</button><button onClick={save} className="flex-1 py-3 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-bold shadow-lg hover:scale-[1.03] transition">{edit ? "Save" : "Log"}</button></div>
            </div>
          </div>}
        </div>
      </main>
    </div>
  );
}
