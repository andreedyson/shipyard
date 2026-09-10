"use client";

import { AlertTriangle, GitCommitHorizontal, Loader2 } from "lucide-react";
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
import type { Deploy, DeployStatus } from "@/types";

type DeployButtonProps = {
  appId: string;
  status: DeployStatus;
  appLabel?: string;
  environment?: string;
  currentRevision?: string | null;
  latestDeploy?: Deploy | null;
  onStarted?: (deployId: string) => void;
};

export function DeployButton({
  appId,
  status,
  appLabel,
  environment,
  currentRevision,
  latestDeploy,
  onStarted,
}: DeployButtonProps) {
  const deploy = useDeploy();
  const isRunning =
    ["queued", "running", "verifying"].includes(status) || deploy.isPending;
  const [open, setOpen] = useState(false);

  const isRetry = ["failed", "timed_out", "interrupted", "cancelled"].includes(
    status,
  );
  const isProduction = environment === "production";

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
                  This will {isRetry ? "retry the deployment for" : "deploy"}{" "}
                  <span className="font-medium text-[#f4f4f5]">{appLabel}</span>
                  . The process will start immediately. It can be cancelled
                  while running, but side effects may not be reversible.
                </>
              ) : (
                <>
                  This will{" "}
                  {isRetry ? "retry the deployment" : "start a new deployment"}.
                  The process will start immediately. It can be cancelled while
                  running, but side effects may not be reversible.
                </>
              )}
            </AlertDialogDescription>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-white/[0.08] bg-[#171717] p-3 text-xs">
              <div>
                <p className="text-[#71717a]">Environment</p>
                <p className="mt-1 font-medium text-[#f4f4f5] capitalize">
                  {environment ?? "unknown"}
                </p>
              </div>
              <div>
                <p className="text-[#71717a]">Current live revision</p>
                <p className="mt-1 flex items-center gap-1 font-mono text-[#f4f4f5]">
                  <GitCommitHorizontal className="size-3 text-[#71717a]" />
                  {currentRevision?.slice(0, 8) ?? "Not available"}
                </p>
              </div>
              {latestDeploy?.commitMessage ? (
                <div className="col-span-2 border-t border-white/[0.06] pt-2">
                  <p className="text-[#71717a]">Last deployment</p>
                  <p className="mt-1 line-clamp-2 text-[#d4d4d8]">
                    {latestDeploy.commitMessage}
                  </p>
                </div>
              ) : null}
            </div>
            {isProduction ? (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-950/25 p-3 text-xs text-amber-200">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-300" />
                <p>
                  This is a production deployment. Confirm that the target
                  branch and working tree are ready before continuing.
                </p>
              </div>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-[#ffffff15] bg-transparent text-[#71717a] hover:bg-[#ffffff08] hover:text-[#f4f4f5]">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-[#f4f4f5] text-[#0a0a0a] hover:bg-[#e4e4e7]"
              onClick={() =>
                deploy.mutate(appId, {
                  onSuccess: (result) => {
                    setOpen(false);
                    onStarted?.(result.deployId);
                  },
                })
              }
            >
              {isRetry ? "Retry" : "Deploy"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
