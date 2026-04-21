import { api } from "@/lib/axios";
import { APIResponse } from "@/types/api";

export const getDashboardData = async () => {
  const res = await api.get<APIResponse<[]>>("/");
  return res.data.data;
};
