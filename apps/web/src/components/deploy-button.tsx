"use client";

import { Loader2 } from "lucide-react";

import { useDeploy } from "@/lib/hooks/use-deploy";
import { statusConfig } from "@/lib/status";
import type { DeployStatus } from "@/types";

type DeployButtonProps = {
  appId: string;
  status: DeployStatus;
};

export function DeployButton({ appId, status }: DeployButtonProps) {
  const deploy = useDeploy();
  const isRunning = status === "running" || deploy.isPending;

  return (
    <button
      type="button"
      disabled={isRunning}
      onClick={() => deploy.mutate(appId)}
      className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg bg-[#f4f4f5] px-3.5 py-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#e4e4e7] disabled:pointer-events-none disabled:opacity-50"
    >
      {isRunning ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : null}
      {isRunning ? "Deploying..." : statusConfig[status].deployLabel}
    </button>
  );
}
