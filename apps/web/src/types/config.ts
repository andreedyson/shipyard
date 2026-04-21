import { LucideIcon } from "lucide-react";

export interface AppConfig {
  appName: string;
  appDescription: string;
  appURL: string;
  appLogo?: {
    light?: string;
    dark?: string;
  };
  gitHubRepo?: string;
  baseAPIUrl: string;
  loginUrl: string;
  siteUrl?: string;
  adminWA?: string;
}

export interface NavigationLink {
  title: string;
  url: string;
  icon?: LucideIcon;
}
