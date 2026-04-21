"use client";

import config from "@/configs/app";
import {
  clearAuthUser,
  registerUnauthorizedHandler,
  resetUnauthorizedState,
  setAuthUser,
  subscribeAuthSession,
} from "@/lib/auth-session";
import { api } from "@/lib/axios";
import { APIResponse } from "@/types/api";
import { AuthUser } from "@/types/auth";
import { useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { customToast } from "../shared/custom-toast";

interface AuthContext {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<AuthUser | null>;
  clearAuthState: () => void;
  allowedRoles: (roles: AuthUser["role"][]) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContext | undefined>(undefined);

type AuthProviderProps = {
  children: React.ReactNode;
  initialUser?: AuthUser;
};

type RefreshUserOptions = {
  preserveUserOnError?: boolean;
};

export function AuthProvider({
  children,
  initialUser,
}: AuthProviderProps) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(initialUser ?? null);
  const [isLoading, setIsLoading] = useState(!initialUser);

  const clearAuthState = useCallback(() => {
    queryClient.clear();
    clearAuthUser();
    setIsLoading(false);
  }, [queryClient]);

  const syncCurrentUser = useCallback(
    async ({ preserveUserOnError = false }: RefreshUserOptions = {}) => {
      try {
        const res = await api.get<APIResponse<AuthUser>>("/auth/me");
        const nextUser = res.data.data ?? null;
        setAuthUser(nextUser);
        return nextUser;
      } catch (error) {
        if (isAxiosError(error) && error.response?.status === 401) {
          clearAuthState();
          return null;
        }

        return preserveUserOnError ? user : null;
      }
    },
    [clearAuthState, user],
  );

  useEffect(() => {
    setAuthUser(initialUser ?? null);
  }, [initialUser]);

  useEffect(() => {
    return subscribeAuthSession(setUser);
  }, []);

  useEffect(() => {
    return registerUnauthorizedHandler(clearAuthState);
  }, [clearAuthState]);

  useEffect(() => {
    let isActive = true;

    const bootstrapUser = async () => {
      if (!initialUser) {
        setIsLoading(true);
      }

      try {
        const nextUser = await syncCurrentUser({
          preserveUserOnError: Boolean(initialUser),
        });

        if (!nextUser && !initialUser) {
          clearAuthState();
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    void bootstrapUser();

    return () => {
      isActive = false;
    };
  }, [clearAuthState, initialUser, syncCurrentUser]);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);

    try {
      return await syncCurrentUser({ preserveUserOnError: true });
    } finally {
      setIsLoading(false);
    }
  }, [syncCurrentUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);

      try {
        await api.post("/auth/login", {
          email,
          password,
        });

        const authenticatedUser = await syncCurrentUser();

        if (!authenticatedUser) {
          clearAuthState();
          customToast("error", "Login berhasil, tetapi sesi tidak dapat dipulihkan.");
          throw new Error("Login berhasil, tetapi sesi tidak dapat dipulihkan.");
        }

        resetUnauthorizedState();
        return authenticatedUser;
      } catch (error) {
        if (isAxiosError<APIResponse>(error)) {
          throw new Error(
            error.response?.data?.message ?? "Login gagal. Silakan coba lagi.",
          );
        }

        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [clearAuthState, syncCurrentUser],
  );

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await api.post("/auth/logout");
    } catch {
    } finally {
      resetUnauthorizedState();
      clearAuthState();
      setIsLoading(false);

      if (typeof window !== "undefined") {
        window.location.assign(config.loginUrl);
      }
    }
  }, [clearAuthState]);

  const allowedRoles = useCallback(
    (roles: AuthUser["role"][]) => {
      return Boolean(user && roles.includes(user.role));
    },
    [user],
  );

  const value = useMemo<AuthContext>(
    () => ({
      user,
      login,
      logout,
      refreshUser,
      clearAuthState,
      allowedRoles,
      isLoading,
    }),
    [user, login, logout, refreshUser, clearAuthState, allowedRoles, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
