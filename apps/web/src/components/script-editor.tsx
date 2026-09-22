"use client";

import { isAxiosError } from "axios";
import { AlertTriangle, Code2, Loader2, RotateCcw, Save } from "lucide-react";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSaveScript, useScript } from "@/lib/hooks/use-script";
import { cn } from "@/lib/utils";
import type { ScriptKind } from "@/types";

type ScriptEditorProps = {
  appId: string;
  appLabel: string;
  editableScripts: ScriptKind[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function errorMessage(error: unknown) {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Unable to save the script";
}

function LoadedEditor({
  appId,
  document,
  saved,
  onDirtyChange,
  onSaved,
}: {
  appId: string;
  document: import("@/types").ScriptDocument;
  saved: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const [content, setContent] = useState(document.content);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveScript = useSaveScript(appId, document.kind);
  const dirty = content !== document.content;

  async function save() {
    setSaveError(null);
    try {
      await saveScript.mutateAsync({
        content,
        expectedVersion: document.version,
      });
      onDirtyChange(false);
      onSaved();
    } catch (error) {
      setSaveError(errorMessage(error));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
        <span>{document.filename}</span>
        <span>{new Blob([content]).size.toLocaleString()} bytes</span>
      </div>
      <textarea
        value={content}
        onChange={(event) => {
          const nextContent = event.target.value;
          setContent(nextContent);
          setSaveError(null);
          onDirtyChange(nextContent !== document.content);
        }}
        spellCheck={false}
        aria-label={`${document.kind} script contents`}
        className="min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-5 text-zinc-200 transition-colors outline-none focus:border-sky-500/50"
      />
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 text-xs">
          {saveError ? (
            <p className="truncate text-red-400" title={saveError}>
              {saveError}
            </p>
          ) : saved ? (
            <p className="text-emerald-400">Saved successfully.</p>
          ) : (
            <p className="text-zinc-600">
              Shell syntax is checked before the file is replaced.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={!dirty || saveScript.isPending}
          onClick={() => void save()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-40"
        >
          {saveScript.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save script
        </button>
      </div>
    </>
  );
}

export function ScriptEditor({
  appId,
  appLabel,
  editableScripts,
  open,
  onOpenChange,
}: ScriptEditorProps) {
  const [kind, setKind] = useState<ScriptKind>(editableScripts[0] ?? "deploy");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const script = useScript(appId, kind, open && editableScripts.includes(kind));

  useEffect(() => {
    if (!saved) return;
    const timeout = window.setTimeout(() => setSaved(false), 2_000);
    return () => window.clearTimeout(timeout);
  }, [saved]);

  function requestOpenChange(nextOpen: boolean) {
    if (
      !nextOpen &&
      dirty &&
      !window.confirm("Discard your unsaved script changes?")
    ) {
      return;
    }
    if (!nextOpen) setDirty(false);
    onOpenChange(nextOpen);
  }

  function changeKind(nextKind: ScriptKind) {
    if (nextKind === kind) return;
    if (dirty && !window.confirm("Discard your unsaved script changes?"))
      return;
    setDirty(false);
    setSaved(false);
    setKind(nextKind);
  }

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent
        className="w-full border-white/10 bg-[#0b0c10] text-zinc-100 sm:max-w-3xl"
        aria-describedby={`${appId}-script-description`}
      >
        <SheetHeader className="border-b border-white/[0.07] px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-zinc-100">
            <Code2 className="size-4 text-sky-400" />
            Edit deployment script
          </SheetTitle>
          <SheetDescription
            id={`${appId}-script-description`}
            className="text-zinc-500"
          >
            {appLabel} · Changes apply to the next deployment.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 px-5 pb-5">
          {editableScripts.length > 1 ? (
            <div className="flex gap-1 rounded-lg bg-zinc-950 p-1 ring-1 ring-white/[0.07]">
              {editableScripts.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => changeKind(option)}
                  className={cn(
                    "flex-1 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                    kind === option
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-500 hover:text-zinc-300",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : null}

          {script.isPending ? (
            <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading script…
            </div>
          ) : script.isError ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
              <AlertTriangle className="size-6 text-amber-400" />
              <p className="max-w-md text-sm text-zinc-400">
                {errorMessage(script.error)}
              </p>
              <button
                type="button"
                onClick={() => void script.refetch()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/5"
              >
                <RotateCcw className="size-3.5" /> Retry
              </button>
            </div>
          ) : script.data ? (
            <LoadedEditor
              key={`${kind}-${script.data.version}`}
              appId={appId}
              document={script.data}
              saved={saved}
              onDirtyChange={(nextDirty) => {
                setDirty(nextDirty);
                if (nextDirty) setSaved(false);
              }}
              onSaved={() => setSaved(true)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
