import assert from "node:assert/strict";
import {
  chmod,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, test } from "node:test";
import type { AppDefinition } from "../types/index.js";

let root: string;
let scriptPath: string;
let app: AppDefinition;
let scriptStore: (typeof import("./script-store.js"))["scriptStore"];
let ScriptStoreError: (typeof import("./script-store.js"))["ScriptStoreError"];

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), "shipyard-script-store-"));
  scriptPath = path.join(root, "deploy-example.sh");
  await writeFile(
    scriptPath,
    "#!/usr/bin/env bash\nset -euo pipefail\necho old\n",
    { mode: 0o750 },
  );
  await chmod(scriptPath, 0o750);

  process.env.DATABASE_URL = "postgresql://example:example@localhost/example";
  process.env.SHIPYARD_PIN = "test-pin";
  process.env.SESSION_SECRET =
    "test-session-secret-with-at-least-32-characters";
  process.env.RESEND_API_KEY = "test-key";
  process.env.NOTIFICATION_EMAIL = "test@example.com";
  process.env.SCRIPT_EDIT_ROOT = root;
  process.env.SCRIPT_MAX_BYTES = "100000";

  ({ scriptStore, ScriptStoreError } = await import("./script-store.js"));
  app = {
    id: "example",
    label: "Example",
    environment: "production",
    deploy: { command: scriptPath },
  };
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

test("saves valid scripts atomically and retains an executable backup", async () => {
  const original = await scriptStore.read(app, "deploy");
  const content = "#!/usr/bin/env bash\nset -euo pipefail\necho new\n";
  const saved = await scriptStore.save(
    app,
    "deploy",
    content,
    original.version,
  );

  assert.equal(await readFile(scriptPath, "utf8"), content);
  assert.notEqual(saved.version, original.version);
  assert.equal((await stat(scriptPath)).mode & 0o777, 0o750);

  const historyDirectory = path.join(
    root,
    ".shipyard-history",
    path.basename(scriptPath),
  );
  const backups = await readdir(historyDirectory);
  assert.equal(backups.length, 1);
  assert.equal(
    await readFile(path.join(historyDirectory, backups[0]!), "utf8"),
    original.content,
  );
});

test("rejects invalid shell syntax without changing the live script", async () => {
  const current = await scriptStore.read(app, "deploy");
  await assert.rejects(
    scriptStore.save(
      app,
      "deploy",
      "#!/usr/bin/env bash\nif then\n",
      current.version,
    ),
    (error) => error instanceof ScriptStoreError && error.status === 422,
  );
  assert.equal(
    (await scriptStore.read(app, "deploy")).version,
    current.version,
  );
});

test("rejects stale edits", async () => {
  const current = await scriptStore.read(app, "deploy");
  await assert.rejects(
    scriptStore.save(
      app,
      "deploy",
      "#!/usr/bin/env bash\necho stale\n",
      "not-the-current-version",
    ),
    (error) => error instanceof ScriptStoreError && error.status === 409,
  );
  assert.equal(
    (await scriptStore.read(app, "deploy")).version,
    current.version,
  );
});
