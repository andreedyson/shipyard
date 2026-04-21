"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/auth";
import type { LucideIcon } from "lucide-react";
import { Sprout, UserCog } from "lucide-react";

type RoleBadgeProps = {
  role: UserRole;
  className?: string;
};

const ROLE_META: Record<
  UserRole,
  { label: string; icon: LucideIcon; classes: string }
> = {
  SUPERADMIN: {
    label: "Super Admin",
    icon: UserCog,
    classes:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300",
  },
  USER: {
    label: "Pengguna",
    icon: Sprout,
    classes:
      "border-green-200 bg-green-100 text-green-700 dark:border-green-700 dark:bg-green-800/40 dark:text-green-300",
  },
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  const meta = ROLE_META[role];
  const Icon = meta.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded-full px-2 text-xs font-medium",
        meta.classes,
        className,
      )}
    >
      <Icon size={12} strokeWidth={2} />
      <span>{meta.label}</span>
    </Badge>
  );
}

export const getRoleBadgeMeta = (role: UserRole) => ROLE_META[role];
