import { customToast } from "@/components/shared/custom-toast";
import config from "@/configs/app";
import { AuthUser } from "@/types/auth";

type AuthListener = (user: AuthUser | null) => void;
type UnauthorizedHandler = () => void;

let currentUser: AuthUser | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;
let unauthorizedInFlight = false;

const listeners = new Set<AuthListener>();

const notifyListeners = () => {
  for (const listener of listeners) {
    listener(currentUser);
  }
};

export const getAuthUser = () => currentUser;

export const setAuthUser = (user: AuthUser | null) => {
  currentUser = user;

  if (user) {
    resetUnauthorizedState();
  }

  notifyListeners();
};

export const clearAuthUser = () => {
  currentUser = null;
  notifyListeners();
};

export const subscribeAuthSession = (listener: AuthListener) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

export const registerUnauthorizedHandler = (handler: UnauthorizedHandler) => {
  unauthorizedHandler = handler;

  return () => {
    if (unauthorizedHandler === handler) {
      unauthorizedHandler = null;
    }
  };
};

export const resetUnauthorizedState = () => {
  unauthorizedInFlight = false;
};

export const notifyUnauthorized = (
  message = "Sesi kamu telah berakhir, silakan login kembali",
) => {
  if (typeof window === "undefined" || unauthorizedInFlight) {
    return;
  }

  unauthorizedInFlight = true;
  unauthorizedHandler?.();

  const onLoginPage = window.location.pathname.startsWith(config.loginUrl);

  if (!onLoginPage) {
    customToast("error", message);
    window.setTimeout(() => {
      window.location.assign(config.loginUrl);
    }, 150);
  }
};
