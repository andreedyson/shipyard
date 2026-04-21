"use client";

import { FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { StatusBadge } from "@/components/status-badge";
import { getLatestDeployId } from "@/lib/deploys";
import type { App } from "@/types";

function formatRelativeTime(value: string | null | undefined): string {
  if (!value) return "Never deployed";

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60)
    return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

type AppCardProps = {
  app: App;
};

export function AppCard({ app }: AppCardProps) {
  const [logsOpen, setLogsOpen] = useState(false);
  const latestDeployId = getLatestDeployId(app);

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group rounded-xl p-5 transition-[border-color] duration-150 ease-out hover:[border-color:#ffffff30]"
        style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-medium tracking-tight text-[#f4f4f5]">
            {app.label}
          </h3>
          <StatusBadge status={app.status} />
        </div>

        {/* Last deployed */}
        <div className="mt-5">
          <p className="text-xs text-[#3f3f46]">Last deployed</p>
          <p className="mt-0.5 font-mono text-sm text-[#71717a]">
            {formatRelativeTime(app.lastDeployedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <DeployButton appId={app.id} status={app.status} appLabel={app.label} />
          <button
            type="button"
            disabled={!latestDeployId}
            onClick={() => setLogsOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-[#71717a] transition-colors hover:text-[#f4f4f5] disabled:pointer-events-none disabled:opacity-40"
            style={{ border: "0.5px solid #ffffff15" }}
          >
            <FileText className="size-3.5" />
            Logs
          </button>
        </div>
      </motion.div>

      <LogPanel
        deployId={latestDeployId}
        appLabel={app.label}
        status={app.status}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </>
  );
}
