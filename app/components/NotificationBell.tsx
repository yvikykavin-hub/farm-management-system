"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

type Severity = "danger" | "warning" | "info";

type NotificationItem = {
  id: string;
  severity: Severity;
  icon: string;
  title: string;
  message: string;
};

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

const getUserLanguage = (): "ta" | "en" => {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("marutham_lang") === "ta" ? "ta" : "en";
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

// Season buckets by month index (0 = Jan): Dec–Feb winter, Mar–May summer,
// Jun–Nov monsoon (rainy season through harvest — kept as one bucket per
// the simplified 3-season model).
const SEASON_TIPS: Record<"winter" | "summer" | "monsoon", { icon: string; en: string; ta: string; msgEn: string; msgTa: string }> = {
  monsoon: {
    icon: "🌧️",
    en: "Monsoon Season Tip",
    ta: "மழைக்கால குறிப்பு",
    msgEn: "Monsoon season - avoid spraying pesticides",
    msgTa: "மழைக்காலம் - பூச்சிக்கொல்லி தெளிக்க சரியான நேரம் அல்ல",
  },
  summer: {
    icon: "☀️",
    en: "Summer Season Tip",
    ta: "கோடைகால குறிப்பு",
    msgEn: "Water in morning or evening only",
    msgTa: "காலை அல்லது மாலை நேரத்தில் பாசனம் செய்யவும்",
  },
  winter: {
    icon: "🌿",
    en: "Winter Season Tip",
    ta: "குளிர்கால குறிப்பு",
    msgEn: "Great time to plant coconut and turmeric!",
    msgTa: "தேங்காய், மஞ்சள் பயிர் செய்ய சிறந்த நேரம்!",
  },
};

const seasonForMonth = (month: number): "winter" | "summer" | "monsoon" => {
  if (month === 11 || month === 0 || month === 1) return "winter";
  if (month >= 2 && month <= 4) return "summer";
  return "monsoon";
};

const DISMISSED_KEY = "marutham_dismissed_notifications";

const getDismissedIds = (): string[] => {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

export default function NotificationBell({ language = "en" }: { language?: "ta" | "en" }) {
  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
      setLoading(true);
      const [
        { data: usage },
        { data: settings },
        { data: oilRecords },
        { data: pendingPayments },
        { data: activeCrops },
        { data: farms },
        { data: motorData },
      ] = await Promise.all([
        supabase.from("tractor_usage").select("duration_hours"),
        supabase.from("tractor_settings").select("oil_change_interval_hours").limit(1).maybeSingle(),
        supabase.from("tractor_engine_oil").select("hours_at_service").order("service_date", { ascending: false }).limit(1),
        supabase.from("milk_payments").select("id").eq("payment_status", "pending"),
        supabase.from("cultivations").select("id, farm_id, crop_type, start_date").is("end_date", null),
        supabase.from("farms").select("id, name"),
        supabase.from("motor_sharing").select("*, farms(name, name_tamil)").eq("is_shared", true),
      ]);

      const detected: NotificationItem[] = [];
      const lang = getUserLanguage();

      // Tractor oil change — two tiers: urgent (very low) vs warning (soon)
      const totalHours = (usage ?? []).reduce((s, u) => s + Number(u.duration_hours), 0);
      const interval = settings ? Number(settings.oil_change_interval_hours) : 300;
      const lastServiceHours = oilRecords?.[0] ? Number(oilRecords[0].hours_at_service) : 0;
      const hoursRemaining = Math.max(interval - (totalHours - lastServiceHours), 0);
      // Bucket the hours into the id so dismissing a "20h left" warning
      // doesn't also silence the later "5h left" urgent alert — a genuinely
      // new range gets a new id, an oil change (hours jump back up) does too.
      const tractorBucket = Math.floor(hoursRemaining / 10);
      if (hoursRemaining <= 5) {
        detected.push({
          id: `tractor-oil-${tractorBucket}`,
          severity: "danger",
          icon: "🚨",
          title: lang === "ta" ? "🚨 டிராக்டர் ஆயில் மாற்றம் அவசியம்!" : "🚨 Tractor Oil Change Urgent!",
          message: lang === "ta" ? `வெறும் ${hoursRemaining.toFixed(1)} மணி நேரம் மட்டுமே உள்ளது!` : `Only ${hoursRemaining.toFixed(1)} hours remaining!`,
        });
      } else if (hoursRemaining <= 20) {
        detected.push({
          id: `tractor-oil-${tractorBucket}`,
          severity: "warning",
          icon: "⚠️",
          title: lang === "ta" ? "⚠️ டிராக்டர் ஆயில் விரைவில் மாற்றவும்" : "⚠️ Tractor Oil Change Soon",
          message: lang === "ta" ? `${hoursRemaining.toFixed(1)} மணி நேரம் மட்டுமே உள்ளது` : `${hoursRemaining.toFixed(1)} hours remaining`,
        });
      }

      // Milk payment pending
      if (pendingPayments && pendingPayments.length > 0) {
        detected.push({
          id: "milk-payment",
          severity: "info",
          icon: "💰",
          title: lang === "ta" ? "💰 பால் பணம் நிலுவை உள்ளது" : "💰 Milk Payment Pending",
          message: lang === "ta" ? `${pendingPayments.length} நிலுவை பணம் உள்ளது` : `${pendingPayments.length} payment(s) pending`,
        });
      }

      // Crop tips — fertilizer milestones for active crops
      const farmName = (farmId: string) => farms?.find((f) => f.id === farmId)?.name ?? "";
      (activeCrops ?? []).forEach((crop) => {
        if (!crop.start_date) return;
        const days = daysSince(crop.start_date);
        const label = `${crop.crop_type}${farmName(crop.farm_id) ? ` — ${farmName(crop.farm_id)}` : ""}`;

        // Turmeric gets its own staged tips instead of the generic milestones.
        if (crop.crop_type === "turmeric") {
          if (days >= 40 && days <= 50) {
            detected.push({
              id: `crop-turmeric-fertilizer-${crop.id}`,
              severity: "warning",
              icon: "🌱",
              title: lang === "ta" ? "🌱 மஞ்சள் உர குறிப்பு" : "🌱 Turmeric Fertilizer Tip",
              message:
                lang === "ta"
                  ? `${label} — மஞ்சள் ${days} நாட்கள். பொட்டாசியம் உரம் இட நேரம்!`
                  : `${label} — Turmeric is ${days} days. Time to apply potassium!`,
            });
          } else if (days >= 240) {
            detected.push({
              id: `crop-turmeric-harvest-${crop.id}`,
              severity: "info",
              icon: "🌾",
              title: lang === "ta" ? "🌾 மஞ்சள் அறுவடை நேரம்" : "🌾 Turmeric Harvest Time",
              message:
                lang === "ta"
                  ? `${label} — மஞ்சள் ${days} நாட்கள். அறுவடைக்கு தயாராகுங்கள்!`
                  : `${label} — Turmeric ${days} days old. Prepare for harvest!`,
            });
          }
          return;
        }

        let milestone: "first" | "second" | null = null;
        if (days >= 60) milestone = "second";
        else if (days >= 30) milestone = "first";
        if (!milestone) return;

        detected.push({
          // Milestone included so dismissing "First" doesn't also silence
          // the later, genuinely different "Second" fertilizer notice.
          id: `crop-fertilizer-${crop.id}-${milestone}`,
          severity: "warning",
          icon: "🌱",
          title:
            milestone === "first"
              ? L(`First Fertilizer Due for ${label}`, `${label} க்கு முதல் உரம் தேவை`)
              : L(`Second Fertilizer Due for ${label}`, `${label} க்கு இரண்டாம் உரம் தேவை`),
          message: L("Fertilizer application due", "உரம் இடும் நேரம் வந்துவிட்டது"),
        });
      });

      // Motor sharing — turn starting/ending soon
      (motorData ?? []).forEach((motor) => {
        if (!motor.current_turn_start) return;

        const turnStart = new Date(motor.current_turn_start);
        const turnEnd = new Date(turnStart);
        turnEnd.setDate(turnEnd.getDate() + motor.current_turn_days);
        turnEnd.setHours(18, 0, 0, 0);

        const now = new Date();
        const isMyTurn = motor.current_turn_owner === "me";
        const motorFarmName = getFarmName(motor.farms as FarmRef);
        const hoursUntilEnd = (turnEnd.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (isMyTurn && hoursUntilEnd > 0 && hoursUntilEnd <= 2) {
          detected.push({
            // current_turn_start included so dismissing "ending soon" for
            // this turn doesn't also silence the same alert on the next
            // turn cycle (the row is reused/updated in place per rotation).
            id: `motor-ending-${motor.id}-${motor.current_turn_start}`,
            severity: "danger",
            icon: "⏰",
            title: lang === "ta" ? `⏰ ${motorFarmName} - மோட்டார் முறை முடியும்!` : `⏰ ${motorFarmName} - Motor Turn Ending Soon!`,
            message:
              lang === "ta" ? `${Math.round(hoursUntilEnd)} மணி நேரத்தில் முடியும்` : `Ends in ${Math.round(hoursUntilEnd)} hour(s)`,
          });
        }

        if (!isMyTurn) {
          const hoursUntilMyTurn = (turnEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntilMyTurn > 0 && hoursUntilMyTurn <= 2) {
            detected.push({
              id: `motor-my-turn-${motor.id}-${motor.current_turn_start}`,
              severity: "warning",
              icon: "🚰",
              title:
                lang === "ta"
                  ? `🚰 ${motorFarmName} - உங்கள் மோட்டார் முறை தொடங்கும்!`
                  : `🚰 ${motorFarmName} - Your Motor Turn Starting Soon!`,
              message:
                lang === "ta"
                  ? `${Math.round(hoursUntilMyTurn)} மணி நேரத்தில் தொடங்கும்`
                  : `Starts in ${Math.round(hoursUntilMyTurn)} hour(s)`,
            });
          }
        }
      });

      // Seasonal tip based on current month
      const season = seasonForMonth(new Date().getMonth());
      const seasonTip = SEASON_TIPS[season];
      detected.push({
        id: `seasonal-${season}`,
        severity: "info",
        icon: seasonTip.icon,
        title: lang === "ta" ? seasonTip.ta : seasonTip.en,
        message: lang === "ta" ? seasonTip.msgTa : seasonTip.msgEn,
      });

      const dismissedIds = getDismissedIds();
      setItems(detected.filter((n) => !dismissedIds.includes(n.id)));
      setLoading(false);
  };

  const dismiss = (id: string) => {
    const dismissedIds = getDismissedIds();
    if (!dismissedIds.includes(id)) {
      dismissedIds.push(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissedIds));
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const clearAllDismissed = () => {
    localStorage.removeItem(DISMISSED_KEY);
    fetchNotifications();
  };

  const severityCls: Record<Severity, string> = {
    danger: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-300",
    warning: "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-300",
    info: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-800 dark:text-blue-300",
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 transition-all duration-200"
        title={L("Notifications", "அறிவிப்புகள்")}
      >
        <span className="text-lg">🔔</span>
        {items.length > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {items.length > 9 ? "9+" : items.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className="fixed sm:absolute z-50 top-[60px] left-2 right-2 sm:top-11 sm:left-auto sm:right-0
                     w-auto max-w-[320px] ml-auto sm:w-80 sm:ml-0
                     bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700
                     max-h-96 overflow-y-auto"
        >
          <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-800">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">🔔 {L("Notifications", "அறிவிப்புகள்")}</h3>
            <div className="flex items-center gap-2">
              {items.length > 0 && <span className="text-xs text-gray-400">{items.length}</span>}
              <button onClick={clearAllDismissed} className="text-xs text-red-400 hover:text-red-600">
                {L("Clear all", "அனைத்தும் அழி")}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="p-3 space-y-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-14 bg-gray-100 dark:bg-slate-700 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-6 text-center text-xs text-gray-400">
              {L("You're all caught up!", "அனைத்தும் புதுப்பித்தது!")}
            </div>
          ) : (
            <div className="p-2 space-y-1.5">
              {items.map((item) => (
                <div key={item.id} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm border ${severityCls[item.severity]}`}>
                  <span className="text-base shrink-0">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-xs opacity-70 mt-0.5">{item.message}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(item.id);
                    }}
                    className="min-h-[24px] min-w-[24px] flex items-center justify-center text-current opacity-60 hover:opacity-100 shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
