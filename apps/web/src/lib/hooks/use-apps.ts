import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { App } from "@/types";

export const appsQueryKey = ["apps"] as const;

export function useApps({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: appsQueryKey,
    queryFn: async () => {
      const { data } = await api.get<App[]>("/apps");

      return data;
    },
    enabled,
    refetchInterval: 5_000,
  });
}
