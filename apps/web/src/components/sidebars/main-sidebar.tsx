"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import AppLogo from "../shared/app-logo";
import DashboardSidebarFooter from "./dashboard-sidebar-footer";
import type { HeaderUser } from "../layouts/dashboard-header";
import type { SidebarMenuLink } from "@/types/dashboard";
import { cn } from "@/lib/utils";

type MainSidebarProps = {
  items: SidebarMenuLink[];
  user: HeaderUser | undefined;
};

function groupSidebarItems(items: SidebarMenuLink[]) {
  const map = new Map<string, SidebarMenuLink[]>();

  for (const item of items) {
    const key = item.group?.trim() || "Application";
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }

  return Array.from(map.entries()).map(([label, links]) => ({
    label,
    links,
  }));
}

export default function MainSidebar({ items, user }: MainSidebarProps) {
  const pathname = usePathname();
  const pathnameSplit = pathname.split("/").slice(0, 4).join("/");

  const grouped = React.useMemo(() => groupSidebarItems(items), [items]);

  return (
    <Sidebar collapsible="icon" className="bg-background border-r">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-14 justify-center"
            >
              <Link href="/" aria-label="Go to home">
                <AppLogo />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="flex flex-col">
        {grouped.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-muted-foreground px-2 text-xs">
              {group.label}
            </SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {group.links.map((item) => {
                  const isActive = pathnameSplit === item.url;
                  const Icon = item.icon;

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={isActive}
                        className={cn(
                          "h-11 rounded-md px-3 transition-colors",
                          "hover:bg-muted/60",
                          isActive && "bg-muted",
                        )}
                      >
                        <Link
                          href={item.url}
                          className="flex items-center gap-3"
                        >
                          <Icon
                            className={cn(
                              "text-muted-foreground size-5 transition-colors",
                              isActive && "text-foreground",
                            )}
                            strokeWidth={isActive ? 2.5 : 2}
                          />
                          <span
                            className={cn(
                              "text-muted-foreground text-sm transition-colors",
                              isActive && "text-foreground font-medium",
                            )}
                          >
                            {item.title}
                          </span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}

        <div className="mt-auto border-t p-2">
          <DashboardSidebarFooter user={user} />
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
