"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function InactivityTimer() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
      }, TIMEOUT_MS);
    };

    const events = ["mousedown", "keypress", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return null;
}
