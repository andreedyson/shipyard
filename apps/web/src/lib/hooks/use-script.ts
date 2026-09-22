import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ScriptDocument, ScriptKind } from "@/types";

const scriptQueryKey = (appId: string, kind: ScriptKind) =>
  ["script", appId, kind] as const;

export function useScript(appId: string, kind: ScriptKind, enabled: boolean) {
  return useQuery({
    queryKey: scriptQueryKey(appId, kind),
    queryFn: async () =>
      (await api.get<ScriptDocument>(`/apps/${appId}/scripts/${kind}`)).data,
    enabled,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSaveScript(appId: string, kind: ScriptKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      content,
      expectedVersion,
    }: {
      content: string;
      expectedVersion: string;
    }) =>
      (
        await api.put<ScriptDocument>(`/apps/${appId}/scripts/${kind}`, {
          content,
          expectedVersion,
        })
      ).data,
    onSuccess: (document) => {
      queryClient.setQueryData(scriptQueryKey(appId, kind), document);
    },
  });
}
