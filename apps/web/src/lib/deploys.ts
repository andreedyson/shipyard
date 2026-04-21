import type { App } from "@/types";

export function getLatestDeployId(app: App) {
  return (
    app.latestDeployId ??
    app.deployId ??
    app.latestDeploy?.id ??
    app.deploys?.[0]?.id ??
    null
  );
}

export function formatDeployTime(value?: string | null) {
  if (!value) {
    return "No deploy recorded";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
