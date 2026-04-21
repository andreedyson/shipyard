"use client";

import { useEffect, useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverArrow,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { useMediaQuery } from "@/hooks/use-media-query";

type NewFeatureHighlightProps = {
  featureId: string;
  children: React.ReactNode;
  title?: string;
  description?: string;
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  contentClassName?: string;
  forceOpen?: boolean;
  delayMs?: number;
  mobileSide?: "top" | "bottom" | "left" | "right";
  desktopSide?: "top" | "bottom" | "left" | "right";
};

const STORAGE_PREFIX = "feature-highlight:";

export function NewFeatureHighlight({
  featureId,
  children,
  title = "Fitur baru ✨",
  description = "Coba klik di sini untuk lihat update terbaru.",
  side,
  align = "start",
  contentClassName,
  forceOpen = false,
  delayMs = 300,
  mobileSide = "bottom",
  desktopSide = "right",
}: NewFeatureHighlightProps) {
  const storageKey = `${STORAGE_PREFIX}${featureId}`;
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const resolvedSide = side ?? (isDesktop ? desktopSide : mobileSide);

  // internal state untuk mode non-force
  const [internalOpen, setInternalOpen] = useState(false);

  // derived open: kalau forceOpen true, selalu open
  const open = forceOpen || internalOpen;

  useEffect(() => {
    // Kalau forceOpen aktif, kita gak perlu jalanin onboarding logic sama sekali.
    if (forceOpen) return;

    try {
      const seen = localStorage.getItem(storageKey);
      if (seen) return;

      const timer = window.setTimeout(() => {
        setInternalOpen(true);
        localStorage.setItem(storageKey, "seen");
      }, delayMs);

      return () => window.clearTimeout(timer);
    } catch (err) {
      console.error("NewFeatureHighlight localStorage error", err);
    }
  }, [storageKey, forceOpen, delayMs]);

  const handleClose = () => {
    try {
      localStorage.setItem(storageKey, "seen");
    } catch (err) {
      console.error("NewFeatureHighlight localStorage error", err);
    }
    setInternalOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        // kalau forceOpen, jangan biarkan popover ditutup oleh interaksi
        if (forceOpen) return;
        setInternalOpen(next);
      }}
    >
      <PopoverTrigger asChild>
        <div className="relative flex w-full items-center">
          {children}
          {!forceOpen && (
            <span className="bg-primary ring-background absolute top-0 -right-0 size-2 animate-pulse rounded-full shadow-md ring-2" />
          )}
        </div>
      </PopoverTrigger>

      <PopoverContent
        side={resolvedSide}
        align={align}
        className={cn(
          "max-w-[250px] items-start gap-3 rounded-xl bg-sky-500 px-4 py-3 text-xs text-white shadow-xl",
          "border-0",
          contentClassName,
        )}
      >
        <PopoverArrow
          width={15}
          height={10}
          className={cn(
            "absolute fill-sky-500 drop-shadow-md",
            resolvedSide === "bottom" && "-top-1",
            resolvedSide === "right" && "-top-1",
            resolvedSide === "left" && "right-[-6px]",
            resolvedSide === "top" && "bottom-[-6px]",
          )}
        />

        <div className="space-y-1">
          <Badge className="rounded-full text-xs font-semibold tracking-wide uppercase">
            ✨ Baru
          </Badge>
          <h4 className="text-sm leading-tight font-semibold text-white">
            {title}
          </h4>
          <p className="text-xs text-white/90">{description}</p>
        </div>

        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-white ring-0!"
            onClick={handleClose}
          >
            Nanti aja
          </Button>
          <Button size="sm" className="text-xs" onClick={handleClose}>
            Oke, paham
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
