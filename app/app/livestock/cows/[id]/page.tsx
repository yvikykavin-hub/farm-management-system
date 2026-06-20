"use client";

import { useState, useEffect, useRef, Fragment } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import { supabase } from "../../../../lib/supabase";
import { extractMilkCardData, type MilkCardRow } from "../../../../lib/geminiOCR";
import { t } from "../../../../lib/labels";

type Cow = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  date_of_birth: string | null;
  gender: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  current_status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
};

type MilkRate = { id: string; cow_id: string; rate_per_litre: number; effective_from: string; notes: string | null };
type MilkCollection = { id: string; cow_id: string; collection_date: string; morning_litres: number; evening_litres: number };
type MilkPayment = {
  id: string;
  cow_id: string;
  payment_date: string;
  period_from: string;
  period_to: string;
  milkman_name: string;
  total_litres: number;
  rate_per_litre: number;
  expected_amount: number;
  received_amount: number;
  status: string;
  remarks: string | null;
};
type CowExpense = {
  id: string;
  cow_id: string;
  expense_date: string;
  type: string;
  quantity: number | null;
  unit: string | null;
  amount: number;
  vendor_name: string | null;
  description: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  deceased: "bg-gray-200 text-gray-600",
};
const PAYMENT_STATUS_BADGE: Record<string, string> = {
  paid: "bg-green-100 text-green-700",
  partially_paid: "bg-amber-100 text-amber-700",
  pending: "bg-red-100 text-red-700",
};
const EXPENSE_TYPE_KEYS = ["riceFeed", "normalFeed", "veterinary", "medicine", "vaccination", "ai", "shedMaintenance", "other"] as const;
const EXPENSE_TYPE_VALUES: Record<typeof EXPENSE_TYPE_KEYS[number], string> = {
  riceFeed: "rice_feed",
  normalFeed: "normal_feed",
  veterinary: "veterinary",
  medicine: "medicine",
  vaccination: "vaccination",
  ai: "ai",
  shedMaintenance: "shed_maintenance",
  other: "other",
};
const FEED_TYPE_KEYS = ["riceFeed", "normalFeed"] as const;

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const parseDMYToISO = (dmy: string) => {
  const parts = dmy.split(/[\/\-]/);
  if (parts.length !== 3) return dmy;
  const [d, m, y] = parts;
  if (d && m && y && y.length === 4) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  return dmy;
};
const weekStartKey = (iso: string) => {
  const d = new Date(iso);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function CowDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [lang, setLang] = useState<"ta" | "en">("en");
  const [cow, setCow] = useState<Cow | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "milk" | "income" | "expenses">("overview");

  const [rates, setRates] = useState<MilkRate[]>([]);
  const [collections, setCollections] = useState<MilkCollection[]>([]);
  const [payments, setPayments] = useState<MilkPayment[]>([]);
  const [cowExpenses, setCowExpenses] = useState<CowExpense[]>([]);

  useEffect(() => {
    if (id) {
      fetchCow();
      fetchRates();
      fetchCollections();
      fetchPayments();
      fetchExpenses();
    }
  }, [id]);

  const fetchCow = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cows").select("*").eq("id", id).single();
    if (!error && data) setCow(data);
    setLoading(false);
  };
  const fetchRates = async () => {
    const { data } = await supabase.from("milk_rates").select("*").eq("cow_id", id).order("effective_from", { ascending: false });
    if (data) setRates(data);
  };
  const fetchCollections = async () => {
    const { data } = await supabase.from("milk_collections").select("*").eq("cow_id", id).order("collection_date", { ascending: false });
    if (data) setCollections(data);
  };
  const fetchPayments = async () => {
    const { data } = await supabase.from("milk_payments").select("*").eq("cow_id", id).order("payment_date", { ascending: false });
    if (data) setPayments(data);
  };
  const fetchExpenses = async () => {
    const { data } = await supabase.from("cow_expenses").select("*").eq("cow_id", id).order("expense_date", { ascending: false });
    if (data) setCowExpenses(data);
  };

  const currentRate = rates.length ? Number(rates[0].rate_per_litre) : 0;
  const rateForDate = (date: string) => {
    const applicable = rates.filter((r) => r.effective_from <= date);
    return applicable.length ? Number(applicable[0].rate_per_litre) : 0;
  };

  // ---------------- Overview ----------------
  const [editingOverview, setEditingOverview] = useState(false);
  const [ovForm, setOvForm] = useState<Record<string, string>>({});
  const [savingOverview, setSavingOverview] = useState(false);

  const startEditOverview = () => {
    if (!cow) return;
    setOvForm({
      name: cow.name,
      tag_number: cow.tag_number ?? "",
      breed: cow.breed ?? "",
      date_of_birth: cow.date_of_birth ?? "",
      gender: cow.gender ?? "",
      purchase_date: cow.purchase_date ?? "",
      purchase_price: cow.purchase_price != null ? String(cow.purchase_price) : "",
      current_status: cow.current_status,
      sold_date: cow.sold_date ?? "",
      sold_price: cow.sold_price != null ? String(cow.sold_price) : "",
      notes: cow.notes ?? "",
    });
    setEditingOverview(true);
  };

  const saveOverview = async () => {
    if (!ovForm.name.trim() || !ovForm.gender) {
      alert(t(lang, "nameGenderRequired"));
      return;
    }
    setSavingOverview(true);
    try {
      const { error } = await supabase
        .from("cows")
        .update({
          name: ovForm.name.trim(),
          tag_number: ovForm.tag_number.trim() || null,
          breed: ovForm.breed.trim() || null,
          date_of_birth: ovForm.date_of_birth || null,
          gender: ovForm.gender,
          purchase_date: ovForm.purchase_date || null,
          purchase_price: ovForm.purchase_price ? parseFloat(ovForm.purchase_price) : null,
          current_status: ovForm.current_status,
          sold_date: ovForm.current_status === "sold" ? ovForm.sold_date || null : null,
          sold_price: ovForm.current_status === "sold" && ovForm.sold_price ? parseFloat(ovForm.sold_price) : null,
          notes: ovForm.notes.trim() || null,
        })
        .eq("id", id);
      if (error) {
        console.error("Error saving: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setEditingOverview(false);
        fetchCow();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingOverview(false);
  };

  // ---------------- Milk Collection: rate ----------------
  const [rateModalOpen, setRateModalOpen] = useState(false);
  const [newRate, setNewRate] = useState("");
  const [newRateDate, setNewRateDate] = useState("");
  const [newRateNotes, setNewRateNotes] = useState("");
  const [savingRate, setSavingRate] = useState(false);

  const saveRate = async () => {
    if (!newRate || !newRateDate) {
      alert(t(lang, "rateDateRequired"));
      return;
    }
    setSavingRate(true);
    try {
      const { error } = await supabase.from("milk_rates").insert({
        cow_id: id,
        farm_location: "Home",
        rate_per_litre: parseFloat(newRate),
        effective_from: newRateDate,
        notes: newRateNotes.trim() || null,
      });
      if (error) {
        console.error("Error saving rate: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setRateModalOpen(false);
        setNewRate("");
        setNewRateDate("");
        setNewRateNotes("");
        fetchRates();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingRate(false);
  };

  // ---------------- Milk Collection: manual entry ----------------
  const [manualDate, setManualDate] = useState("");
  const [manualMorning, setManualMorning] = useState("");
  const [manualEvening, setManualEvening] = useState("");
  const [savingManual, setSavingManual] = useState(false);

  const manualTotal = (parseFloat(manualMorning) || 0) + (parseFloat(manualEvening) || 0);
  const manualIncome = manualTotal * (manualDate ? rateForDate(manualDate) : currentRate);

  const saveManualCollection = async () => {
    if (!manualDate || !manualMorning || !manualEvening) {
      alert(t(lang, "collectionFieldsRequired"));
      return;
    }
    setSavingManual(true);
    try {
      const { error } = await supabase.from("milk_collections").insert({
        cow_id: id,
        farm_location: "Home",
        collection_date: manualDate,
        morning_litres: parseFloat(manualMorning) || 0,
        evening_litres: parseFloat(manualEvening) || 0,
      });
      if (error) {
        console.error("Error saving collection: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setManualDate("");
        setManualMorning("");
        setManualEvening("");
        fetchCollections();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingManual(false);
  };

  // ---------------- Milk Collection: OCR ----------------
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrImage, setOcrImage] = useState<string | null>(null);
  const [ocrRows, setOcrRows] = useState<MilkCardRow[]>([]);
  const [savingOcr, setSavingOcr] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setOcrImage(dataUrl);
      const base64 = dataUrl.split(",")[1];
      setOcrLoading(true);
      try {
        const rows = await extractMilkCardData(base64);
        setOcrRows(rows);
      } catch (err) {
        alert("OCR error: " + (err instanceof Error ? err.message : String(err)));
      }
      setOcrLoading(false);
    };
    reader.readAsDataURL(file);
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
      const payload = ocrRows.map((row) => ({
        cow_id: id,
        farm_location: "Home",
        collection_date: row.date.includes("/") ? parseDMYToISO(row.date) : row.date,
        morning_litres: row.morning,
        evening_litres: row.evening,
      }));
      const { error } = await supabase.from("milk_collections").insert(payload);
      if (error) {
        console.error("Error saving rows: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setOcrRows([]);
        setOcrImage(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        fetchCollections();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingOcr(false);
  };

  // ---------------- Collection history grouped by week ----------------
  const weekGroups = (() => {
    const map = new Map<string, MilkCollection[]>();
    [...collections]
      .sort((a, b) => a.collection_date.localeCompare(b.collection_date))
      .forEach((c) => {
        const key = weekStartKey(c.collection_date);
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(c);
      });
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  })();

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthCollections = collections.filter((c) => c.collection_date.startsWith(monthPrefix));
  const monthTotalLitres = monthCollections.reduce((s, c) => s + Number(c.morning_litres) + Number(c.evening_litres), 0);
  const monthExpectedAmount = monthCollections.reduce(
    (s, c) => s + (Number(c.morning_litres) + Number(c.evening_litres)) * rateForDate(c.collection_date),
    0
  );

  const deleteCollection = async (cid: string) => {
    if (!confirm(t(lang, "deleteConfirmRecord"))) return;
    const { error } = await supabase.from("milk_collections").delete().eq("id", cid);
    if (error) {
      console.error("Error: ", error);
      alert(t(lang, "saveFailedMessage"));
    }
    else fetchCollections();
  };

  // ---------------- Income (Milk Sales / Payments) ----------------
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
  const [pmDate, setPmDate] = useState("");
  const [pmFrom, setPmFrom] = useState("");
  const [pmTo, setPmTo] = useState("");
  const [pmMilkman, setPmMilkman] = useState("");
  const [pmLitres, setPmLitres] = useState("");
  const [pmRate, setPmRate] = useState("");
  const [pmReceived, setPmReceived] = useState("");
  const [pmStatus, setPmStatus] = useState("pending");
  const [pmRemarks, setPmRemarks] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  const pmExpected = (parseFloat(pmLitres) || 0) * (parseFloat(pmRate) || 0);
  const pmDifference = (parseFloat(pmReceived) || 0) - pmExpected;

  const openAddPayment = () => {
    setEditingPaymentId(null);
    setPmDate("");
    setPmFrom("");
    setPmTo("");
    setPmMilkman("");
    setPmLitres("");
    setPmRate(currentRate ? String(currentRate) : "");
    setPmReceived("");
    setPmStatus("pending");
    setPmRemarks("");
    setPaymentModalOpen(true);
  };

  const openEditPayment = (p: MilkPayment) => {
    setEditingPaymentId(p.id);
    setPmDate(p.payment_date);
    setPmFrom(p.period_from);
    setPmTo(p.period_to);
    setPmMilkman(p.milkman_name);
    setPmLitres(String(p.total_litres));
    setPmRate(String(p.rate_per_litre));
    setPmReceived(String(p.received_amount));
    setPmStatus(p.status);
    setPmRemarks(p.remarks ?? "");
    setPaymentModalOpen(true);
  };

  const savePayment = async () => {
    if (!pmDate || !pmReceived) {
      alert(t(lang, "paymentFieldsRequired"));
      return;
    }
    setSavingPayment(true);
    try {
      const payload = {
        cow_id: id,
        farm_location: "Home",
        payment_date: pmDate,
        period_from: pmFrom,
        period_to: pmTo,
        milkman_name: pmMilkman.trim(),
        total_litres: parseFloat(pmLitres) || 0,
        rate_per_litre: parseFloat(pmRate) || 0,
        expected_amount: pmExpected,
        received_amount: parseFloat(pmReceived) || 0,
        status: pmStatus,
        remarks: pmRemarks.trim() || null,
      };
      const { error } = editingPaymentId
        ? await supabase.from("milk_payments").update(payload).eq("id", editingPaymentId)
        : await supabase.from("milk_payments").insert(payload);
      if (error) {
        console.error("Error saving payment: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setPaymentModalOpen(false);
        fetchPayments();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingPayment(false);
  };

  const deletePayment = async (pid: string) => {
    if (!confirm(t(lang, "deleteConfirmPayment"))) return;
    const { error } = await supabase.from("milk_payments").delete().eq("id", pid);
    if (error) {
      console.error("Error: ", error);
      alert(t(lang, "saveFailedMessage"));
    }
    else fetchPayments();
  };

  const totalExpected = payments.reduce((s, p) => s + Number(p.expected_amount), 0);
  const totalReceived = payments.reduce((s, p) => s + Number(p.received_amount), 0);
  const outstanding = totalExpected - totalReceived;
  const thisMonthPaymentLitres = payments
    .filter((p) => p.payment_date.startsWith(monthPrefix))
    .reduce((s, p) => s + Number(p.total_litres), 0);

  // ---------------- Expenses ----------------
  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expType, setExpType] = useState<typeof EXPENSE_TYPE_KEYS[number]>("riceFeed");
  const [expDate, setExpDate] = useState("");
  const [expQty, setExpQty] = useState("");
  const [expUnit, setExpUnit] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expVendor, setExpVendor] = useState("");
  const [expDescription, setExpDescription] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const isFeedType = (FEED_TYPE_KEYS as readonly string[]).includes(expType);

  const openAddExpense = () => {
    setExpType("riceFeed");
    setExpDate("");
    setExpQty("");
    setExpUnit("");
    setExpAmount("");
    setExpVendor("");
    setExpDescription("");
    setExpenseModalOpen(true);
  };

  const saveExpense = async () => {
    if (!expDate || !expAmount) {
      alert(t(lang, "dateAmountRequired"));
      return;
    }
    setSavingExpense(true);
    try {
      const payload = {
        cow_id: id,
        farm_location: "Home",
        expense_date: expDate,
        type: EXPENSE_TYPE_VALUES[expType],
        quantity: isFeedType && expQty ? parseFloat(expQty) : null,
        unit: isFeedType ? expUnit.trim() || null : null,
        amount: parseFloat(expAmount) || 0,
        vendor_name: expVendor.trim() || null,
        description: expDescription.trim() || null,
      };
      const { error } = await supabase.from("cow_expenses").insert(payload);
      if (error) {
        console.error("Error saving expense: ", error);
        alert(t(lang, "saveFailedMessage"));
      } else {
        setExpenseModalOpen(false);
        fetchExpenses();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(t(lang, "saveFailedMessage"));
    }
    setSavingExpense(false);
  };

  const deleteExpense = async (eid: string) => {
    if (!confirm(t(lang, "deleteConfirmExpense"))) return;
    const { error } = await supabase.from("cow_expenses").delete().eq("id", eid);
    if (error) {
      console.error("Error: ", error);
      alert(t(lang, "saveFailedMessage"));
    }
    else fetchExpenses();
  };

  const monthExpenses = cowExpenses.filter((e) => e.expense_date.startsWith(monthPrefix));
  const totalExpenseAll = monthExpenses.reduce((s, e) => s + Number(e.amount), 0);
  const expenseTotalsByType = EXPENSE_TYPE_KEYS.map((key) => ({
    key,
    total: monthExpenses.filter((e) => e.type === EXPENSE_TYPE_VALUES[key]).reduce((s, e) => s + Number(e.amount), 0),
  })).filter((e) => e.total > 0);

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-page">
        <Sidebar lang={lang} setLang={setLang} />
        <main className="flex-1 p-4 flex flex-col gap-3">
          <div className="h-12 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-64 bg-gray-200 rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">

          {/* Back */}
          <Link href="/livestock/cows" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToCows")}
          </Link>

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-primary">🐄 {cow?.name}</h1>
            <span className={`${STATUS_BADGE[cow?.current_status ?? "active"]} text-xs font-semibold px-2 py-1 rounded-full`}>
              {cow?.current_status}
            </span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit overflow-x-auto">
            {([
              ["overview", t(lang, "overview")],
              ["milk", t(lang, "milkCollection")],
              ["income", t(lang, "income")],
              ["expenses", t(lang, "expenses")],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                  activeTab === key ? "bg-primary text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-800">{t(lang, "details")}</h2>
                {!editingOverview && (
                  <button onClick={startEditOverview} className="text-xs font-semibold text-primary hover:text-primary/80">
                    ✏️ {t(lang, "edit")}
                  </button>
                )}
              </div>

              {!editingOverview ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-gray-500">{t(lang, "tagNumber")}:</span> <span className="font-medium text-gray-800">{cow?.tag_number || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "breed")}:</span> <span className="font-medium text-gray-800">{cow?.breed || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "gender")}:</span> <span className="font-medium text-gray-800">{cow?.gender || "—"}</span></div>
                  <div><span className="text-gray-500">{t(lang, "dateOfBirth")}:</span> <span className="font-medium text-gray-800">{formatDMY(cow?.date_of_birth)}</span></div>
                  <div><span className="text-gray-500">{t(lang, "purchaseDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(cow?.purchase_date)}</span></div>
                  <div><span className="text-gray-500">{t(lang, "purchasePrice")}:</span> <span className="font-medium text-gray-800">{cow?.purchase_price != null ? inr(Number(cow.purchase_price)) : "—"}</span></div>
                  {cow?.current_status === "sold" && (
                    <>
                      <div><span className="text-gray-500">{t(lang, "soldDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(cow?.sold_date)}</span></div>
                      <div><span className="text-gray-500">{t(lang, "soldPrice")}:</span> <span className="font-medium text-gray-800">{cow?.sold_price != null ? inr(Number(cow.sold_price)) : "—"}</span></div>
                    </>
                  )}
                  <div className="sm:col-span-2"><span className="text-gray-500">{t(lang, "notes")}:</span> <span className="font-medium text-gray-800">{cow?.notes || "—"}</span></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t(lang, "name")} *</label>
                    <input type="text" value={ovForm.name} onChange={(e) => setOvForm({ ...ovForm, name: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "gender")} *</label>
                    <select value={ovForm.gender} onChange={(e) => setOvForm({ ...ovForm, gender: e.target.value })} className={inputCls}>
                      <option value="">{t(lang, "select")}</option>
                      <option value="Female">{t(lang, "female")}</option>
                      <option value="Male">{t(lang, "male")}</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "tagNumber")}</label>
                    <input type="text" value={ovForm.tag_number} onChange={(e) => setOvForm({ ...ovForm, tag_number: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "breed")}</label>
                    <input type="text" value={ovForm.breed} onChange={(e) => setOvForm({ ...ovForm, breed: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "dateOfBirth")}</label>
                    <input type="date" value={ovForm.date_of_birth} onChange={(e) => setOvForm({ ...ovForm, date_of_birth: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "purchaseDate")}</label>
                    <input type="date" value={ovForm.purchase_date} onChange={(e) => setOvForm({ ...ovForm, purchase_date: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "purchasePrice")}</label>
                    <input type="number" value={ovForm.purchase_price} onChange={(e) => setOvForm({ ...ovForm, purchase_price: e.target.value })} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "status")}</label>
                    <select value={ovForm.current_status} onChange={(e) => setOvForm({ ...ovForm, current_status: e.target.value })} className={inputCls}>
                      <option value="active">{t(lang, "active")}</option>
                      <option value="sold">{t(lang, "sold")}</option>
                      <option value="deceased">{t(lang, "deceased")}</option>
                    </select>
                  </div>
                  {ovForm.current_status === "sold" && (
                    <>
                      <div>
                        <label className={labelCls}>{t(lang, "soldDate")}</label>
                        <input type="date" value={ovForm.sold_date} onChange={(e) => setOvForm({ ...ovForm, sold_date: e.target.value })} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{t(lang, "soldPrice")}</label>
                        <input type="number" value={ovForm.sold_price} onChange={(e) => setOvForm({ ...ovForm, sold_price: e.target.value })} className={inputCls} />
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2">
                    <label className={labelCls}>{t(lang, "notes")}</label>
                    <textarea value={ovForm.notes} onChange={(e) => setOvForm({ ...ovForm, notes: e.target.value })} className={inputCls} rows={2} />
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <button onClick={saveOverview} disabled={savingOverview} className="bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg px-4 py-2 text-sm font-semibold transition">
                      {savingOverview ? "..." : t(lang, "save")}
                    </button>
                    <button onClick={() => setEditingOverview(false)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold transition">
                      {t(lang, "cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MILK COLLECTION TAB */}
          {activeTab === "milk" && (
            <div className="flex flex-col gap-3">

              {/* Section A: Rate */}
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
                        </tr>
                      </thead>
                      <tbody>
                        {rates.map((r) => (
                          <tr key={r.id} className="border-b border-gray-50">
                            <td className="py-1">{formatDMY(r.effective_from)}</td>
                            <td className="py-1">{inr(Number(r.rate_per_litre))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section B: Add Collection */}
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
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="text-xs mb-2 w-full" />
                  {ocrLoading && <p className="text-xs text-gray-500">{t(lang, "readingMilkCard")}</p>}
                  {ocrImage && (
                    <img src={ocrImage} alt="Milk card" className="w-full max-h-32 object-contain rounded-lg border border-gray-200 mb-2" />
                  )}
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
                              <th className="py-1">{t(lang, "income")}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ocrRows.map((row, idx) => {
                              const total = (row.morning || 0) + (row.evening || 0);
                              const iso = row.date.includes("/") ? parseDMYToISO(row.date) : row.date;
                              const income = total * rateForDate(iso);
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
                                  <td className="py-1">{inr(income)}</td>
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

              {/* Section C: History */}
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
                        <th className="py-1 px-1">{t(lang, "rate")}</th>
                        <th className="py-1 px-1">{t(lang, "income")}</th>
                        <th className="py-1 px-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {weekGroups.length === 0 ? (
                        <tr><td colSpan={7} className="text-center py-6 text-gray-500">🐄 {t(lang, "noRecordsYet")}</td></tr>
                      ) : (
                        weekGroups.map(([weekKey, rows]) => {
                          const weekTotal = rows.reduce((s, r) => s + Number(r.morning_litres) + Number(r.evening_litres), 0);
                          const weekIncome = rows.reduce((s, r) => s + (Number(r.morning_litres) + Number(r.evening_litres)) * rateForDate(r.collection_date), 0);
                          return (
                            <Fragment key={weekKey}>
                              {[...rows].reverse().map((r) => {
                                const total = Number(r.morning_litres) + Number(r.evening_litres);
                                const rate = rateForDate(r.collection_date);
                                return (
                                  <tr key={r.id} className="border-b border-gray-50">
                                    <td className="py-1 px-1">{formatDMY(r.collection_date)}</td>
                                    <td className="py-1 px-1">{r.morning_litres}</td>
                                    <td className="py-1 px-1">{r.evening_litres}</td>
                                    <td className="py-1 px-1 font-medium">{total.toFixed(1)}</td>
                                    <td className="py-1 px-1">{inr(rate)}</td>
                                    <td className="py-1 px-1 font-medium text-success">{inr(total * rate)}</td>
                                    <td className="py-1 px-1">
                                      <button onClick={() => deleteCollection(r.id)} className="hover:text-danger">🗑️</button>
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-gray-50">
                                <td colSpan={7} className="py-1 px-1 text-[11px] font-semibold text-gray-600">
                                  {t(lang, "weekTotal")}: {weekTotal.toFixed(1)} L | {inr(weekIncome)}
                                </td>
                              </tr>
                            </Fragment>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="mt-2 pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    {t(lang, "thisMonth")}: {monthTotalLitres.toFixed(1)} L | {inr(monthExpectedAmount)}
                  </span>
                  <button onClick={() => setActiveTab("income")} className="text-primary font-semibold hover:text-primary/80">
                    {t(lang, "goToPayments")} →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* INCOME TAB */}
          {activeTab === "income" && (
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{t(lang, "totalExpected")}</p>
                  <p className="text-lg font-bold text-gray-800">{inr(totalExpected)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{t(lang, "totalReceived")}</p>
                  <p className="text-lg font-bold text-success">{inr(totalReceived)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{t(lang, "outstanding")}</p>
                  <p className={`text-lg font-bold ${outstanding > 0 ? "text-danger" : "text-success"}`}>{inr(outstanding)}</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{t(lang, "thisMonth")} {t(lang, "totalLitres")}</p>
                  <p className="text-lg font-bold text-gray-800">{thisMonthPaymentLitres.toFixed(1)} L</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-gray-800">{t(lang, "income")}</h2>
                  <button onClick={openAddPayment} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                    + {t(lang, "addPayment")}
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                        <th className="py-1 px-1">{t(lang, "date")}</th>
                        <th className="py-1 px-1">{t(lang, "periodFrom")}</th>
                        <th className="py-1 px-1">{t(lang, "milkmanName")}</th>
                        <th className="py-1 px-1">{t(lang, "totalLitres")}</th>
                        <th className="py-1 px-1">{t(lang, "rate")}</th>
                        <th className="py-1 px-1">{t(lang, "expectedAmount")}</th>
                        <th className="py-1 px-1">{t(lang, "receivedAmount")}</th>
                        <th className="py-1 px-1">{t(lang, "difference")}</th>
                        <th className="py-1 px-1">{t(lang, "status")}</th>
                        <th className="py-1 px-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length === 0 ? (
                        <tr><td colSpan={10} className="text-center py-6 text-gray-500">🐄 {t(lang, "noPaymentsYet")}</td></tr>
                      ) : (
                        payments.map((p) => {
                          const diff = Number(p.received_amount) - Number(p.expected_amount);
                          return (
                            <tr key={p.id} className="border-b border-gray-50">
                              <td className="py-1 px-1">{formatDMY(p.payment_date)}</td>
                              <td className="py-1 px-1">{formatDMY(p.period_from)} → {formatDMY(p.period_to)}</td>
                              <td className="py-1 px-1">{p.milkman_name}</td>
                              <td className="py-1 px-1">{Number(p.total_litres).toFixed(1)} L</td>
                              <td className="py-1 px-1">{inr(Number(p.rate_per_litre))}</td>
                              <td className="py-1 px-1">{inr(Number(p.expected_amount))}</td>
                              <td className="py-1 px-1 font-medium text-success">{inr(Number(p.received_amount))}</td>
                              <td className={`py-1 px-1 font-medium ${diff < 0 ? "text-danger" : "text-success"}`}>{inr(diff)}</td>
                              <td className="py-1 px-1">
                                <span className={`${PAYMENT_STATUS_BADGE[p.status] ?? PAYMENT_STATUS_BADGE.pending} text-[10px] font-semibold px-2 py-0.5 rounded-full`}>
                                  {p.status.replace("_", " ")}
                                </span>
                              </td>
                              <td className="py-1 px-1 whitespace-nowrap">
                                <button onClick={() => openEditPayment(p)} className="mr-2 hover:text-primary">✏️</button>
                                <button onClick={() => deletePayment(p.id)} className="hover:text-danger">🗑️</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* EXPENSES TAB */}
          {activeTab === "expenses" && (
            <div className="flex flex-col gap-3">
              <div className="bg-white rounded-xl shadow-sm p-3 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-xs text-gray-500">{t(lang, "thisMonth")} {t(lang, "totalExpense")}</p>
                  <p className="text-lg font-bold text-danger">{inr(totalExpenseAll)}</p>
                </div>
                <button onClick={openAddExpense} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
                  + {t(lang, "addExpense")}
                </button>
              </div>

              {expenseTotalsByType.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {expenseTotalsByType.map(({ key, total }) => (
                    <span key={key} className="bg-red-50 text-red-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-red-100">
                      {t(lang, key)}: {inr(total)}
                    </span>
                  ))}
                </div>
              )}

              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">{t(lang, "expenseRecords")}</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                        <th className="py-1 px-1">{t(lang, "date")}</th>
                        <th className="py-1 px-1">{t(lang, "type")}</th>
                        <th className="py-1 px-1">{t(lang, "qty")}</th>
                        <th className="py-1 px-1">{t(lang, "unit")}</th>
                        <th className="py-1 px-1">{t(lang, "amount")}</th>
                        <th className="py-1 px-1">{t(lang, "vendor")}</th>
                        <th className="py-1 px-1">{t(lang, "description")}</th>
                        <th className="py-1 px-1"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {cowExpenses.length === 0 ? (
                        <tr><td colSpan={8} className="text-center py-6 text-gray-500">🐄 {t(lang, "noExpensesYet")}</td></tr>
                      ) : (
                        cowExpenses.map((e) => {
                          const typeKey = EXPENSE_TYPE_KEYS.find((k) => EXPENSE_TYPE_VALUES[k] === e.type);
                          return (
                            <tr key={e.id} className="border-b border-gray-50">
                              <td className="py-1 px-1">{formatDMY(e.expense_date)}</td>
                              <td className="py-1 px-1">{typeKey ? t(lang, typeKey) : e.type}</td>
                              <td className="py-1 px-1">{e.quantity ?? "—"}</td>
                              <td className="py-1 px-1">{e.unit ?? "—"}</td>
                              <td className="py-1 px-1 text-danger font-medium">{inr(Number(e.amount))}</td>
                              <td className="py-1 px-1">{e.vendor_name ?? "—"}</td>
                              <td className="py-1 px-1">{e.description ?? "—"}</td>
                              <td className="py-1 px-1">
                                <button onClick={() => deleteExpense(e.id)} className="hover:text-danger">🗑️</button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* Update Rate Modal */}
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

      {/* Add/Edit Payment Modal */}
      {paymentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg sm:max-h-[90vh] h-full sm:h-auto overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">
                {editingPaymentId ? t(lang, "editPayment") : t(lang, "addPayment")}
              </h2>
              <button onClick={() => setPaymentModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>{t(lang, "paymentDate")}</label>
                <input type="date" value={pmDate} onChange={(e) => setPmDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "milkmanName")}</label>
                <input type="text" value={pmMilkman} onChange={(e) => setPmMilkman(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "periodFrom")}</label>
                <input type="date" value={pmFrom} onChange={(e) => setPmFrom(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "periodTo")}</label>
                <input type="date" value={pmTo} onChange={(e) => setPmTo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "totalLitres")}</label>
                <input type="number" value={pmLitres} onChange={(e) => setPmLitres(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "rate")} ({t(lang, "perLitre")}, ₹)</label>
                <input type="number" value={pmRate} onChange={(e) => setPmRate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "expectedAmount")}</label>
                <input type="number" value={pmExpected.toFixed(2)} disabled className={`${inputCls} bg-gray-50 text-gray-500`} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "receivedAmount")}</label>
                <input type="number" value={pmReceived} onChange={(e) => setPmReceived(e.target.value)} className={inputCls} />
              </div>
              <div className="col-span-2">
                <p className={`text-xs font-semibold ${pmDifference < 0 ? "text-danger" : "text-success"}`}>
                  {t(lang, "difference")}: {inr(pmDifference)}
                </p>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "paymentStatus")}</label>
                <select value={pmStatus} onChange={(e) => setPmStatus(e.target.value)} className={inputCls}>
                  <option value="paid">{t(lang, "paid")}</option>
                  <option value="partially_paid">{t(lang, "partiallyPaid")}</option>
                  <option value="pending">{t(lang, "pending")}</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className={labelCls}>{t(lang, "remarks")}</label>
                <input type="text" value={pmRemarks} onChange={(e) => setPmRemarks(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={savePayment} disabled={savingPayment} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2.5 text-sm font-semibold transition">
                {savingPayment ? "..." : t(lang, "save")}
              </button>
              <button onClick={() => setPaymentModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-semibold transition">
                {t(lang, "cancel")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {expenseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">{t(lang, "addExpense")}</h2>
              <button onClick={() => setExpenseModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>{t(lang, "expenseType")}</label>
                <select value={expType} onChange={(e) => setExpType(e.target.value as typeof EXPENSE_TYPE_KEYS[number])} className={inputCls}>
                  {EXPENSE_TYPE_KEYS.map((k) => <option key={k} value={k}>{t(lang, k)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>{t(lang, "date")}</label>
                <input type="date" value={expDate} onChange={(e) => setExpDate(e.target.value)} className={inputCls} />
              </div>
              {isFeedType && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>{t(lang, "quantityOptional")}</label>
                    <input type="number" value={expQty} onChange={(e) => setExpQty(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{t(lang, "unit")}</label>
                    <input type="text" value={expUnit} onChange={(e) => setExpUnit(e.target.value)} className={inputCls} placeholder="kg" />
                  </div>
                </div>
              )}
              <div>
                <label className={labelCls}>{t(lang, "amount")}</label>
                <input type="number" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "vendorName")}</label>
                <input type="text" value={expVendor} onChange={(e) => setExpVendor(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>{t(lang, "description")}</label>
                <input type="text" value={expDescription} onChange={(e) => setExpDescription(e.target.value)} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={saveExpense} disabled={savingExpense} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {savingExpense ? "..." : t(lang, "save")}
                </button>
                <button onClick={() => setExpenseModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
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
