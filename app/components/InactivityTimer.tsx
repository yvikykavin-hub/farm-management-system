"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { hasBiometricRegistered } from "../lib/webauthn";
import { setLockedCookie } from "../lib/lockCookie";

const TIMEOUT_MS = 2 * 60 * 60 * 1000; // 2 hours

export default function InactivityTimer() {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        // Biometric enabled: soft-lock instead of a full sign-out, so
        // fingerprint has a still-valid session to unlock. Everyone else
        // keeps the original hard sign-out behavior unchanged.
        if (hasBiometricRegistered()) {
          setLockedCookie();
        } else {
          await supabase.auth.signOut();
        }
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
