"use client";

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
import { cn } from "@/lib/utils";
import type { DeployStatus } from "@/types";

type LogPanelProps = {
  deployId: string | null;
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
    text.includes("✓")
  ) {
    return "success";
  }

  return "normal";
}

export function LogPanel({
  deployId,
  appLabel,
  status,
  open,
  onClose,
}: LogPanelProps) {
  const [lines, setLines] = useState<LogLine[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [lines]);

  useEffect(() => {
    if (!open || !deployId) {
      return;
    }

    const pin = getPin();

    if (!pin) {
      redirectToLogin();
      return;
    }

    setLines([]);

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
  }, [deployId, open]);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        style={{ background: "#050505", borderLeft: "0.5px solid #ffffff12" }}
      >
        <motion.div
          initial={{ opacity: 0, x: 12 }}
          animate={open ? { opacity: 1, x: 0 } : { opacity: 0, x: 12 }}
          transition={{ duration: 0.3, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 flex-col overflow-hidden"
        >
          {/* Header */}
          <SheetHeader
            className="flex-row items-center justify-between px-5 py-4"
            style={{ borderBottom: "0.5px solid #ffffff10" }}
          >
            <div className="flex items-center gap-3">
              <SheetTitle className="text-sm font-medium text-[#f4f4f5]">
                {appLabel}
              </SheetTitle>
              {status && <StatusBadge status={status} />}
            </div>
            <SheetDescription className="max-w-[160px] truncate font-mono text-xs text-[#3f3f46]">
              {deployId ?? "—"}
            </SheetDescription>
          </SheetHeader>

          {/* Log output */}
          <ScrollArea className="flex-1">
            <div className="space-y-px p-5 font-mono text-[12px] leading-[1.8] text-[#71717a]">
              {lines.length === 0 ? (
                <p className="text-[#3f3f46]">Waiting for log output...</p>
              ) : null}

              {lines.map((line) =>
                line.kind === "separator" ? (
                  <div key={line.id} className="flex items-center gap-3 py-4">
                    <Separator
                      className="flex-1"
                      style={{ background: "#ffffff10" }}
                    />
                    <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#3f3f46]">
                      {line.text}
                    </span>
                    <Separator
                      className="flex-1"
                      style={{ background: "#ffffff10" }}
                    />
                  </div>
                ) : (
                  <p
                    key={line.id}
                    className={cn(
                      "whitespace-pre-wrap break-words",
                      line.kind === "normal" && "text-[#71717a]",
                      line.kind === "error" && "text-[#f87171]",
                      line.kind === "success" && "text-[#4ade80]",
                      line.kind === "warning" && "text-[#fb923c]",
                    )}
                  >
                    {line.text}
                  </p>
                ),
              )}
              <div ref={bottomRef} />
            </div>
          </ScrollArea>
        </motion.div>
      </SheetContent>
    </Sheet>
  );
}
