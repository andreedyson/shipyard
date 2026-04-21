"use client";

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
  kind: "normal" | "success" | "error" | "separator";
};

function getLineKind(text: string): LogLine["kind"] {
  const lower = text.toLowerCase();

  if (lower.includes("error") || lower.includes("failed")) {
    return "error";
  }

  if (lower.includes("success") || lower.includes("done")) {
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
      <SheetContent className="flex w-full flex-col gap-0 border-l border-white/7 bg-[#080808] p-0 text-zinc-100 sm:max-w-2xl">
        <SheetHeader className="flex-row items-center justify-between border-b border-white/7 px-5 py-4">
          <div className="flex items-center gap-3">
            <SheetTitle className="text-sm font-medium text-foreground">
              {appLabel}
            </SheetTitle>
            {status && <StatusBadge status={status} />}
          </div>
          <SheetDescription className="font-mono text-xs text-zinc-600">
            {deployId ?? "-"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-px p-5 font-mono text-[13px] leading-[1.65]">
            {lines.length === 0 ? (
              <p className="text-zinc-600">Waiting for log output...</p>
            ) : null}

            {lines.map((line) =>
              line.kind === "separator" ? (
                <div key={line.id} className="flex items-center gap-3 py-4">
                  <Separator className="flex-1 bg-white/7" />
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-600">
                    {line.text}
                  </span>
                  <Separator className="flex-1 bg-white/7" />
                </div>
              ) : (
                <p
                  key={line.id}
                  className={cn(
                    "whitespace-pre-wrap break-words",
                    line.kind === "normal" && "text-zinc-400",
                    line.kind === "error" && "text-[#f87171]",
                    line.kind === "success" && "text-[#4ade80]",
                  )}
                >
                  {line.text}
                </p>
              ),
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
