"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Shield, Zap, Trophy, BookOpen, Star, ArrowRight, Eye, EyeOff, KeyRound, RefreshCw, ArrowLeft } from "lucide-react";

type Mode = "login" | "signup";
type Role = "teacher" | "student" | "admin";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("teacher");
  const [adminCode, setAdminCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // MFA State
  const [isMfaStep, setIsMfaStep] = useState(false);
  const [mfaEmail, setMfaEmail] = useState("");
  const [mfaType, setMfaType] = useState<"signup_verification" | "first_login_mfa">("signup_verification");
  const [otpCode, setOtpCode] = useState("");
  const [previewCode, setPreviewCode] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  // Cooldown countdown timer for resending OTP
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const body = mode === "login"
      ? { email: email.trim().toLowerCase(), password }
      : { name: name.trim(), email: email.trim().toLowerCase(), password, role, adminCode };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setLoading(false);

      if (data.requiresMFA) {
        // Switch to Multi-Factor Authentication Verification screen
        setMfaEmail(data.email || email.trim().toLowerCase());
        setMfaType(data.type || (mode === "signup" ? "signup_verification" : "first_login_mfa"));
        setPreviewCode(data.previewCode || null);
        setIsMfaStep(true);
        setResendCooldown(60);
        setOtpCode("");
        setSuccess(data.message || "A 6-digit security code has been sent to your email.");
      } else if (data.success) {
        setSuccess(mode === "signup" ? "Account created successfully. Redirecting..." : "Signed in successfully.");
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || (mode === "login" ? "Login failed" : "Signup failed"));
      }
    } catch {
      setLoading(false);
      setError("Network or server connection error. Please try again.");
    }
  }

  async function handleVerifyMFA(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.trim().length !== 6) {
      setError("Please enter a valid 6-digit security code.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mfaEmail,
          code: otpCode.trim(),
          type: mfaType,
        }),
      });

      const data = await res.json();
      setLoading(false);

      if (data.success) {
        if (data.pendingApproval) {
          setSuccess(data.message || "Email verified! Your account is pending administrator approval. Please wait for an admin to activate your account.");
          setIsMfaStep(false);
          setMode("login");
          setPassword("");
        } else {
          setSuccess("Identity verified! Redirecting to dashboard...");
          router.push("/dashboard");
          router.refresh();
        }
      } else {
        setError(data.error || "Invalid or expired security code.");
      }
    } catch {
      setLoading(false);
      setError("Failed to verify code. Please try again.");
    }
  }

  async function handleResendCode() {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: mfaEmail,
          type: mfaType,
        }),
      });

      const data = await res.json();
      setResending(false);

      if (data.success) {
        setSuccess("A new 6-digit security code has been sent to your email.");
        setPreviewCode(data.previewCode || null);
        setResendCooldown(60);
      } else {
        setError(data.error || "Failed to resend security code.");
      }
    } catch {
      setResending(false);
      setError("Network error while requesting new code.");
    }
  }

  function handleBackToAuth() {
    setIsMfaStep(false);
    setError("");
    setSuccess("");
    setOtpCode("");
    setPreviewCode(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-violet-950 px-6 py-12 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-3xl" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-400/15 rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-5xl grid lg:grid-cols-2 gap-12 items-center">
        <div className="hidden lg:block">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-violet-200 text-xs font-bold mb-6">
            <Shield size={14} /> Gamified Mathematics
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight bg-gradient-to-r from-white via-violet-100 to-amber-200 bg-clip-text text-transparent mb-6">
            Gamified <br />
            <span className="text-violet-300">Mathematics</span>
          </h1>
          <p className="text-lg text-slate-300 mb-8 leading-relaxed max-w-md">
            Interactive math learning and grading platform with enhanced Multi-Factor Authentication security.
          </p>
          <div className="flex flex-wrap gap-3">
            {[
              { icon: Shield, label: "Multi-Factor Authentication" },
              { icon: Zap, label: "Real-time scores" },
              { icon: Trophy, label: "Achievements" },
              { icon: BookOpen, label: "Curriculum units" },
              { icon: Star, label: "Level progress" }
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm font-medium text-slate-200">
                <f.icon size={16} className="text-violet-300" /> {f.label}
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-3xl p-8 lg:p-10 shadow-2xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-amber-400 flex items-center justify-center shadow-lg shadow-violet-900/30">
              <Star className="text-white" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white leading-none">Gamified Mathematics</h2>
              <p className="text-xs text-slate-400 font-medium">Learning and grading made engaging</p>
            </div>
          </div>

          {/* MFA VERIFICATION VIEW */}
          {isMfaStep ? (
            <div className="space-y-5">
              <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-200">
                <KeyRound size={20} className="text-sky-400 shrink-0" />
                <div className="text-xs leading-relaxed">
                  <span className="font-bold">Multi-Factor Authentication</span>
                  <p className="text-slate-300">
                    A 6-digit security code was sent to <strong className="text-white">{mfaEmail}</strong>.
                  </p>
                </div>
              </div>

              {/* Development helper banner when previewCode is available */}
              {previewCode && (
                <div className="p-3.5 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold">🔑 Security Code:</span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(previewCode)}
                      className="px-2 py-0.5 rounded bg-amber-500/30 hover:bg-amber-500/50 text-amber-100 font-bold transition cursor-pointer"
                    >
                      Click to Auto-fill
                    </button>
                  </div>
                  <span className="font-mono text-base font-extrabold tracking-widest text-white">{previewCode}</span>
                </div>
              )}

              <form onSubmit={handleVerifyMFA} className="space-y-4">
                <div>
                  <label htmlFor="otp" className="block text-xs font-bold text-slate-300 mb-1.5 text-center">
                    Enter 6-Digit Verification Code
                  </label>
                  <input
                    id="otp"
                    type="text"
                    maxLength={6}
                    autoFocus
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/15 text-center text-2xl font-mono font-black tracking-[0.5em] text-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/50 placeholder:text-slate-600 placeholder:tracking-normal placeholder:text-sm"
                    placeholder="000000"
                  />
                </div>

                {error && <p className="text-rose-300 text-sm font-medium text-center">{error}</p>}
                {success && <p className="text-emerald-300 text-sm font-medium text-center">{success}</p>}

                <button
                  type="submit"
                  disabled={loading || otpCode.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 via-indigo-600 to-violet-600 text-white font-extrabold text-sm shadow-xl shadow-sky-900/30 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? "Verifying..." : <>Verify & Continue <ArrowRight size={16} /></>}
                </button>
              </form>

              <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={handleBackToAuth}
                  className="inline-flex items-center gap-1 hover:text-white transition cursor-pointer"
                >
                  <ArrowLeft size={13} /> Back to Sign In
                </button>

                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={resendCooldown > 0 || resending}
                  className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200 disabled:text-slate-500 transition cursor-pointer"
                >
                  <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
                  {resending ? "Sending..." : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend Code"}
                </button>
              </div>
            </div>
          ) : (
            /* STANDARD LOGIN / SIGNUP VIEW */
            <div>
              <div className="flex gap-2 mb-6">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${mode === "login" ? "bg-violet-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); setSuccess(""); }}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition cursor-pointer ${mode === "signup" ? "bg-violet-600 text-white" : "bg-white/5 text-slate-300 hover:bg-white/10"}`}
                >
                  Create Account
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label htmlFor="name" className="block text-xs font-bold text-slate-300 mb-1.5">Full Name</label>
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white"
                      placeholder="Your full name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-slate-300 mb-1.5">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white"
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-slate-300 mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition cursor-pointer"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {mode === "signup" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label htmlFor="role" className="block text-xs font-bold text-slate-300 mb-1.5">Role</label>
                      <select
                        id="role"
                        value={role}
                        onChange={e => setRole(e.target.value as Role)}
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 text-white cursor-pointer"
                      >
                        <option value="teacher" className="bg-slate-900">Teacher</option>
                        <option value="student" className="bg-slate-900">Student</option>
                        <option value="admin" className="bg-slate-900">Admin</option>
                      </select>
                    </div>
                    {role === "admin" && (
                      <div>
                        <label htmlFor="adminCode" className="block text-xs font-bold text-slate-300 mb-1.5">Admin Code</label>
                        <input
                          id="adminCode"
                          type="text"
                          value={adminCode}
                          onChange={e => setAdminCode(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 placeholder:text-slate-500 text-white font-mono"
                          placeholder="Developer code"
                        />
                        <p className="mt-2 text-[11px] font-semibold text-amber-300">Developer code: Ask Developer for assistance</p>
                      </div>
                    )}
                  </div>
                )}

                {error && <p className="text-rose-300 text-sm font-medium">{error}</p>}
                {success && <p className="text-emerald-300 text-sm font-medium">{success}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-violet-600 to-violet-400 text-white font-extrabold text-sm shadow-xl shadow-violet-900/30 hover:scale-[1.02] active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading
                    ? (mode === "login" ? "Signing in..." : "Creating account...")
                    : (mode === "login" ? <>Sign In <ArrowRight size={16} /></> : <>Create Account <ArrowRight size={16} /></>)}
                </button>
              </form>

              {mode === "signup" && (
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                  <p className="text-xs text-slate-400">
                    Admin signup requires the developer-only code. Teachers and students can sign up immediately.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

