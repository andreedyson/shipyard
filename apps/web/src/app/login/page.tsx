"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Anchor,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPinInput] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void api
      .get<{ authenticated: boolean }>("/auth/session")
      .then(({ data }) => {
        if (data.authenticated) router.replace("/");
      });
  }, [router]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPin = pin.trim();

    if (!normalizedPin || isSubmitting) {
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      await api.post("/auth/login", { pin: normalizedPin });
      router.replace("/");
    } catch {
      setError("Invalid security PIN. Please try again.");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      inputRef.current?.select();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#07080b] px-4 py-8 sm:px-6">
      {/* Ambient background glow & grid pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(56,189,248,0.12),transparent_50%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_80%,rgba(16,185,129,0.06),transparent_40%)]" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{
          opacity: 1,
          y: 0,
          x: shake ? [-6, 6, -4, 4, -2, 2, 0] : 0,
        }}
        transition={{
          y: { duration: 0.35, ease: [0.16, 1, 0.3, 1] },
          opacity: { duration: 0.35 },
          x: { duration: 0.4 },
        }}
        className="relative z-10 w-full max-w-[390px]"
      >
        {/* Brand Header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative flex size-9 items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-md shadow-black/60 ring-1 ring-white/15">
              <Anchor className="size-4.5 text-sky-400" />
            </div>
            <div>
              <span className="text-[15px] font-semibold tracking-tight text-zinc-100">
                Shipyard
              </span>
              <span className="block font-mono text-[10px] text-zinc-500">
                DEPLOY CONSOLE
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 rounded-full bg-zinc-900/90 px-2.5 py-1 ring-1 ring-white/10 backdrop-blur">
            <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
            <span className="font-mono text-[9.5px] font-medium tracking-wider text-zinc-400 uppercase">
              VPN Only
            </span>
          </div>
        </div>

        {/* Login Card */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950/70 p-6 shadow-2xl shadow-black/80 backdrop-blur-xl sm:p-7">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <div className="flex size-6 items-center justify-center rounded-md bg-sky-950/80 text-sky-400 ring-1 ring-sky-500/30">
                <KeyRound className="size-3.5" />
              </div>
              <h1 className="text-lg font-semibold tracking-tight text-zinc-100">
                Security Checkpoint
              </h1>
            </div>
            <p className="text-xs leading-relaxed text-zinc-400">
              Enter your access PIN to unlock deployment controls and server logs.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5">
              <label
                htmlFor="access-pin"
                className="flex items-center justify-between text-[11px] font-medium text-zinc-300"
              >
                <span>Access PIN</span>
                <span className="font-mono text-[10px] text-zinc-500">
                  {pin.length > 0 ? `${pin.length} digits` : "Numeric PIN"}
                </span>
              </label>

              {/* Password Input with Lock Icon and Eye Toggle */}
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-zinc-500">
                  <Lock className="size-4" />
                </div>

                <input
                  ref={inputRef}
                  id="access-pin"
                  value={pin}
                  onChange={(event) => {
                    setPinInput(event.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  spellCheck={false}
                  type={showPin ? "text" : "password"}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-xl border border-white/10 bg-zinc-900/90 pr-11 pl-9 font-mono text-sm tracking-[0.15em] text-zinc-100 placeholder:tracking-normal placeholder:text-zinc-600 focus:border-sky-500/60 focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 disabled:opacity-50"
                  style={{
                    boxShadow: "inset 0 1px 2px rgba(0, 0, 0, 0.4)",
                  }}
                />

                {/* Eye / EyeOff Toggle Button */}
                <button
                  type="button"
                  onClick={() => setShowPin((prev) => !prev)}
                  aria-label={showPin ? "Hide PIN" : "Show PIN"}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-zinc-400 transition-colors hover:text-zinc-200 focus:text-zinc-100 focus:outline-none"
                >
                  {showPin ? (
                    <EyeOff className="size-4 transition-transform active:scale-90" />
                  ) : (
                    <Eye className="size-4 transition-transform active:scale-90" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Banner with AnimatePresence */}
            <AnimatePresence>
              {error ? (
                <motion.div
                  initial={{ opacity: 0, height: 0, y: -4 }}
                  animate={{ opacity: 1, height: "auto", y: 0 }}
                  exit={{ opacity: 0, height: 0, y: -4 }}
                  className="flex items-center gap-2 overflow-hidden rounded-lg bg-red-950/60 px-3 py-2 text-xs text-red-300 ring-1 ring-red-500/30"
                >
                  <AlertCircle className="size-3.5 shrink-0 text-red-400" />
                  <span className="flex-1">{error}</span>
                </motion.div>
              ) : null}
            </AnimatePresence>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || !pin.trim()}
              className="group relative h-11 w-full overflow-hidden rounded-xl bg-zinc-100 font-medium text-zinc-950 shadow-md transition-all duration-150 hover:bg-white active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin text-zinc-700" />
                  <span>Verifying PIN...</span>
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <span>Enter Dashboard</span>
                  <ArrowRight className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
                </span>
              )}
            </Button>
          </form>

          {/* Security Info Card / Footer */}
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="flex items-center justify-between text-[11px] text-zinc-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="size-3 text-emerald-500/80" />
                End-to-end encrypted
              </span>
              <span className="font-mono text-[10px]">Press Enter ↵</span>
            </div>
          </div>
        </div>

        {/* Footnote */}
        <p className="mt-4 text-center font-mono text-[10.5px] leading-relaxed text-zinc-500">
          Accessible only via VPN or server network.
          <br />
          Contact your administrator if you don&apos;t have an access PIN.
        </p>
      </motion.div>
    </main>
  );
}
