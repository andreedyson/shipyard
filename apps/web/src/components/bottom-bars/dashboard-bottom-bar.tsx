"use client";

import type { SidebarMenuLink } from "@/types/dashboard";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

type DashboardBottomBarProps = {
  items: SidebarMenuLink[];
  className?: string;
};

export default function DashboardBottomBar({
  items,
  className,
}: DashboardBottomBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Dashboard bottom navigation"
      className={cn(
        "border-border/80 dark:bg-muted sticky bottom-0 z-40 flex h-16 items-center justify-around border bg-zinc-100 px-2 shadow-sm md:hidden",
        className,
      )}
    >
      {items.map((nav) => {
        const isActive =
          pathname === nav.url || pathname.startsWith(nav.url + "/");
        const Icon = nav.icon;

        return (
          <Link
            key={nav.url}
            href={nav.url}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-md py-2 text-xs duration-200",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-primary/80",
            )}
          >
            <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
            <span className={cn("truncate", isActive && "font-semibold")}>
              {nav.title}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
