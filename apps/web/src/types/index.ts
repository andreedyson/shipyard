export type DeployStatus =
  | "idle"
  | "queued"
  | "running"
  | "verifying"
  | "success"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "interrupted";

export type Deploy = {
  id: string;
  appId: string;
  status: DeployStatus;
  action: "deploy" | "rollback";
  environment: string;
  branch: string | null;
  revision: string | null;
  previousRevision: string | null;
  commitMessage: string | null;
  requestedBy: string;
  exitCode: number | null;
  failureSummary: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
  createdAt: string;
};

export type DeployHistoryItem = Deploy;

export type App = {
  id: string;
  label: string;
  environment: "production" | "staging" | "preview" | "development";
  status: DeployStatus;
  lastDeployedAt?: string | null;
  currentRevision: string | null;
  latestDeploy: Deploy | null;
  canRollback: boolean;
};
