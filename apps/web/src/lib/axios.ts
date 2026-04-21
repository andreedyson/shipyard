import axios, { AxiosError, AxiosInstance, AxiosResponse } from "axios";
import config from "@/configs/app";
import { getAuthUser, notifyUnauthorized } from "@/lib/auth-session";
import { APIResponse } from "@/types/api";
import { customToast } from "../components/shared/custom-toast";

export const baseURL = config.baseAPIUrl;

const createSuccessHandler = (withToast = true) => {
  return function (response: AxiosResponse<APIResponse>) {
    if (response.status >= 200 && response.status < 300 && withToast) {
      customToast("success", response.data.message);
    }
    return response;
  };
};

const handleError = async (error: AxiosError<APIResponse>) => {
  const response = error.response;
  const original = error.config;

  if (!response) {
    customToast("error", "Gagal terhubung ke server");
    return Promise.reject(error);
  }

  const status = response.status;
  const message = response.data?.message || `Error ${status}`;

  if (status === 401) {
    const url = original?.url ?? "";
    const isAuthEndpoint =
      url.includes("/auth/me") ||
      url.includes("/auth/login") ||
      url.includes("/auth/logout") ||
      url.includes("/users/forgot-password") ||
      url.includes("/users/reset-password");

    if (typeof window === "undefined" || isAuthEndpoint) {
      return Promise.reject(error);
    }

    const hadAuthenticatedUser = Boolean(getAuthUser());
    const onLoginPage = window.location.pathname.startsWith(config.loginUrl);

    if (!hadAuthenticatedUser || onLoginPage) {
      return Promise.reject(error);
    }

    notifyUnauthorized();
    return Promise.reject(error);
  }

  customToast("error", message);
  return Promise.reject(error);
};

const createAxiosInstance = (withToast = true): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    withCredentials: true,
  });

  instance.interceptors.response.use(
    createSuccessHandler(withToast),
    handleError,
  );

  return instance;
};

export const api = createAxiosInstance(false);
