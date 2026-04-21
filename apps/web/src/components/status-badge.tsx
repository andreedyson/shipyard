"use client";

import { AnimatePresence, motion } from "framer-motion";

import { Badge } from "@/components/ui/badge";
import { statusConfig } from "@/lib/status";
import type { DeployStatus } from "@/types";

type StatusBadgeProps = {
  status: DeployStatus;
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
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="flex-shrink-0"
      >
        <Badge variant={config.badgeVariant} className="gap-1.5 text-[11px]">
          {isRunning && (
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-amber-400" />
            </span>
          )}
          {config.label}
        </Badge>
      </motion.span>
    </AnimatePresence>
  );
}
