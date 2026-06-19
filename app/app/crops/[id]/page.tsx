"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Sidebar from "../../../components/Sidebar";
import { supabase } from "../../../lib/supabase";

type Cultivation = {
  id: string;
  farm_id: string;
  crop_type: string;
  area: number;
  status: string;
};

type CoconutDetails = {
  id: string;
  cultivation_id: string;
  total_trees: number;
  small_trees: number;
  large_trees: number;
};

type IncomeRecord = {
  id: string;
  cultivation_id: string;
  farm_id: string;
  income_date: string;
  category: string | null;
  amount: number;
  quantity: number | null;
  unit: string | null;
  price_per_unit: number | null;
  buyer_name: string | null;
  notes: string | null;
  small_coconuts: number | null;
  large_coconuts: number | null;
  small_price: number | null;
  large_price: number | null;
  dealer_deduction: number | null;
};

type ExpenseRecord = {
  id: string;
  cultivation_id: string;
  farm_id: string;
  expense_date: string;
  category: string;
  amount: number;
  description: string | null;
  vendor_name: string | null;
  notes: string | null;
  trees_harvested: number | null;
  price_per_tree: number | null;
};

type HarvestRecord = {
  id: string;
  harvest_date: string;
  yield_quantity: number;
  yield_unit: string;
  notes: string | null;
};

type FertilizerRecord = {
  id: string;
  application_date: string;
  fertilizer_name: string;
  quantity: number;
  unit: string;
  crop_month: number;
  growth_stage: string;
  cost: number;
  notes: string | null;
};

type WeedRecord = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  workers_per_day: number;
  cost_per_day: number;
  total_cost: number;
  notes: string | null;
};

type TurmericDetails = {
  id: string;
  cultivation_id: string;
  variety: string | null;
  planting_date: string | null;
  seed_quantity: number | null;
  expected_harvest_date: string | null;
};

type ActivityField = {
  name: string;
  type: "date" | "text" | "number" | "select";
  labelEn: string;
  labelTa: string;
  options?: string[];
};

type ActivitySubsection = {
  key: string;
  titleEn: string;
  titleTa: string;
  category: string;
  dateField?: string;
  fields: ActivityField[];
  computeAmount: (v: Record<string, string>) => number;
  buildDescription: (v: Record<string, string>) => string;
  matches: (r: ExpenseRecord) => boolean;
  extra?: "fertilizer" | "weed";
};

const CROP_TYPES = [
  { value: "coconut", icon: "🥥", labelTa: "தேங்காய்", labelEn: "Coconut" },
  { value: "sugarcane", icon: "🎋", labelTa: "கரும்பு", labelEn: "Sugarcane" },
  { value: "turmeric", icon: "🟡", labelTa: "மஞ்சள்", labelEn: "Turmeric" },
  { value: "ellu", icon: "🌾", labelTa: "எள்ளு", labelEn: "Ellu" },
  { value: "kuchi_kilangu", icon: "🥔", labelTa: "குச்சிக்கிழங்கு", labelEn: "Kuchi Kilangu" },
  { value: "onion", icon: "🧅", labelTa: "வெங்காயம்", labelEn: "Onion" },
  { value: "fodder_corn", icon: "🌽", labelTa: "மக்காச்சோளம்", labelEn: "Fodder Corn" },
];

const cropInfo = (value: string) =>
  CROP_TYPES.find((c) => c.value === value) ?? { value, icon: "🌱", labelTa: value, labelEn: value };

const EXPENSE_CATEGORIES = [
  { value: "seeds", en: "Seeds", ta: "விதைகள்" },
  { value: "fertilizer", en: "Fertilizer", ta: "உரம்" },
  { value: "labour", en: "Labour", ta: "கூலி" },
  { value: "land_preparation", en: "Land Preparation", ta: "நில தயாரிப்பு" },
  { value: "irrigation", en: "Irrigation", ta: "நீர்ப்பாசனம்" },
  { value: "transport", en: "Transport", ta: "போக்குவரத்து" },
  { value: "machinery_repair", en: "Machinery Repair", ta: "இயந்திர பழுது" },
  { value: "miscellaneous", en: "Miscellaneous", ta: "இதர செலவு" },
];

const YIELD_UNITS = ["kg", "tonnes", "bags", "nos"];

const inr = (n: number) =>
  `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2, minimumFractionDigits: 0 })}`;

const inputCls =
  "w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-900 placeholder:text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400";
const labelCls = "block mb-0.5 text-xs font-medium text-gray-600";

const num = (v: string | undefined) => parseFloat(v ?? "") || 0;

const weedDaysFromValues = (v: Record<string, string>) =>
  v.start_date && v.end_date
    ? Math.max(Math.floor((new Date(v.end_date).getTime() - new Date(v.start_date).getTime()) / 86400000) + 1, 0)
    : 0;

const TURMERIC_SUBSECTIONS: ActivitySubsection[] = [
  {
    key: "A1",
    titleEn: "Land Preparation",
    titleTa: "நில தயாரிப்பு",
    category: "land_preparation",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "description", type: "text", labelEn: "Description", labelTa: "விவரம்" },
      { name: "amount", type: "number", labelEn: "Amount (₹)", labelTa: "தொகை (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.amount),
    buildDescription: (v) => v.description?.trim() || "Land preparation",
    matches: (r) => r.category === "land_preparation",
  },
  {
    key: "A2",
    titleEn: "Drip Irrigation",
    titleTa: "நீர்ப்பாசன அமைப்பு",
    category: "irrigation",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "type", type: "select", labelEn: "Type", labelTa: "வகை", options: ["Installation", "Maintenance"] },
      { name: "amount", type: "number", labelEn: "Amount (₹)", labelTa: "தொகை (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.amount),
    buildDescription: (v) => `Drip irrigation - ${v.type || "Installation"}`,
    matches: (r) => r.category === "irrigation",
  },
  {
    key: "A3",
    titleEn: "Seed Rhizomes Purchase",
    titleTa: "விதை கிழங்கு கொள்முதல்",
    category: "seeds",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "quantity", type: "number", labelEn: "Quantity (kg)", labelTa: "அளவு (கி.கி)" },
      { name: "price_per_kg", type: "number", labelEn: "Price/kg (₹)", labelTa: "விலை/கி.கி (₹)" },
      { name: "vendor_name", type: "text", labelEn: "Vendor Name", labelTa: "விற்பனையாளர் பெயர்" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.quantity) * num(v.price_per_kg),
    buildDescription: (v) => `Seed rhizomes purchase - ${num(v.quantity)}kg @ ₹${num(v.price_per_kg)}/kg`,
    matches: (r) => r.category === "seeds",
  },
  {
    key: "A4",
    titleEn: "Fertilizer Application",
    titleTa: "உர பயன்பாடு",
    category: "fertilizer",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "fertilizer_name", type: "text", labelEn: "Fertilizer Name", labelTa: "உரம் பெயர்" },
      { name: "quantity", type: "number", labelEn: "Quantity", labelTa: "அளவு" },
      { name: "unit", type: "select", labelEn: "Unit", labelTa: "அளவீடு", options: ["kg", "litre", "g"] },
      { name: "crop_month", type: "number", labelEn: "Crop Month", labelTa: "பயிர் மாதம்" },
      { name: "growth_stage", type: "text", labelEn: "Growth Stage", labelTa: "வளர்ச்சி நிலை" },
      { name: "cost", type: "number", labelEn: "Cost (₹)", labelTa: "செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.cost),
    buildDescription: (v) => `${v.fertilizer_name?.trim() || "Fertilizer"} - ${num(v.quantity)}${v.unit || "kg"}`,
    matches: (r) => r.category === "fertilizer",
    extra: "fertilizer",
  },
  {
    key: "A5",
    titleEn: "Weeding Operations",
    titleTa: "களை மேலாண்மை",
    category: "labour",
    dateField: "start_date",
    fields: [
      { name: "start_date", type: "date", labelEn: "Start Date", labelTa: "தொடக்க தேதி" },
      { name: "end_date", type: "date", labelEn: "End Date", labelTa: "முடிவு தேதி" },
      { name: "workers_per_day", type: "number", labelEn: "Workers/Day", labelTa: "தொழிலாளர்/நாள்" },
      { name: "cost_per_day", type: "number", labelEn: "Cost/Day (₹)", labelTa: "செலவு/நாள் (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => weedDaysFromValues(v) * num(v.workers_per_day) * num(v.cost_per_day),
    buildDescription: () => "Weeding operations",
    matches: (r) => r.category === "labour" && r.description === "Weeding operations",
    extra: "weed",
  },
  {
    key: "B1",
    titleEn: "Leaf Removal",
    titleTa: "இலை அகற்றல்",
    category: "labour",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "workers_count", type: "number", labelEn: "Workers Count", labelTa: "தொழிலாளர் எண்ணிக்கை" },
      { name: "cost_per_worker", type: "number", labelEn: "Cost/Worker (₹)", labelTa: "தொழிலாளர் செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.workers_count) * num(v.cost_per_worker),
    buildDescription: () => "Turmeric leaf removal - pre harvest preparation",
    matches: (r) => r.category === "labour" && r.description === "Turmeric leaf removal - pre harvest preparation",
  },
  {
    key: "B2",
    titleEn: "Harvesting",
    titleTa: "அறுவடை",
    category: "labour",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "area_harvested", type: "number", labelEn: "Area Harvested (acres)", labelTa: "அறுவடை பரப்பு (ஏக்கர்)" },
      { name: "workers_count", type: "number", labelEn: "Workers Count", labelTa: "தொழிலாளர் எண்ணிக்கை" },
      { name: "cost_per_worker", type: "number", labelEn: "Cost/Worker (₹)", labelTa: "தொழிலாளர் செலவு (₹)" },
      { name: "other_costs", type: "number", labelEn: "Other Costs (₹)", labelTa: "இதர செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.workers_count) * num(v.cost_per_worker) + num(v.other_costs),
    buildDescription: () => "Turmeric harvesting",
    matches: (r) => r.category === "labour" && r.description === "Turmeric harvesting",
  },
  {
    key: "B3",
    titleEn: "Boiling / Processing",
    titleTa: "வேகவைத்தல்",
    category: "miscellaneous",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "quantity_boiled", type: "number", labelEn: "Quantity Boiled (kg)", labelTa: "வேகவைத்த அளவு (கி.கி)" },
      { name: "fuel_cost", type: "number", labelEn: "Fuel Cost (₹)", labelTa: "எரிபொருள் செலவு (₹)" },
      { name: "labour_cost", type: "number", labelEn: "Labour Cost (₹)", labelTa: "கூலி செலவு (₹)" },
      { name: "other_cost", type: "number", labelEn: "Other Cost (₹)", labelTa: "இதர செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.fuel_cost) + num(v.labour_cost) + num(v.other_cost),
    buildDescription: () => "Turmeric boiling/curing process",
    matches: (r) => r.category === "miscellaneous" && r.description === "Turmeric boiling/curing process",
  },
  {
    key: "B4",
    titleEn: "Drying",
    titleTa: "உலர்த்துதல்",
    category: "miscellaneous",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "quantity_before_drying", type: "number", labelEn: "Qty Before Drying (kg)", labelTa: "உலர்த்தும் முன் அளவு (கி.கி)" },
      { name: "quantity_after_drying", type: "number", labelEn: "Qty After Drying (kg)", labelTa: "உலர்த்திய பின் அளவு (கி.கி)" },
      { name: "drying_days", type: "number", labelEn: "Drying Days", labelTa: "உலர்த்தும் நாட்கள்" },
      { name: "labour_cost", type: "number", labelEn: "Labour Cost (₹)", labelTa: "கூலி செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.labour_cost),
    buildDescription: () => "Turmeric drying",
    matches: (r) => r.category === "miscellaneous" && r.description === "Turmeric drying",
  },
  {
    key: "B5",
    titleEn: "Polishing",
    titleTa: "மெருகூட்டல்",
    category: "miscellaneous",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "quantity", type: "number", labelEn: "Quantity (kg)", labelTa: "அளவு (கி.கி)" },
      { name: "polishing_cost", type: "number", labelEn: "Polishing Cost (₹)", labelTa: "மெருகூட்டல் செலவு (₹)" },
      { name: "labour_cost", type: "number", labelEn: "Labour Cost (₹)", labelTa: "கூலி செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.polishing_cost) + num(v.labour_cost),
    buildDescription: () => "Turmeric polishing",
    matches: (r) => r.category === "miscellaneous" && r.description === "Turmeric polishing",
  },
  {
    key: "B6",
    titleEn: "Packing",
    titleTa: "பேக்கிங்",
    category: "miscellaneous",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "number_of_bags", type: "number", labelEn: "Number of Bags", labelTa: "பைகள் எண்ணிக்கை" },
      { name: "weight_per_bag", type: "number", labelEn: "Weight/Bag (kg)", labelTa: "ஒரு பை எடை (கி.கி)" },
      { name: "packing_material_cost", type: "number", labelEn: "Packing Material Cost (₹)", labelTa: "பேக்கிங் பொருள் செலவு (₹)" },
      { name: "labour_cost", type: "number", labelEn: "Labour Cost (₹)", labelTa: "கூலி செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.packing_material_cost) + num(v.labour_cost),
    buildDescription: () => "Turmeric packing",
    matches: (r) => r.category === "miscellaneous" && r.description === "Turmeric packing",
  },
  {
    key: "B7",
    titleEn: "Transportation",
    titleTa: "போக்குவரத்து",
    category: "transport",
    fields: [
      { name: "date", type: "date", labelEn: "Date", labelTa: "தேதி" },
      { name: "destination", type: "text", labelEn: "Destination", labelTa: "இடம்" },
      { name: "vehicle_type", type: "text", labelEn: "Vehicle Type", labelTa: "வாகன வகை" },
      { name: "quantity_transported", type: "number", labelEn: "Quantity (kg)", labelTa: "அளவு (கி.கி)" },
      { name: "transport_cost", type: "number", labelEn: "Transport Cost (₹)", labelTa: "போக்குவரத்து செலவு (₹)" },
      { name: "notes", type: "text", labelEn: "Notes", labelTa: "குறிப்பு" },
    ],
    computeAmount: (v) => num(v.transport_cost),
    buildDescription: () => "Turmeric transportation",
    matches: (r) => r.category === "transport",
  },
];

const COMMON_ACTIVITY_KEYS = ["A1", "A2", "A3", "A4", "A5"];
const TURMERIC_ACTIVITY_KEYS = ["B1", "B2", "B3", "B4", "B5", "B6", "B7"];

export default function CropDetail() {
  const params = useParams();
  const id = params.id as string;

  const [lang, setLang] = useState<"ta" | "en">("en");
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [cultivation, setCultivation] = useState<Cultivation | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "finance" | "activities">("overview");

  const cropType = cultivation?.crop_type ?? "";
  const isCoconut = cropType === "coconut";
  const isTurmeric = cropType === "turmeric";
  const showHarvestSection = cropType !== "" && cropType !== "coconut" && cropType !== "fodder_corn";
  const crop = cropInfo(cropType);

  // Turmeric details
  const [turmericDetailsId, setTurmericDetailsId] = useState<string | null>(null);
  const [turmericVariety, setTurmericVariety] = useState("");
  const [turmericPlantingDate, setTurmericPlantingDate] = useState("");
  const [turmericSeedQuantity, setTurmericSeedQuantity] = useState("");
  const [turmericExpectedHarvestDate, setTurmericExpectedHarvestDate] = useState("");
  const [savingTurmericDetails, setSavingTurmericDetails] = useState(false);

  // Turmeric income (crop sale)
  const [turmericSaleDate, setTurmericSaleDate] = useState("");
  const [turmericQtySold, setTurmericQtySold] = useState("");
  const [turmericPricePerKg, setTurmericPricePerKg] = useState("");
  const [turmericSaleBuyer, setTurmericSaleBuyer] = useState("");
  const [turmericSaleNotes, setTurmericSaleNotes] = useState("");
  const [savingTurmericSale, setSavingTurmericSale] = useState(false);

  // Turmeric harvest
  const [turmericHarvestDate, setTurmericHarvestDate] = useState("");
  const [turmericRawYield, setTurmericRawYield] = useState("");
  const [turmericAfterBoiling, setTurmericAfterBoiling] = useState("");
  const [turmericAfterDrying, setTurmericAfterDrying] = useState("");
  const [turmericAfterPolishing, setTurmericAfterPolishing] = useState("");
  const [turmericHarvestNotes, setTurmericHarvestNotes] = useState("");
  const [savingTurmericHarvest, setSavingTurmericHarvest] = useState(false);

  // Turmeric activities (generic engine)
  const [formValues, setFormValues] = useState<Record<string, Record<string, string>>>({});
  const [formOpen, setFormOpen] = useState<Record<string, boolean>>({});
  const [savingActivity, setSavingActivity] = useState<Record<string, boolean>>({});
  const [successMsg, setSuccessMsg] = useState<Record<string, string | null>>({});

  // Coconut tree tracking
  const [coconutDetailsId, setCoconutDetailsId] = useState<string | null>(null);
  const [totalTrees, setTotalTrees] = useState("");
  const [smallTrees, setSmallTrees] = useState("");
  const [largeTrees, setLargeTrees] = useState("");
  const [savingTrees, setSavingTrees] = useState(false);

  // Income
  const [incomeRecords, setIncomeRecords] = useState<IncomeRecord[]>([]);
  const [harvestDate, setHarvestDate] = useState("");
  const [smallCount, setSmallCount] = useState("");
  const [smallPrice, setSmallPrice] = useState("");
  const [largeCount, setLargeCount] = useState("");
  const [largePrice, setLargePrice] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [savingIncome, setSavingIncome] = useState(false);

  const [incomeDate, setIncomeDate] = useState("");
  const [incomeCategory, setIncomeCategory] = useState("harvest");
  const [incomeAmount, setIncomeAmount] = useState("");
  const [incomeBuyer, setIncomeBuyer] = useState("");
  const [incomeNotes, setIncomeNotes] = useState("");

  // Expenses
  const [expenseRecords, setExpenseRecords] = useState<ExpenseRecord[]>([]);
  const [expenseDate, setExpenseDate] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("seeds");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseVendorName, setExpenseVendorName] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [savingExpense, setSavingExpense] = useState(false);

  const [labourDate, setLabourDate] = useState("");
  const [treesHarvested, setTreesHarvested] = useState("");
  const [pricePerTree, setPricePerTree] = useState("");
  const [savingLabour, setSavingLabour] = useState(false);

  // Harvest
  const [harvestRecords, setHarvestRecords] = useState<HarvestRecord[]>([]);
  const [harvestRecordDate, setHarvestRecordDate] = useState("");
  const [yieldQuantity, setYieldQuantity] = useState("");
  const [yieldUnit, setYieldUnit] = useState("kg");
  const [harvestNotes, setHarvestNotes] = useState("");
  const [savingHarvest, setSavingHarvest] = useState(false);

  // Activities - fertilizer
  const [fertilizerRecords, setFertilizerRecords] = useState<FertilizerRecord[]>([]);
  const [fertDate, setFertDate] = useState("");
  const [fertName, setFertName] = useState("");
  const [fertQty, setFertQty] = useState("");
  const [fertUnit, setFertUnit] = useState("kg");
  const [fertMonth, setFertMonth] = useState("");
  const [fertStage, setFertStage] = useState("");
  const [fertCost, setFertCost] = useState("");
  const [fertNotes, setFertNotes] = useState("");
  const [savingFert, setSavingFert] = useState(false);

  // Activities - weed removal
  const [weedRecords, setWeedRecords] = useState<WeedRecord[]>([]);
  const [weedStart, setWeedStart] = useState("");
  const [weedEnd, setWeedEnd] = useState("");
  const [weedWorkers, setWeedWorkers] = useState("");
  const [weedCostPerDay, setWeedCostPerDay] = useState("");
  const [weedNotes, setWeedNotes] = useState("");
  const [savingWeed, setSavingWeed] = useState(false);

  useEffect(() => {
    if (id) {
      fetchCultivation();
      fetchIncomeRecords();
      fetchExpenseRecords();
      fetchHarvestRecords();
      fetchFertilizerRecords();
      fetchWeedRecords();
    }
  }, [id]);

  useEffect(() => {
    if (isCoconut) fetchCoconutDetails();
  }, [isCoconut, id]);

  useEffect(() => {
    if (isTurmeric) fetchTurmericDetails();
  }, [isTurmeric, id]);

  const fetchCultivation = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cultivations").select("*").eq("id", id).single();
    if (!error && data) setCultivation(data);
    setLoading(false);
  };

  const fetchCoconutDetails = async () => {
    const { data, error } = await supabase
      .from("coconut_details")
      .select("*")
      .eq("cultivation_id", id)
      .maybeSingle();
    if (!error && data) {
      const d = data as CoconutDetails;
      setCoconutDetailsId(d.id);
      setTotalTrees(String(d.total_trees ?? ""));
      setSmallTrees(String(d.small_trees ?? ""));
      setLargeTrees(String(d.large_trees ?? ""));
    }
  };

  const fetchTurmericDetails = async () => {
    const { data, error } = await supabase
      .from("turmeric_details")
      .select("*")
      .eq("cultivation_id", id)
      .maybeSingle();
    if (!error && data) {
      const d = data as TurmericDetails;
      setTurmericDetailsId(d.id);
      setTurmericVariety(d.variety ?? "");
      setTurmericPlantingDate(d.planting_date ?? "");
      setTurmericSeedQuantity(String(d.seed_quantity ?? ""));
      setTurmericExpectedHarvestDate(d.expected_harvest_date ?? "");
    }
  };

  const fetchIncomeRecords = async () => {
    const { data, error } = await supabase
      .from("income_records")
      .select("*")
      .eq("cultivation_id", id)
      .order("income_date", { ascending: false });
    if (!error && data) setIncomeRecords(data);
  };

  const fetchExpenseRecords = async () => {
    const { data, error } = await supabase
      .from("expense_records")
      .select("*")
      .eq("cultivation_id", id)
      .order("expense_date", { ascending: false });
    if (!error && data) setExpenseRecords(data);
  };

  const fetchHarvestRecords = async () => {
    const { data, error } = await supabase
      .from("harvest_records")
      .select("*")
      .eq("cultivation_id", id)
      .order("harvest_date", { ascending: false });
    if (!error && data) setHarvestRecords(data);
  };

  const fetchFertilizerRecords = async () => {
    const { data, error } = await supabase
      .from("fertilizer_applications")
      .select("*")
      .eq("cultivation_id", id)
      .order("application_date", { ascending: false });
    if (!error && data) setFertilizerRecords(data);
  };

  const fetchWeedRecords = async () => {
    const { data, error } = await supabase
      .from("weed_removals")
      .select("*")
      .eq("cultivation_id", id)
      .order("start_date", { ascending: false });
    if (!error && data) setWeedRecords(data);
  };

  const reportError = (label: string, message: string) => alert(`${label}: ${message}`);

  // ---- Coconut tree tracking ----
  const totalTreesNum = parseFloat(totalTrees) || 0;
  const smallTreesNum = parseFloat(smallTrees) || 0;
  const largeTreesNum = parseFloat(largeTrees) || 0;
  const treesMismatch =
    totalTrees !== "" && smallTrees !== "" && largeTrees !== "" && smallTreesNum + largeTreesNum !== totalTreesNum;

  const saveCoconutTrees = async () => {
    if (treesMismatch) {
      alert(
        L(
          "Small Trees + Large Trees must equal Total Trees",
          "சிறிய மரங்கள் + பெரிய மரங்கள் மொத்த மரங்களுக்கு சமமாக இருக்க வேண்டும்"
        )
      );
      return;
    }
    setSavingTrees(true);
    try {
      const payload = {
        cultivation_id: id,
        total_trees: totalTreesNum,
        small_trees: smallTreesNum,
        large_trees: largeTreesNum,
      };
      const { error } = coconutDetailsId
        ? await supabase.from("coconut_details").update(payload).eq("id", coconutDetailsId)
        : await supabase.from("coconut_details").insert(payload);
      if (error) reportError("Error saving tree details", error.message);
      else fetchCoconutDetails();
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingTrees(false);
  };

  const saveTurmericDetails = async () => {
    setSavingTurmericDetails(true);
    try {
      const payload = {
        cultivation_id: id,
        variety: turmericVariety.trim() || null,
        planting_date: turmericPlantingDate || null,
        seed_quantity: parseFloat(turmericSeedQuantity) || 0,
        expected_harvest_date: turmericExpectedHarvestDate || null,
      };
      const { error } = turmericDetailsId
        ? await supabase.from("turmeric_details").update(payload).eq("id", turmericDetailsId)
        : await supabase.from("turmeric_details").insert(payload);
      if (error) reportError("Error saving turmeric details", error.message);
      else fetchTurmericDetails();
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingTurmericDetails(false);
  };

  // ---- Coconut income ----
  const smallCountNum = parseFloat(smallCount) || 0;
  const smallPriceNum = parseFloat(smallPrice) || 0;
  const largeCountNum = parseFloat(largeCount) || 0;
  const largePriceNum = parseFloat(largePrice) || 0;
  const smallRevenue = smallCountNum * smallPriceNum;
  const largeRevenue = largeCountNum * largePriceNum;
  const totalBeforeDeduction = smallRevenue + largeRevenue;
  const totalCoconutCount = smallCountNum + largeCountNum;
  const deductionCount = Math.floor(totalCoconutCount / 100) * 5;
  const averagePrice = totalCoconutCount > 0 ? totalBeforeDeduction / totalCoconutCount : 0;
  const deductionValue = deductionCount * averagePrice;
  const netRevenue = totalBeforeDeduction - deductionValue;

  const saveCoconutIncome = async () => {
    if (!cultivation) return;
    if (!harvestDate || totalCoconutCount <= 0) {
      alert(L("Harvest date and at least one coconut count are required", "அறுவடை தேதி மற்றும் எண்ணிக்கை தேவை"));
      return;
    }
    const notes =
      `Small: ${smallCountNum} nos × ₹${smallPriceNum} = ₹${smallRevenue.toFixed(2)}\n` +
      `Large: ${largeCountNum} nos × ₹${largePriceNum} = ₹${largeRevenue.toFixed(2)}\n` +
      `Dealer deduction: -${deductionCount} nos (≈ ₹${deductionValue.toFixed(2)})\n` +
      `Net Income: ₹${netRevenue.toFixed(2)}`;
    setSavingIncome(true);
    try {
      const { error } = await supabase.from("income_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        income_date: harvestDate,
        category: "harvest",
        amount: netRevenue,
        quantity: totalCoconutCount,
        unit: "nos",
        price_per_unit: averagePrice,
        buyer_name: buyerName.trim() || null,
        notes,
        small_coconuts: smallCountNum,
        large_coconuts: largeCountNum,
        small_price: smallPriceNum,
        large_price: largePriceNum,
        dealer_deduction: deductionCount,
      });
      if (error) reportError("Error saving income", error.message);
      else {
        setHarvestDate("");
        setSmallCount("");
        setSmallPrice("");
        setLargeCount("");
        setLargePrice("");
        setBuyerName("");
        fetchIncomeRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingIncome(false);
  };

  // ---- Generic income ----
  const saveIncome = async () => {
    if (!cultivation) return;
    if (!incomeDate || !incomeAmount) {
      alert(L("Date and amount are required", "தேதி மற்றும் தொகை தேவை"));
      return;
    }
    setSavingIncome(true);
    try {
      const { error } = await supabase.from("income_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        income_date: incomeDate,
        category: incomeCategory.trim() || null,
        amount: parseFloat(incomeAmount) || 0,
        buyer_name: incomeBuyer.trim() || null,
        notes: incomeNotes.trim() || null,
      });
      if (error) reportError("Error saving income", error.message);
      else {
        setIncomeDate("");
        setIncomeAmount("");
        setIncomeBuyer("");
        setIncomeNotes("");
        fetchIncomeRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingIncome(false);
  };

  // ---- Generic expense ----
  const saveExpense = async () => {
    if (!cultivation) return;
    if (!expenseDate || !expenseAmount) {
      alert(L("Date and amount are required", "தேதி மற்றும் தொகை தேவை"));
      return;
    }
    setSavingExpense(true);
    try {
      const { error } = await supabase.from("expense_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        expense_date: expenseDate,
        category: expenseCategory,
        description: expenseDescription.trim() || null,
        vendor_name: expenseVendorName.trim() || null,
        amount: parseFloat(expenseAmount) || 0,
      });
      if (error) reportError("Error saving expense", error.message);
      else {
        setExpenseDate("");
        setExpenseDescription("");
        setExpenseVendorName("");
        setExpenseAmount("");
        fetchExpenseRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingExpense(false);
  };

  // ---- Coconut labour ----
  const treesHarvestedNum = parseFloat(treesHarvested) || 0;
  const pricePerTreeNum = parseFloat(pricePerTree) || 0;
  const labourTotal = treesHarvestedNum * pricePerTreeNum;

  const saveCoconutLabour = async () => {
    if (!cultivation) return;
    if (!labourDate || treesHarvestedNum <= 0 || pricePerTreeNum <= 0) {
      alert(L("Date, trees and price per tree are required", "தேதி, மரங்கள் மற்றும் விலை தேவை"));
      return;
    }
    setSavingLabour(true);
    try {
      const description = `Coconut harvesting labour - ${treesHarvestedNum} trees @ ₹${pricePerTreeNum}/tree`;
      const { error } = await supabase.from("expense_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        expense_date: labourDate,
        category: "labour",
        description,
        trees_harvested: treesHarvestedNum,
        price_per_tree: pricePerTreeNum,
        amount: labourTotal,
      });
      if (error) reportError("Error saving labour expense", error.message);
      else {
        setLabourDate("");
        setTreesHarvested("");
        setPricePerTree("");
        fetchExpenseRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingLabour(false);
  };

  // ---- Harvest ----
  const saveHarvest = async () => {
    if (!harvestRecordDate || !yieldQuantity) {
      alert(L("Date and yield quantity are required", "தேதி மற்றும் அளவு தேவை"));
      return;
    }
    setSavingHarvest(true);
    try {
      const { error } = await supabase.from("harvest_records").insert({
        cultivation_id: id,
        harvest_date: harvestRecordDate,
        yield_quantity: parseFloat(yieldQuantity) || 0,
        yield_unit: yieldUnit,
        notes: harvestNotes.trim() || null,
      });
      if (error) reportError("Error saving harvest", error.message);
      else {
        setHarvestRecordDate("");
        setYieldQuantity("");
        setHarvestNotes("");
        fetchHarvestRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingHarvest(false);
  };

  // ---- Fertilizer ----
  const saveFertilizer = async () => {
    if (!fertDate || !fertName || !fertQty || !fertCost) {
      alert(L("Date, fertilizer name, quantity and cost are required", "தேதி, உரம் பெயர், அளவு மற்றும் செலவு தேவை"));
      return;
    }
    setSavingFert(true);
    try {
      const { error } = await supabase.from("fertilizer_applications").insert({
        cultivation_id: id,
        application_date: fertDate,
        fertilizer_name: fertName.trim(),
        quantity: parseFloat(fertQty) || 0,
        unit: fertUnit,
        crop_month: parseInt(fertMonth) || 0,
        growth_stage: fertStage.trim(),
        cost: parseFloat(fertCost) || 0,
        notes: fertNotes.trim() || null,
      });
      if (error) reportError("Error saving fertilizer record", error.message);
      else {
        setFertDate("");
        setFertName("");
        setFertQty("");
        setFertMonth("");
        setFertStage("");
        setFertCost("");
        setFertNotes("");
        fetchFertilizerRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingFert(false);
  };

  // ---- Weed removal ----
  const weedDays =
    weedStart && weedEnd
      ? Math.max(Math.floor((new Date(weedEnd).getTime() - new Date(weedStart).getTime()) / 86400000) + 1, 0)
      : 0;
  const weedWorkersNum = parseFloat(weedWorkers) || 0;
  const weedCostPerDayNum = parseFloat(weedCostPerDay) || 0;
  const weedTotalCost = weedDays * weedWorkersNum * weedCostPerDayNum;

  const saveWeedRemoval = async () => {
    if (!weedStart || !weedEnd || weedDays <= 0 || weedWorkersNum <= 0 || weedCostPerDayNum <= 0) {
      alert(L("All weed removal fields are required", "அனைத்து புல் அகற்றும் தகவல்களும் தேவை"));
      return;
    }
    setSavingWeed(true);
    try {
      const { error } = await supabase.from("weed_removals").insert({
        cultivation_id: id,
        start_date: weedStart,
        end_date: weedEnd,
        total_days: weedDays,
        workers_per_day: weedWorkersNum,
        cost_per_day: weedCostPerDayNum,
        total_cost: weedTotalCost,
        notes: weedNotes.trim() || null,
      });
      if (error) reportError("Error saving weed removal record", error.message);
      else {
        setWeedStart("");
        setWeedEnd("");
        setWeedWorkers("");
        setWeedCostPerDay("");
        setWeedNotes("");
        fetchWeedRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingWeed(false);
  };

  // ---- Generic turmeric activity engine ----
  const setActivityValue = (key: string, field: string, value: string) => {
    setFormValues((prev) => ({ ...prev, [key]: { ...(prev[key] || {}), [field]: value } }));
  };

  const deleteExpenseRecord = async (recordId: string) => {
    try {
      const { error } = await supabase.from("expense_records").delete().eq("id", recordId);
      if (error) reportError("Error deleting record", error.message);
      else fetchExpenseRecords();
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
  };

  const saveActivity = async (sub: ActivitySubsection) => {
    if (!cultivation) return;
    const values = formValues[sub.key] || {};
    const dateField = sub.dateField ?? "date";
    if (!values[dateField]) {
      alert(L("Date is required", "தேதி தேவை"));
      return;
    }
    const amount = sub.computeAmount(values);
    const description = sub.buildDescription(values);
    setSavingActivity((s) => ({ ...s, [sub.key]: true }));
    try {
      const { error } = await supabase.from("expense_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        expense_date: values[dateField],
        category: sub.category,
        description,
        vendor_name: values.vendor_name?.trim() || null,
        amount,
        notes: values.notes?.trim() || null,
      });
      if (error) {
        reportError("Error saving record", error.message);
        setSavingActivity((s) => ({ ...s, [sub.key]: false }));
        return;
      }

      if (sub.extra === "fertilizer") {
        await supabase.from("fertilizer_applications").insert({
          cultivation_id: id,
          application_date: values.date,
          fertilizer_name: values.fertilizer_name?.trim() || "",
          quantity: num(values.quantity),
          unit: values.unit || "kg",
          crop_month: parseInt(values.crop_month) || 0,
          growth_stage: values.growth_stage?.trim() || "",
          cost: amount,
          notes: values.notes?.trim() || null,
        });
        fetchFertilizerRecords();
      }
      if (sub.extra === "weed") {
        await supabase.from("weed_removals").insert({
          cultivation_id: id,
          start_date: values.start_date,
          end_date: values.end_date,
          total_days: weedDaysFromValues(values),
          workers_per_day: num(values.workers_per_day),
          cost_per_day: num(values.cost_per_day),
          total_cost: amount,
          notes: values.notes?.trim() || null,
        });
        fetchWeedRecords();
      }

      setFormValues((s) => ({ ...s, [sub.key]: {} }));
      setFormOpen((s) => ({ ...s, [sub.key]: false }));
      setSuccessMsg((s) => ({ ...s, [sub.key]: L("Saved!", "சேமிக்கப்பட்டது!") }));
      setTimeout(() => setSuccessMsg((s) => ({ ...s, [sub.key]: null })), 2000);
      fetchExpenseRecords();
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingActivity((s) => ({ ...s, [sub.key]: false }));
  };

  // ---- Turmeric crop sale income ----
  const turmericSaleQtyNum = parseFloat(turmericQtySold) || 0;
  const turmericSalePriceNum = parseFloat(turmericPricePerKg) || 0;
  const turmericSaleTotal = turmericSaleQtyNum * turmericSalePriceNum;

  const saveTurmericIncome = async () => {
    if (!cultivation) return;
    if (!turmericSaleDate || turmericSaleQtyNum <= 0) {
      alert(L("Sale date and quantity are required", "விற்பனை தேதி மற்றும் அளவு தேவை"));
      return;
    }
    setSavingTurmericSale(true);
    try {
      const { error } = await supabase.from("income_records").insert({
        cultivation_id: id,
        farm_id: cultivation.farm_id,
        income_date: turmericSaleDate,
        category: "crop_sale",
        amount: turmericSaleTotal,
        quantity: turmericSaleQtyNum,
        unit: "kg",
        price_per_unit: turmericSalePriceNum,
        buyer_name: turmericSaleBuyer.trim() || null,
        notes: turmericSaleNotes.trim() || null,
      });
      if (error) reportError("Error saving income", error.message);
      else {
        setTurmericSaleDate("");
        setTurmericQtySold("");
        setTurmericPricePerKg("");
        setTurmericSaleBuyer("");
        setTurmericSaleNotes("");
        fetchIncomeRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingTurmericSale(false);
  };

  // ---- Turmeric harvest ----
  const saveTurmericHarvest = async () => {
    if (!turmericHarvestDate || !turmericAfterDrying) {
      alert(L("Harvest date and after-drying weight are required", "அறுவடை தேதி மற்றும் உலர் எடை தேவை"));
      return;
    }
    setSavingTurmericHarvest(true);
    try {
      const notes =
        `Raw: ${turmericRawYield || 0}kg, After boiling: ${turmericAfterBoiling || 0}kg, ` +
        `After drying: ${turmericAfterDrying || 0}kg (final), After polishing: ${turmericAfterPolishing || 0}kg` +
        (turmericHarvestNotes.trim() ? ` · ${turmericHarvestNotes.trim()}` : "");
      const { error } = await supabase.from("harvest_records").insert({
        cultivation_id: id,
        harvest_date: turmericHarvestDate,
        yield_quantity: parseFloat(turmericAfterDrying) || 0,
        yield_unit: "kg",
        notes,
      });
      if (error) reportError("Error saving harvest", error.message);
      else {
        setTurmericHarvestDate("");
        setTurmericRawYield("");
        setTurmericAfterBoiling("");
        setTurmericAfterDrying("");
        setTurmericAfterPolishing("");
        setTurmericHarvestNotes("");
        fetchHarvestRecords();
      }
    } catch (err) {
      reportError("Unexpected error", err instanceof Error ? err.message : String(err));
    }
    setSavingTurmericHarvest(false);
  };

  const totalIncome = incomeRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const totalExpenses = expenseRecords.reduce((sum, r) => sum + Number(r.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  const turmericTotalYield = harvestRecords.reduce((sum, r) => sum + Number(r.yield_quantity), 0);
  const turmericTotalSold = incomeRecords
    .filter((r) => r.category === "crop_sale")
    .reduce((sum, r) => sum + Number(r.quantity ?? 0), 0);
  const turmericRemainingStock = turmericTotalYield - turmericTotalSold;

  const turmericExpenseBreakdown = TURMERIC_SUBSECTIONS.map((sub) => ({
    key: sub.key,
    titleEn: sub.titleEn,
    titleTa: sub.titleTa,
    total: expenseRecords.filter(sub.matches).reduce((sum, r) => sum + Number(r.amount), 0),
  }));

  const renderField = (sub: ActivitySubsection, f: ActivityField, values: Record<string, string>) => (
    <div key={f.name}>
      <label className={labelCls}>{lang === "ta" ? f.labelTa : f.labelEn}</label>
      {f.type === "select" ? (
        <select
          value={values[f.name] || ""}
          onChange={(e) => setActivityValue(sub.key, f.name, e.target.value)}
          className={inputCls}
        >
          {(f.options || []).map((o) => (
            <option className="text-gray-900" key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : (
        <input
          type={f.type}
          value={values[f.name] || ""}
          onChange={(e) => setActivityValue(sub.key, f.name, e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  );

  const renderSubsection = (sub: ActivitySubsection) => {
    const isOpen = formOpen[sub.key] ?? false;
    const values = formValues[sub.key] || {};
    const records = expenseRecords.filter(sub.matches);
    const total = records.reduce((s, r) => s + Number(r.amount), 0);

    return (
      <div key={sub.key} className="border border-gray-100 rounded-xl p-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFormOpen((s) => ({ ...s, [sub.key]: !isOpen }))}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 text-green-700 text-sm font-bold hover:bg-green-200 transition"
            >
              {isOpen ? "−" : "+"}
            </button>
            <span className="text-xs font-semibold text-gray-800">
              {lang === "ta" ? sub.titleTa : sub.titleEn}
            </span>
          </div>
          <span className="text-xs text-gray-500">{inr(total)}</span>
        </div>

        {isOpen && (
          <div className="mt-2">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {sub.fields.map((f) => renderField(sub, f, values))}
            </div>
            <p className="text-xs font-mono text-gray-600 mt-1">
              {L("Amount", "தொகை")}: {inr(sub.computeAmount(values))}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button
                onClick={() => saveActivity(sub)}
                disabled={savingActivity[sub.key]}
                className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-3 py-1 text-xs font-semibold transition"
              >
                {savingActivity[sub.key] ? "..." : L("Save", "சேமி")}
              </button>
              {successMsg[sub.key] && (
                <span className="text-xs text-green-600 font-medium">{successMsg[sub.key]}</span>
              )}
            </div>
          </div>
        )}

        {records.length > 0 && (
          <div className="mt-2 max-h-24 overflow-y-auto">
            {records.map((r) => (
              <div key={r.id} className="flex justify-between items-center text-xs text-gray-600 border-b border-gray-50 py-0.5">
                <span className="truncate">{r.expense_date} · {r.description}</span>
                <span className="flex items-center gap-1.5 shrink-0">
                  {inr(Number(r.amount))}
                  <button onClick={() => deleteExpenseRecord(r.id)} className="hover:text-red-600">🗑️</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden bg-green-50">
        <Sidebar lang={lang} setLang={setLang} />
        <main className="flex-1 flex items-center justify-center text-green-700 text-sm font-medium">
          {L("Loading...", "ஏற்றுகிறது...")}
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-green-50">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-3">
        <div className="max-w-5xl mx-auto flex flex-col gap-3">

          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm py-2 px-4 flex items-center justify-between shrink-0">
            <Link
              href={cultivation ? `/farms/${cultivation.farm_id}` : "/farms"}
              className="text-green-700 hover:text-green-800 text-sm font-semibold"
            >
              ← {L("Back to Farm", "நிலத்திற்கு திரும்பு")}
            </Link>
            <h1 className="text-base font-bold text-green-800">
              {crop.icon} {lang === "ta" ? crop.labelTa : crop.labelEn} · {cultivation?.area} {L("Acres", "ஏக்கர்")}
            </h1>
            <button
              onClick={() => setLang(lang === "ta" ? "en" : "ta")}
              className="px-3 py-1.5 rounded-lg border border-green-300 text-green-700 text-sm font-medium hover:bg-green-50 transition"
            >
              {lang === "ta" ? "English" : "தமிழ்"}
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 w-fit shrink-0">
            {([
              ["overview", L("Overview", "மேலோட்டம்")],
              ["finance", L("Finance", "நிதி")],
              ["activities", L("Activities", "செயல்பாடுகள்")],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                  activeTab === key ? "bg-green-600 text-white" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* OVERVIEW TAB */}
          {activeTab === "overview" && (
            <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
              {isCoconut ? (
                <>
                  <h2 className="text-sm font-semibold text-gray-800 mb-2">
                    🌴 {L("Coconut Tree Tracking", "தேங்காய் மர விவரம்")}
                  </h2>

                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-green-50 rounded-xl p-3 border border-white shadow-sm">
                      <p className="text-xs font-medium text-gray-700">🌴 {L("Total Trees", "மொத்த மரங்கள்")}</p>
                      <p className="text-2xl font-bold text-green-700">{totalTreesNum || 0}</p>
                    </div>
                    <div className="bg-amber-50 rounded-xl p-3 border border-white shadow-sm">
                      <p className="text-xs font-medium text-gray-700">🥥 {L("Small Trees", "சிறிய மரங்கள்")}</p>
                      <p className="text-2xl font-bold text-amber-700">{smallTreesNum || 0}</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-3 border border-white shadow-sm">
                      <p className="text-xs font-medium text-gray-700">🥥 {L("Large Trees", "பெரிய மரங்கள்")}</p>
                      <p className="text-2xl font-bold text-blue-700">{largeTreesNum || 0}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 mb-1">
                    <div>
                      <label className={labelCls}>{L("Total Trees", "மொத்த மரங்கள்")}</label>
                      <input type="number" value={totalTrees} onChange={(e) => setTotalTrees(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Small Trees", "சிறிய மரங்கள்")}</label>
                      <input type="number" value={smallTrees} onChange={(e) => setSmallTrees(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Large Trees", "பெரிய மரங்கள்")}</label>
                      <input type="number" value={largeTrees} onChange={(e) => setLargeTrees(e.target.value)} className={inputCls} />
                    </div>
                  </div>

                  {treesMismatch && (
                    <p className="text-xs text-red-600 font-medium mb-2">
                      {L(
                        "Small Trees + Large Trees must equal Total Trees",
                        "சிறிய மரங்கள் + பெரிய மரங்கள் மொத்த மரங்களுக்கு சமமாக இருக்க வேண்டும்"
                      )}
                    </p>
                  )}

                  <button
                    onClick={saveCoconutTrees}
                    disabled={savingTrees || treesMismatch}
                    className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                  >
                    {savingTrees ? "..." : L("Save", "சேமி")}
                  </button>
                </>
              ) : isTurmeric ? (
                <>
                  <h2 className="text-sm font-semibold text-gray-800 mb-2">
                    🟡 {L("Turmeric Cultivation Details", "மஞ்சள் பயிர் விவரங்கள்")}
                  </h2>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                    <div>
                      <label className={labelCls}>{L("Variety", "வகை")}</label>
                      <input type="text" value={turmericVariety} onChange={(e) => setTurmericVariety(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Planting Date", "நடவு தேதி")}</label>
                      <input type="date" value={turmericPlantingDate} onChange={(e) => setTurmericPlantingDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Seed Quantity (kg)", "விதை அளவு (கி.கி)")}</label>
                      <input type="number" step="0.01" value={turmericSeedQuantity} onChange={(e) => setTurmericSeedQuantity(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Expected Harvest Date", "எதிர்பார்க்கும் அறுவடை தேதி")}</label>
                      <input type="date" value={turmericExpectedHarvestDate} onChange={(e) => setTurmericExpectedHarvestDate(e.target.value)} className={inputCls} />
                    </div>
                    <div>
                      <label className={labelCls}>{L("Area Under Cultivation", "பயிரிடப்பட்ட பரப்பு")}</label>
                      <input type="text" disabled value={`${cultivation?.area ?? ""} ${L("Acres", "ஏக்கர்")}`} className={`${inputCls} bg-gray-100 text-gray-500`} />
                    </div>
                  </div>

                  <button
                    onClick={saveTurmericDetails}
                    disabled={savingTurmericDetails}
                    className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                  >
                    {savingTurmericDetails ? "..." : L("Save", "சேமி")}
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-600">
                  {L("Cultivation", "பயிர் தகவல்")}: {lang === "ta" ? crop.labelTa : crop.labelEn} ·{" "}
                  {cultivation?.area} {L("Acres", "ஏக்கர்")} · {cultivation?.status}
                </div>
              )}
            </div>
          )}

          {/* FINANCE TAB */}
          {activeTab === "finance" && (
            <div className="flex flex-col gap-3">

              {/* Income */}
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">💰 {L("Income", "வருமானம்")}</h2>

                {isCoconut ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-2">
                      <div>
                        <label className={labelCls}>{L("Harvest Date", "அறுவடை தேதி")}</label>
                        <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Small Coconuts", "சிறிய தேங்காய்")}</label>
                        <input type="number" placeholder={L("Count", "எண்ணிக்கை")} value={smallCount} onChange={(e) => setSmallCount(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Small Price/pc (₹)", "சிறிய விலை/து (₹)")}</label>
                        <input type="number" placeholder="₹" value={smallPrice} onChange={(e) => setSmallPrice(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Large Coconuts", "பெரிய தேங்காய்")}</label>
                        <input type="number" placeholder={L("Count", "எண்ணிக்கை")} value={largeCount} onChange={(e) => setLargeCount(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Large Price/pc (₹)", "பெரிய விலை/து (₹)")}</label>
                        <input type="number" placeholder="₹" value={largePrice} onChange={(e) => setLargePrice(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Buyer Name", "வாங்குபவர் பெயர்")}</label>
                        <input type="text" value={buyerName} onChange={(e) => setBuyerName(e.target.value)} className={inputCls} />
                      </div>
                    </div>

                    {totalCoconutCount > 0 && (
                      <div className="bg-gray-50 rounded-lg p-2 mb-2 text-xs font-mono text-gray-700 space-y-0.5">
                        <p>Small: {smallCountNum} nos × ₹{smallPriceNum} = ₹{smallRevenue.toFixed(2)}</p>
                        <p>Large: {largeCountNum} nos × ₹{largePriceNum} = ₹{largeRevenue.toFixed(2)}</p>
                        <p>{L("Dealer deduction", "டீலர் தள்ளுபடி")}: -{deductionCount} nos (≈ ₹{deductionValue.toFixed(2)})</p>
                        <div className="border-t border-gray-300 my-1" />
                        <p className="font-bold text-green-700">{L("Net Income", "நிகர வருமானம்")}: ₹{netRevenue.toFixed(2)}</p>
                      </div>
                    )}

                    <button
                      onClick={saveCoconutIncome}
                      disabled={savingIncome}
                      className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                    >
                      {savingIncome ? "..." : L("Save Income", "வருமானம் சேமி")}
                    </button>
                  </>
                ) : isTurmeric ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                      <div>
                        <label className={labelCls}>{L("Sale Date", "விற்பனை தேதி")}</label>
                        <input type="date" value={turmericSaleDate} onChange={(e) => setTurmericSaleDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Quantity Sold (kg)", "விற்ற அளவு (கி.கி)")}</label>
                        <input type="number" value={turmericQtySold} onChange={(e) => setTurmericQtySold(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Price/kg (₹)", "விலை/கி.கி (₹)")}</label>
                        <input type="number" value={turmericPricePerKg} onChange={(e) => setTurmericPricePerKg(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Buyer Name", "வாங்குபவர் பெயர்")}</label>
                        <input type="text" value={turmericSaleBuyer} onChange={(e) => setTurmericSaleBuyer(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                        <input type="text" value={turmericSaleNotes} onChange={(e) => setTurmericSaleNotes(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    {turmericSaleQtyNum > 0 && (
                      <p className="text-xs font-mono text-gray-700 mb-2">
                        {turmericSaleQtyNum}kg × ₹{turmericSalePriceNum} = ₹{turmericSaleTotal.toFixed(2)}
                      </p>
                    )}
                    <button
                      onClick={saveTurmericIncome}
                      disabled={savingTurmericSale}
                      className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                    >
                      {savingTurmericSale ? "..." : L("Save Income", "வருமானம் சேமி")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                      <div>
                        <label className={labelCls}>{L("Date", "தேதி")}</label>
                        <input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Category", "வகை")}</label>
                        <input type="text" value={incomeCategory} onChange={(e) => setIncomeCategory(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Amount (₹)", "தொகை (₹)")}</label>
                        <input type="number" value={incomeAmount} onChange={(e) => setIncomeAmount(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Buyer Name", "வாங்குபவர் பெயர்")}</label>
                        <input type="text" value={incomeBuyer} onChange={(e) => setIncomeBuyer(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                        <input type="text" value={incomeNotes} onChange={(e) => setIncomeNotes(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <button
                      onClick={saveIncome}
                      disabled={savingIncome}
                      className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                    >
                      {savingIncome ? "..." : L("Save Income", "வருமானம் சேமி")}
                    </button>
                  </>
                )}

                {isTurmeric && turmericTotalYield > 0 && (
                  <div className="mt-3 bg-gray-50 rounded-lg p-2 text-xs text-gray-700 space-y-0.5">
                    <p>{L("Total Yield", "மொத்த விளைச்சல்")}: {turmericTotalYield.toFixed(2)} kg</p>
                    <p>{L("Total Sold", "மொத்த விற்பனை")}: {turmericTotalSold.toFixed(2)} kg</p>
                    <p className="font-semibold text-green-700">{L("Remaining Stock", "மீதமுள்ள இருப்பு")}: {turmericRemainingStock.toFixed(2)} kg</p>
                  </div>
                )}

                {incomeRecords.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {incomeRecords.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 py-1">
                        <span>{r.income_date} {r.buyer_name ? `· ${r.buyer_name}` : ""}</span>
                        <span className="font-semibold text-green-700">{inr(Number(r.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Expenses */}
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">
                  💸 {isTurmeric ? L("Expense Breakdown by Stage", "செலவு பகுப்பு") : L("Expenses", "செலவுகள்")}
                </h2>

                {isTurmeric && (
                  <div className="text-xs text-gray-700 space-y-1">
                    {turmericExpenseBreakdown.map((row) => (
                      <div key={row.key} className="flex justify-between">
                        <span>{lang === "ta" ? row.titleTa : row.titleEn}</span>
                        <span className="font-medium">{inr(row.total)}</span>
                      </div>
                    ))}
                    <div className="border-t border-gray-200 my-1" />
                    <div className="flex justify-between font-bold text-gray-800">
                      <span>{L("Total Expenses", "மொத்த செலவு")}</span>
                      <span>{inr(totalExpenses)}</span>
                    </div>
                  </div>
                )}

                {!isTurmeric && isCoconut && (
                  <div className="bg-amber-50 rounded-lg p-2 mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1.5">🥥 {L("Coconut Harvesting Labour", "தேங்காய் அறுவடை கூலி")}</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-1">
                      <div>
                        <label className={labelCls}>{L("Date", "தேதி")}</label>
                        <input type="date" value={labourDate} onChange={(e) => setLabourDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Trees Harvested", "அறுவடை மரங்கள்")}</label>
                        <input type="number" value={treesHarvested} onChange={(e) => setTreesHarvested(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Price/Tree (₹)", "மர விலை (₹)")}</label>
                        <input type="number" placeholder="₹40" value={pricePerTree} onChange={(e) => setPricePerTree(e.target.value)} className={inputCls} />
                        <p className="text-[10px] text-gray-500 mt-0.5">{L("Current rate: ₹40/tree (update if changed)", "தற்போதைய விலை: ₹40/மரம்")}</p>
                      </div>
                    </div>
                    {treesHarvestedNum > 0 && pricePerTreeNum > 0 && (
                      <p className="text-xs font-mono text-gray-700 mb-1">
                        {treesHarvestedNum} trees × ₹{pricePerTreeNum} = ₹{labourTotal.toFixed(2)}
                      </p>
                    )}
                    <button
                      onClick={saveCoconutLabour}
                      disabled={savingLabour}
                      className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                    >
                      {savingLabour ? "..." : L("Save Labour Expense", "கூலி செலவு சேமி")}
                    </button>
                  </div>
                )}

                {!isTurmeric && (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                      <div>
                        <label className={labelCls}>{L("Date", "தேதி")}</label>
                        <input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Category", "வகை")}</label>
                        <select value={expenseCategory} onChange={(e) => setExpenseCategory(e.target.value)} className={inputCls}>
                          {EXPENSE_CATEGORIES.map((c) => (
                            <option className="text-gray-900" key={c.value} value={c.value}>
                              {lang === "ta" ? c.ta : c.en}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelCls}>{L("Description", "விவரம்")}</label>
                        <input type="text" value={expenseDescription} onChange={(e) => setExpenseDescription(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Vendor Name", "விற்பனையாளர் பெயர்")}</label>
                        <input type="text" value={expenseVendorName} onChange={(e) => setExpenseVendorName(e.target.value)} className={inputCls} />
                      </div>
                      <div>
                        <label className={labelCls}>{L("Amount (₹)", "தொகை (₹)")}</label>
                        <input type="number" value={expenseAmount} onChange={(e) => setExpenseAmount(e.target.value)} className={inputCls} />
                      </div>
                    </div>
                    <button
                      onClick={saveExpense}
                      disabled={savingExpense}
                      className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                    >
                      {savingExpense ? "..." : L("Save Expense", "செலவு சேமி")}
                    </button>

                    {expenseRecords.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                        {expenseRecords.map((r) => (
                          <div key={r.id} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 py-1">
                            <span>{r.expense_date} · {r.category} {r.vendor_name ? `· ${r.vendor_name}` : ""} {r.description ? `· ${r.description}` : ""}</span>
                            <span className="font-semibold text-red-600">{inr(Number(r.amount))}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Harvest */}
              {showHarvestSection && (
                <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                  <h2 className="text-sm font-semibold text-gray-800 mb-2">🌾 {L("Harvest", "அறுவடை")}</h2>

                  {isTurmeric ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                        <div>
                          <label className={labelCls}>{L("Harvest Date", "அறுவடை தேதி")}</label>
                          <input type="date" value={turmericHarvestDate} onChange={(e) => setTurmericHarvestDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("Raw Yield (kg)", "பச்சை விளைச்சல் (கி.கி)")}</label>
                          <input type="number" value={turmericRawYield} onChange={(e) => setTurmericRawYield(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("After Boiling (kg)", "வேகவைத்த பின் (கி.கி)")}</label>
                          <input type="number" value={turmericAfterBoiling} onChange={(e) => setTurmericAfterBoiling(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("After Drying (kg)", "உலர்த்திய பின் (கி.கி)")}</label>
                          <input type="number" value={turmericAfterDrying} onChange={(e) => setTurmericAfterDrying(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("After Polishing (kg)", "மெருகூட்டிய பின் (கி.கி)")}</label>
                          <input type="number" value={turmericAfterPolishing} onChange={(e) => setTurmericAfterPolishing(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                          <input type="text" value={turmericHarvestNotes} onChange={(e) => setTurmericHarvestNotes(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <button
                        onClick={saveTurmericHarvest}
                        disabled={savingTurmericHarvest}
                        className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                      >
                        {savingTurmericHarvest ? "..." : L("Save Harvest", "அறுவடை சேமி")}
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
                        <div>
                          <label className={labelCls}>{L("Harvest Date", "அறுவடை தேதி")}</label>
                          <input type="date" value={harvestRecordDate} onChange={(e) => setHarvestRecordDate(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("Yield Quantity", "அளவு")}</label>
                          <input type="number" value={yieldQuantity} onChange={(e) => setYieldQuantity(e.target.value)} className={inputCls} />
                        </div>
                        <div>
                          <label className={labelCls}>{L("Unit", "அளவீடு")}</label>
                          <select value={yieldUnit} onChange={(e) => setYieldUnit(e.target.value)} className={inputCls}>
                            {YIELD_UNITS.map((u) => (
                              <option className="text-gray-900" key={u} value={u}>{u}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                          <input type="text" value={harvestNotes} onChange={(e) => setHarvestNotes(e.target.value)} className={inputCls} />
                        </div>
                      </div>
                      <button
                        onClick={saveHarvest}
                        disabled={savingHarvest}
                        className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                      >
                        {savingHarvest ? "..." : L("Save Harvest", "அறுவடை சேமி")}
                      </button>
                    </>
                  )}

                  {harvestRecords.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                      {harvestRecords.map((r) => (
                        <div key={r.id} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 py-1">
                          <span>{r.harvest_date} {r.notes ? `· ${r.notes}` : ""}</span>
                          <span className="font-semibold text-gray-800">{r.yield_quantity} {r.yield_unit}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                <div className="flex justify-between text-sm text-gray-700 font-medium mb-1">
                  <span>💰 {L("Total Income", "மொத்த வருமானம்")}</span>
                  <span>{inr(totalIncome)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-700 font-medium mb-1">
                  <span>💸 {L("Total Expenses", "மொத்த செலவு")}</span>
                  <span>{inr(totalExpenses)}</span>
                </div>
                <div className="border-t border-gray-200 my-1" />
                <div className={`flex justify-between text-sm font-bold ${netProfit >= 0 ? "text-green-700" : "text-red-600"}`}>
                  <span>{netProfit >= 0 ? `📈 ${L("Net Profit", "நிகர லாபம்")}` : `📉 ${L("Net Loss", "நிகர நஷ்டம்")}`}</span>
                  <span>{inr(Math.abs(netProfit))}</span>
                </div>
              </div>
            </div>
          )}

          {/* ACTIVITIES TAB */}
          {activeTab === "activities" && (
            <div className="flex flex-col gap-3">

              {isTurmeric && (
                <>
                  <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                    <h2 className="text-sm font-semibold text-gray-800 mb-2">
                      🟢 {L("Common Activities", "பொதுவான செயல்பாடுகள்")}
                    </h2>
                    {TURMERIC_SUBSECTIONS.filter((s) => COMMON_ACTIVITY_KEYS.includes(s.key)).map(renderSubsection)}
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                    <h2 className="text-sm font-semibold text-gray-800 mb-2">
                      🟡 {L("Turmeric Specific Activities", "மஞ்சள் சிறப்பு செயல்பாடுகள்")}
                    </h2>
                    {TURMERIC_SUBSECTIONS.filter((s) => TURMERIC_ACTIVITY_KEYS.includes(s.key)).map(renderSubsection)}
                  </div>
                </>
              )}

              {!isTurmeric && (
                <>
              {/* Fertilizer */}
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">🌱 {L("Fertilizer", "உரம்")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-8 gap-2 mb-2">
                  <div>
                    <label className={labelCls}>{L("Date", "தேதி")}</label>
                    <input type="date" value={fertDate} onChange={(e) => setFertDate(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Fertilizer Name", "உரம் பெயர்")}</label>
                    <input type="text" value={fertName} onChange={(e) => setFertName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Qty", "அளவு")}</label>
                    <input type="number" value={fertQty} onChange={(e) => setFertQty(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Unit", "அளவீடு")}</label>
                    <select value={fertUnit} onChange={(e) => setFertUnit(e.target.value)} className={inputCls}>
                      {["kg", "litre", "bags"].map((u) => (
                        <option className="text-gray-900" key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>{L("Month", "மாதம்")}</label>
                    <input type="number" min="1" value={fertMonth} onChange={(e) => setFertMonth(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Stage", "வளர்ச்சி நிலை")}</label>
                    <input type="text" placeholder={L("e.g. flowering", "எ.கா. பூக்கும்")} value={fertStage} onChange={(e) => setFertStage(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Cost (₹)", "செலவு (₹)")}</label>
                    <input type="number" value={fertCost} onChange={(e) => setFertCost(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                    <input type="text" value={fertNotes} onChange={(e) => setFertNotes(e.target.value)} className={inputCls} />
                  </div>
                </div>
                <button
                  onClick={saveFertilizer}
                  disabled={savingFert}
                  className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                >
                  {savingFert ? "..." : L("Add", "சேர்")}
                </button>

                {fertilizerRecords.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {fertilizerRecords.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 py-1">
                        <span>
                          {r.application_date} · {r.fertilizer_name} · {r.quantity}{r.unit} · M{r.crop_month} · {r.growth_stage}
                        </span>
                        <span className="font-semibold text-gray-800">{inr(Number(r.cost))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Weed Removal */}
              <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
                <h2 className="text-sm font-semibold text-gray-800 mb-2">🌿 {L("Weed Removal", "புல் அகற்றுதல்")}</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
                  <div>
                    <label className={labelCls}>{L("Start Date", "தொடக்க தேதி")}</label>
                    <input type="date" value={weedStart} onChange={(e) => setWeedStart(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("End Date", "முடிவு தேதி")}</label>
                    <input type="date" value={weedEnd} onChange={(e) => setWeedEnd(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Workers/Day", "தொழிலாளர்/நாள்")}</label>
                    <input type="number" value={weedWorkers} onChange={(e) => setWeedWorkers(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Cost/Day (₹)", "செலவு/நாள் (₹)")}</label>
                    <input type="number" value={weedCostPerDay} onChange={(e) => setWeedCostPerDay(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                    <input type="text" value={weedNotes} onChange={(e) => setWeedNotes(e.target.value)} className={inputCls} />
                  </div>
                </div>

                {weedDays > 0 && (
                  <p className="text-xs font-mono text-gray-700 mb-2">
                    {L("Total days", "மொத்த நாட்கள்")}: {weedDays} · {weedDays} {L("days", "நாட்கள்")} × {weedWorkersNum} {L("workers", "தொழிலாளர்")} × ₹{weedCostPerDayNum} = ₹{weedTotalCost.toFixed(2)}
                  </p>
                )}

                <button
                  onClick={saveWeedRemoval}
                  disabled={savingWeed}
                  className="bg-green-700 hover:bg-green-800 disabled:bg-green-400 text-white rounded-lg px-4 py-1.5 text-xs font-semibold transition shadow-sm"
                >
                  {savingWeed ? "..." : L("Add", "சேர்")}
                </button>

                {weedRecords.length > 0 && (
                  <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                    {weedRecords.map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-gray-700 border-b border-gray-100 py-1">
                        <span>{r.start_date} → {r.end_date} · {r.total_days}d · {r.workers_per_day}w × ₹{r.cost_per_day}</span>
                        <span className="font-semibold text-gray-800">{inr(Number(r.total_cost))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
}
