import { UserRole } from "@/types/auth";

const dashboardRoutes: Record<UserRole, string> = {
  SUPERADMIN: "/dashboard/admin",
  USER: "/dashboard/user",
};

export const getDashboardRouteByRole = (role: UserRole) =>
  dashboardRoutes[role];

export const isRoleRouteAllowed = (role: UserRole, pathname: string) => {
  const dashboardRoute = getDashboardRouteByRole(role);

  return pathname === "/dashboard" || pathname.startsWith(dashboardRoute);
};

export const getLoginRedirectPath = (
  role: UserRole,
  nextPath?: string | null,
) => {
  if (!nextPath || nextPath === "/dashboard") {
    return getDashboardRouteByRole(role);
  }

  return isRoleRouteAllowed(role, nextPath)
    ? nextPath
    : getDashboardRouteByRole(role);
};
