"use client";

import { useEffect, useState } from "react";

export function useCurrentTime(enabled = true) {
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [enabled]);

  return now;
}
