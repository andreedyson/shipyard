"use client";

import MainSidebar from "./main-sidebar";
import { HeaderUser } from "../layouts/dashboard-header";
import { DASHBOARD_MENU_LINKS } from "@/configs/navigation";

export function UserSidebar({ user }: { user: HeaderUser | undefined }) {
  return <MainSidebar items={DASHBOARD_MENU_LINKS} user={user} />;
}
