"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";

const getUserLanguage = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("marutham_lang") || "en";
  }
  return "en";
};

type FarmRef = { name: string | null; name_tamil: string | null } | null;

const getFarmName = (farm: FarmRef): string => {
  const lang = getUserLanguage();
  if (lang === "ta" && farm?.name_tamil) {
    return farm.name_tamil;
  }
  return farm?.name || (lang === "ta" ? "உங்கள் பண்ணை" : "Your Farm");
};

export default function MotorTurnNotifier() {
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

    const checkTractorOil = async () => {
      const [{ data: usage }, { data: settings }, { data: oilRecords }] = await Promise.all([
        supabase.from("tractor_usage").select("duration_hours"),
        supabase.from("tractor_settings").select("oil_change_interval_hours").limit(1).maybeSingle(),
        supabase.from("tractor_engine_oil").select("hours_at_service").order("service_date", { ascending: false }).limit(1),
      ]);

      const totalHours = (usage ?? []).reduce((s, u) => s + Number(u.duration_hours), 0);
      const interval = settings ? Number(settings.oil_change_interval_hours) : 300;
      const lastServiceHours = oilRecords?.[0] ? Number(oilRecords[0].hours_at_service) : 0;
      const hoursRemaining = interval - (totalHours - lastServiceHours);

      const today = new Date().toDateString();
      const lang = getUserLanguage();

      if (hoursRemaining <= 5) {
        const lastNotified = localStorage.getItem("tractor_notified_urgent");
        if (lastNotified !== today) {
          sendNotification(
            lang === "ta" ? "🚨 டிராக்டர் ஆயில் மாற்றம் அவசியம்!" : "🚨 Tractor Oil Change Urgent!",
            lang === "ta" ? `வெறும் ${hoursRemaining.toFixed(1)} மணி நேரம் மட்டுமே உள்ளது!` : `Only ${hoursRemaining.toFixed(1)} hours remaining!`,
            true
          );
          localStorage.setItem("tractor_notified_urgent", today);
        }
      } else if (hoursRemaining <= 20) {
        const lastNotified = localStorage.getItem("tractor_notified_warning");
        if (lastNotified !== today) {
          sendNotification(
            lang === "ta" ? "⚠️ டிராக்டர் ஆயில் விரைவில் மாற்றவும்" : "⚠️ Tractor Oil Change Soon",
            lang === "ta" ? `${hoursRemaining.toFixed(1)} மணி நேரம் மட்டுமே உள்ளது` : `${hoursRemaining.toFixed(1)} hours remaining`
          );
          localStorage.setItem("tractor_notified_warning", today);
        }
      }
    };

    const checkMotorTurns = async () => {
      const { data: motorData } = await supabase
        .from("motor_sharing")
        .select("*, motor_sharing_neighbors(*), farms(name, name_tamil)")
        .eq("is_shared", true);

      if (!motorData) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const lang = getUserLanguage();

      motorData.forEach((motor) => {
        if (!motor.current_turn_start) return;

        const turnStart = new Date(motor.current_turn_start);
        const turnEnd = new Date(turnStart);
        turnEnd.setDate(turnEnd.getDate() + motor.current_turn_days);
        turnEnd.setHours(18, 0, 0, 0);

        const farmDisplayName = getFarmName(motor.farms as FarmRef);
        const isMyTurn = motor.current_turn_owner === "me";

        // Check if my turn just started (6 PM)
        if (isMyTurn && currentHour === 18 && currentMinute < 5) {
          const lastNotified = localStorage.getItem(`motor_notified_start_${motor.id}`);
          const today = now.toDateString();

          if (lastNotified !== today) {
            sendNotification(
              lang === "ta"
                ? `🚰 ${farmDisplayName} - உங்கள் மோட்டார் முறை தொடங்கியது!`
                : `🚰 ${farmDisplayName} - Your motor turn has started!`,
              lang === "ta" ? "இப்போதே தண்ணீர் பாசனம் செய்யலாம்" : "You can start watering now",
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
                ? `☀️ காலை வணக்கம்! ${farmDisplayName} - இன்று உங்கள் மோட்டார் முறை நாள்.`
                : `☀️ Good morning! ${farmDisplayName} - Today is your motor turn day.`,
              "",
              false
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
                  ? `⏰ ${farmDisplayName} - உங்கள் மோட்டார் முறை 1 மணி நேரத்தில் முடியும்!`
                  : `⏰ ${farmDisplayName} - Your motor turn ends in 1 hour!`,
                lang === "ta" ? "தண்ணீர் பாசனத்தை முடிக்கவும்" : "Finish your watering soon",
                true
              );
              localStorage.setItem(`motor_notified_end_${motor.id}`, today);
            }
          }
        }
      });
    };

    const checkAndNotify = async () => {
      const hasPermission = await requestNotificationPermission();
      if (!hasPermission) return;

      await Promise.all([checkMotorTurns(), checkTractorOil()]);
    };

    registerServiceWorker();
    checkAndNotify();

    const interval = setInterval(checkAndNotify, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return null; // No UI — runs in background
}
