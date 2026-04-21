export type DeployStatus = "running" | "success" | "failed";
export type FinalDeployStatus = Exclude<DeployStatus, "running">;
export type AppStatus = "idle" | DeployStatus;

export type AppDefinition = {
  id: string;
  label: string;
  scriptPath: string;
};

export type AppResponse = {
  id: string;
  label: string;
  status: AppStatus;
  lastDeployedAt: Date | null;
  latestDeployId: string | null;
};
