"use client";

import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleSlash,
  Clock3,
  Copy,
  Download,
  GitBranch,
  GitCommitHorizontal,
  History,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Search,
  Square,
  Terminal,
  Timer,
  Undo2,
  User,
  WrapText,
  X,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnsiRenderer, stripAnsi } from "@/lib/ansi";
import { StatusBadge } from "@/components/status-badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { redirectToLogin } from "@/lib/auth";
import { useCurrentTime } from "@/hooks/use-current-time";
import {
  formatDeployTime,
  formatDuration,
  formatRelativeDeployTime,
} from "@/lib/deploys";
import { useDeployHistory } from "@/lib/hooks/use-deploy-history";
import { useCancelDeploy, useRollback } from "@/lib/hooks/use-deploy";
import {
  activeStatuses,
  failedStatuses,
  statusGroup,
  type StatusGroup,
} from "@/lib/status";
import { cn } from "@/lib/utils";
import type { DeployHistoryItem, DeployStatus } from "@/types";

type LogPanelProps = {
  appId: string;
  appLabel: string;
  status?: DeployStatus;
  open: boolean;
  onClose: () => void;
  preferredDeployId?: string | null;
  canRollback?: boolean;
  currentRevision?: string | null;
};

type LogLine = {
  id: number;
  raw: string;
  clean: string;
  kind: "normal" | "success" | "error" | "warning" | "stage";
};

type LevelFilter = "all" | "error" | "warning";

const statusVerb: Record<DeployStatus, string> = {
  idle: "idle",
  queued: "queued",
  running: "in progress",
  verifying: "verifying",
  success: "succeeded",
  failed: "failed",
  cancelled: "cancelled",
  timed_out: "timed out",
  interrupted: "interrupted",
};

const stageLabel: Record<DeployStatus, string> = {
  queued: "Queued",
  running: "Deploying",
  verifying: "Verifying health",
  success: "Live",
  failed: "Failed",
  cancelled: "Cancelled",
  timed_out: "Timed out",
  interrupted: "Interrupted",
  idle: "Idle",
};

function getLineKind(text: string): LogLine["kind"] {
  const lower = text.toLowerCase();

  if (
    lower.startsWith("stage:") ||
    lower.includes("=== stage") ||
    lower.startsWith("═══")
  ) {
    return "stage";
  }

  if (
    lower.includes("error") ||
    lower.includes("failed") ||
    lower.includes("err:") ||
    lower.includes("err!") ||
    lower.includes("fatal:") ||
    lower.includes("exit 1") ||
    lower.includes("exit 2") ||
    lower.includes("disconnected")
  ) {
    return "error";
  }

  if (lower.includes("warn") || lower.includes("warning")) {
    return "warning";
  }

  if (
    lower.includes("success") ||
    lower.includes("successfully") ||
    lower.includes("deployed successfully") ||
    text.includes("✓") ||
    text.includes("✔")
  ) {
    return "success";
  }

  return "normal";
}

function deployTitle(deploy: DeployHistoryItem) {
  const action = deploy.action === "rollback" ? "Rollback" : "Deploy";
  return `${action} ${statusVerb[deploy.status]}`;
}

function dayLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  const startOfDay = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round(
    (startOfDay(new Date()) - startOfDay(date)) / 86_400_000,
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return new Intl.DateTimeFormat("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(date);
}

function DeployStatusIcon({
  status,
  className,
}: {
  status: DeployStatus;
  className?: string;
}) {
  if (activeStatuses.includes(status)) {
    return (
      <Loader2 className={cn("animate-spin text-sky-400", className)} />
    );
  }
  if (status === "cancelled") {
    return <CircleSlash className={cn("text-zinc-500", className)} />;
  }
  if (failedStatuses.includes(status)) {
    return <XCircle className={cn("text-red-400", className)} />;
  }
  if (status === "success") {
    return <CheckCircle2 className={cn("text-emerald-400", className)} />;
  }
  return <Clock3 className={cn("text-zinc-500", className)} />;
}

function DeployHistoryButton({
  deploy,
  active,
  onSelect,
}: {
  deploy: DeployHistoryItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none",
        active
          ? "bg-white/[0.07] ring-1 ring-white/10"
          : "hover:bg-white/[0.035]",
      )}
    >
      <DeployStatusIcon
        status={deploy.status}
        className="mt-0.5 size-4 shrink-0"
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[13px] font-medium",
            active ? "text-white" : "text-zinc-300",
          )}
        >
          {deploy.commitMessage ?? deployTitle(deploy)}
        </p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-500">
          <span className="truncate">
            {formatRelativeDeployTime(deploy.createdAt)}
          </span>
          {deploy.durationMs != null ? (
            <>
              <span className="text-zinc-700">·</span>
              <span className="font-mono">
                {formatDuration(deploy.durationMs)}
              </span>
            </>
          ) : null}
          {deploy.revision ? (
            <span className="ml-auto shrink-0 font-mono text-[10.5px] text-zinc-600">
              {deploy.revision.slice(0, 7)}
            </span>
          ) : null}
        </p>
      </div>
    </button>
  );
}

function ToolbarIconButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none",
        pressed
          ? "bg-white/10 text-white"
          : "text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-100",
      )}
    >
      {children}
    </button>
  );
}

function StreamedDeployLogs({
  deployId,
  appLabel,
}: {
  deployId: string | null;
  appLabel: string;
}) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);
  const [exitStatus, setExitStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<LevelFilter>("all");
  // Wide tables (e.g. pm2 output) read best unwrapped; narrow screens need wrapping.
  const [wrapLines, setWrapLines] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 767px)").matches,
  );
  const [copied, setCopied] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(0);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const showStreaming = isStreaming && Boolean(baseUrl);

  // Follow new output unless the user has scrolled up to read.
  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport && !isUserScrolledUp) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [lines, exitStatus, isUserScrolledUp]);

  useEffect(() => {
    if (!deployId) {
      return;
    }

    sequenceRef.current = 0;

    const addLines = (rawText: string, explicitKind?: LogLine["kind"]) => {
      if (!rawText) return;
      const chunks = rawText.split(/\r?\n/);
      // Build outside the updater: StrictMode double-invokes updaters, which
      // would otherwise skip line numbers.
      const newItems: LogLine[] = [];
      for (const chunk of chunks) {
        if (chunk.length === 0 && chunks.length > 1) {
          // Keep empty line for spacing
          newItems.push({
            id: ++sequenceRef.current,
            raw: "",
            clean: "",
            kind: "normal",
          });
          continue;
        }
        const clean = stripAnsi(chunk);
        newItems.push({
          id: ++sequenceRef.current,
          raw: chunk,
          clean,
          kind: explicitKind ?? getLineKind(clean || chunk),
        });
      }
      setLines((current) => [...current, ...newItems]);
    };

    if (!baseUrl) {
      addLines("Missing NEXT_PUBLIC_API_URL configuration", "error");
      return;
    }

    const url = new URL(`/logs/${deployId}`, baseUrl);
    const eventSource = new EventSource(url.toString(), {
      withCredentials: true,
    });
    let finished = false;

    const finishStream = () => {
      if (finished) return;
      finished = true;
      setIsStreaming(false);
      eventSource.close();
    };

    const handleLog = (event: MessageEvent<string>) => {
      addLines(event.data);
    };

    const handleExit = (event: MessageEvent<string>) => {
      setExitStatus(event.data || "completed");
      finishStream();
    };

    eventSource.onmessage = handleLog;
    eventSource.addEventListener("log", handleLog);
    eventSource.addEventListener("exit", handleExit);
    eventSource.addEventListener("stage", (event: MessageEvent<string>) => {
      addLines(`Stage: ${event.data}`, "stage");
    });

    eventSource.onerror = () => {
      if (finished || eventSource.readyState === EventSource.CLOSED) {
        finishStream();
        return;
      }

      if (eventSource.readyState === EventSource.CLOSED) {
        redirectToLogin();
      }
      addLines("Log stream disconnected", "error");
      finishStream();
    };

    return () => {
      eventSource.close();
      setIsStreaming(false);
    };
  }, [baseUrl, deployId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    setIsUserScrolledUp(distanceToBottom > 80);
  };

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    scrollViewportRef.current?.scrollTo({
      top: scrollViewportRef.current.scrollHeight,
      behavior: "smooth",
    });
  };

  const filteredLines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return lines.filter((line) => {
      if (levelFilter !== "all" && line.kind !== levelFilter) return false;
      if (
        query &&
        !line.clean.toLowerCase().includes(query) &&
        !line.raw.toLowerCase().includes(query)
      ) {
        return false;
      }
      return true;
    });
  }, [lines, levelFilter, searchQuery]);

  const stats = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const l of lines) {
      if (l.kind === "error") errors++;
      if (l.kind === "warning") warnings++;
    }
    return { errors, warnings, total: lines.length };
  }, [lines]);

  const logText = () => lines.map((l) => l.clean || l.raw).join("\n");

  const handleCopyLogs = () => {
    void navigator.clipboard.writeText(logText()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadLogs = () => {
    const blob = new Blob([logText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipyard-${appLabel}-${deployId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!deployId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center">
        <div className="flex size-11 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-white/10">
          <Terminal className="size-5 text-zinc-500" />
        </div>
        <p className="mt-3 text-sm font-medium text-zinc-300">
          No deployment selected
        </p>
        <p className="mt-1 text-xs text-zinc-500">
          Pick a deployment from the history to view its logs.
        </p>
      </div>
    );
  }

  const levelOptions: { id: LevelFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.total },
    { id: "error", label: "Errors", count: stats.errors },
    { id: "warning", label: "Warnings", count: stats.warnings },
  ];

  const exitTone =
    exitStatus === "success"
      ? "bg-emerald-500/[0.08] text-emerald-300 ring-emerald-500/20"
      : exitStatus === "failed"
        ? "bg-red-500/[0.08] text-red-300 ring-red-500/20"
        : "bg-white/[0.03] text-zinc-300 ring-white/10";

  return (
    <div className="relative flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 py-2 sm:px-4">
        <div className="relative w-full sm:w-auto sm:min-w-44 sm:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              // Esc should clear the search, not close the sheet.
              if (e.key === "Escape" && searchQuery) {
                e.stopPropagation();
                setSearchQuery("");
              }
            }}
            aria-label="Search logs"
            placeholder="Search logs"
            className="h-8 w-full rounded-lg border border-white/[0.08] bg-zinc-900/70 pr-8 pl-8 text-xs text-zinc-200 transition outline-none placeholder:text-zinc-500 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/15"
          />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              aria-label="Clear log search"
              className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-zinc-500 hover:text-zinc-200"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </div>

        <div
          role="group"
          aria-label="Filter by log level"
          className="flex items-center rounded-lg bg-zinc-900/70 p-0.5 ring-1 ring-white/[0.06]"
        >
          {levelOptions.map((option) => {
            const selected = levelFilter === option.id;
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setLevelFilter(option.id)}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors",
                  selected
                    ? option.id === "error"
                      ? "bg-red-500/15 text-red-200"
                      : option.id === "warning"
                        ? "bg-amber-500/15 text-amber-200"
                        : "bg-white/10 text-white"
                    : "text-zinc-400 hover:text-zinc-100",
                )}
              >
                {option.label}
                <span
                  className={cn(
                    "font-mono text-[10px] tabular-nums",
                    selected ? "opacity-80" : "text-zinc-600",
                    !selected &&
                      option.count > 0 &&
                      option.id === "error" &&
                      "text-red-400",
                    !selected &&
                      option.count > 0 &&
                      option.id === "warning" &&
                      "text-amber-400",
                  )}
                >
                  {option.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <ToolbarIconButton
            label={wrapLines ? "Disable line wrap" : "Wrap long lines"}
            pressed={wrapLines}
            onClick={() => setWrapLines((v) => !v)}
          >
            <WrapText className="size-4" />
          </ToolbarIconButton>
          <ToolbarIconButton
            label={copied ? "Copied" : "Copy logs"}
            onClick={handleCopyLogs}
          >
            {copied ? (
              <Check className="size-4 text-emerald-400" />
            ) : (
              <Copy className="size-4" />
            )}
          </ToolbarIconButton>
          <ToolbarIconButton label="Download .log" onClick={handleDownloadLogs}>
            <Download className="size-4" />
          </ToolbarIconButton>
        </div>
      </div>

      {/* Log output */}
      <div
        ref={scrollViewportRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 overflow-auto bg-[#060709] font-mono text-[12px] leading-[1.65] text-zinc-300 selection:bg-sky-500/30 selection:text-white"
      >
        {lines.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center px-6 py-16 text-center">
            {showStreaming ? (
              <Loader2 className="size-5 animate-spin text-sky-400" />
            ) : (
              <Terminal className="size-5 text-zinc-600" />
            )}
            <p className="mt-3 font-sans text-xs text-zinc-400">
              {showStreaming ? "Waiting for output…" : "No output recorded."}
            </p>
          </div>
        ) : filteredLines.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-16 text-center font-sans">
            <p className="text-xs text-zinc-400">
              No lines match the current filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setLevelFilter("all");
              }}
              className="mt-3 rounded-md px-2.5 py-1 text-xs text-sky-300 ring-1 ring-sky-500/30 hover:bg-sky-500/10"
            >
              Show all lines
            </button>
          </div>
        ) : (
          <div className={cn("py-3", !wrapLines && "w-max min-w-full")}>
            {filteredLines.map((line) => {
              if (line.kind === "stage") {
                return (
                  <div
                    key={line.id}
                    className="my-2.5 flex items-center gap-2 px-3 sm:px-4"
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-sky-500/10 px-2 py-0.5 font-sans text-[10.5px] font-semibold tracking-wider text-sky-300 uppercase ring-1 ring-sky-500/20">
                      <Layers className="size-3" />
                      {line.clean || line.raw}
                    </span>
                    <span className="h-px flex-1 bg-white/[0.06]" />
                  </div>
                );
              }

              return (
                <div
                  key={line.id}
                  className={cn(
                    "group flex gap-3 px-3 hover:bg-white/[0.025] sm:px-4",
                    line.kind === "error" &&
                      "bg-red-500/[0.07] text-red-200 shadow-[inset_2px_0_0_rgba(248,113,113,0.7)]",
                    line.kind === "warning" &&
                      "bg-amber-500/[0.06] text-amber-200 shadow-[inset_2px_0_0_rgba(251,191,36,0.7)]",
                    line.kind === "success" && "text-emerald-300",
                  )}
                >
                  <span className="hidden w-8 shrink-0 text-right text-[11px] text-zinc-700 tabular-nums select-none group-hover:text-zinc-500 sm:block">
                    {line.id}
                  </span>
                  <div
                    className={cn(
                      "min-w-0 flex-1",
                      wrapLines
                        ? "break-words whitespace-pre-wrap"
                        : "whitespace-pre",
                    )}
                  >
                    {line.raw ? (
                      <AnsiRenderer text={line.raw} searchQuery={searchQuery} />
                    ) : (
                      " "
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showStreaming && lines.length > 0 ? (
          <div className="sticky left-0 flex items-center gap-2 px-3 pb-3 font-sans text-[11px] text-zinc-500 sm:px-4">
            <span className="inline-block h-3.5 w-1.5 animate-pulse rounded-[1px] bg-emerald-400" />
            Streaming output…
          </div>
        ) : null}

        {exitStatus ? (
          <div className="sticky left-0 px-3 pb-4 sm:px-4">
            <div
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-xs ring-1",
                exitTone,
              )}
            >
              {exitStatus === "success" ? (
                <CheckCircle2 className="size-4 shrink-0" />
              ) : exitStatus === "failed" ? (
                <XCircle className="size-4 shrink-0" />
              ) : (
                <CircleSlash className="size-4 shrink-0" />
              )}
              <span className="font-medium capitalize">
                Deployment {exitStatus.replaceAll("_", " ")}
              </span>
              <span className="text-zinc-500">· process exited</span>
            </div>
          </div>
        ) : null}
      </div>

      <AnimatePresence>
        {isUserScrolledUp ? (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={scrollToBottom}
            className="absolute right-4 bottom-4 z-20 flex items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-950 shadow-lg shadow-black/60 hover:bg-white"
          >
            <ArrowDown className="size-3.5" />
            Jump to latest
            {showStreaming ? (
              <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            ) : null}
          </motion.button>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MetaItem({
  icon: Icon,
  children,
  mono = false,
  title,
}: {
  icon: typeof Clock3;
  children: React.ReactNode;
  mono?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex min-w-0 items-center gap-1.5 text-zinc-400",
        mono && "font-mono text-[11px]",
      )}
    >
      <Icon className="size-3.5 shrink-0 text-zinc-500" />
      <span className="truncate">{children}</span>
    </span>
  );
}

function DeploymentOverview({
  deploy,
  currentRevision,
}: {
  deploy: DeployHistoryItem | null;
  currentRevision?: string | null;
}) {
  const isActive = deploy ? activeStatuses.includes(deploy.status) : false;
  const now = useCurrentTime(isActive);

  if (!deploy) {
    return null;
  }

  const isFailure = failedStatuses.includes(deploy.status);
  const duration =
    deploy.durationMs ??
    (isActive && deploy.startedAt && now > 0
      ? Math.max(0, now - new Date(deploy.startedAt).getTime())
      : null);

  return (
    <div className="border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <StatusBadge status={deploy.status} />
        <span className="text-sm font-medium text-zinc-100">
          {deploy.action === "rollback" ? "Rollback" : "Deploy"}
          <span className="text-zinc-500">
            {" "}
            · {stageLabel[deploy.stage ?? deploy.status]}
          </span>
        </span>
        {deploy.environment ? (
          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10.5px] text-zinc-400 capitalize ring-1 ring-white/[0.06]">
            {deploy.environment}
          </span>
        ) : null}
      </div>

      {deploy.commitMessage ? (
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-zinc-300">
          {deploy.commitMessage}
        </p>
      ) : null}

      <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <MetaItem icon={Clock3} title={formatDeployTime(deploy.createdAt)}>
          {formatRelativeDeployTime(deploy.createdAt)}
        </MetaItem>
        {duration != null ? (
          <MetaItem icon={Timer} mono>
            {formatDuration(duration)}
            {isActive ? " elapsed" : ""}
          </MetaItem>
        ) : null}
        {deploy.branch ? (
          <MetaItem icon={GitBranch} mono>
            {deploy.branch}
          </MetaItem>
        ) : null}
        {deploy.revision ? (
          <MetaItem icon={GitCommitHorizontal} mono>
            {deploy.revision.slice(0, 8)}
          </MetaItem>
        ) : null}
        <MetaItem icon={User}>{deploy.requestedBy}</MetaItem>
        {deploy.exitCode != null ? (
          <span
            className={cn(
              "rounded-md px-1.5 py-0.5 font-mono text-[10.5px] ring-1",
              deploy.exitCode === 0
                ? "bg-emerald-500/10 text-emerald-300 ring-emerald-500/20"
                : "bg-red-500/10 text-red-300 ring-red-500/20",
            )}
          >
            exit {deploy.exitCode}
          </span>
        ) : null}
      </div>

      {currentRevision && deploy.status === "success" ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-emerald-300/90">
          <CheckCircle2 className="size-3.5" />
          Live revision is{" "}
          <span className="font-mono">{currentRevision.slice(0, 8)}</span>
        </p>
      ) : null}
      {deploy.status === "verifying" ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-sky-300">
          <Clock3 className="size-3.5" />
          Health check is running; the deployment goes live when it passes.
        </p>
      ) : null}
      {isFailure && deploy.failureSummary ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2.5 text-xs">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
          <p className="leading-relaxed text-red-200/90">
            {deploy.failureSummary}
          </p>
        </div>
      ) : null}
    </div>
  );
}

const historyFilters: { id: "all" | StatusGroup; label: string }[] = [
  { id: "all", label: "All" },
  { id: "healthy", label: "Success" },
  { id: "failed", label: "Failed" },
  { id: "active", label: "Running" },
];

export function LogPanel({
  appId,
  appLabel,
  status,
  open,
  onClose,
  preferredDeployId,
  canRollback = false,
  currentRevision,
}: LogPanelProps) {
  const [manualSelectedDeployId, setManualSelectedDeployId] = useState<
    string | null
  >(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | StatusGroup>("all");
  const [isExpanded, setIsExpanded] = useState(false);
  // Mobile only: history replaces the log view instead of sitting beside it.
  const [historyOpen, setHistoryOpen] = useState(false);

  const history = useDeployHistory(appId, open);
  const cancelDeploy = useCancelDeploy();
  const rollback = useRollback();

  const filteredHistory = useMemo(() => {
    const needle = query.toLowerCase();
    return (history.data ?? []).filter((deploy) => {
      const matchesStatus =
        statusFilter === "all" || statusGroup(deploy.status) === statusFilter;
      const haystack =
        `${deploy.branch ?? ""} ${deploy.revision ?? ""} ${deploy.commitMessage ?? ""} ${deploy.id}`.toLowerCase();
      return matchesStatus && haystack.includes(needle);
    });
  }, [history.data, statusFilter, query]);

  const groupedHistory = useMemo(() => {
    const groups: { label: string; items: DeployHistoryItem[] }[] = [];
    for (const deploy of filteredHistory) {
      const label = dayLabel(deploy.createdAt);
      const last = groups.at(-1);
      if (last && last.label === label) last.items.push(deploy);
      else groups.push({ label, items: [deploy] });
    }
    return groups;
  }, [filteredHistory]);

  const selectedDeployId =
    manualSelectedDeployId &&
    history.data?.some((deploy) => deploy.id === manualSelectedDeployId)
      ? manualSelectedDeployId
      : (preferredDeployId ?? history.data?.[0]?.id ?? null);

  const selectedDeploy =
    history.data?.find((deploy) => deploy.id === selectedDeployId) ?? null;
  const selectedStatus = selectedDeploy?.status ?? status;
  const isSelectedActive = activeStatuses.includes(
    selectedStatus ?? "idle",
  );
  const totalDeploys = history.data?.length ?? 0;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        className={cn(
          "flex w-full flex-col gap-0 border-white/10 bg-[#08090c] p-0 transition-[max-width] duration-300 ease-in-out",
          "[&>button:last-child]:top-3.5 [&>button:last-child]:right-3 [&>button:last-child]:rounded-lg [&>button:last-child]:p-1.5 [&>button:last-child]:text-zinc-400 [&>button:last-child]:opacity-100 [&>button:last-child]:hover:bg-white/[0.06] [&>button:last-child]:hover:text-white",
          isExpanded
            ? "sm:max-w-[96vw] xl:max-w-[94vw]"
            : "sm:max-w-4xl lg:max-w-6xl",
        )}
      >
        {/* Header */}
        <SheetHeader className="h-14 shrink-0 flex-row items-center gap-3 space-y-0 border-b border-white/[0.06] px-4 py-0 pr-14 sm:px-5 sm:pr-14">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-800/80 ring-1 ring-white/10">
            <Terminal className="size-4 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1">
            <SheetTitle className="truncate text-[15px] leading-tight font-semibold tracking-tight text-white">
              {appLabel}
            </SheetTitle>
            <SheetDescription className="truncate text-xs text-zinc-500">
              Deployments &amp; logs
            </SheetDescription>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {isSelectedActive && selectedDeployId ? (
              <button
                type="button"
                disabled={cancelDeploy.isPending}
                aria-label="Cancel active deployment"
                title="Cancel deployment"
                onClick={() => {
                  if (
                    window.confirm(
                      "Cancel this deployment? The running process will be terminated.",
                    )
                  ) {
                    cancelDeploy.mutate(selectedDeployId);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/40 px-2.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-900/50 disabled:opacity-50"
              >
                <Square className="size-3 fill-current" />
                <span className="hidden sm:inline">Cancel</span>
              </button>
            ) : null}

            {canRollback && !isSelectedActive ? (
              <button
                type="button"
                disabled={rollback.isPending}
                aria-label="Rollback to previous successful revision"
                title="Rollback to previous revision"
                onClick={() => {
                  if (
                    window.confirm(
                      "Roll back to revision " +
                        (
                          selectedDeploy?.previousRevision ??
                          "previous successful revision"
                        ).slice(0, 8) +
                        (currentRevision
                          ? " from " + currentRevision.slice(0, 8)
                          : "") +
                        "? The current live revision may be replaced.",
                    )
                  ) {
                    rollback.mutate(appId);
                  }
                }}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-amber-500/30 hover:bg-amber-950/30 hover:text-amber-200 disabled:opacity-50"
              >
                <Undo2 className="size-3.5" />
                <span className="hidden sm:inline">Rollback</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              aria-pressed={historyOpen}
              aria-label={
                historyOpen ? "Back to logs" : "Show deployment history"
              }
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-800 md:hidden"
            >
              {historyOpen ? (
                <>
                  <ArrowLeft className="size-3.5" />
                  Logs
                </>
              ) : (
                <>
                  <History className="size-3.5" />
                  {totalDeploys > 0 ? totalDeploys : "History"}
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded((v) => !v)}
              aria-label={isExpanded ? "Collapse panel" : "Expand panel"}
              title={isExpanded ? "Collapse width" : "Expand width"}
              className="hidden size-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-white md:flex"
            >
              {isExpanded ? (
                <Minimize2 className="size-4" />
              ) : (
                <Maximize2 className="size-4" />
              )}
            </button>
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex min-h-0 flex-1">
          {/* History */}
          <aside
            className={cn(
              "min-h-0 w-full flex-col bg-[#0a0b0f] md:flex md:w-72 md:shrink-0 md:border-r md:border-white/[0.06]",
              historyOpen ? "flex" : "hidden",
            )}
            aria-label="Deployment history"
          >
            <div className="space-y-2 border-b border-white/[0.06] p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search deployments"
                  placeholder="Search deployments"
                  className="h-8 w-full rounded-lg border border-white/[0.08] bg-zinc-900/70 pr-7 pl-8 text-xs text-zinc-200 transition outline-none placeholder:text-zinc-500 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/15"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear deployment search"
                    className="absolute top-1/2 right-1.5 flex size-5 -translate-y-1/2 items-center justify-center rounded text-zinc-500 hover:text-zinc-200"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <div
                role="group"
                aria-label="Filter deployments by status"
                className="flex gap-1"
              >
                {historyFilters.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={statusFilter === filter.id}
                    onClick={() => setStatusFilter(filter.id)}
                    className={cn(
                      "h-7 flex-1 rounded-md text-[11px] font-medium transition-colors",
                      statusFilter === filter.id
                        ? "bg-white/10 text-white"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200",
                    )}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {history.isLoading ? (
                <div className="space-y-1.5 p-1">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-12 animate-pulse rounded-lg bg-zinc-900/60"
                    />
                  ))}
                </div>
              ) : null}

              {history.isError ? (
                <div className="m-1 flex items-center gap-2 rounded-lg bg-red-950/40 p-3 text-xs text-red-300 ring-1 ring-red-500/20">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  Failed to load deploy history.
                </div>
              ) : null}

              {!history.isLoading &&
              !history.isError &&
              filteredHistory.length === 0 ? (
                <p className="py-10 text-center text-xs text-zinc-500">
                  {totalDeploys === 0
                    ? "No deployments yet."
                    : "No deployments match your filters."}
                </p>
              ) : null}

              {groupedHistory.map((group) => (
                <div key={group.label} className="mb-2">
                  <p className="sticky top-0 z-10 bg-[#0a0b0f]/95 px-2.5 pt-2 pb-1.5 text-[10.5px] font-medium tracking-wider text-zinc-500 uppercase backdrop-blur">
                    {group.label}
                  </p>
                  <div className="space-y-0.5">
                    {group.items.map((deploy) => (
                      <DeployHistoryButton
                        key={deploy.id}
                        deploy={deploy}
                        active={deploy.id === selectedDeployId}
                        onSelect={() => {
                          setManualSelectedDeployId(deploy.id);
                          setHistoryOpen(false);
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>

          {/* Selected deployment */}
          <section
            className={cn(
              "min-h-0 min-w-0 flex-1 flex-col",
              historyOpen ? "hidden md:flex" : "flex",
            )}
            aria-label="Deployment logs"
          >
            <DeploymentOverview
              deploy={selectedDeploy}
              currentRevision={currentRevision}
            />
            <div className="min-h-0 flex-1">
              <StreamedDeployLogs
                key={selectedDeployId ?? "empty"}
                deployId={selectedDeployId}
                appLabel={appLabel}
              />
            </div>
          </section>
        </div>

      </SheetContent>
    </Sheet>
  );
}
