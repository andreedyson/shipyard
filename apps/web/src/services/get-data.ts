import { endpoints } from "@/app/api/endpoints";
import { api } from "@/lib/axios";
import { APIResponse } from "@/types/api";

export const getData = async () => {
  const res = await api.get<APIResponse<[]>>(endpoints.public.me);
  return res.data.data;
};
