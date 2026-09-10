"use client";

import {
  AlertTriangle,
  Clock3,
  FileText,
  GitBranch,
  GitCommitHorizontal,
  HeartPulse,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatDuration, formatRelativeDeployTime } from "@/lib/deploys";
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

function DeploymentLifecycle({ status }: { status: DeployStatus }) {
  const isFailure = failedStatuses.includes(status);
  const currentIndex = stageIndex(status);

  return (
    <div
      className="mt-3 grid grid-cols-4 gap-1"
      aria-label="Deployment progress"
    >
      {lifecycleStages.map((stage, index) => {
        const completed = !isFailure && index < currentIndex;
        const current = index === currentIndex;
        const failed = isFailure && current;

        return (
          <div key={stage.key} className="min-w-0">
            <div className="flex items-center">
              <span
                className="relative z-10 flex size-2.5 shrink-0 rounded-full ring-4 ring-[#151515]"
                style={{
                  background: failed
                    ? "#f87171"
                    : completed || current
                      ? "#38bdf8"
                      : "#3f3f46",
                }}
              />
              {index < lifecycleStages.length - 1 ? (
                <span
                  className="h-px flex-1"
                  style={{
                    background:
                      !isFailure && index < currentIndex
                        ? "#38bdf880"
                        : "#ffffff12",
                  }}
                />
              ) : null}
            </div>
            <p
              className="mt-2 truncate text-[10px]"
              style={{
                color: failed
                  ? "#fca5a5"
                  : current || completed
                    ? "#d4d4d8"
                    : "#52525b",
              }}
            >
              {failed ? "Failed" : stage.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function HealthSignal({ app }: { app: App }) {
  if (!app.healthCheckConfigured) {
    return (
      <div className="flex items-center gap-1.5 text-[#52525b]">
        <HeartPulse className="size-3.5" />
        <span>Health check not configured</span>
      </div>
    );
  }

  const status = app.status;
  const isHealthy = status === "success";
  const isIdle = status === "idle";
  const isChecking = status === "verifying";
  const isAttention = failedStatuses.includes(status);
  const label = isAttention
    ? "Needs attention"
    : isChecking
      ? "Checking"
      : isHealthy
        ? "Healthy"
        : isIdle
          ? "Configured"
          : "Health check pending";

  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        color: isAttention
          ? "#f87171"
          : isChecking
            ? "#60a5fa"
            : isHealthy
              ? "#4ade80"
              : "#a1a1aa",
      }}
    >
      {isAttention ? (
        <AlertTriangle className="size-3.5" />
      ) : isHealthy ? (
        <ShieldCheck className="size-3.5" />
      ) : (
        <HeartPulse className="size-3.5" />
      )}
      <span>{label}</span>
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

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group flex flex-col rounded-xl p-5 transition-[border-color,box-shadow] duration-150 ease-out hover:[border-color:#ffffff30] hover:shadow-[0_10px_35px_rgba(0,0,0,0.18)]"
        style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-[15px] font-medium tracking-tight text-[#f4f4f5]">
                {app.label}
              </h3>
              <button
                type="button"
                onClick={onToggleFavorite}
                aria-label={favorite ? "Remove favorite" : "Add favorite"}
                className="text-[#3f3f46] transition-colors hover:text-[#fbbf24] focus-visible:text-[#fbbf24] focus-visible:outline-none"
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

        <div className="mt-4 rounded-lg border border-white/[0.07] bg-[#151515] px-3 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-medium tracking-wider text-[#71717a] uppercase">
              Latest deployment
            </p>
            {latest ? (
              <span className="font-mono text-[10px] text-[#52525b]">
                {latest.action === "rollback" ? "Rollback" : "Deploy"}
              </span>
            ) : null}
          </div>

          {latest ? (
            <>
              <DeploymentLifecycle status={deploymentStatus} />
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                <GitBranch className="size-3.5 shrink-0 text-[#60a5fa]" />
                <span className="truncate">
                  {latest.branch ?? "unknown branch"}
                </span>
                <span className="font-mono text-[#52525b]">
                  {latest.revision?.slice(0, 8) ?? "no revision"}
                </span>
              </div>
              {latest.commitMessage ? (
                <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-[#d4d4d8]">
                  “{latest.commitMessage}”
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-3 text-xs text-[#52525b]">
              No deployment has been recorded yet.
            </p>
          )}
        </div>

        {latest?.failureSummary ? (
          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/20 px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-red-300 uppercase">
              <AlertTriangle className="size-3" />
              Deployment needs attention
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-red-200/80">
              {latest.failureSummary}
            </p>
          </div>
        ) : null}

        <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-[11px]">
          <div>
            <p className="text-[#52525b]">Live revision</p>
            <p className="mt-1 flex items-center gap-1 font-mono text-[#a1a1aa]">
              <GitCommitHorizontal className="size-3 text-[#52525b]" />
              {app.currentRevision?.slice(0, 8) ?? "Not available"}
            </p>
          </div>
          <div>
            <p className="text-[#52525b]">Last deployed</p>
            <p className="mt-1 flex items-center gap-1 text-[#a1a1aa]">
              <Clock3 className="size-3 text-[#52525b]" />
              {formatRelativeDeployTime(app.lastDeployedAt)}
            </p>
          </div>
          <div>
            <p className="text-[#52525b]">Duration</p>
            <p className="mt-1 font-mono text-[#a1a1aa]">
              {isActive && latest?.startedAt && now > 0
                ? `${formatDuration(now - new Date(latest.startedAt).getTime())} elapsed`
                : formatDuration(latest?.durationMs)}
            </p>
          </div>
          <div>
            <p className="text-[#52525b]">Requested by</p>
            <p className="mt-1 flex items-center gap-1 truncate text-[#a1a1aa]">
              <User className="size-3 text-[#52525b]" />
              {latest?.requestedBy ?? "—"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3 text-[11px]">
          <HealthSignal app={app} />
          {isStale ? (
            <span className="flex items-center gap-1 text-amber-300">
              <AlertTriangle className="size-3" />
              No recent heartbeat
            </span>
          ) : null}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
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
            className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-[13px] font-medium text-[#a1a1aa] transition-colors hover:text-[#f4f4f5] focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none"
            style={{ border: "0.5px solid #ffffff15" }}
          >
            <FileText className="size-3.5" />
            Details
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
