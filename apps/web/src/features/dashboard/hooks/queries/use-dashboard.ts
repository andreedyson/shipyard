import { useQuery } from "@tanstack/react-query";
import { getDashboardData } from "../../services/dashboard";

export const useDashboard = () => {
  return useQuery<[]>({
    queryKey: ["dashboard-data"],
    queryFn: async () => {
      const result = await getDashboardData();
      return result ?? [];
    },
  });
};
