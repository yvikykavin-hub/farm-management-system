"use client";

import toast from "react-hot-toast";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { extractMilkCardData, type MilkCardRow } from "../lib/geminiOCR";
import { t } from "../lib/labels";
import { milkRateWarning } from "../lib/validators";

const OCR_BATCH_SIZE = 10;

// Mobile camera photos are commonly 3-5MB; sending that as base64 JSON risks
// timing out the Gemini call and can exceed serverless request body limits.
// Downscale to a max width and re-encode as JPEG before it ever reaches the OCR API.
const compressImage = (file: File, maxWidth = 1024): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
};

type MilkRate = { id: string; rate_per_litre: number; effective_from: string; notes: string | null };
type MilkCollection = {
  id: string;
  collection_date: string;
  morning_litres: number;
  evening_litres: number;
  daily_income: number | null;
  animal_type: string | null;
};

type Week = { weekNum: number; start: string; end: string; litres: number; income: number; isPaymentWeek: boolean };

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const parseOCRDate = (raw: string): string => {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const parts = trimmed.split(/[\/\-.]/);
  if (parts.length === 3) {
    const [d, m, yRaw] = parts;
    const y = yRaw.length === 2 ? (Number(yRaw) > 50 ? "19" : "20") + yRaw : yRaw;
    if (d && m && y.length === 4) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return "Invalid Date";
};

const currentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function MilkCollectionSection({ animalType, lang }: { animalType: "cow" | "buffalo"; lang: "ta" | "en" }) {
  const router = useRouter();
  const rateTable = animalType === "buffalo" ? "buffalo_milk_rates" : "milk_rates";

  const [rates, setRates] = useState<MilkRate[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);

  useEffect(() => {
    fetchRates();
    fetchCollections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animalType]);

  const fetchRates = async () => {
    const { data } = await supabase.from(rateTable).select("*").order("effective_from", { ascending: false });
    if (data) setRates(data);
  };

  const fetchCollections = async () => {
    const query = supabase.from("milk_collections").select("*").order("collection_date", { ascending: false });
    const { data } =
      animalType === "cow"
        ? await query.or("animal_type.eq.cow,animal_type.is.null")
        : await query.eq("animal_type", "buffalo");
    if (data) setCollections(data);
  };

  const currentRate = rates.length ? Number(rates[0].rate_per_litre) : 0;
  const rateForDate = (date: string) => {
    const applicable = rates.filter((r) => r.effective_from <= date).sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    return applicable.length ? Number(applicable[0].rate_per_litre) : 0;
  };

  // ---------------- Rate: add + edit ----------------
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [newRateDate, setNewRateDate] = useState("");
  const [newRateNotes, setNewRateNotes] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const saveRate = async () => {
    if (!newRate || !newRateDate) {
      toast.error(t(lang, "rateDateRequired"));
      return;
    }
    setSavingRate(true);
    try {
      const { error } = await supabase.from(rateTable).insert({
        rate_per_litre: parseFloat(newRate),
        effective_from: newRateDate || null,
        notes: newRateNotes.trim() || null,
      });
      if (error) {
        console.error("Error saving rate: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setRateModalOpen(false);
        setNewRate("");
        setNewRateDate("");
        setNewRateNotes("");
        fetchRates();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingRate(false);
  };

  const [editingRate, setEditingRate] = useState<MilkRate | null>(null);
  const [editRateValue, setEditRateValue] = useState("");
  const [editRateDate, setEditRateDate] = useState("");
  const [savingRateEdit, setSavingRateEdit] = useState(false);

  const openEditRate = (r: MilkRate) => {
    setEditingRate(r);
    setEditRateValue(String(r.rate_per_litre));
    setEditRateDate(r.effective_from);
  };

  const saveEditRate = async () => {
    if (!editingRate || !editRateValue || !editRateDate) return;
    setSavingRateEdit(true);
    try {
      const { error } = await supabase
        .from(rateTable)
        .update({ rate_per_litre: parseFloat(editRateValue), effective_from: editRateDate })
        .eq("id", editingRate.id);
      if (error) {
        console.error("Error updating rate: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setEditingRate(null);
        fetchRates();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingRateEdit(false);
  };

  // ---------------- Manual entry ----------------
  const [manualDate, setManualDate] = useState("");
  const [manualMorning, setManualMorning] = useState("");
  const [manualEvening, setManualEvening] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const manualTotal = (parseFloat(manualMorning) || 0) + (parseFloat(manualEvening) || 0);
  const manualIncome = manualTotal * (manualDate ? rateForDate(manualDate) : currentRate);

  const saveManualCollection = async () => {
    if (!manualDate || !manualMorning || !manualEvening) {
      toast.error(t(lang, "collectionFieldsRequired"));
      return;
    }
    setSavingManual(true);
    try {
      // total_litres and daily_income are DB-generated columns (total_litres = morning + evening,
      // daily_income = total_litres * rate_per_litre) — sending them explicitly errors with 428C9.
      const payload = {
        farm_location: "Home",
        collection_date: manualDate,
        morning_litres: parseFloat(manualMorning) || 0,
        evening_litres: parseFloat(manualEvening) || 0,
        rate_per_litre: rateForDate(manualDate),
        animal_type: animalType,
        month_year: manualDate.slice(0, 7),
      };
      console.log("Saving manual milk collection:", payload);
      const { error } = await supabase.from("milk_collections").insert(payload);
      if (error) {
        console.error("Error saving collection: ", error);
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setManualDate("");
        setManualMorning("");
        setManualEvening("");
        fetchCollections();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingManual(false);
  };

  // ---------------- OCR ----------------
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrRows, setOcrRows] = useState<MilkCardRow[]>([]);
  const [savingOcr, setSavingOcr] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFileName(file.name);
    setOcrLoading(true);
    try {
      const dataUrl = await compressImage(file);
      setOcrImage(dataUrl);
      const base64 = dataUrl.split(",")[1];
      const rows = await extractMilkCardData(base64);
      setOcrRows(rows);
    } catch (err) {
      toast.error("OCR error: " + (err instanceof Error ? err.message : String(err)));
    }
    setOcrLoading(false);
  };

  const updateOcrRow = (idx: number, field: keyof MilkCardRow, value: string) => {
    setOcrRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: field === "date" ? value : parseFloat(value) || 0 } : row))
    );
  };

  const saveOcrRows = async () => {
    if (ocrRows.length === 0) return;
    setSavingOcr(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error(lang === "ta" ? "மீண்டும் உள்நுழையவும்" : "Please login again");
        router.push("/login");
        setSavingOcr(false);
        return;
      }

      const parsedRows = ocrRows.map((row) => ({
        ...row,
        isoDate: row.date.includes("/") || row.date.includes("-") ? parseOCRDate(row.date) : row.date,
      }));
      const validRows = parsedRows.filter(
        (r) => r.isoDate !== "Invalid Date" && (r.morning > 0 || r.evening > 0)
      );
      if (validRows.length === 0) {
        toast.error(t(lang, "saveFailedMessage"));
        setSavingOcr(false);
        return;
      }
      // total_litres and daily_income are DB-generated columns (total_litres = morning + evening,
      // daily_income = total_litres * rate_per_litre) — sending them explicitly errors with 428C9.
      const payload = validRows.map((row) => ({
        farm_location: "Home",
        collection_date: row.isoDate,
        morning_litres: row.morning,
        evening_litres: row.evening,
        rate_per_litre: rateForDate(row.isoDate),
        animal_type: animalType,
        month_year: row.isoDate.slice(0, 7),
      }));
      console.log("Saving OCR milk collections:", payload);

      // Save in small batches — more resilient than one large insert on unstable mobile networks.
      let savedCount = 0;
      for (let i = 0; i < payload.length; i += OCR_BATCH_SIZE) {
        const batch = payload.slice(i, i + OCR_BATCH_SIZE);
        const { error } = await supabase.from("milk_collections").insert(batch);
        if (error) {
          console.error("Batch save error: ", error);
          toast.error(t(lang, "saveFailedMessage"));
          setSavingOcr(false);
          return;
        }
        savedCount += batch.length;
      }

      toast.success(lang === "ta" ? `✅ ${savedCount} நாட்கள் சேமிக்கப்பட்டது!` : `✅ ${savedCount} days saved!`);
      setOcrRows([]);
      setOcrImage(null);
      setSelectedFileName(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchCollections();
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingOcr(false);
  };

  const deleteCollection = async (cid: string) => {
    if (!confirm(t(lang, "deleteConfirmRecord"))) return;
    const { error } = await supabase.from("milk_collections").delete().eq("id", cid);
    if (error) {
      console.error("Error: ", error);
      toast.error(t(lang, "saveFailedMessage"));
    } else fetchCollections();
  };

  // ---------------- Monthly view + weekly breakdown ----------------
  const [selectedMonthYear, setSelectedMonthYear] = useState(currentMonthYear());

  const monthCollections = collections.filter((c) => c.collection_date.startsWith(selectedMonthYear));
  const sortedMonthCollections = [...monthCollections].sort((a, b) => a.collection_date.localeCompare(b.collection_date));
  const monthTotalLitres = monthCollections.reduce((s, c) => s + Number(c.morning_litres) + Number(c.evening_litres), 0);
  const monthTotalIncome = monthCollections.reduce((s, c) => s + Number(c.daily_income ?? 0), 0);
  const daysRecorded = monthCollections.length;

  const getWeeklyBreakdown = (): Week[] => {
    const weeks: Week[] = [];
    let bucket: MilkCollection[] = [];
    let weekNum = 1;
    sortedMonthCollections.forEach((c, idx) => {
      bucket.push(c);
      const day = new Date(c.collection_date).getDay();
      const isPaymentDay = day === 3; // Wednesday
      const isLast = idx === sortedMonthCollections.length - 1;
      if (isPaymentDay || isLast) {
        const litres = bucket.reduce((s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0);
        const income = bucket.reduce((s, r) => s + Number(r.daily_income ?? 0), 0);
        weeks.push({
          weekNum,
          start: bucket[0].collection_date,
          end: bucket[bucket.length - 1].collection_date,
          litres,
          income,
          isPaymentWeek: isPaymentDay,
        });
        bucket = [];
        weekNum++;
      }
    });
    return weeks;
  };

  const weeks = getWeeklyBreakdown();

  return (
    <div className="flex flex-col gap-3">
      {/* Rate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800">{t(lang, "currentMilkRate")}</h2>
          <button onClick={() => setRateModalOpen(true)} className="text-xs font-semibold text-primary hover:text-primary/80">
            + {t(lang, "updateRate")}
          </button>
        </div>
        <p className="text-sm font-bold text-success mb-2">
          {t(lang, "currentRate")}: {inr(currentRate)} / {t(lang, "perLitre")}
          {rates[0] && ` (${t(lang, "effectiveFrom")} ${formatDMY(rates[0].effective_from)})`}
        </p>
        {rates.length > 0 && (
          <div className="overflow-x-auto max-h-32 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="py-1">{t(lang, "effectiveFromDate")}</th>
                  <th className="py-1">{t(lang, "rate")}/{t(lang, "perLitre")}</th>
                  <th className="py-1"></th>
                </tr>
              </thead>
              <tbody>
                {rates.map((r) => (
                  <tr key={r.id} className="border-b border-gray-50">
                    <td className="py-1 text-gray-900">{formatDMY(r.effective_from)}</td>
                    <td className="py-1 text-gray-900 font-medium">{inr(Number(r.rate_per_litre))}</td>
                    <td className="py-1">
                      <button onClick={() => openEditRate(r)} className="hover:text-primary" title={t(lang, "editMilkRate")}>
                        ✏️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Manual entry + OCR */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">{t(lang, "manualEntry")}</h2>
          <div className="grid grid-cols-3 gap-2 mb-2">
            <div>
              <label className={labelCls}>{t(lang, "date")}</label>
              <input type="date" value={manualDate} onChange={(e) => setManualDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t(lang, "morning")}</label>
              <input type="number" value={manualMorning} onChange={(e) => setManualMorning(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>{t(lang, "evening")}</label>
              <input type="number" value={manualEvening} onChange={(e) => setManualEvening(e.target.value)} className={inputCls} />
            </div>
          </div>
          <p className="text-xs text-gray-600 mb-2">
            {t(lang, "totalLitres")}: {manualTotal.toFixed(1)} L · {t(lang, "expectedIncome")}: {inr(manualIncome)}
          </p>
          <button onClick={saveManualCollection} disabled={savingManual} className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition">
            {savingManual ? "..." : t(lang, "save")}
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">📷 {t(lang, "uploadMilkCard")}</h2>
          <div className="relative mb-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-400 hover:bg-green-50 transition-colors duration-200">
              <div className="text-3xl mb-2">📷</div>
              <p className="text-gray-700 font-medium text-sm">{t(lang, "clickToUploadPhoto")}</p>
              <p className="text-gray-500 text-xs mt-1">{selectedFileName ? `✅ ${selectedFileName}` : t(lang, "jpgPngSupported")}</p>
            </div>
          </div>
          {ocrLoading && <p className="text-xs text-gray-500">{t(lang, "readingMilkCard")}</p>}
          {ocrImage && <img src={ocrImage} alt="Milk card" className="w-full max-h-32 object-contain rounded-lg border border-gray-200 mb-2" />}
          {ocrRows.length > 0 && (
            <>
              <div className="overflow-x-auto max-h-40 overflow-y-auto mb-2">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="py-1">{t(lang, "date")}</th>
                      <th className="py-1">{t(lang, "morning")}</th>
                      <th className="py-1">{t(lang, "evening")}</th>
                      <th className="py-1">{t(lang, "totalLitres")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ocrRows.map((row, idx) => {
                      const total = (row.morning || 0) + (row.evening || 0);
                      return (
                        <tr key={idx} className="border-b border-gray-50">
                          <td className="py-1">
                            <input type="text" value={row.date} onChange={(e) => updateOcrRow(idx, "date", e.target.value)} className="w-20 border border-gray-200 rounded px-1 py-0.5 text-xs" />
                          </td>
                          <td className="py-1">
                            <input type="number" value={row.morning} onChange={(e) => updateOcrRow(idx, "morning", e.target.value)} className="w-14 border border-gray-200 rounded px-1 py-0.5 text-xs" />
                          </td>
                          <td className="py-1">
                            <input type="number" value={row.evening} onChange={(e) => updateOcrRow(idx, "evening", e.target.value)} className="w-14 border border-gray-200 rounded px-1 py-0.5 text-xs" />
                          </td>
                          <td className="py-1">{total.toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <button onClick={saveOcrRows} disabled={savingOcr} className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition">
                {savingOcr ? "..." : t(lang, "saveAllRows")}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Monthly view */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-sm font-semibold text-gray-800">{t(lang, "monthlySummary")}</h2>
          <input
            type="month"
            value={selectedMonthYear}
            onChange={(e) => setSelectedMonthYear(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white text-gray-900"
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{t(lang, "totalLitres")}</p>
            <p className="text-lg font-bold text-gray-800">{monthTotalLitres.toFixed(1)} L</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{t(lang, "expectedIncome")}</p>
            <p className="text-lg font-bold text-success">{inr(monthTotalIncome)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">{t(lang, "daysRecorded")}</p>
            <p className="text-lg font-bold text-gray-800">{daysRecorded}</p>
          </div>
        </div>

        <h3 className="text-xs font-semibold text-gray-700 mb-2">{t(lang, "weeklyBreakdown")}</h3>
        {weeks.length === 0 ? (
          <p className="text-xs text-gray-500 py-3 text-center">{t(lang, "noRecordsYet")}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                  <th className="py-1 px-1">{t(lang, "week")}</th>
                  <th className="py-1 px-1">{t(lang, "date")}</th>
                  <th className="py-1 px-1">{t(lang, "totalLitres")}</th>
                  <th className="py-1 px-1">{t(lang, "expectedIncome")}</th>
                  <th className="py-1 px-1"></th>
                </tr>
              </thead>
              <tbody>
                {weeks.map((w) => (
                  <tr key={w.weekNum} className="border-b border-gray-50 text-gray-900">
                    <td className="py-1 px-1 font-medium">{t(lang, "week")} {w.weekNum}</td>
                    <td className="py-1 px-1 text-gray-700">{formatDMY(w.start)} → {formatDMY(w.end)}</td>
                    <td className="py-1 px-1">{w.litres.toFixed(1)} L</td>
                    <td className="py-1 px-1 text-green-600 font-medium">{inr(w.income)}</td>
                    <td className="py-1 px-1">
                      {w.isPaymentWeek && (
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                          💰 {t(lang, "paymentWeek")}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Collection history */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h2 className="text-sm font-semibold text-gray-800 mb-2">{t(lang, "collectionHistory")}</h2>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-gray-50">
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide">
                <th className="py-1 px-1">{t(lang, "date")}</th>
                <th className="py-1 px-1">{t(lang, "morning")}</th>
                <th className="py-1 px-1">{t(lang, "evening")}</th>
                <th className="py-1 px-1">{t(lang, "totalLitres")}</th>
                <th className="py-1 px-1">{t(lang, "income")}</th>
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {collections.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-gray-500">🐄 {t(lang, "noRecordsYet")}</td></tr>
              ) : (
                collections.map((c) => {
                  const total = Number(c.morning_litres) + Number(c.evening_litres);
                  return (
                    <tr key={c.id} className="border-b border-gray-50 text-gray-900">
                      <td className="py-1 px-1 text-gray-700">{formatDMY(c.collection_date)}</td>
                      <td className="py-1 px-1 font-medium">{c.morning_litres}</td>
                      <td className="py-1 px-1 font-medium">{c.evening_litres}</td>
                      <td className="py-1 px-1 font-medium">{total.toFixed(1)}</td>
                      <td className="py-1 px-1 font-medium text-green-600">{inr(Number(c.daily_income ?? 0))}</td>
                      <td className="py-1 px-1">
                        <button onClick={() => deleteCollection(c.id)} className="hover:text-danger">🗑️</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add rate modal */}
      {rateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "updateRate")}</h2>
              <button onClick={() => setRateModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{t(lang, "newRate")}</label>
                <input type="number" value={newRate} onChange={(e) => setNewRate(e.target.value)} className={inputCls} />
                {milkRateWarning(newRate, lang) && <p className="text-amber-600 text-xs mt-1">{milkRateWarning(newRate, lang)}</p>}
              </div>
              <div>
                <label className={labelCls}>{t(lang, "effectiveFromDate")}</label>
                <input type="date" value={newRateDate} onChange={(e) => setNewRateDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "notes")}</label>
                <input type="text" value={newRateNotes} onChange={(e) => setNewRateNotes(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveRate} disabled={savingRate} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingRate ? "..." : t(lang, "save")}
                </button>
                <button onClick={() => setRateModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {t(lang, "cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit rate modal */}
      {editingRate && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "editMilkRate")}</h2>
              <button onClick={() => setEditingRate(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{t(lang, "newRate")}</label>
                <input type="number" value={editRateValue} onChange={(e) => setEditRateValue(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "effectiveFromDate")}</label>
                <input type="date" value={editRateDate} onChange={(e) => setEditRateDate(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveEditRate} disabled={savingRateEdit} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingRateEdit ? "..." : t(lang, "save")}
                </button>
                <button onClick={() => setEditingRate(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
                  {t(lang, "cancel")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
