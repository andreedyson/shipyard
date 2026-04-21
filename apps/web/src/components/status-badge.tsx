"use client";

import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/types";

type StatusBadgeProps = {
  status: DeployStatus;
};

const statusConfig: Record<
  DeployStatus,
  { bg: string; text: string; label: string }
> = {
  idle:    { bg: "#ffffff10", text: "#71717a", label: "Idle" },
  running: { bg: "#451a03",   text: "#fb923c", label: "Running" },
  success: { bg: "#052e16",   text: "#4ade80", label: "Success" },
  failed:  { bg: "#450a0a",   text: "#f87171", label: "Failed" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  const isRunning = status === "running";

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={status}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="flex-shrink-0"
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5",
            "text-[11px] font-medium uppercase tracking-[0.05em]",
          )}
          style={{ background: config.bg, color: config.text }}
        >
          {isRunning && (
            <span className="relative flex size-1.5 flex-shrink-0">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"
                style={{ background: config.text }}
              />
              <span
                className="relative inline-flex size-1.5 rounded-full"
                style={{ background: config.text }}
              />
            </span>
          )}
          {config.label}
        </span>
      </motion.span>
    </AnimatePresence>
  );
}
