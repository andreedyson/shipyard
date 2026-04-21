import axios from "axios";

import { getPin, PIN_HEADER, redirectToLogin, removePin } from "@/lib/auth";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const pin = getPin();

  if (pin) {
    config.headers[PIN_HEADER] = pin;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401 && !isLoginRequest) {
      removePin();
      redirectToLogin();
    }

    return Promise.reject(error);
  },
);
