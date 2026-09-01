"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  Lock,
  Shield,
  ShieldCheck,
  User,
  UserPlus,
} from "lucide-react";

/**
 * The capabilities beside the sign-in form.
 *
 * Icons are the same lucide glyphs the sidebar uses for these areas, so the login
 * screen previews the application's own language rather than generic bullets.
 */
const HIGHLIGHTS = [
  { icon: UserPlus, label: "Member Registration & Profile Management" },
  { icon: ClipboardList, label: "Board Approval Workflows" },
  { icon: GraduationCap, label: "Scholarship & Donation Processing" },
  { icon: FileText, label: "Audit-ready Document Trails" },
];

/**
 * Assurance line, in place of a live figure.
 *
 * Member counts would need a permitAll endpoint publishing institutional numbers to
 * anyone who loads this page — the API is otherwise `anyRequest().authenticated()`. It
 * would also couple the login screen to backend availability, so a slow or down API
 * would put a spinner where people need to type.
 */
const ASSURANCES = ["Encrypted session", "Activity logged", "Authorised access only"];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const usernameRef = useRef<HTMLInputElement>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Straight to the first field — this page exists to be typed into.
  useEffect(() => {
    usernameRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim() || !password.trim()) {
      setError("Please enter username and password.");
      return;
    }

    setIsLoading(true);
    try {
      await login(username.trim(), password);
      router.push("/");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Invalid username or password."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    /*
     * min-h-svh rather than min-h-screen: on a phone `vh` is measured against the
     * viewport with the browser chrome retracted, so 100vh is taller than what is
     * actually visible and the panel is pushed under the URL bar. svh is the visible
     * height, and matches the h-svh the protected layout already uses.
     */
    <div className="flex min-h-svh flex-col lg:flex-row">
      {/*
       * Entrance only — the panel settles once and stops. A looping animation on a
       * screen people hit several times a day reads as a consumer product and becomes
       * irritating; reduced-motion users get the end state immediately.
       */}
      <style>{`
        @keyframes login-rise {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: none; }
        }
        .login-rise { animation: login-rise .5s cubic-bezier(.22,.61,.36,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .login-rise { animation: none !important; }
        }
      `}</style>

      {/* ── Brand panel ──────────────────────────────────────────────────
          Hidden below lg: on a phone it would push the form off the fold, so the
          compact lockup above the card carries the identity instead. */}
      <aside className="relative hidden w-full flex-col justify-between overflow-hidden bg-[#180b04] px-12 py-10 lg:flex lg:w-[36%] xl:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(120% 80% at 0% 0%, rgba(149,48,2,0.28) 0%, rgba(24,11,4,0) 60%)",
          }}
        />

        {/* Product lockup — the institute is the hero below, so this stays quiet. */}
        <div className="login-rise relative flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ffb401]">
            <Shield className="h-5 w-5 text-[#4a2c00]" strokeWidth={2.2} />
          </div>
          <div className="leading-tight">
            <p className="text-[13px] font-bold tracking-wide text-white">
              MemberConnect
            </p>
            <p className="text-[12px] font-medium text-[#ffb401]">
              Member Management System
            </p>
          </div>
        </div>

        <div className="relative">
          <h1
            className="login-rise text-[40px] leading-none font-bold tracking-tight text-white"
            style={{ animationDelay: "80ms" }}
          >
            Financial Institute
          </h1>
          <p
            className="login-rise mt-4 max-w-xs text-[15px] leading-relaxed text-white/55"
            style={{ animationDelay: "140ms" }}
          >
            Secure, process-driven workflows for District Office and Head Office
            operations.
          </p>

          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map(({ icon: Icon, label }, i) => (
              <li
                key={label}
                className="login-rise flex items-center gap-3"
                style={{ animationDelay: `${200 + i * 60}ms` }}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/10">
                  <Icon className="h-[15px] w-[15px] text-[#ffb401]" />
                </span>
                <span className="text-[14px] text-white/85">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="login-rise relative space-y-4"
          style={{ animationDelay: "460ms" }}
        >
          {/* Trust strip — what a financial sign-in reasonably asserts, and where the
              stray "Authorized personnel only" line now lives. */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-white/10 pt-4">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#ffb401]" />
            {ASSURANCES.map((item, i) => (
              <span key={item} className="flex items-center gap-3">
                {i > 0 && (
                  <span aria-hidden className="h-1 w-1 rounded-full bg-white/20" />
                )}
                <span className="text-[12px] text-white/45">{item}</span>
              </span>
            ))}
          </div>

          <p className="text-[12px] text-white/25">
            &copy; {new Date().getFullYear()} Financial Institute. All rights reserved.
          </p>
        </div>
      </aside>

      {/* ── Sign-in panel ─────────────────────────────────────────────── */}
      <main className="relative flex w-full flex-1 items-center justify-center overflow-hidden px-4 py-8 sm:px-6 sm:py-12">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #26120a 0%, #4a2110 45%, #7d3a17 100%)",
          }}
        />

        <div className="login-rise relative w-full max-w-[400px]">
          {/* Compact identity for narrow screens, where the brand panel is hidden. */}
          <div className="mb-6 flex items-center justify-center gap-3 sm:mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#ffb401]">
              <Shield className="h-5 w-5 text-[#4a2c00]" strokeWidth={2.2} />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-bold tracking-wide text-white">
                Financial Institute
              </p>
              <p className="text-xs font-medium text-[#ffb401]">MemberConnect</p>
            </div>
          </div>

          <div className="rounded-2xl bg-[#faf9f7] p-6 shadow-2xl shadow-black/25 sm:p-8">
            <h2 className="text-[22px] leading-none font-bold text-[#141414] sm:text-[24px]">
              Sign In
            </h2>
            <p className="mt-2 text-[13px] text-neutral-500">
              Enter your credentials to access the system
            </p>

            {error && (
              <div
                role="alert"
                className="mt-5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-700"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="username"
                  className="block text-[13px] font-semibold text-[#141414]"
                >
                  Username
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#953002]" />
                  <input
                    id="username"
                    ref={usernameRef}
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    autoComplete="username"
                    className="h-11 w-full rounded-lg border border-neutral-200 bg-white pr-4 pl-11 text-[14px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#953002] focus:ring-2 focus:ring-[#953002]/20"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="password"
                  className="block text-[13px] font-semibold text-[#141414]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#953002]" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    // Caps Lock is a real cause of failed sign-ins, and the field
                    // masks the evidence. getModifierState reads the live key state,
                    // so it is correct on the very first keystroke.
                    onKeyUp={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onKeyDown={(e) => setCapsLock(e.getModifierState("CapsLock"))}
                    onBlur={() => setCapsLock(false)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="h-11 w-full rounded-lg border border-neutral-200 bg-white pr-11 pl-11 text-[14px] text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 focus:border-[#953002] focus:ring-2 focus:ring-[#953002]/20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-neutral-400 transition-colors hover:text-neutral-600"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {capsLock && (
                  <p className="text-[12px] font-medium text-amber-700">
                    Caps Lock is on
                  </p>
                )}
              </div>

              <button
                id="login-submit"
                type="submit"
                disabled={isLoading}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#953002] text-[15px] font-semibold text-white transition-colors hover:bg-[#7a2700] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading && (
                  <span
                    aria-hidden
                    className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
                  />
                )}
                {isLoading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <div className="mt-6 border-t border-neutral-200 pt-4">
              <p className="text-center text-[12px] leading-relaxed text-neutral-500">
                For account access issues, contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
