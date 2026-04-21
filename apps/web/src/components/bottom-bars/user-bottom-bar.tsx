"use client";

import { DASHBOARD_MENU_LINKS } from "@/configs/navigation";
import DashboardBottomBar from "./dashboard-bottom-bar";

export function UserBottomBar() {
  return <DashboardBottomBar items={DASHBOARD_MENU_LINKS} />;
}
