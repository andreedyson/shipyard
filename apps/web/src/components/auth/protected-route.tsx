"use client";

import configs from "@/configs/app";
import { getLoginRedirectPath } from "@/lib/auth-routing";
import { UserRole } from "@/types/auth";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../providers/auth-provider";

type ProtectedRouteProps = {
  allowed?: UserRole[];
  redirectTo?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export default function ProtectedRoute({
  allowed,
  redirectTo = configs.loginUrl,
  children,
  fallback = null,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isLoading, allowedRoles } = useAuth();

  const isAuthed = Boolean(user);
  const isAllowed = allowed ? allowedRoles(allowed) : isAuthed;

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthed || !user) {
      router.replace(`${redirectTo}?next=${encodeURIComponent(pathname)}`);
      return;
    }

    if (allowed && !isAllowed) {
      router.replace(getLoginRedirectPath(user.role, pathname));
    }
  }, [
    allowed,
    isAllowed,
    isAuthed,
    isLoading,
    pathname,
    redirectTo,
    router,
    user,
  ]);

  if (isLoading) return <>{fallback}</>;
  if (!isAuthed || !user) return <>{fallback}</>;
  if (allowed && !isAllowed) return <>{fallback}</>;

  return <>{children}</>;
}
