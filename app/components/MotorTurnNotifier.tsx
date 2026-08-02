"use client";

import { useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getTractorOilStatus } from "../lib/tractorOilStatus";

const NOTIFICATION_CHECK_KEY = "marutham_last_notification_check";
const DISMISSED_KEY = "marutham_dismissed_notifications";

const getUserLanguage = (): string => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("marutham_lang") || "en";
  }
  return "en";
};

const getDismissedIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const isDismissed = (tag: string): boolean => getDismissedIds().includes(tag);

type FarmRef = { name: string | null; name_tamil: string | null } | null;

const getFarmName = (farm: FarmRef): string => {
  const lang = getUserLanguage();
  if (lang === "ta" && farm?.name_tamil) {
    return farm.name_tamil;
  }
  return farm?.name || (lang === "ta" ? "உங்கள் பண்ணை" : "Your Farm");
};

export default function MotorTurnNotifier() {
  const checkInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) return;
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        console.log("SW registered:", registration.scope);
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    const requestNotificationPermission = async (): Promise<boolean> => {
      if (!("Notification" in window)) return false;
      if (Notification.permission === "granted") return true;
      if (Notification.permission === "denied") return false;
      const result = await Notification.requestPermission();
      return result === "granted";
    };

    const sendNotification = async (title: string, body: string, tag: string, url: string = "/", urgent = false) => {
      if (isDismissed(tag)) return;
      if (Notification.permission !== "granted") return;

      try {
        // Use the service worker's showNotification so alerts still land while
        // the PWA is backgrounded, not just while this tab is open.
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: "/icon-192x192.png",
          badge: "/icon-192x192.png",
          tag,
          renotify: false,
          vibrate: [200, 100, 200],
          data: { url },
          requireInteraction: urgent,
        } as NotificationOptions);
      } catch {
        if ("Notification" in window) {
          new Notification(title, { body, icon: "/icon-192x192.png", tag });
        }
      }
    };

    const checkTractorOil = async (lang: string) => {
      const { data: tractors } = await supabase.from("tractors").select("id, name").eq("is_active", true);
      if (!tractors) return;

      for (const tractor of tractors) {
        const status = await getTractorOilStatus(tractor.id);
        const hoursLeft = Math.max(status.hoursRemaining, 0);
        // Bucketed by 10-hr band, so a tractor doesn't spam a notification every
        // check while still re-alerting once it crosses into a more urgent band.
        const tag = `tractor-oil-${tractor.id}-${Math.floor(hoursLeft / 10)}`;

        if (status.isUrgent) {
          await sendNotification(
            lang === "ta" ? `🚨 ${tractor.name} - எண்ணெய் மாற்றம் அவசியம்!` : `🚨 ${tractor.name} - Oil Change Urgent!`,
            lang === "ta" ? `வெறும் ${hoursLeft.toFixed(1)} மணி மட்டுமே!` : `Only ${hoursLeft.toFixed(1)} hours left!`,
            tag,
            "/machinery/tractor",
            true
          );
        } else if (status.isWarning) {
          await sendNotification(
            lang === "ta" ? `⚠️ ${tractor.name} - எண்ணெய் விரைவில்` : `⚠️ ${tractor.name} - Oil Change Soon`,
            lang === "ta" ? `${hoursLeft.toFixed(1)} மணி மட்டுமே உள்ளது` : `${hoursLeft.toFixed(1)} hours remaining`,
            tag,
            "/machinery/tractor",
            false
          );
        }
      }
    };

    const checkMotorTurns = async (lang: string, hour: number, today: string) => {
      const { data: motorData } = await supabase
        .from("motor_sharing")
        .select("*, motor_sharing_neighbors(*), farms(name, name_tamil)")
        .eq("is_shared", true);

      if (!motorData) return;

      for (const motor of motorData) {
        if (!motor.current_turn_start) continue;

        const isMyTurn = motor.current_turn_owner === "me";
        const farmName = getFarmName(motor.farms as FarmRef);

        const turnStart = new Date(motor.current_turn_start);
        const turnEnd = new Date(turnStart);
        turnEnd.setDate(turnEnd.getDate() + motor.current_turn_days);
        turnEnd.setHours(18, 0, 0, 0);

        const now = new Date();

        // 6 PM - turn starts
        if (isMyTurn && hour === 18) {
          const tag = `motor-start-${motor.id}-${today}`;
          await sendNotification(
            lang === "ta" ? `🚰 ${farmName} - உங்கள் முறை தொடங்கியது!` : `🚰 ${farmName} - Your motor turn started!`,
            lang === "ta" ? "இப்போதே தண்ணீர் பாசனம் செய்யலாம்" : "You can start watering now",
            tag,
            "/land-details",
            true
          );
        }

        // 7 AM - morning reminder
        if (isMyTurn && hour === 7) {
          const tag = `motor-morning-${motor.id}-${today}`;
          await sendNotification(
            lang === "ta" ? `☀️ ${farmName} - இன்று உங்கள் மோட்டார் நாள்` : `☀️ ${farmName} - Today is your motor turn day`,
            "",
            tag,
            "/land-details",
            false
          );
        }

        // 5 PM - 1 hour warning
        if (isMyTurn && hour === 17) {
          const turnEndsToday = turnEnd.toDateString() === now.toDateString();
          if (turnEndsToday) {
            const tag = `motor-end-${motor.id}-${today}`;
            await sendNotification(
              lang === "ta" ? `⏰ ${farmName} - முறை 1 மணி நேரத்தில் முடியும்!` : `⏰ ${farmName} - Turn ends in 1 hour!`,
              lang === "ta" ? "பாசனத்தை முடிக்கவும்" : "Finish your watering soon",
              tag,
              "/land-details",
              true
            );
          }
        }
      }
    };

    // Walks the rotation day-by-day from the configured start until it finds
    // today's slot, mirroring MotorSharingSection's getTodaysTurn logic.
    const checkTodaysTurn = async (lang: string) => {
      const { data: motorData } = await supabase
        .from("motor_sharing")
        .select("*, motor_sharing_neighbors(*), farms(name, name_tamil)")
        .eq("is_shared", true);

      if (!motorData) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toDateString();

      for (const motor of motorData) {
        if (!motor.current_turn_start) continue;

        const allParticipants = [
          { name: "me", days: motor.current_turn_days || 2 },
          ...(motor.motor_sharing_neighbors || []).map((n: { neighbor_name: string; turn_days: number }) => ({
            name: n.neighbor_name,
            days: n.turn_days || 2,
          })),
        ];

        const startIndex = allParticipants.findIndex((p) => p.name === motor.current_turn_owner);
        if (startIndex === -1) continue;

        let currentDate = new Date(motor.current_turn_start);
        let participantIndex = startIndex;
        let isMyTurn = false;
        let iterations = 0;

        while (currentDate <= today && iterations < 100) {
          const participant = allParticipants[participantIndex % allParticipants.length];

          const endDate = new Date(currentDate);
          endDate.setDate(endDate.getDate() + participant.days);
          endDate.setHours(18, 0, 0, 0);

          if (today < endDate) {
            isMyTurn = participant.name === "me";
            break;
          }

          currentDate = new Date(endDate);
          participantIndex++;
          iterations++;
        }

        if (isMyTurn) {
          const farmName = lang === "ta" && motor.farms?.name_tamil ? motor.farms.name_tamil : motor.farms?.name || "Farm";
          const tag = `motor-today-${motor.id}-${todayStr}`;

          await sendNotification(
            lang === "ta" ? `🚰 ${farmName} - இன்று உங்கள் முறை!` : `🚰 ${farmName} - Today is your motor turn!`,
            lang === "ta" ? "இப்போதே தண்ணீர் பாசனம் செய்யலாம்" : "You can water your fields now",
            tag,
            "/land-details",
            false
          );
        }
      }
    };

    const checkMilkPayments = async (lang: string) => {
      const { data: pending } = await supabase.from("milk_payments").select("id").eq("payment_status", "Pending").limit(5);

      if (pending && pending.length > 0) {
        const tag = `milk-payment-${new Date().toDateString()}`;
        await sendNotification(
          lang === "ta" ? "💰 பால் பணம் நிலுவை உள்ளது" : "💰 Milk Payment Pending",
          lang === "ta" ? `${pending.length} நிலுவை பணம் உள்ளது` : `${pending.length} payment(s) pending`,
          tag,
          "/livestock/cows",
          false
        );
      }
    };

    const checkAndSendNotifications = async () => {
      if (Notification.permission !== "granted") return;

      const lang = getUserLanguage();
      const now = new Date();
      const hour = now.getHours();
      const today = now.toDateString();

      // Prevent checking too frequently
      const lastCheck = localStorage.getItem(NOTIFICATION_CHECK_KEY);
      const lastCheckDate = lastCheck ? new Date(lastCheck) : null;
      const minutesSinceCheck = lastCheckDate ? (now.getTime() - lastCheckDate.getTime()) / (1000 * 60) : 999;

      if (minutesSinceCheck < 25) return;
      localStorage.setItem(NOTIFICATION_CHECK_KEY, now.toISOString());

      try {
        await checkTractorOil(lang);
        await checkMotorTurns(lang, hour, today);
        // Check today's motor turn (morning only)
        if (hour >= 6 && hour <= 9) {
          await checkTodaysTurn(lang);
        }
        if (now.getDay() === 3) {
          await checkMilkPayments(lang);
        }
      } catch (error) {
        console.error("Notification check error:", error);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        checkAndSendNotifications();
      }
    };

    const init = async () => {
      await registerServiceWorker();
      const hasPermission = await requestNotificationPermission();
      if (hasPermission) await checkAndSendNotifications();
    };

    init();

    // Check every 30 minutes when app is open
    checkInterval.current = setInterval(checkAndSendNotifications, 30 * 60 * 1000);

    // Also check when the page becomes visible again
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (checkInterval.current) clearInterval(checkInterval.current);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return null; // No UI — runs in background
}
