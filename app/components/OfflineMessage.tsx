"use client";

import { useState, useEffect } from "react";
import { useLang } from "../lib/useLang";

export default function OfflineMessage() {
  const [lang] = useLang();
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[200] py-2.5 px-4 text-center text-sm font-medium transition-all duration-300 ${
        isOnline ? "bg-green-500 text-white" : "bg-red-500 text-white"
      }`}
    >
      {isOnline ? (
        <span>✅ {lang === "ta" ? "இணைப்பு மீண்டும் கிடைத்தது!" : "Back online!"}</span>
      ) : (
        <span>
          📵 {lang === "ta" ? "இணைய இணைப்பு இல்லை. உங்கள் தரவு பாதுகாப்பாக உள்ளது." : "No internet. Your data is safe."}
        </span>
      )}
    </div>
  );
}
