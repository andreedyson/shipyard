import { Resend } from "resend";
import { env } from "../env.js";
import type { FinalDeployStatus } from "../types/index.js";

const resend = new Resend(env.RESEND_API_KEY);

const lastLogLines = (logs: string, count = 20) =>
  logs
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-count)
    .join("\n");

export async function sendDeployNotification(params: {
  appLabel: string;
  status: FinalDeployStatus;
  deployId: string;
  logs: string;
}) {
  const logSnippet = lastLogLines(params.logs);
  const timestamp = new Date().toISOString();

  await resend.emails.send({
    from: "Shipyard <onboarding@resend.dev>",
    to: env.NOTIFICATION_EMAIL,
    subject: `[Shipyard] ${params.appLabel} deploy ${params.status}`,
    text: [
      `App: ${params.appLabel}`,
      `Status: ${params.status}`,
      `Deploy ID: ${params.deployId}`,
      `Timestamp: ${timestamp}`,
      "",
      "Last 20 log lines:",
      logSnippet || "No logs captured.",
    ].join("\n"),
  });
}
