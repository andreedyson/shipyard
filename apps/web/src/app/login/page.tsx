"use client";

import { motion } from "framer-motion";
import { ShipWheel } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { getPin, setPin } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [pin, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (getPin()) {
      router.replace("/");
    }
  }, [router]);

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
      setPin(normalizedPin);
      router.replace("/");
    } catch {
      setError("Invalid PIN. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-5 py-10">
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/6">
            <ShipWheel className="size-5 text-white/80" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-tight text-foreground">
              Shipyard
            </p>
            <p className="font-mono text-[11px] text-muted-foreground">
              Private console
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_32px_80px_-20px_rgba(0,0,0,0.9)]">
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-foreground">
            Enter your access PIN
          </h1>
          <p className="mb-6 text-sm text-muted-foreground">
            Authenticate to access the deployment dashboard.
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              value={pin}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              spellCheck={false}
              type="password"
              className="h-11 border-border bg-secondary font-mono focus-visible:ring-white/15"
            />
            {error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : null}
            <Button
              type="submit"
              className="h-11 w-full font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Enter dashboard"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">
          Accessible only via VPN &mdash; contact your admin if you don&apos;t
          have a PIN.
        </p>
      </motion.div>
    </main>
  );
}
