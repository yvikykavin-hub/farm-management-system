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

const SEASONAL_TIPS: Record<number, { icon: string; en: string; ta: string; msgEn: string; msgTa: string }> = {
  0: { icon: "🌤️", en: "Winter Tip", ta: "குளிர்கால குறிப்பு", msgEn: "Monitor irrigation closely for winter crops.", msgTa: "குளிர்கால பயிர்களுக்கு பாசனத்தை கவனமாக கண்காணிக்கவும்." },
  1: { icon: "🌤️", en: "Winter Tip", ta: "குளிர்கால குறிப்பு", msgEn: "Good time to plan land preparation for the next season.", msgTa: "அடுத்த பருவத்திற்கான நில தயாரிப்பை திட்டமிட ஏற்ற நேரம்." },
  2: { icon: "☀️", en: "Summer Tip", ta: "கோடைகால குறிப்பு", msgEn: "Ensure adequate irrigation as temperatures rise.", msgTa: "வெப்பநிலை அதிகரிக்கும் போது போதிய பாசனம் உறுதி செய்யவும்." },
  3: { icon: "☀️", en: "Summer Tip", ta: "கோடைகால குறிப்பு", msgEn: "Watch livestock for heat stress; ensure shade and water.", msgTa: "கால்நடைகளுக்கு வெப்ப அழுத்தம் ஏற்படாமல் நிழலும் நீரும் வழங்கவும்." },
  4: { icon: "☀️", en: "Summer Tip", ta: "கோடைகால குறிப்பு", msgEn: "Check well and motor condition before peak summer demand.", msgTa: "கோடை உச்சத்திற்கு முன் கிணறு மற்றும் மோட்டார் நிலையை சரிபார்க்கவும்." },
  5: { icon: "🌧️", en: "Monsoon Tip", ta: "பருவமழை குறிப்பு", msgEn: "Good time to plant kharif crops; check field drainage.", msgTa: "காரீஃப் பயிர்களை நடவு செய்ய ஏற்ற நேரம்; வயல் வடிகால் சரிபார்க்கவும்." },
  6: { icon: "🌧️", en: "Monsoon Tip", ta: "பருவமழை குறிப்பு", msgEn: "Watch for fungal disease risk in high humidity.", msgTa: "அதிக ஈரப்பதத்தில் பூஞ்சை நோய் அபாயத்தை கவனிக்கவும்." },
  7: { icon: "🌧️", en: "Monsoon Tip", ta: "பருவமழை குறிப்பு", msgEn: "Inspect shed roofing and drainage before heavy rain.", msgTa: "கனமழைக்கு முன் கொட்டகை கூரை மற்றும் வடிகாலை ஆய்வு செய்யவும்." },
  8: { icon: "🍂", en: "Post-Monsoon Tip", ta: "பருவமழைக்குப் பின் குறிப்பு", msgEn: "Begin preparing storage ahead of the harvest season.", msgTa: "அறுவடை பருவத்திற்கு முன் சேமிப்பு தயார் செய்யத் தொடங்கவும்." },
  9: { icon: "🌾", en: "Harvest Tip", ta: "அறுவடை குறிப்பு", msgEn: "Service harvesting machinery before the busy season.", msgTa: "பணிச்சுமை பருவத்திற்கு முன் அறுவடை இயந்திரங்களை பராமரிக்கவும்." },
  10: { icon: "🌾", en: "Harvest Tip", ta: "அறுவடை குறிப்பு", msgEn: "Plan labour and transport ahead of harvest.", msgTa: "அறுவடைக்கு முன் தொழிலாளர் மற்றும் போக்குவரத்தை திட்டமிடவும்." },
  11: { icon: "🌤️", en: "Winter Tip", ta: "குளிர்கால குறிப்பு", msgEn: "Review this year's finances and plan next season's budget.", msgTa: "இந்த ஆண்டு நிதியை மதிப்பாய்வு செய்து அடுத்த பருவ பட்ஜெட்டை திட்டமிடவும்." },
};

export default function NotificationBell({ language = "en" }: { language?: "ta" | "en" }) {
  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
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
        supabase.from("motor_sharing").select("id, farm_id, current_turn_owner, current_turn_start, current_turn_days").eq("is_shared", true),
      ]);

      const detected: NotificationItem[] = [];

      // Tractor oil change due
      const totalHours = (usage ?? []).reduce((s, u) => s + Number(u.duration_hours), 0);
      const interval = settings ? Number(settings.oil_change_interval_hours) : 300;
      const lastServiceHours = oilRecords?.[0] ? Number(oilRecords[0].hours_at_service) : 0;
      const hoursRemaining = interval - (totalHours - lastServiceHours);
      if (hoursRemaining < 20) {
        detected.push({
          id: "tractor-oil",
          severity: "danger",
          icon: "🚜",
          title: L("Tractor Oil Change Due!", "டிராக்டர் ஆயில் மாற்றம் தேவை!"),
          message: L(
            `Only ${Math.max(hoursRemaining, 0).toFixed(1)} hours remaining`,
            `${Math.max(hoursRemaining, 0).toFixed(1)} மணி நேரம் மட்டுமே உள்ளது`
          ),
        });
      }

      // Milk payment pending
      if (pendingPayments && pendingPayments.length > 0) {
        detected.push({
          id: "milk-payment",
          severity: "info",
          icon: "💰",
          title: L("Milk Payment Pending", "பால் பணம் நிலுவையில்"),
          message: L(`${pendingPayments.length} payment(s) pending`, `${pendingPayments.length} பணம் நிலுவையில் உள்ளது`),
        });
      }

      // Crop tips — fertilizer milestones for active crops
      const farmName = (farmId: string) => farms?.find((f) => f.id === farmId)?.name ?? "";
      (activeCrops ?? []).forEach((crop) => {
        if (!crop.start_date) return;
        const days = daysSince(crop.start_date);
        let milestone: "first" | "second" | null = null;
        if (days >= 60) milestone = "second";
        else if (days >= 30) milestone = "first";
        if (!milestone) return;

        const label = `${crop.crop_type}${farmName(crop.farm_id) ? ` — ${farmName(crop.farm_id)}` : ""}`;
        detected.push({
          id: `crop-fertilizer-${crop.id}`,
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
        const farm = farmName(motor.farm_id);
        const hoursUntilEnd = (turnEnd.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (isMyTurn && hoursUntilEnd > 0 && hoursUntilEnd <= 2) {
          detected.push({
            id: `motor-ending-${motor.id}`,
            severity: "danger",
            icon: "⏰",
            title: L("Motor Turn Ending Soon!", "மோட்டார் முறை முடியும்!"),
            message: L(
              `${farm} - ends in ${Math.round(hoursUntilEnd)} hour(s)`,
              `${farm} - ${Math.round(hoursUntilEnd)} மணி நேரத்தில் முடியும்`
            ),
          });
        }

        if (!isMyTurn) {
          const hoursUntilMyTurn = (turnEnd.getTime() - now.getTime()) / (1000 * 60 * 60);
          if (hoursUntilMyTurn > 0 && hoursUntilMyTurn <= 2) {
            detected.push({
              id: `motor-my-turn-${motor.id}`,
              severity: "warning",
              icon: "🚰",
              title: L("Your Motor Turn Starting Soon!", "உங்கள் மோட்டார் முறை தொடங்கும்!"),
              message: L(
                `${farm} - starts in ${Math.round(hoursUntilMyTurn)} hour(s)`,
                `${farm} - ${Math.round(hoursUntilMyTurn)} மணி நேரத்தில் தொடங்கும்`
              ),
            });
          }
        }
      });

      // Seasonal tip based on current month
      const monthTip = SEASONAL_TIPS[new Date().getMonth()];
      if (monthTip) {
        detected.push({
          id: "seasonal-tip",
          severity: "info",
          icon: monthTip.icon,
          title: L(monthTip.en, monthTip.ta),
          message: L(monthTip.msgEn, monthTip.msgTa),
        });
      }

      setItems(detected);
      setLoading(false);
    };

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

  const dismiss = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
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
            {items.length > 0 && <span className="text-xs text-gray-400">{items.length}</span>}
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
                    onClick={() => dismiss(item.id)}
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
