import { execFile } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { constants } from "node:fs";
import {
  chmod,
  copyFile,
  lstat,
  mkdir,
  open,
  readdir,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
} from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { env } from "../env.js";
import type {
  AppDefinition,
  CommandDefinition,
  ScriptKind,
} from "../types/index.js";

const execFileAsync = promisify(execFile);
const HISTORY_LIMIT = 20;
const saveLocks = new Map<string, Promise<void>>();

export type ScriptDocument = {
  content: string;
  filename: string;
  kind: ScriptKind;
  updatedAt: string;
  version: string;
};

export class ScriptStoreError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 413 | 422 | 500,
  ) {
    super(message);
    this.name = "ScriptStoreError";
  }
}

function versionOf(content: Buffer | string) {
  return createHash("sha256").update(content).digest("hex");
}

function isInside(root: string, candidate: string) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

function commandFor(app: AppDefinition, kind: ScriptKind) {
  const command = kind === "deploy" ? app.deploy : app.rollback;
  if (!command) {
    throw new ScriptStoreError(
      `No ${kind} script is configured for this app`,
      404,
    );
  }
  return command;
}

function configuredPath(command: CommandDefinition) {
  if (!path.isAbsolute(command.command)) {
    throw new ScriptStoreError(
      "Only absolute script paths can be edited in Shipyard",
      400,
    );
  }
  return path.resolve(command.command);
}

function configuredRoot() {
  return path.resolve(env.SCRIPT_EDIT_ROOT);
}

async function resolveSafeTarget(command: CommandDefinition) {
  const root = configuredRoot();
  const target = configuredPath(command);
  if (!isInside(root, target)) {
    throw new ScriptStoreError(
      `This script is outside SCRIPT_EDIT_ROOT (${root})`,
      400,
    );
  }

  try {
    if ((await lstat(target)).isSymbolicLink()) {
      throw new ScriptStoreError("Symbolic-link scripts cannot be edited", 400);
    }
  } catch (error) {
    if (error instanceof ScriptStoreError) throw error;
    throw new ScriptStoreError("The configured script does not exist", 404);
  }

  let realRoot: string;
  let realTarget: string;
  try {
    [realRoot, realTarget] = await Promise.all([
      realpath(root),
      realpath(target),
    ]);
  } catch {
    throw new ScriptStoreError(
      "The configured script or script edit root does not exist",
      404,
    );
  }
  if (!isInside(realRoot, realTarget)) {
    throw new ScriptStoreError(
      "The configured script resolves outside SCRIPT_EDIT_ROOT",
      400,
    );
  }

  const fileStat = await stat(realTarget);
  if (!fileStat.isFile()) {
    throw new ScriptStoreError(
      "The configured command is not a regular file",
      400,
    );
  }
  if (fileStat.size > env.SCRIPT_MAX_BYTES) {
    throw new ScriptStoreError(
      `The script exceeds the ${env.SCRIPT_MAX_BYTES}-byte editor limit`,
      413,
    );
  }
  return { target: realTarget, fileStat };
}

function shellFor(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0] ?? "";
  if (/^#!\s*\/usr\/bin\/env(?:\s+-S)?\s+bash(?:\s|$)/.test(firstLine)) {
    return "bash";
  }
  if (/^#!\s*(?:\/bin\/|\/usr\/bin\/)bash(?:\s|$)/.test(firstLine)) {
    return "bash";
  }
  if (/^#!\s*\/usr\/bin\/env(?:\s+-S)?\s+sh(?:\s|$)/.test(firstLine)) {
    return "sh";
  }
  if (/^#!\s*(?:\/bin\/|\/usr\/bin\/)sh(?:\s|$)/.test(firstLine)) {
    return "sh";
  }
  throw new ScriptStoreError(
    "Editable scripts must start with a Bash or sh shebang, for example #!/usr/bin/env bash",
    422,
  );
}

async function validateSyntax(shell: "bash" | "sh", filename: string) {
  try {
    await execFileAsync(shell, ["-n", filename], {
      timeout: 5_000,
      maxBuffer: 64_000,
    });
  } catch (error) {
    const candidate = error as { stderr?: string; message?: string };
    const detail =
      candidate.stderr?.trim() || candidate.message || "invalid syntax";
    throw new ScriptStoreError(`Shell syntax check failed: ${detail}`, 422);
  }
}

async function withSaveLock<T>(target: string, operation: () => Promise<T>) {
  const previous = saveLocks.get(target) ?? Promise.resolve();
  let release!: () => void;
  const hold = new Promise<void>((resolve) => {
    release = resolve;
  });
  const queued = previous.then(() => hold);
  saveLocks.set(target, queued);
  await previous;
  try {
    return await operation();
  } finally {
    release();
    if (saveLocks.get(target) === queued) saveLocks.delete(target);
  }
}

async function createBackup(target: string, currentVersion: string) {
  const historyDirectory = path.join(
    path.dirname(target),
    ".shipyard-history",
    path.basename(target),
  );
  await mkdir(historyDirectory, { recursive: true, mode: 0o700 });
  const timestamp = new Date().toISOString().replaceAll(":", "-");
  const backup = path.join(
    historyDirectory,
    `${timestamp}-${currentVersion.slice(0, 12)}-${randomUUID().slice(0, 8)}.bak`,
  );
  await copyFile(target, backup, constants.COPYFILE_EXCL);

  const entries = (await readdir(historyDirectory)).sort().reverse();
  await Promise.all(
    entries
      .slice(HISTORY_LIMIT)
      .map((entry) =>
        unlink(path.join(historyDirectory, entry)).catch(() => undefined),
      ),
  );
  return backup;
}

function editable(command: CommandDefinition | undefined) {
  if (!command || !path.isAbsolute(command.command)) return false;
  return isInside(configuredRoot(), path.resolve(command.command));
}

export const scriptStore = {
  editableKinds(app: AppDefinition): ScriptKind[] {
    return (["deploy", "rollback"] as const).filter((kind) =>
      editable(kind === "deploy" ? app.deploy : app.rollback),
    );
  },

  async read(app: AppDefinition, kind: ScriptKind): Promise<ScriptDocument> {
    const command = commandFor(app, kind);
    const { target, fileStat } = await resolveSafeTarget(command);
    const content = await readFile(target);
    if (content.length > env.SCRIPT_MAX_BYTES) {
      throw new ScriptStoreError(
        `The script exceeds the ${env.SCRIPT_MAX_BYTES}-byte editor limit`,
        413,
      );
    }
    return {
      content: content.toString("utf8"),
      filename: path.basename(target),
      kind,
      updatedAt: fileStat.mtime.toISOString(),
      version: versionOf(content),
    };
  },

  async save(
    app: AppDefinition,
    kind: ScriptKind,
    content: string,
    expectedVersion: string,
  ): Promise<ScriptDocument & { previousVersion: string; backup: string }> {
    if (!content.trim())
      throw new ScriptStoreError("Script content is required", 422);
    if (content.includes("\0"))
      throw new ScriptStoreError("Script cannot contain null bytes", 422);
    if (Buffer.byteLength(content) > env.SCRIPT_MAX_BYTES) {
      throw new ScriptStoreError(
        `The script exceeds the ${env.SCRIPT_MAX_BYTES}-byte editor limit`,
        413,
      );
    }
    const shell = shellFor(content);
    const command = commandFor(app, kind);
    const { target } = await resolveSafeTarget(command);

    return withSaveLock(target, async () => {
      const current = await readFile(target);
      const previousVersion = versionOf(current);
      if (previousVersion !== expectedVersion) {
        throw new ScriptStoreError(
          "The script changed after you opened it. Reload it before saving.",
          409,
        );
      }

      const currentStat = await stat(target);
      const temporary = path.join(
        path.dirname(target),
        `.${path.basename(target)}.shipyard-${randomUUID()}.tmp`,
      );
      let temporaryExists = false;
      try {
        const handle = await open(temporary, "wx", currentStat.mode & 0o777);
        temporaryExists = true;
        try {
          await handle.writeFile(content, "utf8");
          await handle.sync();
        } finally {
          await handle.close();
        }
        await chmod(temporary, currentStat.mode & 0o777);
        await validateSyntax(shell, temporary);
        const backup = await createBackup(target, previousVersion);
        await rename(temporary, target);
        temporaryExists = false;

        const directory = await open(path.dirname(target), "r");
        try {
          await directory.sync();
        } finally {
          await directory.close();
        }

        const saved = await scriptStore.read(app, kind);
        return {
          ...saved,
          previousVersion,
          backup: path.relative(configuredRoot(), backup),
        };
      } finally {
        if (temporaryExists) await unlink(temporary).catch(() => undefined);
      }
    });
  },
};
