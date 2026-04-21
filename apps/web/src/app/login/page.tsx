"use client";

import { motion } from "framer-motion";
import { Anchor } from "lucide-react";
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
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-sm"
      >
        {/* Wordmark */}
        <div className="mb-8 flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-[#ffffff10]">
            <Anchor className="size-4 text-[#f4f4f5]" />
          </div>
          <span className="text-[15px] font-semibold tracking-tight text-[#f4f4f5]">
            Shipyard
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
        >
          <h1 className="mb-1 text-xl font-semibold tracking-tight text-[#f4f4f5]">
            Enter your access PIN
          </h1>
          <p className="mb-6 text-sm text-[#71717a]">
            Authenticate to access the deployment dashboard.
          </p>

          <form className="space-y-3" onSubmit={handleSubmit}>
            <Input
              value={pin}
              onChange={(event) => setPinInput(event.target.value)}
              placeholder="9923**"
              autoComplete="current-password"
              spellCheck={false}
              type="password"
              className="h-11 border-[#ffffff15] bg-[#1a1a1a] font-mono text-[#f4f4f5] placeholder:text-[#3f3f46] focus-visible:ring-white/10"
            />
            {error ? <p className="text-sm text-[#f87171]">{error}</p> : null}
            <Button
              type="submit"
              className="h-11 w-full bg-[#f4f4f5] font-medium text-[#0a0a0a] hover:bg-[#e4e4e7]"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Verifying..." : "Enter Dashboard"}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center font-mono text-[11px] text-[#3f3f46]">
          Accessible only via VPN or server contact your admin if you don&apos;t
          have a PIN.
        </p>
      </motion.div>
    </main>
  );
}
