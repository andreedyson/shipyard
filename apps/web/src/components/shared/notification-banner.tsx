"use client";

import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  LucideIcon,
  XCircle,
} from "lucide-react";

type Variant = "info" | "success" | "warning" | "error";

interface NotificationBannerProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  variant?: Variant;
  className?: string;
}

const variantStyles: Record<Variant, string> = {
  info: "border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  success:
    "border-l-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning:
    "border-l-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  error:
    "border-l-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300",
};

const defaultIcons: Record<Variant, LucideIcon> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
};

export function NotificationBanner({
  icon,
  title,
  description,
  variant = "info",
  className,
}: NotificationBannerProps) {
  const Icon = icon ?? defaultIcons[variant];

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-md border-2 p-4 shadow-sm transition-all md:items-center",
        variantStyles[variant],
        className,
      )}
    >
      <div className="grid aspect-square size-12 place-items-center rounded-md bg-zinc-200 dark:bg-slate-400">
        <Icon className="mt-0.5 size-5 shrink-0" />
      </div>
      <div>
        <h3 className="leading-none font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm opacity-90 md:max-w-[750px]">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
