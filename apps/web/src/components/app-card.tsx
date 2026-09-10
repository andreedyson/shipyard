"use client";

import {
  AlertCircle,
  AlertTriangle,
  Clock3,
  ExternalLink,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Star,
  Terminal,
  User,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatDuration, formatRelativeDeployTime } from "@/lib/deploys";
import { cn } from "@/lib/utils";
import type { App, DeployStatus } from "@/types";

const lifecycleStages = [
  { key: "queued", label: "Queued" },
  { key: "running", label: "Deploying" },
  { key: "verifying", label: "Verifying" },
  { key: "success", label: "Live" },
] as const;

const activeStatuses = ["queued", "running", "verifying"];
const failedStatuses = ["failed", "timed_out", "interrupted", "cancelled"];

function stageIndex(status: DeployStatus) {
  if (status === "queued") return 0;
  if (status === "running") return 1;
  if (status === "verifying") return 2;
  return 3;
}

function DeploymentProgress({ status }: { status: DeployStatus }) {
  const isFailure = failedStatuses.includes(status);
  const currentIndex = stageIndex(status);

  return (
    <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3">
      <div className="flex items-center justify-between text-[10.5px] font-semibold text-sky-300 uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3 animate-spin text-sky-400" />
          Deployment in progress
        </span>
        <span className="font-mono text-zinc-400">
          Step {currentIndex + 1} of 4
        </span>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Deployment progress">
        {lifecycleStages.map((stage, index) => {
          const isDone = !isFailure && index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFailed = isFailure && isCurrent;

          return (
            <div key={stage.key} className="min-w-0">
              <div className="flex items-center">
                <span
                  className={cn(
                    "relative z-10 flex size-2.5 shrink-0 rounded-full",
                    isFailed
                      ? "bg-red-400 ring-2 ring-red-500/30"
                      : isCurrent
                        ? "bg-sky-400 ring-2 ring-sky-400/50 shadow-[0_0_6px_#38bdf8]"
                        : isDone
                          ? "bg-emerald-400 ring-2 ring-emerald-500/30"
                          : "bg-zinc-700",
                  )}
                />
                {index < lifecycleStages.length - 1 ? (
                  <span
                    className={cn(
                      "h-0.5 flex-1",
                      isDone
                        ? "bg-emerald-500/60"
                        : isCurrent
                          ? "bg-sky-500/40"
                          : "bg-zinc-800",
                    )}
                  />
                ) : null}
              </div>
              <p
                className={cn(
                  "mt-1.5 truncate font-mono text-[10px]",
                  isFailed
                    ? "font-semibold text-red-300"
                    : isCurrent
                      ? "font-semibold text-sky-300"
                      : isDone
                        ? "text-emerald-300/80"
                        : "text-zinc-600",
                )}
              >
                {isFailed ? "Failed" : stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function HealthSignal({ app }: { app: App }) {
  if (!app.healthCheckConfigured) {
    return null;
  }

  const status = app.status;
  const isHealthy = status === "success";
  const isChecking = status === "verifying";
  const isAttention = failedStatuses.includes(status);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] font-medium",
        isAttention
          ? "text-red-400"
          : isChecking
            ? "text-sky-400"
            : isHealthy
              ? "text-emerald-400"
              : "text-zinc-400",
      )}
    >
      {isAttention ? (
        <AlertTriangle className="size-3.5" />
      ) : isHealthy ? (
        <ShieldCheck className="size-3.5" />
      ) : (
        <HeartPulse className="size-3.5" />
      )}
      <span>{isAttention ? "Health check failed" : isHealthy ? "Healthy" : "Verifying health"}</span>
    </div>
  );
}

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
  const deploymentStatus = latest?.status ?? app.status;
  const isActive = activeStatuses.includes(app.status);
  const now = useCurrentTime(isActive);
  const heartbeatAge = latest?.heartbeatAt
    ? now - new Date(latest.heartbeatAt).getTime()
    : 0;
  const isStale = isActive && heartbeatAge > 90_000;

  const envColor =
    app.environment === "production"
      ? "bg-emerald-950/60 text-emerald-400 ring-emerald-500/20"
      : app.environment === "staging"
        ? "bg-sky-950/60 text-sky-400 ring-sky-500/20"
        : "bg-purple-950/60 text-purple-400 ring-purple-500/20";

  return (
    <>
      <motion.div
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c0d12]/90 p-5 shadow-lg shadow-black/40 backdrop-blur-md transition-all duration-200 hover:border-white/20 hover:shadow-2xl hover:shadow-black/60"
      >
        {/* Top Row: App Label, Star, Environment Tag & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-100 group-hover:text-white">
                {app.label}
              </h3>
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={favorite ? "Remove favorite" : "Add favorite"}
                className="text-zinc-500 transition-colors hover:text-amber-400 focus:outline-none"
              >
                <Star
                  className="size-3.5"
                  fill={favorite ? "currentColor" : "none"}
                  style={favorite ? { color: "#fbbf24" } : undefined}
                />
              </button>
            </div>
            <div className="mt-1.5 flex items-center gap-2">
              <span
                className={cn(
                  "inline-block rounded-md px-2 py-0.5 font-mono text-[9px] font-semibold tracking-wider uppercase ring-1",
                  envColor,
                )}
              >
                {app.environment}
              </span>
              <span className="font-mono text-[10px] text-zinc-500">
                {app.id}
              </span>
            </div>
          </div>
          <StatusBadge status={app.status} />
        </div>

        {/* Dynamic Deployment Status Section */}
        <div className="mt-4">
          {isActive ? (
            /* Active Progress Stepper when deploying */
            <DeploymentProgress status={deploymentStatus} />
          ) : (
            /* Clean Compact Deployment Summary Box when idle */
            <div className="rounded-xl border border-white/[0.06] bg-zinc-950/60 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 font-mono text-xs text-zinc-300">
                  <GitBranch className="size-3.5 text-sky-400 shrink-0" />
                  <span className="font-medium truncate max-w-[140px]">
                    {latest?.branch ?? "main"}
                  </span>
                  <span className="text-zinc-600">·</span>
                  <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400 ring-1 ring-white/10">
                    {latest?.revision?.slice(0, 7) ?? app.currentRevision?.slice(0, 7) ?? "no rev"}
                  </span>
                </div>
                <span className="font-mono text-[10px] text-zinc-500 uppercase">
                  {latest?.action ?? "Deploy"}
                </span>
              </div>

              {latest?.commitMessage ? (
                <p className="mt-2 line-clamp-1 text-xs text-zinc-400">
                  “{latest.commitMessage}”
                </p>
              ) : null}
            </div>
          )}
        </div>

        {/* Failure summary alert banner */}
        {latest?.failureSummary ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-950/30 p-2.5 text-xs text-red-300">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
            <p className="line-clamp-2 leading-relaxed text-red-200">
              {latest.failureSummary}
            </p>
          </div>
        ) : null}

        {/* 2x2 Metric Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-lg bg-zinc-900/40 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-zinc-500">Last deployed</p>
            <p className="mt-1 flex items-center gap-1.5 font-medium text-zinc-300">
              <Clock3 className="size-3 text-zinc-500" />
              <span>{formatRelativeDeployTime(app.lastDeployedAt)}</span>
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900/40 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-zinc-500">Duration</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono font-medium text-zinc-300">
              <Zap className="size-3 text-amber-500/80" />
              <span>
                {isActive && latest?.startedAt && now > 0
                  ? `${formatDuration(now - new Date(latest.startedAt).getTime())}`
                  : formatDuration(latest?.durationMs) || "—"}
              </span>
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900/40 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-zinc-500">Triggered by</p>
            <p className="mt-1 flex items-center gap-1.5 truncate font-medium text-zinc-300">
              <User className="size-3 text-zinc-500" />
              <span className="truncate">{latest?.requestedBy ?? "pin-user"}</span>
            </p>
          </div>

          <div className="rounded-lg bg-zinc-900/40 p-2.5 ring-1 ring-white/[0.04]">
            <p className="text-[10px] text-zinc-500">Live Revision</p>
            <p className="mt-1 flex items-center gap-1.5 font-mono font-medium text-zinc-300">
              <GitCommitHorizontal className="size-3 text-zinc-500" />
              <span className="truncate">
                {app.currentRevision?.slice(0, 7) ?? "latest"}
              </span>
            </p>
          </div>
        </div>

        {/* Health signal & Stale Warning Footer */}
        {(app.healthCheckConfigured || isStale) && (
          <div className="mt-3.5 flex items-center justify-between border-t border-white/[0.06] pt-2.5 text-[11px]">
            <HealthSignal app={app} />
            {isStale ? (
              <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400">
                <AlertTriangle className="size-3" />
                Heartbeat delayed
              </span>
            ) : null}
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="mt-5 flex items-center justify-between gap-2.5 pt-1">
          <DeployButton
            appId={app.id}
            status={app.status}
            appLabel={app.label}
            environment={app.environment}
            currentRevision={app.currentRevision}
            latestDeploy={latest}
            onStarted={(deployId) => {
              setPreferredDeployId(deployId);
              setLogsOpen(true);
            }}
          />
          <button
            type="button"
            onClick={() => setLogsOpen(true)}
            aria-label={`Open deployment details and logs for ${app.label}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3.5 py-1.5 text-xs font-medium text-zinc-300 shadow-sm transition-all duration-150 hover:bg-zinc-800 hover:text-white active:scale-[0.98] focus-visible:outline-none"
          >
            <Terminal className="size-3.5 text-zinc-400" />
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
        currentRevision={app.currentRevision}
      />
    </>
  );
}
