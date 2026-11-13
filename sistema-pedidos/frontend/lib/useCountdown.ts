"use client";

import { useEffect, useState } from "react";

// Segundos que faltan para una fecha ISO (0 si ya pasó o no hay fecha).
// Se actualiza solo cada segundo mientras falte tiempo.
export function useCountdown(until?: string | null) {
  const calc = () => {
    if (!until) return 0;
    const ms = new Date(until).getTime() - Date.now();
    return ms > 0 ? Math.ceil(ms / 1000) : 0;
  };

  const [seconds, setSeconds] = useState(calc);

  useEffect(() => {
    setSeconds(calc());
    if (!until) return;
    const id = setInterval(() => {
      const s = calc();
      setSeconds(s);
      if (s <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [until]);

  return seconds;
}

export function formatCountdown(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
