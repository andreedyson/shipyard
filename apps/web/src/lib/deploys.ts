export function formatRelativeDeployTime(value?: string | null): string {
  if (!value) return "Never deployed";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin !== 1 ? "s" : ""} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr !== 1 ? "s" : ""} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay !== 1 ? "s" : ""} ago`;

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
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

export function formatDuration(durationMs?: number | null): string {
  if (durationMs == null) return "—";

  if (durationMs < 60_000) {
    return `${Math.max(1, Math.round(durationMs / 1_000))}s`;
  }

  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1_000);
  return `${minutes}m ${seconds}s`;
}

export function formatElapsed(startedAt?: string | null): string {
  if (!startedAt) return "Not started";
  const started = new Date(startedAt).getTime();
  if (Number.isNaN(started)) return "Unknown";
  return formatDuration(Math.max(0, Date.now() - started));
}
