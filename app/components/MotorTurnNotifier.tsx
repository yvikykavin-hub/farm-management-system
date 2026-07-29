"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/useLang";

export default function MotorTurnNotifier({ language }: { language?: "ta" | "en" }) {
  const [storedLang] = useLang();
  const lang = language ?? storedLang;

  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    const requestNotificationPermission = async () => {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;

      const result = await Notification.requestPermission();
      return result === "granted";
    };

    const sendNotification = (title: string, body: string, urgent = false) => {
      if (Notification.permission !== "granted") return;

      new Notification(title, {
        body,
        icon: "/icon-192x192.png",
        badge: "/icon-192x192.png",
        requireInteraction: urgent,
      });
    };

    const checkAndNotify = async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      const [{ data: motorData }, { data: farms }] = await Promise.all([
        supabase.from("motor_sharing").select("*").eq("is_shared", true),
        supabase.from("farms").select("id, name"),
      ]);

      if (!motorData) return;

      const farmName = (farmId: string) => farms?.find((f) => f.id === farmId)?.name ?? "Farm";

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      motorData.forEach((motor) => {
        if (!motor.current_turn_start) return;

        const turnStart = new Date(motor.current_turn_start);
        const turnEnd = new Date(turnStart);
        turnEnd.setDate(turnEnd.getDate() + motor.current_turn_days);
        turnEnd.setHours(18, 0, 0, 0);

        const farm = farmName(motor.farm_id);
        const isMyTurn = motor.current_turn_owner === "me";

        // Check if my turn just started (6 PM)
        if (isMyTurn && currentHour === 18 && currentMinute < 5) {
          const lastNotified = localStorage.getItem(`motor_notified_start_${motor.id}`);
          const today = now.toDateString();

          if (lastNotified !== today) {
            sendNotification(
              lang === "ta" ? "🚰 உங்கள் மோட்டார் முறை தொடங்கியது!" : "🚰 Your motor turn has started!",
              farm,
              true
            );
            localStorage.setItem(`motor_notified_start_${motor.id}`, today);
          }
        }

        // Check 7 AM morning reminder (my turn day)
        if (isMyTurn && currentHour === 7 && currentMinute < 5) {
          const lastNotified = localStorage.getItem(`motor_notified_morning_${motor.id}`);
          const today = now.toDateString();

          if (lastNotified !== today) {
            sendNotification(
              lang === "ta"
                ? "☀️ காலை வணக்கம்! இன்று உங்கள் மோட்டார் முறை நாள்."
                : "☀️ Good morning! Today is your motor turn day.",
              farm
            );
            localStorage.setItem(`motor_notified_morning_${motor.id}`, today);
          }
        }

        // Check 5 PM warning (1 hour before turn ends)
        if (isMyTurn && currentHour === 17 && currentMinute < 5) {
          const turnEndsToday = turnEnd.toDateString() === now.toDateString();

          if (turnEndsToday) {
            const lastNotified = localStorage.getItem(`motor_notified_end_${motor.id}`);
            const today = now.toDateString();

            if (lastNotified !== today) {
              sendNotification(
                lang === "ta"
                  ? "⏰ உங்கள் மோட்டார் முறை 1 மணி நேரத்தில் முடியும்!"
                  : "⏰ Your motor turn ends in 1 hour! Finish your watering soon.",
                farm,
                true
              );
              localStorage.setItem(`motor_notified_end_${motor.id}`, today);
            }
          }
        }
      });
    };

    registerServiceWorker();
    checkAndNotify();

    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lang]);

  return null; // No UI — runs in background
}
