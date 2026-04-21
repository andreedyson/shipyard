import type { DeployStatus } from "@/types";

export const statusConfig: Record<
  DeployStatus,
  {
    label: string;
    badgeVariant: "secondary" | "warning" | "success" | "destructive";
    deployLabel: "Deploy" | "Retry";
  }
> = {
  idle: {
    label: "Idle",
    badgeVariant: "secondary",
    deployLabel: "Deploy",
  },
  running: {
    label: "Running",
    badgeVariant: "warning",
    deployLabel: "Deploy",
  },
  success: {
    label: "Success",
    badgeVariant: "success",
    deployLabel: "Deploy",
  },
  failed: {
    label: "Failed",
    badgeVariant: "destructive",
    deployLabel: "Retry",
  },
};
