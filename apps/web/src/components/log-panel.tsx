"use client";

import { Clock3 } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import { StatusBadge } from "@/components/status-badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { getPin, PIN_QUERY_PARAM, redirectToLogin } from "@/lib/auth";
import { formatDeployTime, formatRelativeDeployTime } from "@/lib/deploys";
import { useDeployHistory } from "@/lib/hooks/use-deploy-history";
import { cn } from "@/lib/utils";
import type { DeployHistoryItem, DeployStatus } from "@/types";

type LogPanelProps = {
  appId: string;
  appLabel: string;
  status?: DeployStatus;
  open: boolean;
  onClose: () => void;
};

type LogLine = {
  id: number;
  text: string;
  kind: "normal" | "success" | "error" | "warning" | "separator";
};

function getLineKind(text: string): LogLine["kind"] {
  const lower = text.toLowerCase();

  if (lower.includes("error") || lower.includes("failed")) {
    return "error";
  }

  if (lower.includes("warn") || lower.includes("warning")) {
    return "warning";
  }

  if (
    lower.includes("success") ||
    lower.includes("done") ||
    lower.includes("successfully") ||
    text.includes("\u2713")
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full rounded-lg px-3 py-2 text-left transition-colors",
        active ? "bg-[#ffffff10]" : "hover:bg-[#ffffff08]",
      )}
      style={{ border: "0.5px solid #ffffff12" }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-mono text-[11px] text-[#f4f4f5]">
            {deploy.id}
          </p>
          <p className="mt-1 text-xs text-[#71717a]">
            {formatRelativeDeployTime(deploy.createdAt)}
          </p>
        </div>
        <StatusBadge status={deploy.status} />
      </div>
    </button>
  );
}

function StreamedDeployLogs({ deployId }: { deployId: string | null }) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  useEffect(() => {
    if (!deployId) {
      return;
    }

    const pin = getPin();

    if (!pin) {
      redirectToLogin();
      return;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    let sequence = 0;

    const pushLine = (text: string, kind = getLineKind(text)) => {
      setLines((current) => [...current, { id: sequence++, text, kind }]);
    };

    if (!baseUrl) {
      pushLine("Missing NEXT_PUBLIC_API_URL", "error");
      return;
    }

    const url = new URL(`/logs/${deployId}`, baseUrl);
    url.searchParams.set(PIN_QUERY_PARAM, pin);

    const eventSource = new EventSource(url.toString());
    let finished = false;

    const finishStream = () => {
      if (finished) {
        return;
      }

      finished = true;
      pushLine("Deploy finished", "separator");
      eventSource.close();
    };

    const handleLog = (event: MessageEvent<string>) => {
      pushLine(event.data);
    };

    const handleExit = (event: MessageEvent<string>) => {
      pushLine(`Deploy ${event.data}`, getLineKind(event.data));
      finishStream();
    };

    eventSource.onmessage = handleLog;
    eventSource.addEventListener("log", handleLog);
    eventSource.addEventListener("exit", handleExit);
    eventSource.onerror = () => {
      if (finished || eventSource.readyState === EventSource.CLOSED) {
        finishStream();
        return;
      }

      pushLine("Log stream disconnected", "error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [deployId]);

  if (!deployId) {
    return <p className="text-[#3f3f46]">Select a deploy first.</p>;
  }

  return (
    <>
      {lines.length === 0 ? (
        <p className="text-[#3f3f46]">Waiting for log output...</p>
      ) : null}

      {lines.map((line) =>
        line.kind === "separator" ? (
          <div key={line.id} className="flex items-center gap-3 py-4">
            <Separator className="flex-1" style={{ background: "#ffffff10" }} />
            <span className="font-mono text-[10px] tracking-[0.3em] text-[#3f3f46] uppercase">
              {line.text}
            </span>
            <Separator className="flex-1" style={{ background: "#ffffff10" }} />
          </div>
        ) : (
          <p
            key={line.id}
            className={cn(
              "break-words whitespace-pre-wrap",
              line.kind === "normal" && "text-[#71717a]",
              line.kind === "error" && "text-[#f87171]",
              line.kind === "success" && "text-[#4ade80]",
              line.kind === "warning" && "text-[#4ade80]",
            )}
          >
            {line.text}
          </p>
        ),
      )}
      <div ref={bottomRef} />
    </>
  );
}

export function LogPanel({
  appId,
  appLabel,
  status,
  open,
  onClose,
}: LogPanelProps) {
  const [manualSelectedDeployId, setManualSelectedDeployId] = useState<string | null>(null);
  const history = useDeployHistory(appId, open);
  const selectedDeployId =
    manualSelectedDeployId &&
    history.data?.some((deploy) => deploy.id === manualSelectedDeployId)
      ? manualSelectedDeployId
      : history.data?.[0]?.id ?? null;

  const selectedDeploy =
    history.data?.find((deploy) => deploy.id === selectedDeployId) ?? null;
  const selectedStatus = selectedDeploy?.status ?? status;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-5xl"
        style={{ background: "#050505", borderLeft: "0.5px solid #ffffff12" }}
      >
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
          transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <SheetHeader
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottom: "0.5px solid #ffffff10" }}
          >
            <div className="flex items-center gap-3">
              <SheetTitle className="text-sm font-medium text-[#f4f4f5]">
                {appLabel}
              </SheetTitle>
              {selectedStatus && <StatusBadge status={selectedStatus} />}
            </div>
            <SheetDescription className="max-w-[220px] truncate font-mono text-xs text-[#3f3f46]">
              {selectedDeployId ?? "No deploy selected"}
            </SheetDescription>
          </SheetHeader>

          <div className="grid min-h-0 flex-1 md:grid-cols-[280px_minmax(0,1fr)]">
            <div
              className="min-h-0 border-b md:border-r md:border-b-0"
              style={{ borderColor: "#ffffff10" }}
            >
              <div className="px-5 py-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#3f3f46]">
                  <Clock3 className="size-3.5" />
                  Deploy history
                </div>
              </div>
              <ScrollArea className="h-[240px] md:h-full">
                <div className="space-y-2 px-4 pb-4">
                  {history.isLoading ? (
                    <p className="px-1 text-sm text-[#3f3f46]">
                      Loading deploy history...
                    </p>
                  ) : null}
                  {history.isError ? (
                    <p className="px-1 text-sm text-[#f87171]">
                      Failed to load deploy history.
                    </p>
                  ) : null}
                  {!history.isLoading &&
                  !history.isError &&
                  history.data?.length === 0 ? (
                    <p className="px-1 text-sm text-[#3f3f46]">
                      No deploy history yet.
                    </p>
                  ) : null}
                  {history.data?.map((deploy) => (
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

            <div className="min-h-0">
              <div
                className="px-5 py-3"
                style={{ borderBottom: "0.5px solid #ffffff10" }}
              >
                <p className="font-mono text-xs text-[#71717a]">
                  {selectedDeploy?.createdAt
                    ? formatDeployTime(selectedDeploy.createdAt)
                    : "Select a deploy to inspect logs"}
                </p>
              </div>

              <ScrollArea className="h-[420px] md:h-[calc(100vh-10rem)]">
                <div className="space-y-0.5 p-5 font-mono text-[12px] leading-[1.8] text-[#71717a]">
                  <StreamedDeployLogs key={selectedDeployId ?? "empty"} deployId={selectedDeployId} />
                </div>
              </ScrollArea>
            </div>
          </div>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
