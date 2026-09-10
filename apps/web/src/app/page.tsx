"use client";

import { AlertCircle, Anchor, Box, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { AppCard } from "@/components/app-card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useApps } from "@/lib/hooks/use-apps";

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
  const [query, setQuery] = useState("");
  const [environment, setEnvironment] = useState("all");
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

  const visibleApps = useMemo(
    () =>
      (apps.data ?? [])
        .filter(
          (app) => environment === "all" || app.environment === environment,
        )
        .filter((app) =>
          `${app.label} ${app.id}`.toLowerCase().includes(query.toLowerCase()),
        )
        .sort(
          (a, b) =>
            Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)),
        ),
    [apps.data, environment, favorites, query],
  );

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

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Header */}
        <header className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2.5">
            <Anchor className="size-4 text-[#71717a]" />
            <span className="text-sm font-semibold tracking-tight text-[#f4f4f5]">
              Shipyard
            </span>
            <span className="rounded-full bg-[#ffffff10] px-2.5 py-0.5 font-mono text-[10px] font-medium tracking-widest text-[#71717a] uppercase">
              VPN / SERVER ONLY
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="h-8 text-xs text-[#71717a] hover:bg-[#ffffff08] hover:text-[#f4f4f5]"
          >
            Sign out
          </Button>
        </header>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f5] md:text-3xl">
            Deployment board
          </h1>
          <p className="mt-1 text-sm text-[#71717a]">
            Monitor apps, trigger deploys, and tail live logs from the Shipyard
            API.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative max-w-md flex-1">
            <Search className="absolute top-2.5 left-3 size-4 text-[#3f3f46]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search apps…  /"
              className="h-9 w-full rounded-lg border border-[#ffffff15] bg-[#111111] pr-3 pl-9 text-sm text-[#f4f4f5] outline-none focus:border-[#ffffff30]"
            />
          </div>
          <select
            value={environment}
            onChange={(event) => setEnvironment(event.target.value)}
            className="h-9 rounded-lg border border-[#ffffff15] bg-[#111111] px-3 text-sm text-[#71717a] outline-none"
          >
            <option value="all">All environments</option>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="preview">Preview</option>
            <option value="development">Development</option>
          </select>
        </div>

        {/* Loading */}
        {apps.isLoading ? <DashboardSkeleton /> : null}

        {/* Error */}
        {apps.isError ? (
          <div
            className="flex items-start gap-3 rounded-xl p-4"
            style={{ background: "#1a0505", border: "0.5px solid #f8717130" }}
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#f87171]" />
            <p className="text-sm text-[#f87171]">
              Failed to load apps. Check the API URL, VPN access, and PIN.
            </p>
          </div>
        ) : null}

        {/* App grid */}
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
                <Box className="size-5 text-[#3f3f46]" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-[#f4f4f5]">
                  {apps.data.length === 0
                    ? "No apps configured"
                    : "No matching apps"}
                </h4>
                <p className="mt-1 max-w-xs text-xs text-[#71717a]">
                  {apps.data.length === 0
                    ? "Add your apps to apps.config.ts to get started."
                    : "Try another search or environment filter."}
                </p>
              </div>
            </div>
          )
        ) : null}
      </section>
    </main>
  );
}
