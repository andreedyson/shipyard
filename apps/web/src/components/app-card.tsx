"use client";

import {
  AlertCircle,
  AlertTriangle,
  Clock3,
  Code2,
  GitBranch,
  GitCommitHorizontal,
  HeartPulse,
  Loader2,
  ShieldCheck,
  Star,
  Terminal,
  Timer,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState, type ReactNode } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { ScriptEditor } from "@/components/script-editor";
import { StatusBadge } from "@/components/status-badge";
import { useCurrentTime } from "@/hooks/use-current-time";
import { useGetInitials } from "@/hooks/use-get-initials";
import { formatDuration, formatRelativeDeployTime } from "@/lib/deploys";
import { failedStatuses, statusGroup } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { App, DeployStatus } from "@/types";

const lifecycleStages = [
  { key: "queued", label: "Queued" },
  { key: "running", label: "Deploying" },
  { key: "verifying", label: "Verifying" },
  { key: "success", label: "Live" },
] as const;

const cardTones = {
  idle: {
    line: "from-white/20",
    monogram: "bg-zinc-800/80 text-zinc-200 ring-white/10",
  },
  healthy: {
    line: "from-emerald-400/70",
    monogram: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  },
  active: {
    line: "from-sky-400/80",
    monogram: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  },
  failed: {
    line: "from-red-400/80",
    monogram: "bg-red-500/10 text-red-300 ring-red-500/25",
  },
};

const environmentStyles: Record<App["environment"], string> = {
  production: "bg-emerald-500/10 text-emerald-300 ring-emerald-500/25",
  staging: "bg-sky-500/10 text-sky-300 ring-sky-500/25",
  preview: "bg-violet-500/10 text-violet-300 ring-violet-500/25",
  development: "bg-amber-500/10 text-amber-300 ring-amber-500/25",
};

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
      <div className="flex items-center justify-between text-[11px] font-medium text-sky-300">
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin text-sky-400" />
          Deployment in progress
        </span>
        <span className="font-mono text-[10.5px] text-zinc-400">
          {currentIndex + 1}/4
        </span>
      </div>

      <div
        className="mt-3 grid grid-cols-4 gap-1.5"
        aria-label="Deployment progress"
      >
        {lifecycleStages.map((stage, index) => {
          const isDone = !isFailure && index < currentIndex;
          const isCurrent = index === currentIndex;
          const isFailed = isFailure && isCurrent;

          return (
            <div key={stage.key} className="min-w-0">
              <span
                className={cn(
                  "block h-1 rounded-full",
                  isFailed
                    ? "bg-red-400"
                    : isCurrent
                      ? "animate-pulse bg-sky-400"
                      : isDone
                        ? "bg-emerald-400/80"
                        : "bg-zinc-800",
                )}
              />
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

function HealthSignal({ status }: { status: DeployStatus }) {
  const isHealthy = status === "success";
  const isChecking = status === "verifying";
  const isAttention = failedStatuses.includes(status);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1",
        isAttention
          ? "bg-red-500/10 text-red-300 ring-red-500/20"
          : isChecking
            ? "bg-sky-500/10 text-sky-300 ring-sky-500/20"
            : isHealthy
              ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
              : "bg-white/[0.03] text-zinc-400 ring-white/10",
      )}
    >
      {isAttention ? (
        <AlertTriangle className="size-3" />
      ) : isHealthy ? (
        <ShieldCheck className="size-3" />
      ) : (
        <HeartPulse className="size-3" />
      )}
      {isAttention
        ? "Health check failed"
        : isHealthy
          ? "Healthy"
          : isChecking
            ? "Verifying health"
            : "Health check enabled"}
    </span>
  );
}

function MetaItem({
  icon: Icon,
  label,
  mono = false,
  children,
}: {
  icon: typeof Clock3;
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1.5 text-[11px] text-zinc-500">
        <Icon className="size-3 shrink-0" />
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate font-medium text-zinc-200",
          mono ? "font-mono text-xs" : "text-[13px]",
        )}
      >
        {children}
      </dd>
    </div>
  );
}

const secondaryAction =
  "inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-zinc-900/80 px-3 text-xs font-medium text-zinc-300 transition-all duration-150 hover:border-white/20 hover:bg-zinc-800 hover:text-white focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none active:scale-[0.98]";

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
  const [scriptEditorOpen, setScriptEditorOpen] = useState(false);
  const [preferredDeployId, setPreferredDeployId] = useState<string | null>(
    null,
  );
  const initials = useGetInitials(app.label);
  const editableScripts = app.editableScripts ?? [];
  const latest = app.latestDeploy;
  const deploymentStatus = latest?.status ?? app.status;
  const group = statusGroup(app.status);
  const isActive = group === "active";
  const tone = cardTones[app.status === "idle" ? "idle" : group];
  const now = useCurrentTime(isActive);
  const heartbeatAge = latest?.heartbeatAt
    ? now - new Date(latest.heartbeatAt).getTime()
    : 0;
  const isStale = isActive && heartbeatAge > 90_000;
  const revision =
    latest?.revision?.slice(0, 7) ?? app.currentRevision?.slice(0, 7);

  return (
    <>
      <motion.article
        whileHover={{ y: -2 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-zinc-900/70 to-zinc-950/80 shadow-lg shadow-black/30 backdrop-blur-md transition-[border-color,box-shadow] duration-200 hover:border-white/15 hover:shadow-xl hover:shadow-black/50"
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-x-0 top-0 h-px bg-gradient-to-r via-transparent to-transparent",
            tone.line,
          )}
        />

        <div className="flex flex-1 flex-col p-4 sm:p-5">
          {/* Identity */}
          <div className="flex items-start gap-3">
            <div
              aria-hidden
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-semibold ring-1",
                tone.monogram,
              )}
            >
              {initials || "?"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <h3 className="truncate text-[15px] font-semibold tracking-tight text-zinc-100">
                  {app.label}
                </h3>
                <button
                  type="button"
                  onClick={onToggleFavorite}
                  aria-label={favorite ? "Remove favorite" : "Add favorite"}
                  aria-pressed={favorite}
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-400/40 focus-visible:outline-none",
                    favorite
                      ? "text-amber-400"
                      : "text-zinc-600 hover:text-amber-400",
                  )}
                >
                  <Star
                    className="size-3.5"
                    fill={favorite ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium capitalize ring-1",
                    environmentStyles[app.environment] ??
                      environmentStyles.development,
                  )}
                >
                  {app.environment}
                </span>
                <span className="truncate font-mono text-[11px] text-zinc-500">
                  {app.id}
                </span>
              </div>
            </div>
            <StatusBadge status={app.status} />
          </div>

          {/* Current deployment */}
          <div className="mt-4">
            {isActive ? (
              <DeploymentProgress status={deploymentStatus} />
            ) : (
              <div className="rounded-xl bg-black/30 px-3 py-2.5 ring-1 ring-white/[0.05]">
                <div className="flex min-w-0 items-center gap-2 font-mono text-xs text-zinc-300">
                  <GitBranch className="size-3.5 shrink-0 text-sky-400" />
                  <span className="truncate font-medium">
                    {latest?.branch ?? "main"}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-md px-1.5 py-0.5 text-[10.5px] ring-1",
                      revision
                        ? "bg-zinc-900 text-zinc-300 ring-white/10"
                        : "text-zinc-600 ring-white/[0.06]",
                    )}
                  >
                    {revision ?? "no rev"}
                  </span>
                  <span className="ml-auto shrink-0 text-[10px] tracking-wider text-zinc-500 uppercase">
                    {latest?.action ?? "deploy"}
                  </span>
                </div>
                <p
                  className={cn(
                    "mt-1.5 truncate text-xs",
                    latest?.commitMessage ? "text-zinc-400" : "text-zinc-600",
                  )}
                >
                  {latest?.commitMessage ??
                    (latest ? "No commit message" : "No deployments yet")}
                </p>
              </div>
            )}
          </div>

          {latest?.failureSummary ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-500/25 bg-red-950/30 p-2.5 text-xs">
              <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
              <p className="line-clamp-2 leading-relaxed text-red-200">
                {latest.failureSummary}
              </p>
            </div>
          ) : null}

          {/* Details */}
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
            <MetaItem icon={Clock3} label="Last deployed">
              {formatRelativeDeployTime(app.lastDeployedAt)}
            </MetaItem>
            <MetaItem icon={Timer} label="Duration" mono>
              {isActive && latest?.startedAt && now > 0
                ? formatDuration(now - new Date(latest.startedAt).getTime())
                : formatDuration(latest?.durationMs)}
            </MetaItem>
            <MetaItem icon={User} label="Triggered by">
              {latest?.requestedBy ?? "—"}
            </MetaItem>
            <MetaItem icon={GitCommitHorizontal} label="Live revision" mono>
              {app.currentRevision?.slice(0, 7) ?? "latest"}
            </MetaItem>
          </dl>

          {app.healthCheckConfigured || isStale ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {app.healthCheckConfigured ? (
                <HealthSignal status={app.status} />
              ) : null}
              {isStale ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300 ring-1 ring-amber-500/20">
                  <AlertTriangle className="size-3" />
                  Heartbeat delayed
                </span>
              ) : null}
            </div>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 border-t border-white/[0.06] bg-black/20 px-4 py-3 sm:px-5">
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
          <div className="ml-auto flex items-center gap-1.5">
            {editableScripts.length > 0 ? (
              <button
                type="button"
                onClick={() => setScriptEditorOpen(true)}
                aria-label={`Edit deployment script for ${app.label}`}
                className={secondaryAction}
              >
                <Code2 className="size-3.5 text-sky-400" />
                Script
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setLogsOpen(true)}
              aria-label={`Open deployment details and logs for ${app.label}`}
              className={secondaryAction}
            >
              <Terminal className="size-3.5 text-zinc-400" />
              Logs
            </button>
          </div>
        </div>
      </motion.article>

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
      <ScriptEditor
        appId={app.id}
        appLabel={app.label}
        editableScripts={editableScripts}
        open={scriptEditorOpen}
        onOpenChange={setScriptEditorOpen}
      />
    </>
  );
}
