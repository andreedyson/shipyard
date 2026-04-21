"use client";

import { FileText } from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

import { DeployButton } from "@/components/deploy-button";
import { LogPanel } from "@/components/log-panel";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatDeployTime, getLatestDeployId } from "@/lib/deploys";
import type { App } from "@/types";

type AppCardProps = {
  app: App;
};

export function AppCard({ app }: AppCardProps) {
  const [logsOpen, setLogsOpen] = useState(false);
  const latestDeployId = getLatestDeployId(app);

  return (
    <>
      <motion.div
        whileHover={{ y: -1 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors duration-200 hover:border-white/14"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-medium tracking-tight text-foreground">
            {app.label}
          </h3>
          <StatusBadge status={app.status} />
        </div>

        {/* Last deployed */}
        <div className="mt-6">
          <p className="text-xs text-muted-foreground">Last deployed</p>
          <p className="mt-0.5 font-mono text-sm text-foreground/60">
            {formatDeployTime(app.lastDeployedAt)}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <DeployButton appId={app.id} status={app.status} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!latestDeployId}
            onClick={() => setLogsOpen(true)}
            className="gap-1.5 border-border text-muted-foreground hover:text-foreground"
          >
            <FileText className="size-3.5" />
            Logs
          </Button>
        </div>
      </motion.div>

      <LogPanel
        deployId={latestDeployId}
        appLabel={app.label}
        status={app.status}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      />
    </>
  );
}
