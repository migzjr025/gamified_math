"use client";
import { useState, useEffect } from "react";
import {
  Users, ShieldCheck, UserCheck, Clock, Plus, Search, Edit2, Trash2,
  CheckCircle2, XCircle, AlertCircle, RefreshCw, KeyRound, Lock, Mail,
  GraduationCap, ShieldAlert, Sparkles, Filter, X
} from "lucide-react";

interface UserItem {
  id: number;
  name: string;
  email: string;
  role: "teacher" | "student" | "admin";
  grade: string;
  approved: boolean;
  emailVerified: boolean;
  firstLoginCompleted: boolean;
  createdAt: string;
}

interface Props {
  currentUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default function AdminUsersInteractive({ currentUser }: Props) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Add Form State
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRole, setAddRole] = useState<"teacher" | "student" | "admin">("teacher");
  const [addGrade, setAddGrade] = useState("Grade 2");
  const [addApproved, setAddApproved] = useState(true);
  const [submittingAdd, setSubmittingAdd] = useState(false);

  // Edit Form State
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<"teacher" | "student" | "admin">("teacher");
  const [editGrade, setEditGrade] = useState("");
  const [editApproved, setEditApproved] = useState(true);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Action Loading
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setError(data.error || "Failed to load users list.");
      }
    } catch {
      setError("Network error while loading users.");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleApprove(user: UserItem, newApproved: boolean) {
    setActionLoadingId(user.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, approved: newApproved }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || (newApproved ? "User approved!" : "User deactivated."));
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, approved: newApproved } : u));
      } else {
        setError(data.error || "Failed to update approval status.");
      }
    } catch {
      setError("Network error updating user.");
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setSubmittingAdd(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          role: addRole,
          grade: addGrade,
          approved: addApproved,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "User created successfully!");
        setShowAddModal(false);
        setAddName("");
        setAddEmail("");
        setAddPassword("");
        setAddRole("teacher");
        setAddGrade("Grade 2");
        setAddApproved(true);
        fetchUsers();
      } else {
        setError(data.error || "Failed to create user.");
      }
    } catch {
      setError("Network error creating user.");
    } finally {
      setSubmittingAdd(false);
    }
  }

  function openEdit(user: UserItem) {
    setSelectedUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword("");
    setEditRole(user.role);
    setEditGrade(user.grade || "");
    setEditApproved(user.approved);
    setShowEditModal(true);
  }

  async function handleEditUser(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmittingEdit(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedUser.id,
          name: editName.trim(),
          email: editEmail.trim(),
          password: editPassword ? editPassword.trim() : undefined,
          role: editRole,
          grade: editGrade,
          approved: editApproved,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "User updated successfully!");
        setShowEditModal(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setError(data.error || "Failed to update user.");
      }
    } catch {
      setError("Network error updating user.");
    } finally {
      setSubmittingEdit(false);
    }
  }

  function openDelete(user: UserItem) {
    setSelectedUser(user);
    setShowDeleteModal(true);
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    setActionLoadingId(selectedUser.id);
    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/users?id=${selectedUser.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(data.message || "User deleted successfully!");
        setShowDeleteModal(false);
        setSelectedUser(null);
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id));
      } else {
        setError(data.error || "Failed to delete user.");
      }
    } catch {
      setError("Network error deleting user.");
    } finally {
      setActionLoadingId(null);
    }
  }

  const pendingUsers = users.filter(u => !u.approved);
  const approvedUsers = users.filter(u => u.approved);

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "pending" && !u.approved) ||
      (statusFilter === "approved" && u.approved);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs font-bold mb-2">
            <ShieldAlert size={14} /> Administrator Control Center
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            User Management & Approvals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Review new user registration requests, manage account roles, and maintain user access across the system.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-900/30 flex items-center gap-2 transition hover:scale-105 active:scale-95 cursor-pointer"
          >
            <Plus size={16} /> Add New User
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-400 hover:text-rose-200"><X size={16} /></button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 text-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-400 hover:text-emerald-200"><X size={16} /></button>
        </div>
      )}

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Total Users</span>
            <div className="h-9 w-9 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
              <Users size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">{users.length}</p>
          <span className="text-[11px] text-slate-400">Active & Registered</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-amber-300">Pending Approvals</span>
            <div className="h-9 w-9 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center">
              <Clock size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-amber-300">{pendingUsers.length}</p>
          <span className="text-[11px] text-amber-400/80">Requires your review</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Teachers</span>
            <div className="h-9 w-9 rounded-xl bg-sky-500/20 text-sky-300 flex items-center justify-center">
              <GraduationCap size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {users.filter(u => u.role === "teacher").length}
          </p>
          <span className="text-[11px] text-slate-400">Educator accounts</span>
        </div>

        <div className="glass-card rounded-2xl p-5 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400">Administrators</span>
            <div className="h-9 w-9 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>
          <p className="text-2xl font-black text-white">
            {users.filter(u => u.role === "admin").length}
          </p>
          <span className="text-[11px] text-slate-400">System management</span>
        </div>
      </div>

      {/* PENDING APPROVAL QUEUE (Highlighted if any) */}
      {pendingUsers.length > 0 && (
        <div className="glass-card rounded-3xl p-6 border-2 border-amber-500/40 bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950/90 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-amber-500/20 text-amber-300 flex items-center justify-center animate-pulse">
              <Clock size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                Pending User Approval Requests
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black text-xs">
                  {pendingUsers.length} Pending
                </span>
              </h2>
              <p className="text-xs text-amber-200/70">
                These users have signed up and verified their email, and are waiting for your approval to access the system.
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
            {pendingUsers.map(user => (
              <div
                key={user.id}
                className="p-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between gap-4 shadow-lg hover:border-amber-400/60 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center font-black text-white text-sm shadow-md shrink-0">
                      {user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                    </div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 border border-amber-500/40 text-amber-300">
                      {user.role}
                    </span>
                  </div>

                  <h3 className="font-bold text-white text-sm truncate">{user.name}</h3>
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                    <Mail size={12} className="shrink-0" /> {user.email}
                  </p>
                  {user.grade && (
                    <p className="text-[11px] text-violet-300 mt-1 font-medium">
                      Assigned: {user.grade}
                    </p>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">
                    Registered: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleToggleApprove(user, true)}
                    disabled={actionLoadingId === user.id}
                    className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950 transition cursor-pointer"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => openDelete(user)}
                    disabled={actionLoadingId === user.id}
                    className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-xs flex items-center justify-center gap-1 transition cursor-pointer"
                    title="Reject and delete"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ALL USERS TABLE SECTION */}
      <div className="glass-card rounded-3xl p-6 lg:p-8 border border-white/10 shadow-2xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-extrabold text-white">All System Users</h2>
            <p className="text-xs text-slate-400">Search, filter, edit details, reset passwords, or deactivate accounts.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[220px]">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search name or email..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-400/40"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Roles</option>
              <option value="teacher" className="bg-slate-900">Teachers</option>
              <option value="student" className="bg-slate-900">Students</option>
              <option value="admin" className="bg-slate-900">Admins</option>
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40 cursor-pointer"
            >
              <option value="all" className="bg-slate-900">All Statuses</option>
              <option value="approved" className="bg-slate-900">Approved</option>
              <option value="pending" className="bg-slate-900">Pending Approval</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Grade Level</th>
                <th className="py-3 px-4">Approval Status</th>
                <th className="py-3 px-4">Email Verification</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    {loading ? "Loading users..." : "No users found matching your search filter."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-400 flex items-center justify-center font-black text-white text-xs shadow shrink-0">
                          {user.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-white text-sm truncate flex items-center gap-2">
                            {user.name}
                            {currentUser.id === user.id && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-violet-500/20 text-violet-300 font-semibold">You</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                        user.role === "admin"
                          ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                          : user.role === "student"
                          ? "bg-sky-500/10 text-sky-300 border border-sky-500/20"
                          : "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                      }`}>
                        {user.role === "admin" ? <ShieldCheck size={13} /> : user.role === "student" ? <Users size={13} /> : <GraduationCap size={13} />}
                        <span className="capitalize">{user.role}</span>
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-300">
                      {user.grade || <span className="text-slate-500">—</span>}
                    </td>

                    <td className="py-3.5 px-4">
                      {user.approved ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                          <span className="h-2 w-2 rounded-full bg-emerald-400" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 animate-pulse">
                          <span className="h-2 w-2 rounded-full bg-amber-400" /> Pending Approval
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs">
                      {user.emailVerified ? (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">
                          <CheckCircle2 size={13} /> Verified
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium flex items-center gap-1">
                          <Clock size={13} /> Unverified
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        {/* 1-Click Approve / Deactivate toggle */}
                        <button
                          onClick={() => handleToggleApprove(user, !user.approved)}
                          disabled={actionLoadingId === user.id || currentUser.id === user.id}
                          className={`p-1.5 rounded-lg border text-xs font-semibold transition cursor-pointer ${
                            user.approved
                              ? "bg-white/5 border-white/10 text-slate-300 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20"
                              : "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 hover:bg-emerald-500/30"
                          }`}
                          title={user.approved ? "Deactivate User" : "Approve User"}
                        >
                          {user.approved ? <UserCheck size={15} /> : <CheckCircle2 size={15} className="text-emerald-400" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => openEdit(user)}
                          className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 hover:text-white transition cursor-pointer"
                          title="Edit User Details"
                        >
                          <Edit2 size={15} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => openDelete(user)}
                          disabled={currentUser.id === user.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 text-rose-300 transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          title={currentUser.id === user.id ? "Cannot delete yourself" : "Delete User"}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD USER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 lg:p-8 max-w-lg w-full border border-white/15 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                  <Plus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Add New User</h3>
                  <p className="text-xs text-slate-400">Directly register a new educator, student, or admin.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  placeholder="e.g., Maria Santos"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={addEmail}
                  onChange={e => setAddEmail(e.target.value)}
                  placeholder="e.g., maria@matatag.edu.ph"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Initial Password *</label>
                <input
                  type="password"
                  required
                  value={addPassword}
                  onChange={e => setAddPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Role *</label>
                  <select
                    value={addRole}
                    onChange={e => setAddRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Grade Level</label>
                  <select
                    value={addGrade}
                    onChange={e => setAddGrade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  >
                    <option value="">None / Admin</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="addApproved"
                  checked={addApproved}
                  onChange={e => setAddApproved(e.target.checked)}
                  className="h-4 w-4 rounded bg-white/5 border-white/20 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="addApproved" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Approve immediately (User can log in right away)
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-violet-900/30 hover:scale-105 transition flex items-center gap-2"
                >
                  {submittingAdd ? "Creating..." : "Create User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 lg:p-8 max-w-lg w-full border border-white/15 shadow-2xl animate-scale-up">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="h-10 w-10 rounded-xl bg-violet-500/20 text-violet-300 flex items-center justify-center">
                  <Edit2 size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edit User: {selectedUser.name}</h3>
                  <p className="text-xs text-slate-400">Update account details, change role, or reset password.</p>
                </div>
              </div>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Reset Password <span className="text-slate-500 font-normal">(Leave blank to keep unchanged)</span>
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={e => setEditPassword(e.target.value)}
                  placeholder="Enter new password if resetting..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Role</label>
                  <select
                    value={editRole}
                    onChange={e => setEditRole(e.target.value as any)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  >
                    <option value="teacher">Teacher</option>
                    <option value="student">Student</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Grade Level</label>
                  <select
                    value={editGrade}
                    onChange={e => setEditGrade(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-400/40"
                  >
                    <option value="">None / Admin</option>
                    <option value="Grade 1">Grade 1</option>
                    <option value="Grade 2">Grade 2</option>
                    <option value="Grade 3">Grade 3</option>
                    <option value="Grade 4">Grade 4</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="editApproved"
                  checked={editApproved}
                  onChange={e => setEditApproved(e.target.checked)}
                  className="h-4 w-4 rounded bg-white/5 border-white/20 text-violet-600 focus:ring-violet-500 cursor-pointer"
                />
                <label htmlFor="editApproved" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Account Approved & Active
                </label>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold text-xs shadow-lg shadow-violet-900/30 hover:scale-105 transition flex items-center gap-2"
                >
                  {submittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-card rounded-3xl p-6 lg:p-8 max-w-md w-full border border-rose-500/30 shadow-2xl animate-scale-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-300 flex items-center justify-center">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Delete User Account</h3>
                <p className="text-xs text-rose-300">This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-6">
              Are you sure you want to delete <strong className="text-white">{selectedUser.name}</strong> ({selectedUser.email})?
              All records associated with this account will be removed.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-semibold text-slate-300 hover:bg-white/10 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={actionLoadingId === selectedUser.id}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 hover:scale-105 transition flex items-center gap-2"
              >
                {actionLoadingId === selectedUser.id ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
