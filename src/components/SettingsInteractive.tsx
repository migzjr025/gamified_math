"use client";
import { useState, useEffect } from "react";
import SidebarNav from "@/components/SidebarNav";
import {
  User, Shield, Lock, Mail, CheckCircle2, AlertCircle, Save, Key,
  Sparkles, Eye, EyeOff, UserCheck
} from "lucide-react";

interface SettingsInteractiveProps {
  initialUser: {
    id: number;
    name: string;
    email: string;
    role: string;
    grade?: string;
  };
}

export default function SettingsInteractive({ initialUser }: SettingsInteractiveProps) {
  const [profile, setProfile] = useState({
    name: initialUser.name || "",
    email: initialUser.email || "",
    role: initialUser.role || "teacher",
    grade: initialUser.grade || "Grade 1-2",
  });

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Load latest profile from server
  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/auth/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile({
            name: data.name || initialUser.name,
            email: data.email || initialUser.email,
            role: data.role || initialUser.role,
            grade: data.grade || "Grade 1-2",
          });
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      }
    }
    loadProfile();
  }, [initialUser]);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          grade: profile.grade,
        }),
      });

      const data = await res.json();
      setLoadingProfile(false);

      if (res.ok && data.success) {
        setProfileSuccess("Profile updated successfully!");
        setTimeout(() => setProfileSuccess(""), 4000);
      } else {
        setProfileError(data.error || "Failed to update profile.");
      }
    } catch {
      setLoadingProfile(false);
      setProfileError("Network error while updating profile.");
    }
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("New password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    setLoadingPassword(true);

    try {
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      setLoadingPassword(false);

      if (res.ok && data.success) {
        setPasswordSuccess("Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => setPasswordSuccess(""), 4000);
      } else {
        setPasswordError(data.error || "Failed to update password.");
      }
    } catch {
      setLoadingPassword(false);
      setPasswordError("Network error while changing password.");
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <SidebarNav userName={profile.name} role={profile.role} />

      <main className="flex-1 lg:pl-72 p-6 lg:p-10 max-w-7xl mx-auto w-full">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <User size={20} />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">Account & Security Settings</h1>
              <p className="text-xs lg:text-sm text-slate-400">Manage your profile credentials, password, and security preferences</p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* LEFT 2 COLS: Profile Form & Password Form */}
          <div className="lg:col-span-2 space-y-8">
            {/* 1. PROFILE DETAILS */}
            <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <UserCheck className="text-violet-400" size={22} />
                <div>
                  <h2 className="text-lg font-bold text-white">Profile Information</h2>
                  <p className="text-xs text-slate-400">Update your account name and educational details</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-xs font-bold text-slate-300 mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                    placeholder="Your Name"
                    required
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-xs font-bold text-slate-300 mb-1.5">
                      Email Address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                      placeholder="teacher@matatag.edu.ph"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="grade" className="block text-xs font-bold text-slate-300 mb-1.5">
                      Assigned Grade Level / Scope
                    </label>
                    <input
                      id="grade"
                      type="text"
                      value={profile.grade}
                      onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white"
                      placeholder="e.g. Grade 1-2, Grade 7"
                    />
                  </div>
                </div>

                {profileError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{profileError}</span>
                  </div>
                )}

                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loadingProfile}
                    className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-sm shadow-lg shadow-violet-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Save size={16} />
                    {loadingProfile ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </form>
            </div>

            {/* 2. CHANGE PASSWORD */}
            <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 shadow-xl relative overflow-hidden">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                <Lock className="text-amber-400" size={22} />
                <div>
                  <h2 className="text-lg font-bold text-white">Security & Password</h2>
                  <p className="text-xs text-slate-400">Change your password with old password verification</p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs font-bold text-slate-300 mb-1.5">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPass ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-white"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPass((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                      aria-label="Toggle current password visibility"
                    >
                      {showCurrentPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="newPassword" className="block text-xs font-bold text-slate-300 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="newPassword"
                        type={showNewPass ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-white"
                        placeholder="Min. 6 characters"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                        aria-label="Toggle new password visibility"
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-300 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40 text-white"
                      placeholder="Repeat new password"
                      required
                    />
                  </div>
                </div>

                {passwordError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                    <CheckCircle2 size={16} className="shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loadingPassword || !currentPassword || !newPassword}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-900/30 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <Key size={16} />
                    {loadingPassword ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* RIGHT COL: Account Badges & Security Overview */}
          <div className="space-y-6">
            {/* Identity Card */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 text-center">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-violet-500 to-rose-400 flex items-center justify-center text-2xl font-black shadow-xl shadow-violet-900/40 text-white mb-4">
                {profile.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
              </div>
              <h3 className="text-lg font-bold text-white">{profile.name}</h3>
              <p className="text-xs text-slate-400 mb-3">{profile.email}</p>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-extrabold uppercase tracking-wider">
                <Sparkles size={13} /> {profile.role}
              </div>
            </div>

            {/* Security Status Box */}
            <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Shield size={18} className="text-sky-400" /> Security Status
              </h4>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Mail size={15} className="text-emerald-400" />
                    <span>Email Verification</span>
                  </div>
                  <span className="font-bold text-emerald-400">Verified</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Key size={15} className="text-sky-400" />
                    <span>Multi-Factor Auth (MFA)</span>
                  </div>
                  <span className="font-bold text-sky-400">Active</span>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <Shield size={15} className="text-violet-400" />
                    <span>Access Control</span>
                  </div>
                  <span className="font-bold text-violet-300 capitalize">{profile.role} Level</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
