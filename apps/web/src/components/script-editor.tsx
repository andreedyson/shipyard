"use client";

import { isAxiosError } from "axios";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Code2,
  Eye,
  ListTree,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useSaveScript, useScript } from "@/lib/hooks/use-script";
import {
  createPipelineStepId,
  generatePipeline,
  parsePipeline,
  type PipelineDefinition,
} from "@/lib/pipeline";
import { cn } from "@/lib/utils";
import type { ScriptDocument, ScriptKind } from "@/types";

type ScriptEditorProps = {
  appId: string;
  appLabel: string;
  editableScripts: ScriptKind[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type EditorMode = "pipeline" | "advanced";

function errorMessage(error: unknown) {
  if (isAxiosError<{ error?: string }>(error)) {
    return error.response?.data?.error ?? error.message;
  }
  return error instanceof Error ? error.message : "Unable to save the script";
}

function PipelineWorkspace({
  appId,
  document,
  saved,
  onDirtyChange,
  onSaved,
}: {
  appId: string;
  document: ScriptDocument;
  saved: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onSaved: () => void;
}) {
  const initial = parsePipeline(document.content);
  const [mode, setMode] = useState<EditorMode>("pipeline");
  const [definition, setDefinition] = useState(initial.definition);
  const [structured, setStructured] = useState(initial.structured);
  const [content, setContent] = useState(document.content);
  const [saveError, setSaveError] = useState<string | null>(null);
  const saveScript = useSaveScript(appId, document.kind);
  const dirty = content !== document.content;
  const pipelineValid =
    definition.steps.length > 0 &&
    definition.steps.every(
      (step) => step.name.trim().length > 0 && step.command.trim().length > 0,
    );

  function setNextContent(nextContent: string) {
    setContent(nextContent);
    setSaveError(null);
    onDirtyChange(nextContent !== document.content);
  }

  function applyDefinition(nextDefinition: PipelineDefinition) {
    setDefinition(nextDefinition);
    setStructured(true);
    setNextContent(generatePipeline(nextDefinition));
  }

  function updateStep(
    stepIndex: number,
    patch: Partial<PipelineDefinition["steps"][number]>,
  ) {
    applyDefinition({
      ...definition,
      steps: definition.steps.map((step, index) =>
        index === stepIndex ? { ...step, ...patch } : step,
      ),
    });
  }

  function moveStep(stepIndex: number, direction: -1 | 1) {
    const destination = stepIndex + direction;
    if (destination < 0 || destination >= definition.steps.length) return;
    const steps = [...definition.steps];
    [steps[stepIndex], steps[destination]] = [
      steps[destination]!,
      steps[stepIndex]!,
    ];
    applyDefinition({ ...definition, steps });
  }

  function removeStep(stepIndex: number) {
    if (definition.steps.length === 1) return;
    if (
      !window.confirm(
        `Delete “${definition.steps[stepIndex]?.name ?? "this step"}” from the pipeline?`,
      )
    ) {
      return;
    }
    applyDefinition({
      ...definition,
      steps: definition.steps.filter((_, index) => index !== stepIndex),
    });
  }

  function addStep() {
    const steps = [
      ...definition.steps,
      {
        id: createPipelineStepId(),
        name: `Step ${definition.steps.length + 1}`,
        command: 'echo "Add command here"',
        enabled: true,
      },
    ];
    applyDefinition({ ...definition, steps });
  }

  function changeMode(nextMode: EditorMode) {
    if (nextMode === mode) return;
    if (nextMode === "pipeline") {
      const parsed = parsePipeline(content);
      setDefinition(parsed.definition);
      setStructured(parsed.structured);
    }
    setMode(nextMode);
  }

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
      <div className="flex items-center justify-between gap-3">
        <div className="flex rounded-lg bg-zinc-950 p-1 ring-1 ring-white/[0.07]">
          <button
            type="button"
            onClick={() => changeMode("pipeline")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "pipeline"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <ListTree className="size-3.5" /> Pipeline steps
          </button>
          <button
            type="button"
            onClick={() => changeMode("advanced")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === "advanced"
                ? "bg-zinc-800 text-zinc-100"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            <Code2 className="size-3.5" /> Advanced
          </button>
        </div>
        <span className="font-mono text-[10px] text-zinc-600">
          {new Blob([content]).size.toLocaleString()} bytes
        </span>
      </div>

      {mode === "pipeline" ? (
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {!structured ? (
            <div className="mb-3 flex items-start justify-between gap-3 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3">
              <div>
                <p className="text-xs font-medium text-amber-300">
                  Existing script imported as editable blocks
                </p>
                <p className="mt-1 text-[11px] leading-4 text-amber-200/60">
                  Review the inferred steps. Converting only adds safe Shipyard
                  markers; the commands remain shell commands.
                </p>
              </div>
              <button
                type="button"
                onClick={() => applyDefinition(definition)}
                className="shrink-0 rounded-lg border border-amber-400/20 px-2.5 py-1.5 text-[11px] font-medium text-amber-200 hover:bg-amber-400/10"
              >
                Convert
              </button>
            </div>
          ) : null}

          <div className="space-y-2.5">
            {definition.steps.map((step, index) => (
              <div
                key={step.id}
                className={cn(
                  "rounded-xl border bg-zinc-950/60 p-3 transition-colors",
                  step.enabled
                    ? "border-white/[0.08]"
                    : "border-white/[0.05] opacity-60",
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-sky-950 font-mono text-[10px] font-semibold text-sky-400 ring-1 ring-sky-500/20">
                    {index + 1}
                  </span>
                  <input
                    value={step.name}
                    onChange={(event) =>
                      updateStep(index, { name: event.target.value })
                    }
                    aria-label={`Name for step ${index + 1}`}
                    className="min-w-0 flex-1 bg-transparent text-xs font-semibold text-zinc-200 outline-none placeholder:text-zinc-700"
                    placeholder="Step name"
                  />
                  <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-zinc-500">
                    <input
                      type="checkbox"
                      checked={step.enabled}
                      onChange={(event) =>
                        updateStep(index, { enabled: event.target.checked })
                      }
                      className="accent-sky-500"
                    />
                    Enabled
                  </label>
                  <div className="flex items-center">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => moveStep(index, -1)}
                      aria-label={`Move ${step.name} up`}
                      className="rounded p-1 text-zinc-600 hover:bg-white/5 hover:text-zinc-300 disabled:opacity-20"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === definition.steps.length - 1}
                      onClick={() => moveStep(index, 1)}
                      aria-label={`Move ${step.name} down`}
                      className="rounded p-1 text-zinc-600 hover:bg-white/5 hover:text-zinc-300 disabled:opacity-20"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={definition.steps.length === 1}
                      onClick={() => removeStep(index)}
                      aria-label={`Delete ${step.name}`}
                      className="rounded p-1 text-zinc-600 hover:bg-red-950/50 hover:text-red-400 disabled:pointer-events-none disabled:opacity-20"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <textarea
                  value={step.command}
                  onChange={(event) =>
                    updateStep(index, { command: event.target.value })
                  }
                  spellCheck={false}
                  rows={Math.max(
                    2,
                    Math.min(7, step.command.split("\n").length),
                  )}
                  aria-label={`Command for ${step.name}`}
                  className="mt-2 w-full resize-y rounded-lg border border-white/[0.06] bg-black/30 px-3 py-2 font-mono text-[11px] leading-4 text-zinc-300 outline-none focus:border-sky-500/40"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addStep}
            className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/10 py-2.5 text-xs font-medium text-zinc-500 transition-colors hover:border-sky-500/30 hover:bg-sky-950/10 hover:text-sky-300"
          >
            <Plus className="size-3.5" /> Add command step
          </button>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="flex items-center justify-between font-mono text-[10px] text-zinc-500">
            <span>{document.filename}</span>
            <span className="flex items-center gap-1">
              <Eye className="size-3" /> Exact executable script
            </span>
          </div>
          <textarea
            value={content}
            onChange={(event) => setNextContent(event.target.value)}
            spellCheck={false}
            aria-label={`${document.kind} script contents`}
            className="min-h-0 flex-1 resize-none rounded-xl border border-white/10 bg-black/40 p-4 font-mono text-xs leading-5 text-zinc-200 transition-colors outline-none focus:border-sky-500/50"
          />
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-white/[0.06] pt-3">
        <div className="min-w-0 text-xs">
          {saveError ? (
            <p className="truncate text-red-400" title={saveError}>
              {saveError}
            </p>
          ) : saved ? (
            <p className="text-emerald-400">Pipeline saved successfully.</p>
          ) : (
            <p className="text-zinc-600">
              Shell syntax is checked before replacing the live script.
            </p>
          )}
        </div>
        <button
          type="button"
          disabled={
            !dirty ||
            saveScript.isPending ||
            !content.trim() ||
            (mode === "pipeline" && !pipelineValid)
          }
          onClick={() => void save()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-950 transition-colors hover:bg-white disabled:pointer-events-none disabled:opacity-40"
        >
          {saveScript.isPending ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Save className="size-3.5" />
          )}
          Save pipeline
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
      !window.confirm("Discard your unsaved pipeline changes?")
    ) {
      return;
    }
    if (!nextOpen) setDirty(false);
    onOpenChange(nextOpen);
  }

  function changeKind(nextKind: ScriptKind) {
    if (nextKind === kind) return;
    if (dirty && !window.confirm("Discard your unsaved pipeline changes?"))
      return;
    setDirty(false);
    setSaved(false);
    setKind(nextKind);
  }

  return (
    <Sheet open={open} onOpenChange={requestOpenChange}>
      <SheetContent
        className="w-full gap-0 border-white/10 bg-[#0b0c10] text-zinc-100 sm:max-w-3xl"
        aria-describedby={`${appId}-script-description`}
      >
        <SheetHeader className="border-b border-white/[0.07] px-5 py-4">
          <SheetTitle className="flex items-center gap-2 text-zinc-100">
            <ListTree className="size-4 text-sky-400" />
            Deployment pipeline
          </SheetTitle>
          <SheetDescription
            id={`${appId}-script-description`}
            className="text-zinc-500"
          >
            {appLabel} · Steps run from top to bottom on the next deployment.
          </SheetDescription>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-3 p-5">
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
              <Loader2 className="mr-2 size-4 animate-spin" /> Loading pipeline…
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
            <PipelineWorkspace
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
