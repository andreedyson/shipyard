import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { DeployHistoryItem } from "@/types";

export function useDeployHistory(appId: string, enabled: boolean) {
  return useQuery({
    queryKey: ["deploy-history", appId],
    queryFn: async () => {
      const { data } = await api.get<DeployHistoryItem[]>(
        `/deploy/${appId}/history`,
      );

      return data;
    },
    enabled,
    refetchInterval: enabled ? 5_000 : false,
  });
}
