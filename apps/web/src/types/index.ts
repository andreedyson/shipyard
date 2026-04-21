export type DeployStatus = "idle" | "running" | "success" | "failed";

export type Deploy = {
  id: string;
  appId: string;
  status: DeployStatus;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt?: string | null;
};

export type App = {
  id: string;
  label: string;
  status: DeployStatus;
  lastDeployedAt?: string | null;
  latestDeployId?: string | null;
  deployId?: string | null;
  latestDeploy?: Deploy | null;
  deploys?: Deploy[];
};
