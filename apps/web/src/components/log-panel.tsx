"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  Download,
  GitBranch,
  GitCommitHorizontal,
  Layers,
  Maximize2,
  Minimize2,
  Search,
  Square,
  Terminal,
  Trash2,
  Undo2,
  User,
  WrapText,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

import { AnsiRenderer, stripAnsi } from "@/lib/ansi";
import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { redirectToLogin } from "@/lib/auth";
import { useCurrentTime } from "@/hooks/use-current-time";
import { formatDeployTime, formatRelativeDeployTime } from "@/lib/deploys";
import { useDeployHistory } from "@/lib/hooks/use-deploy-history";
import { useCancelDeploy, useRollback } from "@/lib/hooks/use-deploy";
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
  kind: "normal" | "success" | "error" | "warning" | "stage" | "separator";
  timestamp?: string;
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

function DeployHistoryButton({
  deploy,
  active,
  onSelect,
}: {
  deploy: DeployHistoryItem;
  active: boolean;
  onSelect: () => void;
}) {
  const isFailed = ["failed", "timed_out", "interrupted"].includes(
    deploy.status,
  );
  const isRunning = ["running", "queued", "verifying"].includes(deploy.status);
  const isSuccess = deploy.status === "success";

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative w-full rounded-xl px-3.5 py-3 text-left transition-all duration-150",
        active
          ? "bg-zinc-800/80 shadow-[0_0_20px_rgba(0,0,0,0.5)] ring-1 ring-white/20"
          : "bg-zinc-900/40 hover:bg-zinc-800/40 hover:ring-1 hover:ring-white/10",
      )}
      style={{
        borderLeft: active
          ? isSuccess
            ? "3px solid #34d399"
            : isFailed
              ? "3px solid #f87171"
              : isRunning
                ? "3px solid #38bdf8"
                : "3px solid #a1a1aa"
          : "3px solid transparent",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-mono text-[11px] font-medium text-zinc-200">
            <span className="truncate">{deploy.id}</span>
          </div>

          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
            <Clock3 className="size-3 text-zinc-500" />
            <span>{formatRelativeDeployTime(deploy.createdAt)}</span>
            {deploy.durationMs != null && (
              <>
                <span className="text-zinc-600">·</span>
                <span className="font-mono text-[10px] text-zinc-400">
                  {(deploy.durationMs / 1000).toFixed(1)}s
                </span>
              </>
            )}
          </div>

          <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] text-zinc-400">
            <span className="inline-flex items-center gap-1 truncate rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-300">
              <GitBranch className="size-2.5 text-zinc-400" />
              {deploy.branch ?? "unknown"}
            </span>
            <span className="text-zinc-500">
              {deploy.revision?.slice(0, 7) ?? "no rev"}
            </span>
          </div>

          {deploy.commitMessage && (
            <p className="mt-1.5 line-clamp-1 text-[11px] text-zinc-400">
              {deploy.commitMessage}
            </p>
          )}
        </div>

        <StatusBadge status={deploy.status} />
      </div>
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
  const [autoScroll, setAutoScroll] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<
    "all" | "error" | "warning" | "info"
  >("all");
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [wrapLines, setWrapLines] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isUserScrolledUp, setIsUserScrolledUp] = useState(false);

  const scrollViewportRef = useRef<HTMLDivElement>(null);
  const bottomAnchorRef = useRef<HTMLDivElement>(null);
  const sequenceRef = useRef(0);
  const baseUrl = process.env.NEXT_PUBLIC_API_URL;
  const showStreaming = isStreaming && Boolean(baseUrl);

  // Auto-scroll handler
  useEffect(() => {
    if (autoScroll && !isUserScrolledUp) {
      bottomAnchorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }
  }, [lines, autoScroll, isUserScrolledUp]);

  // Connect to SSE stream
  useEffect(() => {
    if (!deployId) {
      return;
    }

    sequenceRef.current = 0;

    const addLines = (
      rawText: string,
      explicitKind?: LogLine["kind"],
      isStage = false,
    ) => {
      if (!rawText) return;
      const chunks = rawText.split(/\r?\n/);

      setLines((current) => {
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
          const kind =
            explicitKind ?? (isStage ? "stage" : getLineKind(clean || chunk));
          newItems.push({
            id: ++sequenceRef.current,
            raw: chunk,
            clean,
            kind,
          });
        }
        return [...current, ...newItems];
      });
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

    const finishStream = (exitMsg?: string) => {
      if (finished) return;
      finished = true;
      setIsStreaming(false);
      if (exitMsg) {
        addLines(`\n─── ${exitMsg} ───`, "separator");
      }
      eventSource.close();
    };

    const handleLog = (event: MessageEvent<string>) => {
      addLines(event.data);
    };

    const handleExit = (event: MessageEvent<string>) => {
      const exitStatus = event.data || "completed";
      const kind =
        exitStatus === "success"
          ? "success"
          : exitStatus === "failed"
            ? "error"
            : "normal";
      addLines(`Deployment ${exitStatus}`, kind);
      finishStream(`Process exited with status: ${exitStatus}`);
    };

    eventSource.onmessage = handleLog;
    eventSource.addEventListener("log", handleLog);
    eventSource.addEventListener("exit", handleExit);
    eventSource.addEventListener("stage", (event: MessageEvent<string>) => {
      addLines(`STAGE: ${event.data.toUpperCase()}`, "stage", true);
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

  // Track scroll position to know if user scrolled away from bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    setIsUserScrolledUp(distanceToBottom > 80);
  };

  const scrollToBottom = () => {
    setIsUserScrolledUp(false);
    bottomAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  // Filter lines
  const filteredLines = useMemo(() => {
    return lines.filter((line) => {
      // Level filter
      if (levelFilter === "error" && line.kind !== "error") return false;
      if (levelFilter === "warning" && line.kind !== "warning") return false;
      if (levelFilter === "info" && ["error", "warning"].includes(line.kind)) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesClean = line.clean.toLowerCase().includes(query);
        const matchesRaw = line.raw.toLowerCase().includes(query);
        if (!matchesClean && !matchesRaw) return false;
      }

      return true;
    });
  }, [lines, levelFilter, searchQuery]);

  // Counts
  const stats = useMemo(() => {
    let errors = 0;
    let warnings = 0;
    for (const l of lines) {
      if (l.kind === "error") errors++;
      if (l.kind === "warning") warnings++;
    }
    return { errors, warnings, total: lines.length };
  }, [lines]);

  const handleCopyLogs = () => {
    const textToCopy = lines
      .filter((l) => l.kind !== "separator")
      .map((l) => l.clean || l.raw)
      .join("\n");

    void navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleDownloadLogs = () => {
    const textToDownload = lines.map((l) => l.clean || l.raw).join("\n");
    const blob = new Blob([textToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shipyard-${appLabel}-${deployId}.log`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearView = () => {
    setLines([]);
  };

  if (!deployId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center text-zinc-500">
        <Terminal className="mb-3 size-10 opacity-30" />
        <p className="text-sm font-medium text-zinc-400">
          No deployment selected
        </p>
        <p className="mt-1 text-xs text-zinc-600">
          Select a deployment from the history panel to view live logs.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-[#07080b]">
      {/* Terminal Titlebar Chrome */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-[#0c0d12]/95 px-4 py-2.5 backdrop-blur-md">
        {/* Left: macOS dots + Breadcrumbs */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-full bg-rose-500/80 shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
            <span className="size-2.5 rounded-full bg-amber-500/80 shadow-[0_0_6px_rgba(245,158,11,0.4)]" />
            <span className="size-2.5 rounded-full bg-emerald-500/80 shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <Terminal className="size-3.5 text-zinc-500" />
            <span className="text-zinc-500">console</span>
            <ChevronRight className="size-3 text-zinc-600" />
            <span className="font-semibold text-zinc-200">{appLabel}</span>
            <ChevronRight className="size-3 text-zinc-600" />
            <span className="text-sky-400/90">{deployId.slice(0, 10)}</span>
          </div>
        </div>

        {/* Right: Live Stream status */}
        <div className="flex items-center gap-2">
          {showStreaming ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-950/80 px-2.5 py-0.5 text-[10px] font-semibold tracking-wider text-emerald-400 uppercase ring-1 ring-emerald-500/30">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
              </span>
              Streaming
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-[10px] font-medium text-zinc-400 ring-1 ring-white/10">
              <CheckCircle2 className="size-3 text-zinc-400" />
              Finished
            </span>
          )}
        </div>
      </div>

      {/* Terminal Toolbar: Search, Filters & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-[#090a0f] px-4 py-2 text-xs">
        {/* Search & Level Filters */}
        <div className="flex min-w-[240px] flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative max-w-xs min-w-[180px] flex-1">
            <Search className="absolute top-2 left-2.5 size-3.5 text-zinc-500" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in logs..."
              className="h-7.5 w-full rounded-md border border-white/10 bg-zinc-900/90 pr-7 pl-8 font-mono text-[11px] text-zinc-200 placeholder:text-zinc-600 focus:border-sky-500/60 focus:ring-1 focus:ring-sky-500/40 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear log search"
                className="absolute top-2 right-2 text-zinc-500 hover:text-zinc-300"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {/* Level Filter Tabs */}
          <div className="flex items-center rounded-md bg-zinc-900/80 p-0.5 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => setLevelFilter("all")}
              className={cn(
                "rounded px-2 py-1 text-[10px] font-medium transition-colors",
                levelFilter === "all"
                  ? "bg-zinc-800 text-zinc-200 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              All ({stats.total})
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter("error")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                levelFilter === "error"
                  ? "bg-red-950/80 text-red-300 ring-1 ring-red-500/30"
                  : "text-zinc-400 hover:text-red-400",
              )}
            >
              <AlertCircle className="size-2.5" />
              Errors ({stats.errors})
            </button>
            <button
              type="button"
              onClick={() => setLevelFilter("warning")}
              className={cn(
                "flex items-center gap-1 rounded px-2 py-1 text-[10px] font-medium transition-colors",
                levelFilter === "warning"
                  ? "bg-amber-950/80 text-amber-300 ring-1 ring-amber-500/30"
                  : "text-zinc-400 hover:text-amber-400",
              )}
            >
              <AlertTriangle className="size-2.5" />
              Warn ({stats.warnings})
            </button>
          </div>
        </div>

        {/* View Options & Action Buttons */}
        <div className="flex items-center gap-1">
          {/* Line Numbers Toggle */}
          <button
            type="button"
            onClick={() => setShowLineNumbers((v) => !v)}
            aria-pressed={showLineNumbers}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              showLineNumbers
                ? "bg-zinc-800 text-zinc-200 ring-1 ring-white/15"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
            )}
            title="Toggle line numbers"
          >
            <span className="font-mono text-[10px]">#</span>
            <span className="hidden text-[10px] sm:inline">Lines</span>
          </button>

          {/* Wrap Lines Toggle */}
          <button
            type="button"
            onClick={() => setWrapLines((v) => !v)}
            aria-pressed={wrapLines}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
              wrapLines
                ? "bg-zinc-800 text-zinc-200 ring-1 ring-white/15"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
            )}
            title="Toggle word wrap"
          >
            <WrapText className="size-3" />
            <span className="hidden text-[10px] sm:inline">Wrap</span>
          </button>

          {/* Auto-scroll Toggle */}
          <button
            type="button"
            onClick={() => setAutoScroll((v) => !v)}
            aria-pressed={autoScroll}
            className={cn(
              "flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors",
              autoScroll
                ? "bg-sky-950/70 text-sky-300 ring-1 ring-sky-500/30"
                : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
            )}
            title="Auto-scroll to latest output"
          >
            <ArrowDown className="size-3" />
            <span className="hidden sm:inline">Scroll</span>
          </button>

          <div className="mx-1 h-3.5 w-px bg-white/10" />

          {/* Copy Logs */}
          <button
            type="button"
            onClick={handleCopyLogs}
            aria-label="Copy deployment logs"
            className="flex items-center gap-1 rounded-md bg-zinc-900/90 px-2 py-1 text-[10px] font-medium text-zinc-300 ring-1 ring-white/10 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Copy logs to clipboard"
          >
            {copied ? (
              <>
                <Check className="size-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="size-3" />
                <span className="hidden sm:inline">Copy</span>
              </>
            )}
          </button>

          {/* Download Logs */}
          <button
            type="button"
            onClick={handleDownloadLogs}
            aria-label="Download deployment logs"
            className="rounded-md bg-zinc-900/90 p-1 text-zinc-400 ring-1 ring-white/10 transition-colors hover:bg-zinc-800 hover:text-white"
            title="Download log file (.log)"
          >
            <Download className="size-3.5" />
          </button>

          {/* Clear View */}
          <button
            type="button"
            onClick={handleClearView}
            aria-label="Clear log view"
            className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-800/60 hover:text-zinc-300"
            title="Clear display"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Main Terminal Viewport */}
      <div
        ref={scrollViewportRef}
        onScroll={handleScroll}
        className={cn(
          "flex-1 overflow-auto font-mono text-[11.5px] leading-[1.65] text-zinc-300 selection:bg-sky-500/30 selection:text-white",
          !wrapLines && "whitespace-pre",
        )}
      >
        <div className="min-w-full p-3 sm:p-4">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-3 flex size-10 items-center justify-center rounded-xl bg-zinc-900/90 ring-1 ring-white/10">
                <Terminal className="size-5 text-sky-400" />
                {showStreaming && (
                  <span className="absolute -top-1 -right-1 flex size-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
                    <span className="relative inline-flex size-3 rounded-full bg-sky-500" />
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-zinc-300">
                {showStreaming
                  ? "Connecting to deployment log stream..."
                  : "Waiting for logs..."}
              </p>
              <p className="mt-1 font-mono text-[11px] text-zinc-600">
                shipyard@runner:~$ tail -f {deployId}.log
              </p>
            </div>
          ) : null}

          {filteredLines.map((line, idx) => {
            if (line.kind === "stage") {
              return (
                <div
                  key={line.id}
                  className="my-3 flex items-center gap-3 overflow-hidden rounded-lg bg-zinc-900/70 px-3 py-1.5 ring-1 ring-sky-500/20"
                >
                  <Layers className="size-3.5 shrink-0 text-sky-400" />
                  <span className="font-mono text-[11px] font-bold tracking-wider text-sky-300 uppercase">
                    {line.clean || line.raw}
                  </span>
                  <div className="h-px flex-1 bg-gradient-to-r from-sky-500/20 to-transparent" />
                </div>
              );
            }

            if (line.kind === "separator") {
              return (
                <div
                  key={line.id}
                  className="my-3 flex items-center gap-2 font-mono text-[10px] text-zinc-500"
                >
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="tracking-widest uppercase">{line.raw}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
              );
            }

            return (
              <div
                key={line.id}
                className={cn(
                  "group flex items-start rounded-xs transition-colors hover:bg-white/[0.03]",
                  line.kind === "error" &&
                    "border-l-2 border-red-500/80 bg-red-500/[0.08] pl-1 text-red-300",
                  line.kind === "warning" &&
                    "border-l-2 border-amber-500/80 bg-amber-500/[0.08] pl-1 text-amber-300",
                  line.kind === "success" && "text-emerald-300",
                )}
              >
                {/* Line number */}
                {showLineNumbers && (
                  <span className="mr-3 w-8 shrink-0 text-right font-mono text-[10.5px] text-zinc-600 select-none group-hover:text-zinc-400">
                    {idx + 1}
                  </span>
                )}

                {/* Line content */}
                <div
                  className={cn(
                    "min-w-0 flex-1",
                    wrapLines
                      ? "break-words whitespace-pre-wrap"
                      : "whitespace-pre",
                  )}
                >
                  <AnsiRenderer text={line.raw} searchQuery={searchQuery} />
                </div>
              </div>
            );
          })}

          {/* Active Blinking Cursor while streaming */}
          {showStreaming && (
            <div className="mt-2 flex items-center gap-2 text-zinc-500">
              {showLineNumbers && (
                <span className="w-8 text-right font-mono text-[10.5px] text-zinc-700 select-none">
                  {filteredLines.length + 1}
                </span>
              )}
              <span className="inline-block h-4 w-2 animate-pulse bg-emerald-400 align-middle shadow-[0_0_8px_#34d399]" />
              <span className="font-mono text-[11px] text-zinc-600">
                executing...
              </span>
            </div>
          )}

          <div ref={bottomAnchorRef} className="h-4" />
        </div>
      </div>

      {/* Floating Jump to Bottom Button */}
      <AnimatePresence>
        {isUserScrolledUp && (
          <motion.button
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            onClick={scrollToBottom}
            className="absolute right-6 bottom-4 z-20 flex items-center gap-1.5 rounded-full bg-sky-600 px-3 py-1.5 font-mono text-[11px] font-medium text-white shadow-lg ring-1 shadow-sky-950/80 ring-sky-400/40 hover:bg-sky-500"
          >
            <ArrowDown className="size-3.5" />
            <span>Jump to latest</span>
            {showStreaming && (
              <span className="size-1.5 animate-ping rounded-full bg-white" />
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeploymentOverview({
  deploy,
  currentRevision,
}: {
  deploy: DeployHistoryItem | null;
  currentRevision?: string | null;
}) {
  const isActive = deploy
    ? ["queued", "running", "verifying"].includes(deploy.status)
    : false;
  const now = useCurrentTime(isActive);

  if (!deploy) {
    return (
      <div className="border-b border-white/[0.08] bg-[#0c0d12]/60 px-4 py-4 text-xs text-zinc-500">
        Select a deployment to inspect its overview and logs.
      </div>
    );
  }

  const isFailure = [
    "failed",
    "timed_out",
    "interrupted",
    "cancelled",
  ].includes(deploy.status);
  const duration =
    deploy.durationMs ??
    (isActive && deploy.startedAt && now > 0
      ? Math.max(0, now - new Date(deploy.startedAt).getTime())
      : null);
  const stageLabel = {
    queued: "Queued",
    running: "Deploying",
    verifying: "Verifying health",
    success: "Live",
    failed: "Failed",
    cancelled: "Cancelled",
    timed_out: "Timed out",
    interrupted: "Interrupted",
    idle: "Idle",
  }[deploy.stage ?? deploy.status];

  return (
    <div className="border-b border-white/[0.08] bg-[#0c0d12]/60 px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.16em] text-zinc-500 uppercase">
            Deployment overview
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-zinc-100">
              {deploy.action === "rollback" ? "Rollback" : "Deploy"}
            </span>
            <span className="text-xs text-zinc-500">·</span>
            <span className="text-xs text-zinc-400">{stageLabel}</span>
            {deploy.environment ? (
              <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400">
                {deploy.environment}
              </span>
            ) : null}
          </div>
        </div>
        <StatusBadge status={deploy.status} />
      </div>

      {deploy.commitMessage ? (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-zinc-300">
          “{deploy.commitMessage}”
        </p>
      ) : null}

      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-[11px] sm:grid-cols-4">
        <div>
          <p className="text-zinc-600">Branch</p>
          <p className="mt-1 flex items-center gap-1 truncate font-mono text-zinc-300">
            <GitBranch className="size-3 text-sky-400" />
            {deploy.branch ?? "unknown"}
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Revision</p>
          <p className="mt-1 flex items-center gap-1 font-mono text-zinc-300">
            <GitCommitHorizontal className="size-3 text-zinc-500" />
            {deploy.revision?.slice(0, 8) ?? "unknown"}
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Duration</p>
          <p className="mt-1 font-mono text-zinc-300">
            {duration == null
              ? "—"
              : `${(duration / 1000).toFixed(1)}s${isActive ? " elapsed" : ""}`}
          </p>
        </div>
        <div>
          <p className="text-zinc-600">Requested by</p>
          <p className="mt-1 flex items-center gap-1 truncate text-zinc-300">
            <User className="size-3 text-zinc-500" />
            {deploy.requestedBy}
          </p>
        </div>
      </div>

      {currentRevision && deploy.status === "success" ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-emerald-300">
          <CheckCircle2 className="size-3.5" />
          Live revision is {currentRevision.slice(0, 8)}
        </p>
      ) : null}
      {deploy.status === "verifying" ? (
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-sky-300">
          <Clock3 className="size-3.5" />
          Health check is running; the deployment will be marked live when it
          passes.
        </p>
      ) : null}
      {isFailure && deploy.failureSummary ? (
        <div className="mt-3 rounded-lg border border-red-500/20 bg-red-950/30 px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold tracking-wider text-red-300 uppercase">
            <AlertCircle className="size-3" />
            Failure summary
            {deploy.exitCode != null ? ` · exit ${deploy.exitCode}` : ""}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-red-200/80">
            {deploy.failureSummary}
          </p>
        </div>
      ) : null}
    </div>
  );
}

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
  const [statusFilter, setStatusFilter] = useState("all");
  const [isExpanded, setIsExpanded] = useState(false);

  const history = useDeployHistory(appId, open);
  const cancelDeploy = useCancelDeploy();
  const rollback = useRollback();

  const filteredHistory = useMemo(() => {
    return history.data?.filter((deploy) => {
      const matchesStatus =
        statusFilter === "all" || deploy.status === statusFilter;
      const haystack =
        `${deploy.branch ?? ""} ${deploy.revision ?? ""} ${deploy.commitMessage ?? ""} ${deploy.id}`.toLowerCase();
      return matchesStatus && haystack.includes(query.toLowerCase());
    });
  }, [history.data, statusFilter, query]);

  const selectedDeployId =
    manualSelectedDeployId &&
    history.data?.some((deploy) => deploy.id === manualSelectedDeployId)
      ? manualSelectedDeployId
      : (preferredDeployId ?? history.data?.[0]?.id ?? null);

  const selectedDeploy =
    history.data?.find((deploy) => deploy.id === selectedDeployId) ?? null;
  const selectedStatus = selectedDeploy?.status ?? status;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        className={cn(
          "flex w-full flex-col gap-0 p-0 transition-all duration-300 ease-in-out",
          isExpanded
            ? "sm:max-w-[96vw] xl:max-w-[94vw]"
            : "sm:max-w-5xl lg:max-w-6xl",
        )}
        style={{
          background: "#08090d",
          borderLeft: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: 16 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="flex h-full flex-1 flex-col overflow-hidden"
        >
          {/* Main Top Header */}
          <SheetHeader className="flex-row items-center justify-between border-b border-white/[0.08] bg-[#0c0d12]/95 px-5 py-3.5 backdrop-blur-md">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-zinc-800/90 ring-1 ring-white/15">
                  <Terminal className="size-4 text-sky-400" />
                </div>
                <SheetTitle className="text-[15px] font-semibold tracking-tight text-white">
                  {appLabel}
                </SheetTitle>
              </div>

              {selectedStatus && <StatusBadge status={selectedStatus} />}

              {/* Action Buttons */}
              {["queued", "running", "verifying"].includes(
                selectedStatus ?? "",
              ) && selectedDeployId ? (
                <button
                  type="button"
                  disabled={cancelDeploy.isPending}
                  aria-label="Cancel active deployment"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Cancel this deployment? The running process will be terminated.",
                      )
                    ) {
                      cancelDeploy.mutate(selectedDeployId);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-950/50 px-2.5 py-1 text-xs font-medium text-red-300 shadow-sm transition-colors hover:bg-red-900/60"
                >
                  <Square className="size-3 fill-current text-red-400" />
                  Cancel Deploy
                </button>
              ) : null}

              {canRollback &&
              !["queued", "running", "verifying"].includes(
                selectedStatus ?? "",
              ) ? (
                <button
                  type="button"
                  disabled={rollback.isPending}
                  aria-label="Rollback to previous successful revision"
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/50 px-2.5 py-1 text-xs font-medium text-amber-300 shadow-sm transition-colors hover:bg-amber-900/60"
                >
                  <Undo2 className="size-3 text-amber-400" />
                  Rollback
                </button>
              ) : null}
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 pr-6">
              {/* Expand / Maximize Sheet Toggle */}
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-label={
                  isExpanded
                    ? "Collapse deployment details"
                    : "Expand deployment details"
                }
                className="hidden rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white sm:block"
                title={isExpanded ? "Collapse width" : "Expand width"}
              >
                {isExpanded ? (
                  <Minimize2 className="size-4" />
                ) : (
                  <Maximize2 className="size-4" />
                )}
              </button>

              <SheetDescription className="hidden font-mono text-[11px] text-zinc-400 md:inline-block">
                {selectedDeployId ? (
                  <span className="rounded bg-zinc-900 px-2 py-0.5 ring-1 ring-white/10">
                    {selectedDeployId}
                  </span>
                ) : (
                  "No deploy selected"
                )}
              </SheetDescription>
            </div>
          </SheetHeader>

          {/* Split Body: Sidebar & Terminal */}
          <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
            {/* Left: Deploy History Sidebar */}
            <div className="flex min-h-0 flex-col border-b border-white/[0.08] bg-[#090a0e] md:border-r md:border-b-0">
              <div className="border-b border-white/[0.06] p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                    <Clock3 className="size-3.5 text-zinc-400" />
                    Deploy History
                  </div>
                  {filteredHistory && (
                    <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-300">
                      {filteredHistory.length}
                    </span>
                  )}
                </div>

                <div className="relative mt-3">
                  <Search className="absolute top-2.5 left-2.5 size-3.5 text-zinc-500" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search commits, branches..."
                    className="h-8 w-full rounded-lg border border-white/10 bg-zinc-950/80 pr-2 pl-8 text-xs text-zinc-200 placeholder:text-zinc-600 focus:border-white/25 focus:ring-1 focus:ring-white/20 focus:outline-none"
                  />
                  {query && (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute top-2.5 right-2 text-zinc-500 hover:text-zinc-300"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                <label className="sr-only" htmlFor={`history-status-${appId}`}>
                  Filter deployment history by status
                </label>
                <select
                  id={`history-status-${appId}`}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value)}
                  className="mt-2 h-8 w-full rounded-lg border border-white/10 bg-zinc-950/80 px-2.5 text-xs text-zinc-300 outline-none focus:border-white/25"
                >
                  <option value="all">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="queued">Queued</option>
                  <option value="running">Running</option>
                  <option value="verifying">Verifying</option>
                  <option value="timed_out">Timed out</option>
                  <option value="interrupted">Interrupted</option>
                </select>
              </div>

              {/* History List */}
              <ScrollArea className="h-[220px] flex-1 md:h-full">
                <div className="space-y-2 p-3">
                  {history.isLoading ? (
                    <div className="space-y-2.5 p-2">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div
                          key={i}
                          className="h-20 animate-pulse rounded-xl bg-zinc-900/60 ring-1 ring-white/5"
                        />
                      ))}
                    </div>
                  ) : null}

                  {history.isError ? (
                    <div className="flex items-center gap-2 rounded-lg bg-red-950/40 p-3 text-xs text-red-300 ring-1 ring-red-500/20">
                      <AlertCircle className="size-4 shrink-0 text-red-400" />
                      Failed to load deploy history.
                    </div>
                  ) : null}

                  {!history.isLoading &&
                  !history.isError &&
                  filteredHistory?.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-500">
                      No deployments match your filters.
                    </div>
                  ) : null}

                  {filteredHistory?.map((deploy) => (
                    <DeployHistoryButton
                      key={deploy.id}
                      deploy={deploy}
                      active={deploy.id === selectedDeployId}
                      onSelect={() => setManualSelectedDeployId(deploy.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>

            {/* Right: Selected Deploy Metadata Banner & Stream Terminal */}
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#07080b]">
              <DeploymentOverview
                deploy={selectedDeploy}
                currentRevision={currentRevision}
              />
              {/* Deploy Metadata Banner */}
              <div className="border-b border-white/[0.08] bg-[#0c0d12]/60 px-4 py-2.5">
                {selectedDeploy ? (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-mono text-[11px] text-zinc-400">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Clock3 className="size-3 text-zinc-500" />
                      <span>{formatDeployTime(selectedDeploy.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-300">
                      <GitBranch className="size-3 text-sky-400" />
                      <span>{selectedDeploy.branch ?? "unknown branch"}</span>
                    </div>

                    <div className="flex items-center gap-1 text-zinc-300">
                      <GitCommitHorizontal className="size-3 text-zinc-500" />
                      <span>
                        {selectedDeploy.revision?.slice(0, 8) ?? "no revision"}
                      </span>
                    </div>

                    {selectedDeploy.durationMs != null ? (
                      <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-zinc-300 ring-1 ring-white/10">
                        ⏱️ {(selectedDeploy.durationMs / 1000).toFixed(1)}s
                      </span>
                    ) : null}

                    {selectedDeploy.exitCode != null ? (
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-semibold ring-1",
                          selectedDeploy.exitCode === 0
                            ? "bg-emerald-950/60 text-emerald-300 ring-emerald-500/30"
                            : "bg-red-950/60 text-red-300 ring-red-500/30",
                        )}
                      >
                        exit {selectedDeploy.exitCode}
                      </span>
                    ) : null}

                    <div className="flex items-center gap-1 text-zinc-400">
                      <User className="size-3 text-zinc-500" />
                      <span>by {selectedDeploy.requestedBy}</span>
                    </div>
                  </div>
                ) : (
                  <p className="font-mono text-xs text-zinc-500">
                    Select a deploy to inspect logs
                  </p>
                )}
              </div>

              {/* Streamed Terminal Console */}
              <div className="min-h-0 flex-1">
                <StreamedDeployLogs
                  key={selectedDeployId ?? "empty"}
                  deployId={selectedDeployId}
                  appLabel={appLabel}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
