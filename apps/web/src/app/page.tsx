"use client";

import {
  Activity,
  AlertCircle,
  Anchor,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Search,
  Server,
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
import { cn } from "@/lib/utils";
import type { App, AuditLogEntry } from "@/types";

const activeStatuses = ["queued", "running", "verifying"];
const failedStatuses = ["failed", "timed_out", "interrupted", "cancelled"];

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-white/[0.06] bg-zinc-950/60 p-5 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-zinc-800" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-12 w-full animate-pulse rounded-xl bg-zinc-900" />
            <div className="grid grid-cols-2 gap-2 pt-2">
              <div className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
              <div className="h-10 animate-pulse rounded-lg bg-zinc-900/60" />
            </div>
          </div>
          <div className="mt-6 flex justify-between gap-3">
            <div className="h-9 w-24 animate-pulse rounded-xl bg-zinc-800" />
            <div className="h-9 w-20 animate-pulse rounded-xl bg-zinc-800" />
          </div>
        </div>
      ))}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  icon: typeof CheckCircle2;
  tone: "green" | "blue" | "red" | "zinc";
}) {
  const styles = {
    green: {
      border: "border-emerald-500/20",
      glow: "bg-emerald-950/40 text-emerald-400 ring-1 ring-emerald-500/30",
      dot: "bg-emerald-400 shadow-[0_0_8px_#34d399]",
    },
    blue: {
      border: "border-sky-500/20",
      glow: "bg-sky-950/40 text-sky-400 ring-1 ring-sky-500/30",
      dot: "bg-sky-400 shadow-[0_0_8px_#38bdf8]",
    },
    red: {
      border: "border-red-500/20",
      glow: "bg-red-950/40 text-red-400 ring-1 ring-red-500/30",
      dot: "bg-red-400 shadow-[0_0_8px_#f87171]",
    },
    zinc: {
      border: "border-white/[0.08]",
      glow: "bg-zinc-900 text-zinc-300 ring-1 ring-white/10",
      dot: "bg-zinc-400",
    },
  };

  const current = styles[tone];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border bg-gradient-to-b from-[#111218] to-[#0a0a0f] p-4.5 shadow-md shadow-black/40 backdrop-blur-md transition-all duration-150 hover:border-white/20",
        current.border,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
          {label}
        </span>
        <div
          className={cn(
            "flex size-7.5 items-center justify-center rounded-xl",
            current.glow,
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      </div>
      <p className="mt-1 text-[11px] text-zinc-500">{hint}</p>
    </div>
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
    .slice(0, 6);

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-[#0c0d12]/80 p-5 shadow-lg shadow-black/40 backdrop-blur-md"
      aria-labelledby="activity-heading"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div>
          <h2
            id="activity-heading"
            className="flex items-center gap-2 text-sm font-semibold text-zinc-200"
          >
            <Activity className="size-4 text-sky-400" />
            Recent Activity
          </h2>
          <p className="mt-0.5 text-xs text-zinc-500">
            Real-time deployment event log across all clusters.
          </p>
        </div>
        <span className="font-mono text-[10px] text-zinc-500 uppercase tracking-wider">
          LIVE · 10s POLL
        </span>
      </div>

      {isError ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-950/20 px-4 py-3 text-xs text-red-300">
          <AlertCircle className="size-4 shrink-0 text-red-400" />
          Activity feed is temporarily unavailable.
        </div>
      ) : visibleEntries.length > 0 ? (
        <div className="mt-3 divide-y divide-white/[0.04]">
          {visibleEntries.map((entry) => {
            const isFailure =
              entry.action.includes("failed") ||
              entry.action.includes("timed_out");
            const isSuccess = entry.action.includes("success");
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-2.5 first:pt-1 last:pb-0"
              >
                <span
                  className={cn(
                    "flex size-7 shrink-0 items-center justify-center rounded-lg ring-1",
                    isFailure
                      ? "bg-red-950/50 text-red-400 ring-red-500/30"
                      : isSuccess
                        ? "bg-emerald-950/50 text-emerald-400 ring-emerald-500/30"
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
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-zinc-300">
                    {activityLabel(entry.action)}
                    {entry.appName ? (
                      <span className="text-zinc-500 font-normal">
                        {" "}
                        · {appLabels.get(entry.appName) ?? entry.appName}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-[11px] text-zinc-500 font-mono">
                    {entry.actor} · {formatRelativeDeployTime(entry.createdAt)}
                  </p>
                </div>
                {entry.deployId ? (
                  <span className="hidden font-mono text-[10px] text-zinc-600 sm:inline">
                    {entry.deployId.slice(0, 8)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-zinc-600">
          No deployment activity recorded recently.
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
  const [statusFilter, setStatusFilter] = useState("all");
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
      if (event.key === "/" && !(event.target instanceof HTMLInputElement)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const summary = useMemo(() => {
    const data = apps.data ?? [];
    return {
      total: data.length,
      healthy: data.filter(
        (app) => app.status === "success" || app.status === "idle",
      ).length,
      active: data.filter((app) => activeStatuses.includes(app.status)).length,
      failed: data.filter((app) => failedStatuses.includes(app.status)).length,
    };
  }, [apps.data]);

  const visibleApps = useMemo(() => {
    const data = (apps.data ?? [])
      .filter((app) => environment === "all" || app.environment === environment)
      .filter((app) => {
        if (statusFilter === "all") return true;
        if (statusFilter === "healthy")
          return app.status === "success" || app.status === "idle";
        if (statusFilter === "active")
          return activeStatuses.includes(app.status);
        if (statusFilter === "failed")
          return failedStatuses.includes(app.status);
        return app.status === statusFilter;
      })
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

  return (
    <main className="min-h-screen px-4 py-6 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-7xl flex-col gap-7">
        {/* Brand Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 shadow-sm ring-1 ring-white/15">
              <Anchor className="size-4 text-sky-400" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-tight text-white">
                Shipyard
              </span>
              <span className="ml-2.5 rounded-md bg-zinc-900 px-2 py-0.5 font-mono text-[9.5px] font-medium tracking-wider text-zinc-400 uppercase ring-1 ring-white/10">
                VPN Protected
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              role="status"
              className={cn(
                "hidden items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] uppercase sm:inline-flex",
                apps.isError
                  ? "bg-red-950/50 text-red-300 ring-1 ring-red-500/20"
                  : "bg-emerald-950/40 text-emerald-300 ring-1 ring-emerald-500/20",
              )}
            >
              {apps.isError ? (
                <CloudOff className="size-3" />
              ) : (
                <span className="size-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
              )}
              {apps.isError ? "API Offline" : "API Connected"}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => void apps.refetch()}
              disabled={apps.isFetching}
              className="h-8 gap-1.5 rounded-xl border border-white/10 bg-zinc-900/60 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
            >
              <RefreshCw
                className={cn("size-3.5 text-zinc-400", apps.isFetching && "animate-spin")}
              />
              Refresh
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 text-xs text-zinc-400 hover:bg-white/[0.04] hover:text-white"
            >
              Sign out
            </Button>
          </div>
        </header>

        {/* Board Title & Top Stats */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
              Deployment Board
            </h1>
            <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
              Manage container targets, trigger zero-downtime deploys, and inspect logs.
            </p>
          </div>
          <p className="font-mono text-[10.5px] text-zinc-500">
            SYNCED · {lastSync}
          </p>
        </div>

        {/* 4 Summary Metric Cards */}
        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Deployment summary"
        >
          <SummaryMetric
            label="Total Targets"
            value={summary.total}
            hint="Configured applications"
            icon={Server}
            tone="zinc"
          />
          <SummaryMetric
            label="Healthy Apps"
            value={summary.healthy}
            hint="Idle or last deploy succeeded"
            icon={CheckCircle2}
            tone="green"
          />
          <SummaryMetric
            label="In Progress"
            value={summary.active}
            hint="Queued, running, or verifying"
            icon={RefreshCw}
            tone="blue"
          />
          <SummaryMetric
            label="Needs Attention"
            value={summary.failed}
            hint="Failed, timed out, or interrupted"
            icon={XCircle}
            tone="red"
          />
        </section>

        {/* Search, Environment, Sort, and Status Filter Controls */}
        <div className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-zinc-950/40 p-3 sm:p-4 backdrop-blur-md">
          <div className="flex flex-col gap-2 sm:flex-row">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-2.5 left-3 size-4 text-zinc-500" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search apps"
                placeholder="Search apps by name, id... (Press / to focus)"
                className="h-9 w-full rounded-xl border border-white/10 bg-zinc-900/90 pr-8 pl-9 font-mono text-xs text-zinc-200 placeholder:font-sans placeholder:text-zinc-600 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <span className="pointer-events-none absolute top-2 right-2.5 rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[9px] text-zinc-500">
                /
              </span>
            </div>

            {/* Environment Filter */}
            <select
              id="environment-filter"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-zinc-300 outline-none focus:border-white/30"
            >
              <option value="all">All environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="development">Development</option>
            </select>

            {/* Sort Filter */}
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-9 rounded-xl border border-white/10 bg-zinc-900/90 px-3 text-xs text-zinc-300 outline-none focus:border-white/30"
            >
              <option value="activity">Sort: Recent activity</option>
              <option value="name">Sort: App name</option>
              <option value="status">Sort: Status</option>
            </select>
          </div>

          {/* Status Tabs with counts */}
          <div
            className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.04] pt-2.5"
            aria-label="Filter by status"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: "all", label: "All", count: summary.total, dot: null },
                {
                  id: "healthy",
                  label: "Healthy",
                  count: summary.healthy,
                  dot: "bg-emerald-400",
                },
                {
                  id: "active",
                  label: "Deploying",
                  count: summary.active,
                  dot: "bg-sky-400 animate-pulse",
                },
                {
                  id: "failed",
                  label: "Needs Attention",
                  count: summary.failed,
                  dot: "bg-red-400",
                },
              ].map((filter) => (
                <button
                  key={filter.id}
                  type="button"
                  aria-pressed={statusFilter === filter.id}
                  onClick={() => setStatusFilter(filter.id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 focus-visible:outline-none",
                    statusFilter === filter.id
                      ? "bg-zinc-100 text-zinc-950 font-semibold shadow-sm"
                      : "bg-zinc-900/60 text-zinc-400 hover:bg-zinc-800 hover:text-white ring-1 ring-white/[0.06]",
                  )}
                >
                  {filter.dot && (
                    <span className={cn("size-1.5 rounded-full", filter.dot)} />
                  )}
                  <span>{filter.label}</span>
                  <span
                    className={cn(
                      "font-mono text-[10px]",
                      statusFilter === filter.id
                        ? "text-zinc-700"
                        : "text-zinc-500",
                    )}
                  >
                    {filter.count}
                  </span>
                </button>
              ))}
            </div>

            <span className="font-mono text-[11px] text-zinc-500">
              Showing {visibleApps.length} of {summary.total} targets
            </span>
          </div>
        </div>

        {/* Loading */}
        {apps.isLoading ? <DashboardSkeleton /> : null}

        {/* Error Alert */}
        {apps.isError ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-500/25 bg-red-950/30 p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4.5 shrink-0 text-red-400" />
              <div>
                <p className="text-sm font-semibold text-red-300">
                  Unable to connect to deployment engine.
                </p>
                <p className="mt-1 text-xs text-red-200/80">
                  Check API connectivity, VPN session, or authorization token.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void apps.refetch()}
              className="rounded-xl border-red-500/30 bg-red-900/40 text-red-200 hover:bg-red-900/60"
            >
              Retry Connection
            </Button>
          </div>
        ) : null}

        {/* App Grid */}
        {apps.data ? (
          visibleApps.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-zinc-900/80 ring-1 ring-white/10">
                <Search className="size-5 text-zinc-500" />
              </div>
              <h4 className="mt-4 text-sm font-semibold text-zinc-200">
                {apps.data.length === 0
                  ? "No targets configured"
                  : "No matching apps found"}
              </h4>
              <p className="mt-1 max-w-xs text-xs text-zinc-500">
                {apps.data.length === 0
                  ? "Configure your apps in the deployment repository to get started."
                  : "Try clearing your search query or switching the status filter."}
              </p>
            </div>
          )
        ) : null}

        {/* Activity Audit Stream */}
        {apps.data && apps.data.length > 0 ? (
          <ActivityPanel
            apps={apps.data}
            entries={audit.data}
            isError={audit.isError}
          />
        ) : null}
      </section>
    </main>
  );
}
