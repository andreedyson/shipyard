import config from "@/configs/app";
import { APIResponse } from "@/types/api";
import { AuthUser } from "@/types/auth";
import { headers } from "next/headers";

const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME ??
  process.env.NEXT_PUBLIC_AUTH_COOKIE_NAME ??
  null;

const normalizeApiBaseUrl = (baseUrl: string) => baseUrl.replace(/\/+$/, "");

const getAuthUrl = (path: string) =>
  `${normalizeApiBaseUrl(config.baseAPIUrl)}${path}`;

export const hasAuthCookie = (cookieHeader?: string | null) => {
  if (!cookieHeader) {
    return false;
  }

  if (!AUTH_COOKIE_NAME) {
    return Boolean(cookieHeader.trim());
  }

  return cookieHeader
    .split(";")
    .some((cookie) => cookie.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
};

export const getProfileFromCookieHeader = async (
  cookieHeader?: string | null,
): Promise<AuthUser | undefined> => {
  if (!hasAuthCookie(cookieHeader)) {
    return undefined;
  }

  const cookie = cookieHeader ?? "";

  try {
    const response = await fetch(getAuthUrl("/auth/me"), {
      method: "GET",
      headers: {
        cookie,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return undefined;
    }

    const payload = (await response.json()) as APIResponse<AuthUser>;
    return payload.data ?? undefined;
  } catch {
    return undefined;
  }
};

export const getProfile = async (): Promise<AuthUser | undefined> => {
  const headerStore = await headers();
  return getProfileFromCookieHeader(headerStore.get("cookie"));
};
