import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { appsQueryKey } from "@/lib/hooks/use-apps";
type DeployStartResponse = { deployId: string };

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const message =
      error.response?.data?.error ?? error.response?.data?.message;

    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Deploy request failed";
}

export function useDeploy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string) => {
      const { data } = await api.post<DeployStartResponse>(`/deploy/${appId}`);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appsQueryKey });
      toast.success("Deploy triggered");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}

export function useCancelDeploy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deployId: string) =>
      (await api.post(`/deploy/id/${deployId}/cancel`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appsQueryKey });
      toast.success("Cancellation requested");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}

export function useRollback() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (appId: string) =>
      (await api.post<DeployStartResponse>(`/deploy/${appId}/rollback`)).data,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: appsQueryKey });
      toast.success("Rollback started");
    },
    onError: (error) => toast.error(getErrorMessage(error)),
  });
}
