import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { AuditLogEntry } from "@/types";

export function useAuditLog({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: ["audit-log"],
    queryFn: async () => {
      const { data } = await api.get<AuditLogEntry[]>("/audit");
      return data;
    },
    enabled,
    refetchInterval: enabled ? 10_000 : false,
  });
}
