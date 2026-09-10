"use client";

import { FileText, GitCommitHorizontal, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { StatusBadge } from "@/components/status-badge";
import { formatRelativeDeployTime } from "@/lib/deploys";
import type { App } from "@/types";

type AppCardProps = {
  app: App;
  favorite?: boolean;
  onToggleFavorite?: () => void;
};

export function AppCard({
  app,
  favorite = false,
  onToggleFavorite,
}: AppCardProps) {
  const [logsOpen, setLogsOpen] = useState(false);
  const [preferredDeployId, setPreferredDeployId] = useState<string | null>(
    null,
  );
  const latest = app.latestDeploy;
  const duration =
    latest?.durationMs == null
      ? null
      : latest.durationMs < 60_000
        ? `${Math.round(latest.durationMs / 1_000)}s`
        : `${Math.floor(latest.durationMs / 60_000)}m ${Math.round((latest.durationMs % 60_000) / 1_000)}s`;

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
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-medium tracking-tight text-[#f4f4f5]">
                {app.label}
              </h3>
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={favorite ? "Remove favorite" : "Add favorite"}
                className="text-[#3f3f46] hover:text-[#fbbf24]"
              >
                <Star
                  className="size-3.5"
                  fill={favorite ? "currentColor" : "none"}
                  style={favorite ? { color: "#fbbf24" } : undefined}
                />
              </button>
            </div>
            <span className="mt-1 inline-block rounded bg-[#ffffff0a] px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-[#71717a] uppercase">
              {app.environment}
            </span>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {latest ? (
          <div className="mt-4 space-y-1 text-xs text-[#71717a]">
            <div className="flex items-center gap-1.5 font-mono">
              <GitCommitHorizontal className="size-3.5" />
              <span>{latest.branch ?? "unknown"}</span>
              <span className="text-[#3f3f46]">
                {latest.revision?.slice(0, 8) ?? "no revision"}
              </span>
              {duration ? <span className="ml-auto">{duration}</span> : null}
            </div>
            {latest.failureSummary ? (
              <p className="line-clamp-2 text-[#f87171]">
                {latest.failureSummary}
              </p>
            ) : null}
          </div>
        ) : null}

        {/* Last deployed */}
        <div className="mt-5">
          <p className="text-xs text-[#3f3f46]">Last deployed</p>
          <p className="mt-0.5 font-mono text-sm text-[#71717a]">
            {formatRelativeDeployTime(app.lastDeployedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-5 flex items-center justify-between gap-3">
          <DeployButton
            appId={app.id}
            status={app.status}
            appLabel={app.label}
            onStarted={(deployId) => {
              setPreferredDeployId(deployId);
              setLogsOpen(true);
            }}
          />
          <button
            type="button"
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
        appId={app.id}
        appLabel={app.label}
        status={app.status}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
        preferredDeployId={preferredDeployId}
        canRollback={app.canRollback}
      />
    </>
  );
}
