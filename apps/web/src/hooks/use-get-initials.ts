"use client";

import { useMemo } from "react";

export function useGetInitials(fullname?: string) {
  return useMemo(() => {
    if (!fullname || typeof fullname !== "string") return "";

    const trimmed = fullname.trim();
    if (!trimmed) return "";

    const nameParts = trimmed.split(/\s+/);
    const initials = nameParts
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("");

    return initials;
  }, [fullname]);
}
