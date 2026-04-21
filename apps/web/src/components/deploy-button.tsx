"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
    <Button
      type="button"
      size="sm"
      disabled={isRunning}
      onClick={() => deploy.mutate(appId)}
      className="min-w-24 gap-1.5"
    >
      {isRunning ? (
        <Loader2 className="size-3.5 animate-spin" />
      ) : null}
      {isRunning ? "Deploying..." : statusConfig[status].deployLabel}
    </Button>
  );
}
