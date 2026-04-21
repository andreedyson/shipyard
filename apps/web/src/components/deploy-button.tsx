"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeploy } from "@/lib/hooks/use-deploy";
import { statusConfig } from "@/lib/status";
import type { DeployStatus } from "@/types";

type DeployButtonProps = {
  appId: string;
  status: DeployStatus;
  appLabel?: string;
};

export function DeployButton({ appId, status, appLabel }: DeployButtonProps) {
  const deploy = useDeploy();
  const isRunning = status === "running" || deploy.isPending;
  const [open, setOpen] = useState(false);

  const isRetry = status === "failed";

  return (
    <>
      <button
        type="button"
        disabled={isRunning}
        onClick={() => setOpen(true)}
        className="inline-flex min-w-24 items-center justify-center gap-1.5 rounded-lg bg-[#f4f4f5] px-3.5 py-1.5 text-[13px] font-medium text-[#0a0a0a] transition-colors hover:bg-[#e4e4e7] disabled:pointer-events-none disabled:opacity-50"
      >
        {isRunning ? <Loader2 className="size-3.5 animate-spin" /> : null}
        {isRunning ? "Deploying..." : statusConfig[status].deployLabel}
      </button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent
          className="border-[#ffffff15] text-[#f4f4f5]"
          style={{ background: "#111111" }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#f4f4f5]">
              {isRetry ? "Retry deployment?" : "Start deployment?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#71717a]">
              {appLabel ? (
                <>
                  This will{" "}
                  {isRetry ? "retry the deployment for" : "deploy"}{" "}
                  <span className="font-medium text-[#f4f4f5]">
                    {appLabel}
                  </span>
                  . The process will start immediately and cannot be
                  interrupted.
                </>
              ) : (
                <>
                  This will{" "}
                  {isRetry
                    ? "retry the deployment"
                    : "start a new deployment"}
                  . The process will start immediately and cannot be
                  interrupted.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#ffffff15] bg-transparent text-[#71717a] hover:bg-[#ffffff08] hover:text-[#f4f4f5]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#f4f4f5] text-[#0a0a0a] hover:bg-[#e4e4e7]"
              onClick={() => deploy.mutate(appId)}
            >
              {isRetry ? "Retry" : "Deploy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
