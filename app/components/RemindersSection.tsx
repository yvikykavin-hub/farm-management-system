"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

type Reminder = {
  id: string;
  title: string;
  description: string | null;
  reminder_date: string;
  reminder_type: string;
  related_to: string | null;
  is_dismissed: boolean;
  is_completed: boolean;
};

const REMINDER_TYPES = [
  { value: "fertilizer", en: "Fertilizer", ta: "உரம்" },
  { value: "pesticide", en: "Pesticide", ta: "பூச்சிக்கொல்லி" },
  { value: "vaccination", en: "Vaccination", ta: "தடுப்பூசி" },
  { value: "payment", en: "Payment", ta: "பணம்" },
  { value: "harvest", en: "Harvest", ta: "அறுவடை" },
  { value: "custom", en: "Custom", ta: "தனிப்பயன்" },
] as const;

const RELATED_TO_OPTIONS = [
  { value: "crop", en: "Crop", ta: "பயிர்" },
  { value: "livestock", en: "Livestock", ta: "கால்நடை" },
  { value: "machinery", en: "Machinery", ta: "இயந்திரங்கள்" },
  { value: "general", en: "General", ta: "பொது" },
] as const;

const REMINDER_COLOR: Record<string, string> = {
  fertilizer: "bg-green-50 border-green-200 text-green-800",
  pesticide: "bg-yellow-50 border-yellow-200 text-yellow-800",
  vaccination: "bg-blue-50 border-blue-200 text-blue-800",
  payment: "bg-red-50 border-red-200 text-red-800",
  harvest: "bg-orange-50 border-orange-200 text-orange-800",
  custom: "bg-purple-50 border-purple-200 text-purple-800",
  machinery: "bg-slate-50 border-slate-200 text-slate-800",
};

const REMINDER_ICON: Record<string, string> = {
  fertilizer: "🌱",
  pesticide: "🧪",
  vaccination: "💉",
  payment: "💰",
  harvest: "🌾",
  machinery: "🚜",
  custom: "📌",
};

const getReminderColor = (type: string) => REMINDER_COLOR[type] ?? REMINDER_COLOR.custom;
const getReminderIcon = (type: string) => REMINDER_ICON[type] ?? REMINDER_ICON.custom;

const todayISO = () => new Date().toISOString().slice(0, 10);
const formatDate = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
const SIX_MONTHS_MS = 1000 * 60 * 60 * 24 * 30 * 6;

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function RemindersSection({ language = "en" }: { language?: "ta" | "en" }) {
  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [type, setType] = useState<typeof REMINDER_TYPES[number]["value"]>("fertilizer");
  const [relatedTo, setRelatedTo] = useState<typeof RELATED_TO_OPTIONS[number]["value"] | "">("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    init();
  }, []);

  const fetchReminders = async () => {
    const { data } = await supabase.from("reminders").select("*").order("reminder_date", { ascending: false });
    const list = data ?? [];
    setReminders(list);
    return list.filter((r) => !r.is_dismissed && !r.is_completed);
  };

  const init = async () => {
    setLoading(true);
    const active = await fetchReminders();
    await Promise.all([
      detectTractorOil(active),
      detectMilkPayments(active),
      detectCropFertilizer(active),
      detectVaccinations(active),
    ]);
    await fetchReminders();
    setLoading(false);
  };

  // ---------------- Auto Reminder 1: Tractor Oil Change ----------------
  const detectTractorOil = async (existing: Reminder[]) => {
    const alreadyExists = existing.some((r) => r.reminder_type === "machinery" && r.related_to === "machinery");
    if (alreadyExists) return;

    const [{ data: usage }, { data: settings }, { data: oilRecords }] = await Promise.all([
      supabase.from("tractor_usage").select("duration_hours"),
      supabase.from("tractor_settings").select("oil_change_interval_hours").limit(1).maybeSingle(),
      supabase.from("tractor_engine_oil").select("hours_at_service").order("service_date", { ascending: false }).limit(1),
    ]);

    const totalHours = (usage ?? []).reduce((s, u) => s + Number(u.duration_hours), 0);
    const interval = settings ? Number(settings.oil_change_interval_hours) : 300;
    const lastServiceHours = oilRecords?.[0] ? Number(oilRecords[0].hours_at_service) : 0;
    const hoursRemaining = interval - (totalHours - lastServiceHours);

    if (hoursRemaining >= 20) return;

    await supabase.from("reminders").insert({
      title: "Tractor Oil Change Due!",
      description: `Only ${Math.max(hoursRemaining, 0).toFixed(1)} hours remaining`,
      reminder_date: todayISO(),
      reminder_type: "machinery",
      related_to: "machinery",
    });
  };

  // ---------------- Auto Reminder 2: Pending Milk Payments ----------------
  const detectMilkPayments = async (existing: Reminder[]) => {
    const { data: pending } = await supabase.from("milk_payments").select("payment_date").eq("payment_status", "pending");
    if (!pending || pending.length === 0) return;

    const existingTitles = new Set(existing.filter((r) => r.reminder_type === "payment").map((r) => r.title));

    for (const p of pending) {
      const paymentDateLabel = formatDate(p.payment_date);
      const reminderTitle = `Milk Payment Pending (${paymentDateLabel})`;
      if (existingTitles.has(reminderTitle)) continue;
      await supabase.from("reminders").insert({
        title: reminderTitle,
        description: `Payment from ${paymentDateLabel} still pending`,
        reminder_date: todayISO(),
        reminder_type: "payment",
        related_to: "livestock",
      });
    }
  };

  // ---------------- Auto Reminder 3: Crop Activity Due ----------------
  const detectCropFertilizer = async (existing: Reminder[]) => {
    const [{ data: activeCrops }, { data: farms }] = await Promise.all([
      supabase.from("cultivations").select("id, farm_id, crop_type, start_date").is("end_date", null),
      supabase.from("farms").select("id, name"),
    ]);
    if (!activeCrops || activeCrops.length === 0) return;

    const farmName = (farmId: string) => farms?.find((f) => f.id === farmId)?.name ?? "";
    const existingTitles = new Set(existing.filter((r) => r.reminder_type === "fertilizer").map((r) => r.title));

    for (const crop of activeCrops) {
      if (!crop.start_date) continue;
      const days = daysSince(crop.start_date);

      let milestone: 30 | 60 | null = null;
      if (days >= 60) milestone = 60;
      else if (days >= 30) milestone = 30;
      if (!milestone) continue;

      const label = `${crop.crop_type}${farmName(crop.farm_id) ? ` — ${farmName(crop.farm_id)}` : ""}`;
      const reminderTitle = `Fertilizer Due for ${label} (Day ${milestone})`;
      if (existingTitles.has(reminderTitle)) continue;

      await supabase.from("reminders").insert({
        title: reminderTitle,
        description: `Your ${crop.crop_type} is ${days} days old`,
        reminder_date: todayISO(),
        reminder_type: "fertilizer",
        related_to: "crop",
      });
    }
  };

  // ---------------- Auto Reminder 4: Livestock Vaccination ----------------
  const detectVaccinations = async (existing: Reminder[]) => {
    const [
      { data: cows },
      { data: goats },
      { data: hens },
      { data: cowExpenses },
      { data: goatExpenses },
      { data: henExpenses },
    ] = await Promise.all([
      supabase.from("cows").select("id, name").eq("current_status", "active"),
      supabase.from("goats").select("id, name").eq("current_status", "active"),
      supabase.from("hens").select("id, name").eq("current_status", "active"),
      supabase.from("cow_expenses").select("cow_id, expense_date").eq("expense_type", "vaccination"),
      supabase.from("goat_expenses").select("goat_id, expense_date").eq("expense_type", "Vaccination"),
      supabase.from("hen_expenses").select("hen_id, expense_date").eq("expense_type", "Vaccination"),
    ]);

    const overdueAnimals: string[] = [];

    const checkGroup = (
      animals: { id: string; name: string }[] | null,
      records: Record<string, string>[] | null,
      idKey: string
    ) => {
      (animals ?? []).forEach((animal) => {
        const lastDate = (records ?? [])
          .filter((r) => r[idKey] === animal.id)
          .reduce<string | null>((latest, r) => {
            const d = r.expense_date;
            return !latest || d > latest ? d : latest;
          }, null);
        if (lastDate && Date.now() - new Date(lastDate).getTime() > SIX_MONTHS_MS) {
          overdueAnimals.push(animal.name);
        }
      });
    };

    checkGroup(cows, cowExpenses, "cow_id");
    checkGroup(goats, goatExpenses, "goat_id");
    checkGroup(hens, henExpenses, "hen_id");

    const existingTitles = new Set(existing.filter((r) => r.reminder_type === "vaccination").map((r) => r.title));

    for (const name of overdueAnimals) {
      const reminderTitle = `Vaccination Due (${name})`;
      if (existingTitles.has(reminderTitle)) continue;
      await supabase.from("reminders").insert({
        title: reminderTitle,
        description: `${name} vaccination overdue`,
        reminder_date: todayISO(),
        reminder_type: "vaccination",
        related_to: "livestock",
      });
    }
  };

  // ---------------- Manual reminders ----------------
  const openAddReminder = () => {
    setTitle("");
    setDescription("");
    setDate(todayISO());
    setType("fertilizer");
    setRelatedTo("");
    setShowAddReminder(true);
  };

  const saveReminder = async () => {
    if (!title.trim() || !date) {
      toast.error(L("Title and date are required.", "தலைப்பு மற்றும் தேதி தேவை."));
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("reminders").insert({
        title: title.trim(),
        description: description.trim() || null,
        reminder_date: date,
        reminder_type: type,
        related_to: relatedTo || null,
      });
      if (error) {
        console.error("Error saving reminder:", error);
        toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setShowAddReminder(false);
        fetchReminders();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const markComplete = async (id: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, is_completed: true } : r)));
    await supabase.from("reminders").update({ is_completed: true }).eq("id", id);
  };

  const dismissReminder = async (id: string) => {
    setReminders((prev) => prev.map((r) => (r.id === id ? { ...r, is_dismissed: true } : r)));
    await supabase.from("reminders").update({ is_dismissed: true }).eq("id", id);
  };

  const activeReminders = reminders.filter((r) => !r.is_dismissed && !r.is_completed);

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-800 text-sm">🔔 {L("Reminders", "நினைவூட்டல்கள்")}</h3>
        <button
          onClick={openAddReminder}
          className="min-h-[44px] px-2 text-xs text-green-600 hover:text-green-700 font-medium"
        >
          + {L("Add", "சேர்")}
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : activeReminders.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-4 text-center text-xs text-gray-400">
          {L("No reminders right now.", "தற்போது நினைவூட்டல்கள் இல்லை.")}
        </div>
      ) : (
        <div className="space-y-2">
          {activeReminders.slice(0, 5).map((reminder) => (
            <div
              key={reminder.id}
              className={`flex items-start gap-3 p-3 rounded-xl text-sm border ${getReminderColor(reminder.reminder_type)}`}
            >
              <span className="text-lg flex-shrink-0">{getReminderIcon(reminder.reminder_type)}</span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{reminder.title}</p>
                {reminder.description && <p className="text-xs opacity-70 mt-0.5">{reminder.description}</p>}
                <p className="text-xs opacity-60 mt-0.5">📅 {formatDate(reminder.reminder_date)}</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <button
                  onClick={() => markComplete(reminder.id)}
                  className="min-h-[28px] min-w-[28px] flex items-center justify-center text-green-600 hover:text-green-700 text-xs font-medium"
                  title={L("Mark complete", "முடிந்தது")}
                >
                  ✅
                </button>
                <button
                  onClick={() => dismissReminder(reminder.id)}
                  className="min-h-[28px] min-w-[28px] flex items-center justify-center text-gray-400 hover:text-gray-600 text-xs"
                  title={L("Dismiss", "நிராகரி")}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Reminder Modal */}
      {showAddReminder && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 sm:p-4">
          <div className="bg-white shadow-xl w-full h-full sm:h-auto sm:max-w-md sm:rounded-2xl overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{L("Add Reminder", "நினைவூட்டல் சேர்")}</h2>
              <button onClick={() => setShowAddReminder(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{L("Title", "தலைப்பு")} *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Description", "விவரம்")}</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputCls} rows={2} />
              </div>
              <div>
                <label className={labelCls}>{L("Date", "தேதி")} *</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{L("Type", "வகை")}</label>
                <select value={type} onChange={(e) => setType(e.target.value as typeof REMINDER_TYPES[number]["value"])} className={inputCls}>
                  {REMINDER_TYPES.map((o) => (
                    <option className="text-gray-900" key={o.value} value={o.value}>{`${o.en} (${o.ta})`}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>{L("Related to (optional)", "தொடர்புடையது (விருப்பம்)")}</label>
                <select
                  value={relatedTo}
                  onChange={(e) => setRelatedTo(e.target.value as typeof RELATED_TO_OPTIONS[number]["value"] | "")}
                  className={inputCls}
                >
                  <option value="">{L("None", "இல்லை")}</option>
                  {RELATED_TO_OPTIONS.map((o) => (
                    <option className="text-gray-900" key={o.value} value={o.value}>{`${o.en} (${o.ta})`}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveReminder}
                  disabled={saving}
                  className="flex-1 min-h-[44px] bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition"
                >
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button
                  onClick={() => setShowAddReminder(false)}
                  className="flex-1 min-h-[44px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition"
                >
                  {L("Cancel", "ரத்து")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
