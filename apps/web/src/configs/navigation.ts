import { SidebarMenuLink } from "@/types/dashboard";
import { NavigationLink } from "./../types/config";
import { Home, Settings } from "lucide-react";

export const LANDING_PAGE_LINKS = [
  {
    title: "Home",
    url: "/",
  },
  {
    title: "About Us",
    url: "/#about",
  },
  {
    title: "How It Works",
    url: "/#how-it-works",
  },
] satisfies NavigationLink[];

export const DASHBOARD_MENU_LINKS = [
  {
    title: "Home",
    url: "/dashboard/admin",
    icon: Home,
    group: "Application",
  },
  {
    title: "Settings",
    url: "/dashboard/admin/settings",
    icon: Settings,
    group: "General",
  },
] satisfies SidebarMenuLink[];
