import { Resend } from "resend";
import { env } from "../env.js";
import type { FinalDeployStatus } from "../types/index.js";

const resend = new Resend(env.RESEND_API_KEY);

const lastLogLines = (logs: string, count = 30) =>
  logs
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-count)
    .join("\n");

function buildEmailHtml(params: {
  appLabel: string;
  status: FinalDeployStatus;
  deployId: string;
  logSnippet: string;
  timestamp: string;
}): string {
  const isSuccess = params.status === "success";

  const statusColor = isSuccess ? "#22c55e" : "#ef4444";
  const statusBg = isSuccess ? "#052e16" : "#2d0a0a";
  const statusBorder = isSuccess ? "#166534" : "#7f1d1d";
  const statusLabel = isSuccess ? "SUCCESS" : "FAILED";
  const statusIcon = isSuccess ? "✓" : "✗";

  const logLines = params.logSnippet
    ? params.logSnippet
        .split("\n")
        .map((line) => {
          const isError =
            /error|fatal|exception|traceback|failed/i.test(line);
          const isWarn = /warn|warning/i.test(line);
          const color = isError
            ? "#f87171"
            : isWarn
              ? "#fbbf24"
              : "#a1a1aa";
          return `<span style="color:${color};display:block;white-space:pre-wrap;word-break:break-all;">${escapeHtml(line)}</span>`;
        })
        .join("")
    : `<span style="color:#52525b;">No logs captured.</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Shipyard Deploy Notification</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:18px;font-weight:700;color:#fafafa;letter-spacing:-0.02em;">
                      ⚓ Shipyard
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#52525b;font-family:'Courier New',monospace;">
                      Deploy Notification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Status Card -->
          <tr>
            <td style="background:${statusBg};border:1px solid ${statusBorder};border-radius:12px;padding:28px 32px;margin-bottom:16px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:${statusColor}22;border:1px solid ${statusColor}55;border-radius:6px;padding:4px 12px;">
                          <span style="font-size:11px;font-weight:700;color:${statusColor};letter-spacing:0.08em;font-family:'Courier New',monospace;">
                            ${statusIcon} ${statusLabel}
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:6px;">
                    <span style="font-size:24px;font-weight:700;color:#fafafa;letter-spacing:-0.03em;">
                      ${escapeHtml(params.appLabel)}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td>
                    <span style="font-size:14px;color:#71717a;">
                      ${isSuccess ? "Deployment completed successfully." : "Deployment encountered an error. Review the logs below."}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:12px;"></td></tr>

          <!-- Meta Info -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:14px;">
                    <span style="font-size:11px;font-weight:600;color:#52525b;letter-spacing:0.08em;text-transform:uppercase;">
                      Details
                    </span>
                  </td>
                </tr>
                ${buildMetaRow("Deploy ID", `<span style="font-family:'Courier New',monospace;font-size:13px;">${escapeHtml(params.deployId)}</span>`)}
                ${buildMetaRow("Timestamp", escapeHtml(formatTimestamp(params.timestamp)))}
                ${buildMetaRow("Status", `<span style="color:${statusColor};font-weight:600;">${statusLabel}</span>`)}
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:12px;"></td></tr>

          <!-- Log Section -->
          <tr>
            <td style="background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
              <!-- Log header -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#1c1c1f;border-bottom:1px solid #27272a;">
                <tr>
                  <td style="padding:12px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-right:10px;">
                          <span style="font-size:13px;color:#52525b;">▸</span>
                        </td>
                        <td>
                          <span style="font-size:11px;color:#52525b;font-family:'Courier New',monospace;letter-spacing:0.04em;">
                            deploy.log &nbsp;·&nbsp; last 30 lines
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <!-- Log body -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-family:'Courier New',Courier,monospace;font-size:12px;line-height:1.7;overflow-x:auto;">
                      ${logLines}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Spacer -->
          <tr><td style="height:32px;"></td></tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #27272a;padding-top:20px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:11px;color:#3f3f46;">
                      Shipyard · Automated deploy notification · Do not reply
                    </span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#3f3f46;font-family:'Courier New',monospace;">
                      ${escapeHtml(params.deployId.slice(0, 8))}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildMetaRow(label: string, valueHtml: string): string {
  return `
  <tr>
    <td style="padding-bottom:10px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td width="120" style="vertical-align:top;padding-top:1px;">
            <span style="font-size:12px;color:#52525b;">${label}</span>
          </td>
          <td style="vertical-align:top;">
            <span style="font-size:13px;color:#d4d4d8;">${valueHtml}</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "long",
      timeZone: "UTC",
    }) + " UTC";
  } catch {
    return iso;
  }
}

export async function sendDeployNotification(params: {
  appLabel: string;
  status: FinalDeployStatus;
  deployId: string;
  logs: string;
}) {
  const logSnippet = lastLogLines(params.logs);
  const timestamp = new Date().toISOString();
  const isSuccess = params.status === "success";

  await resend.emails.send({
    from: env.RESEND_FROM,
    to: env.NOTIFICATION_EMAIL,
    subject: `[Shipyard] ${isSuccess ? "✓" : "✗"} ${params.appLabel} deploy ${params.status}`,
    html: buildEmailHtml({
      appLabel: params.appLabel,
      status: params.status,
      deployId: params.deployId,
      logSnippet,
      timestamp,
    }),
    text: [
      `App: ${params.appLabel}`,
      `Status: ${params.status.toUpperCase()}`,
      `Deploy ID: ${params.deployId}`,
      `Timestamp: ${formatTimestamp(timestamp)}`,
      "",
      "--- Last 30 log lines ---",
      logSnippet || "No logs captured.",
    ].join("\n"),
  });
}
