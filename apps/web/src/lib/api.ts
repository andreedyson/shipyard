import axios from "axios";

import { redirectToLogin } from "@/lib/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthRequest = error.config?.url?.includes("/auth/");

    if (error.response?.status === 401 && !isAuthRequest) {
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
