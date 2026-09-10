"use client";

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  CloudOff,
  RefreshCw,
  Search,
  Server,
  XCircle,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppCard } from "@/components/app-card";
import { Button } from "@/components/ui/button";
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
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl p-5"
          style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="h-4 w-32 animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-4 w-16 animate-pulse rounded-full bg-[#1a1a1a]" />
          </div>
          <div className="mt-7 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-[#1a1a1a]" />
            <div className="h-3.5 w-40 animate-pulse rounded bg-[#1a1a1a]" />
          </div>
          <div className="mt-7 flex justify-between gap-3">
            <div className="h-8 w-24 animate-pulse rounded-lg bg-[#1a1a1a]" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-[#1a1a1a]" />
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
  const colors = {
    green: { icon: "#4ade80", background: "#052e161c" },
    blue: { icon: "#60a5fa", background: "#17255430" },
    red: { icon: "#f87171", background: "#450a0a30" },
    zinc: { icon: "#a1a1aa", background: "#ffffff08" },
  };
  const color = colors[tone];

  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[11px] font-medium tracking-wider text-[#71717a] uppercase">
          {label}
        </span>
        <span
          className="flex size-7 items-center justify-center rounded-lg"
          style={{ background: color.background, color: color.icon }}
        >
          <Icon className="size-3.5" />
        </span>
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-[#f4f4f5]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#52525b]">{hint}</p>
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
      className="rounded-xl p-5"
      style={{ background: "#111111", border: "0.5px solid #ffffff15" }}
      aria-labelledby="activity-heading"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="activity-heading"
            className="flex items-center gap-2 text-sm font-medium text-[#f4f4f5]"
          >
            <Activity className="size-4 text-[#71717a]" />
            Recent activity
          </h2>
          <p className="mt-1 text-xs text-[#52525b]">
            Deployment actions across all applications.
          </p>
        </div>
        <span className="font-mono text-[10px] text-[#52525b]">AUTO · 10S</span>
      </div>

      {isError ? (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-950/20 px-4 py-4 text-xs text-red-200">
          <AlertCircle className="size-3.5 shrink-0 text-red-300" />
          Activity is temporarily unavailable.
        </div>
      ) : visibleEntries.length > 0 ? (
        <div className="mt-4 divide-y divide-white/[0.06]">
          {visibleEntries.map((entry) => {
            const isFailure =
              entry.action.includes("failed") ||
              entry.action.includes("timed_out");
            const isSuccess = entry.action.includes("success");
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <span
                  className="flex size-7 shrink-0 items-center justify-center rounded-full"
                  style={{
                    background: isFailure
                      ? "#450a0a50"
                      : isSuccess
                        ? "#052e1640"
                        : "#ffffff08",
                    color: isFailure
                      ? "#f87171"
                      : isSuccess
                        ? "#4ade80"
                        : "#a1a1aa",
                  }}
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
                  <p className="truncate text-xs text-[#d4d4d8]">
                    {activityLabel(entry.action)}
                    {entry.appName ? (
                      <span className="text-[#71717a]">
                        {" "}
                        · {appLabels.get(entry.appName) ?? entry.appName}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-1 text-[11px] text-[#52525b]">
                    {entry.actor} · {formatRelativeDeployTime(entry.createdAt)}
                  </p>
                </div>
                {entry.deployId ? (
                  <span className="hidden font-mono text-[10px] text-[#3f3f46] sm:inline">
                    {entry.deployId.slice(0, 8)}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-dashed border-white/[0.08] px-4 py-6 text-center text-xs text-[#52525b]">
          No deployment activity yet.
        </div>
      )}
    </section>
  );
}

export default function DashboardPage() {
  const router = useRouter();
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
      router.replace("/login");
    }
  }, [router, session.data, authenticated]);

  const handleLogout = () => {
    void api.post("/auth/logout").finally(() => router.replace("/login"));
  };

  if (session.isLoading || !authenticated) {
    return null;
  }

  const lastSync = apps.dataUpdatedAt
    ? formatRelativeDeployTime(new Date(apps.dataUpdatedAt).toISOString())
    : "Syncing";
  const connectionLabel = apps.isError
    ? "API unavailable"
    : apps.isFetching
      ? "Syncing"
      : "API connected";

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4 py-1">
          <div className="flex items-center gap-2.5">
            <Server className="size-4 text-[#71717a]" />
            <span className="text-sm font-semibold tracking-tight text-[#f4f4f5]">
              Shipyard
            </span>
            <span className="rounded-full bg-[#ffffff10] px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-[#71717a] uppercase">
              VPN / SERVER ONLY
            </span>
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
                <span className="size-1.5 rounded-full bg-current" />
              )}
              {connectionLabel}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void apps.refetch()}
              disabled={apps.isFetching}
              className="h-8 gap-1.5 text-xs text-[#71717a] hover:bg-[#ffffff08] hover:text-[#f4f4f5]"
            >
              <RefreshCw
                className={cn("size-3.5", apps.isFetching && "animate-spin")}
              />
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="h-8 text-xs text-[#71717a] hover:bg-[#ffffff08] hover:text-[#f4f4f5]"
            >
              Sign out
            </Button>
          </div>
        </header>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f5] md:text-3xl">
              Deployment board
            </h1>
            <p className="mt-1 text-sm text-[#71717a]">
              Monitor apps, trigger deploys, and inspect live deployment logs.
            </p>
          </div>
          <p className="font-mono text-[10px] text-[#52525b]">
            LAST SYNC · {lastSync}
          </p>
        </div>

        <section
          className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Deployment summary"
        >
          <SummaryMetric
            label="Total apps"
            value={summary.total}
            hint="Configured deploy targets"
            icon={Server}
            tone="zinc"
          />
          <SummaryMetric
            label="Healthy"
            value={summary.healthy}
            hint="Idle or last deploy succeeded"
            icon={CheckCircle2}
            tone="green"
          />
          <SummaryMetric
            label="Deploying"
            value={summary.active}
            hint="Queued, running, or verifying"
            icon={RefreshCw}
            tone="blue"
          />
          <SummaryMetric
            label="Needs attention"
            value={summary.failed}
            hint="Failed, cancelled, or interrupted"
            icon={XCircle}
            tone="red"
          />
        </section>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative max-w-md flex-1">
              <Search className="absolute top-2.5 left-3 size-4 text-[#52525b]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                aria-label="Search apps"
                placeholder="Search apps…  /"
                className="h-9 w-full rounded-lg border border-[#ffffff15] bg-[#111111] pr-3 pl-9 text-sm text-[#f4f4f5] outline-none placeholder:text-[#52525b] focus:border-[#ffffff30] focus:ring-2 focus:ring-white/[0.06]"
              />
            </div>
            <label className="sr-only" htmlFor="environment-filter">
              Filter by environment
            </label>
            <select
              id="environment-filter"
              value={environment}
              onChange={(event) => setEnvironment(event.target.value)}
              className="h-9 rounded-lg border border-[#ffffff15] bg-[#111111] px-3 text-sm text-[#a1a1aa] outline-none focus:border-[#ffffff30]"
            >
              <option value="all">All environments</option>
              <option value="production">Production</option>
              <option value="staging">Staging</option>
              <option value="preview">Preview</option>
              <option value="development">Development</option>
            </select>
            <label className="sr-only" htmlFor="sort-filter">
              Sort apps
            </label>
            <select
              id="sort-filter"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className="h-9 rounded-lg border border-[#ffffff15] bg-[#111111] px-3 text-sm text-[#a1a1aa] outline-none focus:border-[#ffffff30]"
            >
              <option value="activity">Recent activity</option>
              <option value="name">App name</option>
              <option value="status">Status</option>
            </select>
          </div>
          <div
            className="flex flex-wrap items-center gap-1.5"
            aria-label="Filter by status"
          >
            {[
              { id: "all", label: "All", count: summary.total },
              { id: "healthy", label: "Healthy", count: summary.healthy },
              { id: "active", label: "Deploying", count: summary.active },
              { id: "failed", label: "Needs attention", count: summary.failed },
            ].map((filter) => (
              <button
                key={filter.id}
                type="button"
                aria-pressed={statusFilter === filter.id}
                onClick={() => setStatusFilter(filter.id)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:outline-none",
                  statusFilter === filter.id
                    ? "bg-[#f4f4f5] text-[#0a0a0a]"
                    : "bg-[#111111] text-[#71717a] ring-1 ring-white/[0.08] hover:text-[#f4f4f5]",
                )}
              >
                {filter.label}{" "}
                <span className="font-mono opacity-60">{filter.count}</span>
              </button>
            ))}
            <span className="ml-auto text-[11px] text-[#52525b]">
              {visibleApps.length} of {summary.total} apps
            </span>
          </div>
        </div>

        {apps.isLoading ? <DashboardSkeleton /> : null}

        {apps.isError ? (
          <div
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4"
            style={{ background: "#1a0505", border: "0.5px solid #f8717130" }}
          >
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#f87171]" />
              <div>
                <p className="text-sm text-[#f87171]">
                  Unable to refresh deployment data.
                </p>
                <p className="mt-1 text-xs text-[#a1a1aa]">
                  Check the API URL, VPN access, and session PIN.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void apps.refetch()}
              className="border-red-500/25 bg-transparent text-red-200 hover:bg-red-950/50"
            >
              Try again
            </Button>
          </div>
        ) : null}

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
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div
                className="flex size-12 items-center justify-center rounded-xl"
                style={{
                  background: "#111111",
                  border: "0.5px solid #ffffff15",
                }}
              >
                <Search className="size-5 text-[#3f3f46]" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#f4f4f5]">
                  {apps.data.length === 0
                    ? "No apps configured"
                    : "No matching apps"}
                </h4>
                <p className="mt-1 max-w-xs text-xs text-[#71717a]">
                  {apps.data.length === 0
                    ? "Add your deploy targets to apps.config.local.json to get started."
                    : "Try another search, environment, or status filter."}
                </p>
              </div>
            </div>
          )
        ) : null}

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
