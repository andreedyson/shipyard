import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { appsQueryKey } from "@/lib/hooks/use-apps";
import type { Deploy } from "@/types";

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const message = error.response?.data?.message;

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
      const { data } = await api.post<Deploy>(`/deploy/${appId}`);

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
