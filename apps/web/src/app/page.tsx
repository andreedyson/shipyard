"use client";

import { AlertCircle, Layers, ShipWheel } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";

import { AppCard } from "@/components/app-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getPin, removePin } from "@/lib/auth";
import { useApps } from "@/lib/hooks/use-apps";

function DashboardSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border bg-card p-5"
        >
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-5 w-32 bg-white/6" />
            <Skeleton className="h-5 w-16 rounded-full bg-white/6" />
          </div>
          <div className="mt-7 space-y-1.5">
            <Skeleton className="h-3 w-20 bg-white/6" />
            <Skeleton className="h-4 w-40 bg-white/6" />
          </div>
          <div className="mt-7 flex justify-between gap-3">
            <Skeleton className="h-8 w-24 bg-white/6" />
            <Skeleton className="h-8 w-20 bg-white/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pin = useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);

      return () => window.removeEventListener("storage", onStoreChange);
    },
    getPin,
    () => null,
  );
  const hasPin = Boolean(pin);
  const apps = useApps({ enabled: hasPin });

  useEffect(() => {
    if (!pin) {
      router.replace("/login");
    }
  }, [router, pin]);

  const handleLogout = () => {
    removePin();
    router.replace("/login");
  };

  if (!hasPin) {
    return null;
  }

  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <section className="mx-auto flex max-w-7xl flex-col gap-8">
        {/* Header */}
        <header className="flex items-center justify-between py-1">
          <div className="flex items-center gap-3">
            <ShipWheel className="size-5 text-white/60" />
            <span className="text-sm font-semibold tracking-tight text-foreground">
              Shipyard
            </span>
            <span className="rounded border border-white/10 bg-white/5 px-2 py-px font-mono text-[10px] font-medium uppercase tracking-widest text-white/35">
              VPN ONLY
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="h-8 border-border text-xs text-muted-foreground hover:bg-white/5 hover:text-foreground"
          >
            Clear PIN
          </Button>
        </header>

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
            Deployment board
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor apps, trigger deploys, and tail live logs from the Shipyard
            API.
          </p>
        </div>

        {/* Loading */}
        {apps.isLoading ? <DashboardSkeleton /> : null}

        {/* Error */}
        {apps.isError ? (
          <div className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-red-500/5 p-4">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-400">
              Failed to load apps. Check the API URL, VPN access, and PIN.
            </p>
          </div>
        ) : null}

        {/* App grid */}
        {apps.data ? (
          apps.data.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {apps.data.map((app) => (
                <AppCard key={app.id} app={app} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-20 text-center">
              <div className="flex size-12 items-center justify-center rounded-xl border border-border bg-card">
                <Layers className="size-5 text-muted-foreground" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-foreground">
                  No apps configured
                </h4>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  No apps were returned from the Shipyard API. Configure your
                  apps in the backend to see them here.
                </p>
              </div>
            </div>
          )
        ) : null}
      </section>
    </main>
  );
}
