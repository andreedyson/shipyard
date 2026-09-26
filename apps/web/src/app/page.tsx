"use client";

import {
  Activity,
  AlertCircle,
  Anchor,
  ArrowUpDown,
  CheckCircle2,
  ChevronDown,
  CloudOff,
  Layers,
  LogOut,
  RefreshCw,
  Search,
  Server,
  X,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppCard } from "@/components/app-card";
import { Button } from "@/components/ui/button";
import { redirectToLogin } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatRelativeDeployTime } from "@/lib/deploys";
import { useApps } from "@/lib/hooks/use-apps";
import { useAuditLog } from "@/lib/hooks/use-audit-log";
import { statusGroup, type StatusGroup } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { App, AuditLogEntry } from "@/types";

type StatusFilter = "all" | StatusGroup;

const environmentOptions = [
  { value: "all", label: "All environments" },
  { value: "production", label: "Production" },
  { value: "staging", label: "Staging" },
  { value: "preview", label: "Preview" },
  { value: "development", label: "Development" },
];

const sortOptions = [
  { value: "activity", label: "Recent activity" },
  { value: "name", label: "App name" },
  { value: "status", label: "Status" },
];

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
  );
}

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/[0.07] bg-zinc-950/60 p-5"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 animate-pulse rounded-xl bg-zinc-800/80" />
            <div className="flex-1 space-y-2 pt-0.5">
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-24 animate-pulse rounded bg-zinc-900" />
            </div>
            <div className="h-5 w-14 animate-pulse rounded-full bg-zinc-800" />
          </div>
          <div className="mt-5 h-11 animate-pulse rounded-xl bg-zinc-900/80" />
          <div className="mt-4 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((__, cell) => (
              <div
                key={cell}
                className="h-9 animate-pulse rounded-lg bg-zinc-900/50"
              />
            ))}
          </div>
          <div className="mt-5 flex justify-between gap-3 border-t border-white/[0.05] pt-4">
            <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-800" />
            <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-900" />
          </div>
        </div>
      ))}
    </div>
  );
}

const tileTones = {
  zinc: {
    icon: "bg-zinc-800/80 text-zinc-300 ring-white/10",
    active: "border-white/25 bg-zinc-900/80",
    bar: "bg-zinc-300",
    value: "text-white",
  },
  green: {
    icon: "bg-emerald-500/10 text-emerald-400 ring-emerald-500/25",
    active: "border-emerald-500/40 bg-emerald-950/30",
    bar: "bg-emerald-400",
    value: "text-white",
  },
  blue: {
    icon: "bg-sky-500/10 text-sky-400 ring-sky-500/25",
    active: "border-sky-500/40 bg-sky-950/30",
    bar: "bg-sky-400",
    value: "text-sky-300",
  },
  red: {
    icon: "bg-red-500/10 text-red-400 ring-red-500/25",
    active: "border-red-500/40 bg-red-950/30",
    bar: "bg-red-400",
    value: "text-red-300",
  },
};

function StatTile({
  label,
  shortLabel,
  value,
  hint,
  icon: Icon,
  tone,
  active,
  onClick,
}: {
  label: string;
  shortLabel?: string;
  value: number;
  hint: string;
  icon: typeof CheckCircle2;
  tone: keyof typeof tileTones;
  active: boolean;
  onClick: () => void;
}) {
  const current = tileTones[tone];
  // Only draw attention to in-progress / failing counts when they are non-zero.
  const emphasize = value > 0 && (tone === "blue" || tone === "red");

  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border p-4 text-left transition-all duration-200 focus-visible:ring-2 focus-visible:ring-sky-500/40 focus-visible:outline-none sm:p-5",
        active
          ? current.active
          : "border-white/[0.07] bg-zinc-950/60 hover:border-white/15 hover:bg-zinc-900/50",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium tracking-wider text-zinc-400 uppercase">
          {shortLabel ? (
            <>
              <span className="sm:hidden">{shortLabel}</span>
              <span className="hidden sm:inline">{label}</span>
            </>
          ) : (
            label
          )}
        </span>
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-lg ring-1",
            current.icon,
          )}
        >
          <Icon
            className={cn(
              "size-4",
              tone === "blue" && value > 0 && "animate-spin [animation-duration:2.5s]",
            )}
          />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 text-3xl font-semibold tracking-tight tabular-nums",
          emphasize ? current.value : "text-white",
        )}
      >
        {value}
      </p>
      <p className="mt-1 hidden truncate text-xs text-zinc-500 sm:block">
        {hint}
      </p>
      <span
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 origin-left transition-transform duration-300",
          current.bar,
          active ? "scale-x-100" : "scale-x-0",
        )}
      />
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  icon: Icon,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  icon: typeof Layers;
  prefix?: string;
}) {
  return (
    <label className="relative flex min-w-0 items-center">
      <span className="sr-only">{label}</span>
      <Icon className="pointer-events-none absolute left-3 hidden size-3.5 text-zinc-500 sm:block" />
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full min-w-0 cursor-pointer appearance-none truncate rounded-xl border border-white/[0.08] bg-zinc-900/70 pr-8 pl-3 text-[13px] sm:pr-9 sm:pl-9 text-zinc-200 transition outline-none hover:border-white/15 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/15 sm:w-auto [&>option]:bg-zinc-900"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {prefix ? `${prefix}${option.label}` : option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-zinc-500" />
    </label>
  );
}

function activityLabel(action: string) {
  const labels: Record<string, string> = {
    "deployment.deploy.requested": "Deploy requested",
    "deployment.rollback.requested": "Rollback requested",
    "deployment.success": "Deployment succeeded",
    "deployment.failed": "Deployment failed",
    "deployment.cancelled.requested": "Cancellation requested",
    "deployment.timed_out.requested": "Deployment timed out",
    "deployment.interrupted": "Deployment interrupted",
  };
  return labels[action] ?? action.replaceAll(".", " ");
}

function ActivityPanel({
  apps,
  entries,
  isError = false,
}: {
  apps: App[];
  entries?: AuditLogEntry[];
  isError?: boolean;
}) {
  const appLabels = new Map(apps.map((app) => [app.id, app.label]));
  const visibleEntries = (entries ?? [])
    .filter((entry) => entry.action.startsWith("deployment."))
    .slice(0, 8);

  return (
    <section
      className="overflow-hidden rounded-2xl border border-white/[0.07] bg-zinc-950/60 backdrop-blur-md"
      aria-labelledby="activity-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
        <h2
          id="activity-heading"
          className="flex items-center gap-2 text-sm font-semibold text-zinc-100"
        >
          <Activity className="size-4 text-sky-400" />
          Recent activity
        </h2>
        <span className="flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-zinc-500 uppercase">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
          </span>
          Live
        </span>
      </div>

      {isError ? (
        <div className="m-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-3.5 py-3 text-xs text-red-300">
          <AlertCircle className="size-4 shrink-0 text-red-400" />
          Activity feed is temporarily unavailable.
        </div>
      ) : visibleEntries.length > 0 ? (
        <ol className="px-4 py-2 sm:px-5">
          {visibleEntries.map((entry, index) => {
            const isFailure =
              entry.action.includes("failed") ||
              entry.action.includes("timed_out");
            const isSuccess = entry.action.includes("success");
            const isLast = index === visibleEntries.length - 1;
            return (
              <li key={entry.id} className="relative flex gap-3 py-2.5">
                {!isLast ? (
                  <span
                    aria-hidden
                    className="absolute top-10 bottom-0 left-[13px] w-px bg-white/[0.06]"
                  />
                ) : null}
                <span
                  className={cn(
                    "relative flex size-7 shrink-0 items-center justify-center rounded-full ring-1",
                    isFailure
                      ? "bg-red-950/60 text-red-400 ring-red-500/30"
                      : isSuccess
                        ? "bg-emerald-950/60 text-emerald-400 ring-emerald-500/30"
                        : "bg-zinc-900 text-zinc-400 ring-white/10",
                  )}
                >
                  {isFailure ? (
                    <XCircle className="size-3.5" />
                  ) : isSuccess ? (
                    <CheckCircle2 className="size-3.5" />
                  ) : (
                    <Zap className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className="text-[13px] leading-snug font-medium text-zinc-200">
                    {activityLabel(entry.action)}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-zinc-500">
                    {entry.appName ? (
                      <span className="text-zinc-400">
                        {appLabels.get(entry.appName) ?? entry.appName}
                      </span>
                    ) : null}
                    {entry.appName ? " · " : null}
                    {entry.actor}
                  </p>
                  <p className="mt-1 flex items-center gap-2 font-mono text-[10.5px] text-zinc-600">
                    <span>{formatRelativeDeployTime(entry.createdAt)}</span>
                    {entry.deployId ? (
                      <span className="truncate">
                        #{entry.deployId.slice(0, 8)}
                      </span>
                    ) : null}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <div className="flex flex-col items-center px-4 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-xl bg-zinc-900 ring-1 ring-white/10">
            <Activity className="size-4 text-zinc-500" />
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            No deployment activity recorded yet.
          </p>
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () =>
      (await api.get<{ authenticated: boolean }>("/auth/session")).data,
    retry: false,
  });
  const authenticated = session.data?.authenticated === true;
  const apps = useApps({ enabled: authenticated });
  const audit = useAuditLog({ enabled: authenticated });
  const [query, setQuery] = useState("");
  const [environment, setEnvironment] = useState("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState("activity");
  const [favorites, setFavorites] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem("shipyard_favorites");
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as unknown;
        if (Array.isArray(parsed)) {
          queueMicrotask(() =>
            setFavorites(
              parsed.filter((item): item is string => typeof item === "string"),
            ),
          );
        }
      } catch {
        window.localStorage.removeItem("shipyard_favorites");
      }
    }
    const handleKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !isTypingTarget(event.target) &&
        !document.querySelector('[role="dialog"]')
      ) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const summary = useMemo(() => {
    const data = apps.data ?? [];
    const count = (group: StatusGroup) =>
      data.filter((app) => statusGroup(app.status) === group).length;
    return {
      total: data.length,
      healthy: count("healthy"),
      active: count("active"),
      failed: count("failed"),
    };
  }, [apps.data]);

  const visibleApps = useMemo(() => {
    const data = (apps.data ?? [])
      .filter((app) => environment === "all" || app.environment === environment)
      .filter(
        (app) =>
          statusFilter === "all" || statusGroup(app.status) === statusFilter,
      )
      .filter((app) =>
        `${app.label} ${app.id}`.toLowerCase().includes(query.toLowerCase()),
      );

    return data.sort((a, b) => {
      const favoriteDiff =
        Number(favorites.includes(b.id)) - Number(favorites.includes(a.id));
      if (favoriteDiff !== 0) return favoriteDiff;
      if (sortBy === "name") return a.label.localeCompare(b.label);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      const timeA = new Date(
        a.latestDeploy?.createdAt ?? a.lastDeployedAt ?? 0,
      ).getTime();
      const timeB = new Date(
        b.latestDeploy?.createdAt ?? b.lastDeployedAt ?? 0,
      ).getTime();
      return timeB - timeA;
    });
  }, [apps.data, environment, favorites, query, sortBy, statusFilter]);

  const hasActiveFilters =
    query !== "" || environment !== "all" || statusFilter !== "all";

  const clearFilters = () => {
    setQuery("");
    setEnvironment("all");
    setStatusFilter("all");
  };

  const toggleFavorite = (appId: string) => {
    setFavorites((current) => {
      const next = current.includes(appId)
        ? current.filter((id) => id !== appId)
        : [...current, appId];
      window.localStorage.setItem("shipyard_favorites", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (session.data && !authenticated) {
      redirectToLogin();
    }
  }, [session.data, authenticated]);

  const handleLogout = () => {
    void api.post("/auth/logout").finally(() => redirectToLogin());
  };

  if (session.isLoading || !authenticated) {
    return null;
  }

  const lastSync = apps.dataUpdatedAt
    ? formatRelativeDeployTime(new Date(apps.dataUpdatedAt).toISOString())
    : "Syncing";

  const tiles = [
    {
      id: "all",
      label: "All targets",
      value: summary.total,
      hint: "Configured applications",
      icon: Server,
      tone: "zinc",
    },
    {
      id: "healthy",
      label: "Healthy",
      value: summary.healthy,
      hint: "Idle or last deploy succeeded",
      icon: CheckCircle2,
      tone: "green",
    },
    {
      id: "active",
      label: "In progress",
      value: summary.active,
      hint: "Queued, running, or verifying",
      icon: RefreshCw,
      tone: "blue",
    },
    {
      id: "failed",
      label: "Needs attention",
      shortLabel: "Attention",
      value: summary.failed,
      hint: "Failed, timed out, or interrupted",
      icon: XCircle,
      tone: "red",
    },
  ] as const;

  const activeTile = tiles.find((tile) => tile.id === statusFilter);

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.08),transparent_60%)]"
      />

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#050506]/75 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-zinc-800 to-zinc-900 ring-1 ring-white/15">
              <Anchor className="size-4 text-sky-400" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight text-white">
              Shipyard
            </span>
            <span className="hidden rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[9.5px] font-medium tracking-wider text-zinc-400 uppercase ring-1 ring-white/10 sm:inline">
              VPN Protected
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <span
              role="status"
              title={apps.isError ? "API offline" : "API connected"}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-mono text-[10px] uppercase ring-1 sm:px-2.5",
                apps.isError
                  ? "bg-red-950/50 text-red-300 ring-red-500/20"
                  : "bg-emerald-950/40 text-emerald-300 ring-emerald-500/20",
              )}
            >
              {apps.isError ? (
                <CloudOff className="size-3" />
              ) : (
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              )}
              <span className="hidden sm:inline">
                {apps.isError ? "API Offline" : "API Connected"}
              </span>
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void apps.refetch()}
              disabled={apps.isFetching}
              aria-label="Refresh"
              className="h-8 gap-1.5 rounded-lg border border-white/10 bg-zinc-900/60 px-2.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <RefreshCw
                className={cn(
                  "size-3.5 text-zinc-400",
                  apps.isFetching && "animate-spin",
                )}
              />
              <span className="hidden sm:inline">Refresh</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              aria-label="Sign out"
              className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-zinc-400 hover:bg-white/[0.05] hover:text-white"
            >
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Page heading */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
              Deployment Board
            </h1>
            <p className="mt-1.5 max-w-xl text-sm text-zinc-400">
              Manage container targets, trigger zero-downtime deploys, and
              inspect logs.
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs text-zinc-500">
            <RefreshCw
              className={cn("size-3", apps.isFetching && "animate-spin")}
            />
            Synced {lastSync.toLowerCase()}
          </p>
        </div>

        {/* Summary tiles double as status filters */}
        <section
          className="grid grid-cols-2 gap-3 lg:grid-cols-4"
          aria-label="Filter by status"
        >
          {tiles.map((tile) => (
            <StatTile
              key={tile.id}
              label={tile.label}
              shortLabel={"shortLabel" in tile ? tile.shortLabel : undefined}
              value={tile.value}
              hint={tile.hint}
              icon={tile.icon}
              tone={tile.tone}
              active={statusFilter === tile.id}
              onClick={() =>
                setStatusFilter(
                  statusFilter === tile.id && tile.id !== "all"
                    ? "all"
                    : tile.id,
                )
              }
            />
          ))}
        </section>

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <section className="flex min-w-0 flex-col gap-4" aria-label="Applications">
            {/* Toolbar */}
            <div className="flex flex-col gap-2 rounded-2xl border border-white/[0.07] bg-zinc-950/60 p-2 backdrop-blur-md sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-zinc-500" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setQuery("");
                      event.currentTarget.blur();
                    }
                  }}
                  aria-label="Search apps"
                  placeholder="Search apps by name or id"
                  className="h-10 w-full rounded-xl border border-transparent bg-zinc-900/70 pr-10 pl-9 text-[13px] text-zinc-200 transition outline-none placeholder:text-zinc-500 hover:border-white/10 focus:border-sky-500/40 focus:ring-2 focus:ring-sky-500/15"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-zinc-500 hover:bg-white/5 hover:text-zinc-200"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : (
                  <kbd className="pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded-md border border-white/10 bg-zinc-800/80 px-1.5 py-0.5 font-mono text-[10px] text-zinc-400 sm:block">
                    /
                  </kbd>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <FilterSelect
                  label="Environment"
                  value={environment}
                  onChange={setEnvironment}
                  options={environmentOptions}
                  icon={Layers}
                />
                <FilterSelect
                  label="Sort by"
                  value={sortBy}
                  onChange={setSortBy}
                  options={sortOptions}
                  icon={ArrowUpDown}
                />
              </div>
            </div>

            {/* Result summary */}
            <div className="flex min-h-7 flex-wrap items-center justify-between gap-2 px-1">
              <p className="text-xs text-zinc-500">
                Showing{" "}
                <span className="font-medium text-zinc-300">
                  {visibleApps.length}
                </span>{" "}
                of {summary.total} targets
                {activeTile && activeTile.id !== "all" ? (
                  <>
                    {" "}
                    ·{" "}
                    <span className="text-zinc-300">
                      {activeTile.label.toLowerCase()}
                    </span>
                  </>
                ) : null}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-white/5 hover:text-white"
                >
                  <X className="size-3" />
                  Clear filters
                </button>
              ) : null}
            </div>

            {apps.isLoading ? <DashboardSkeleton /> : null}

            {apps.isError ? (
              <div className="flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-950/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-red-400" />
                  <div>
                    <p className="text-sm font-semibold text-red-300">
                      Unable to connect to deployment engine.
                    </p>
                    <p className="mt-1 text-xs text-red-200/80">
                      Check API connectivity, VPN session, or authorization
                      token.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void apps.refetch()}
                  className="rounded-xl border-red-500/30 bg-red-900/40 text-red-200 hover:bg-red-900/60"
                >
                  Retry connection
                </Button>
              </div>
            ) : null}

            {apps.data ? (
              visibleApps.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleApps.map((app) => (
                    <AppCard
                      key={app.id}
                      app={app}
                      favorite={favorites.includes(app.id)}
                      onToggleFavorite={() => toggleFavorite(app.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
                  <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900/80 ring-1 ring-white/10">
                    <Search className="size-5 text-zinc-500" />
                  </div>
                  <h3 className="mt-4 text-sm font-semibold text-zinc-200">
                    {apps.data.length === 0
                      ? "No targets configured"
                      : "No matching apps found"}
                  </h3>
                  <p className="mt-1 max-w-xs text-xs text-zinc-500">
                    {apps.data.length === 0
                      ? "Configure your apps in the deployment repository to get started."
                      : "Try a different search term or clear the active filters."}
                  </p>
                  {apps.data.length > 0 && hasActiveFilters ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearFilters}
                      className="mt-4 rounded-lg border-white/10 bg-zinc-900 text-xs text-zinc-300 hover:bg-zinc-800"
                    >
                      Clear filters
                    </Button>
                  ) : null}
                </div>
              )
            ) : null}
          </section>

          {apps.data && apps.data.length > 0 ? (
            <aside className="xl:sticky xl:top-20">
              <ActivityPanel
                apps={apps.data}
                entries={audit.data}
                isError={audit.isError}
              />
            </aside>
          ) : null}
        </div>
      </main>
    </div>
  );
}
