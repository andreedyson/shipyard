import { LucideIcon } from "lucide-react";

export interface SidebarMenuLink {
  title: string;
  url: string;
  icon: LucideIcon;
  group?: string;
}
