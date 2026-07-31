"use client";

import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { getTractorOilStatus } from "../lib/tractorOilStatus";

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
      const { data: tractors } = await supabase.from("tractors").select("id, name").eq("is_active", true);
      if (!tractors) return;

      const lang = getUserLanguage();
      const today = new Date().toDateString();

      for (const tractor of tractors) {
        const status = await getTractorOilStatus(tractor.id);
        const hoursLeft = Math.max(status.hoursRemaining, 0);
        // Bucketed by 10-hr band + day, so a tractor doesn't spam a notification every
        // hour while still re-alerting once it crosses into a more urgent band.
        const notifKey = `tractor_notified_${tractor.id}_${Math.floor(hoursLeft / 10)}_${today}`;
        if (localStorage.getItem(notifKey)) continue;

        if (status.isUrgent) {
          sendNotification(
            lang === "ta" ? `🚨 ${tractor.name} - எண்ணெய் மாற்றம் அவசியம்!` : `🚨 ${tractor.name} - Oil Change Urgent!`,
            lang === "ta" ? `வெறும் ${hoursLeft.toFixed(1)} மணி மட்டுமே உள்ளது!` : `Only ${hoursLeft.toFixed(1)} hours remaining!`,
            true
          );
          localStorage.setItem(notifKey, "1");
        } else if (status.isWarning) {
          sendNotification(
            lang === "ta" ? `⚠️ ${tractor.name} - எண்ணெய் விரைவில் மாற்றவும்` : `⚠️ ${tractor.name} - Oil Change Soon`,
            lang === "ta" ? `${hoursLeft.toFixed(1)} மணி மட்டுமே உள்ளது` : `${hoursLeft.toFixed(1)} hours remaining`
          );
          localStorage.setItem(notifKey, "1");
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
