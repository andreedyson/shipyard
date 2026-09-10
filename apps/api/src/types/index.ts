export const activeDeployStatuses = ["queued", "running", "verifying"] as const;

export type ActiveDeployStatus = (typeof activeDeployStatuses)[number];
export type FinalDeployStatus =
  | "success"
  | "failed"
  | "cancelled"
  | "timed_out"
  | "interrupted";
export type DeployStatus = ActiveDeployStatus | FinalDeployStatus;
export type AppStatus = "idle" | DeployStatus;
export type DeployAction = "deploy" | "rollback";

export type CommandDefinition = {
  command: string;
  args?: string[];
  cwd?: string;
};

export type AppDefinition = {
  id: string;
  label: string;
  environment: "production" | "staging" | "preview" | "development";
  deploy: CommandDefinition & { timeoutSeconds?: number };
  minFreeDiskMb?: number;
  rollback?: CommandDefinition;
  healthCheck?: {
    url: string;
    retries?: number;
    intervalMs?: number;
    timeoutMs?: number;
  };
  notifications?: {
    enabled?: boolean;
    on?: FinalDeployStatus[];
  };
};

export type DeployHistoryItem = {
  id: string;
  appId: string;
  status: DeployStatus;
  action: DeployAction;
  environment: string;
  branch: string | null;
  revision: string | null;
  previousRevision: string | null;
  commitMessage: string | null;
  requestedBy: string;
  exitCode: number | null;
  failureSummary: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  durationMs: number | null;
  createdAt: Date;
};

export type AppResponse = {
  id: string;
  label: string;
  environment: AppDefinition["environment"];
  status: AppStatus;
  lastDeployedAt: Date | null;
  currentRevision: string | null;
  latestDeploy: DeployHistoryItem | null;
  canRollback: boolean;
};
