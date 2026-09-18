"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, BookOpen, ClipboardCheck, Trophy, Settings,
  LogOut, Menu, Zap, Star, BrainCircuit, Gamepad2, UserCircle, ShieldCheck
} from "lucide-react";
import { useState } from "react";

interface SidebarNavProps {
  userName?: string;
  role?: string;
}

export default function SidebarNav({ userName = "Arminda Villeno", role = "teacher" }: SidebarNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const isStudent = role === "student";
  const isAdmin = role === "admin";

  const nav = isStudent
    ? [
        { label: "Quest Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Play Game", href: "/game", icon: Gamepad2 },
        { label: "My Grades", href: "/grades", icon: Zap },
        { label: "Achievements", href: "/achievements", icon: Trophy },
        { label: "Settings", href: "/settings", icon: Settings },
      ]
    : isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "User Management", href: "/admin/users", icon: ShieldCheck },
        { label: "Students", href: "/students", icon: Users },
        { label: "Units", href: "/units", icon: BookOpen },
        { label: "Assessments", href: "/assessments", icon: ClipboardCheck },
        { label: "Questions", href: "/questions", icon: BrainCircuit },
        { label: "Game", href: "/game", icon: Gamepad2 },
        { label: "Grades", href: "/grades", icon: Zap },
        { label: "Achievements", href: "/achievements", icon: Trophy },
        { label: "Settings", href: "/settings", icon: Settings },
      ]
    : [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Students", href: "/students", icon: Users },
        { label: "Units", href: "/units", icon: BookOpen },
        { label: "Assessments", href: "/assessments", icon: ClipboardCheck },
        { label: "Questions", href: "/questions", icon: BrainCircuit },
        { label: "Game", href: "/game", icon: Gamepad2 },
        { label: "Grades", href: "/grades", icon: Zap },
        { label: "Achievements", href: "/achievements", icon: Trophy },
        { label: "Settings", href: "/settings", icon: Settings },
      ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const roleLabel = role === "admin" ? "Administrator" : role === "student" ? "Student" : "Teacher · Grade 1-2";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-white/10 backdrop-blur border border-white/10 text-white shadow-xl hover:bg-white/20 transition cursor-pointer"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      <aside className={`fixed top-0 left-0 h-screen w-72 z-40 flex flex-col bg-gradient-to-b from-slate-950/95 via-indigo-950/95 to-violet-950/95 backdrop-blur-2xl border-r border-white/10 shadow-2xl transition-transform duration-300 lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-3 px-6 py-7 border-b border-white/10">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-amber-400 flex items-center justify-center shadow-lg shadow-violet-900/30">
            <Star className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base font-extrabold leading-none tracking-tight bg-gradient-to-r from-violet-200 to-amber-200 bg-clip-text text-transparent">Matatag Quest</h1>
            <p className="text-[11px] text-slate-400 font-medium mt-1">Math Grading Game</p>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-1">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  active
                    ? "bg-gradient-to-r from-violet-600/30 to-violet-400/10 text-violet-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] border border-violet-400/20"
                    : "text-slate-300 hover:text-white hover:bg-white/5 hover:border hover:border-white/5 border border-transparent"
                }`}
              >
                <item.icon size={18} className={active ? "text-amber-300" : "text-slate-400"} />
                <span>{item.label}</span>
                {item.label === "Grades" && (
                  <span className="ml-auto text-[10px] font-bold bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-md">NEW</span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="px-5 py-5 border-t border-white/10">
          <Link
            href="/settings"
            className="flex items-center gap-3 mb-3 p-2 rounded-xl hover:bg-white/5 border border-transparent hover:border-white/10 transition group"
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-violet-500 to-rose-400 flex items-center justify-center text-xs font-extrabold shadow-lg text-white group-hover:scale-105 transition">
              {userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate group-hover:text-violet-200 transition">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate">{roleLabel}</p>
            </div>
            <Settings size={15} className="text-slate-500 group-hover:text-slate-300 transition" />
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-200 bg-rose-500/10 border border-rose-400/20 hover:bg-rose-500/20 transition cursor-pointer"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} />
      )}
    </>
  );
}

