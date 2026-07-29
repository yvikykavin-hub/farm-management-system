"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { useLang } from "../lib/useLang";

type Farm = { id: string; name: string };
type Cultivation = { id: string; crop_type: string; farm_id: string };

const HIDDEN_PATHS = ["/login", "/forgot-password", "/reset-password", "/privacy-policy"];

export default function QuickActions({
  language,
}: {
  language?: string;
}) {
  const pathname = usePathname();
  const [storedLang] = useLang();
  const language_ = language ?? storedLang;
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [cultivations, setCultivations] = useState<Cultivation[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [selectedFarm, setSelectedFarm] = useState("");
  const [selectedCrop, setSelectedCrop] = useState("");
  const [amount, setAmount] = useState("");
  const [expenseType, setExpenseType] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [morningMilk, setMorningMilk] = useState("");
  const [eveningMilk, setEveningMilk] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: farmsData }, { data: cultsData }] = await Promise.all([
        supabase.from("farms").select("id, name"),
        supabase.from("cultivations").select("id, crop_type, farm_id").is("end_date", null),
      ]);
      if (farmsData) setFarms(farmsData);
      if (cultsData) setCultivations(cultsData);
    };
    fetchData();
  }, []);

  const filteredCrops = cultivations.filter((c) => c.farm_id === selectedFarm);

  const resetForm = () => {
    setSelectedFarm("");
    setSelectedCrop("");
    setAmount("");
    setExpenseType("");
    setMorningMilk("");
    setEveningMilk("");
    setNotes("");
    setDate(new Date().toISOString().split("T")[0]);
    setActiveForm(null);
  };

  const handleSaveExpense = async () => {
    if (!selectedCrop || !amount || !expenseType) {
      toast.error(language_ === "ta" ? "அனைத்து தகவல்களையும் நிரப்பவும்" : "Please fill all required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("expense_records").insert({
      cultivation_id: selectedCrop,
      farm_id: selectedFarm,
      category: expenseType,
      amount: parseFloat(amount),
      expense_date: date,
      notes: notes || null,
    });
    if (error) {
      toast.error(language_ === "ta" ? "சேமிக்க முடியவில்லை" : "Could not save");
    } else {
      toast.success(language_ === "ta" ? "✅ செலவு சேமிக்கப்பட்டது!" : "✅ Expense saved!");
      resetForm();
      setIsOpen(false);
    }
    setLoading(false);
  };

  const handleSaveIncome = async () => {
    if (!selectedCrop || !amount) {
      toast.error(language_ === "ta" ? "அனைத்து தகவல்களையும் நிரப்பவும்" : "Please fill all required fields");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("income_records").insert({
      cultivation_id: selectedCrop,
      farm_id: selectedFarm,
      amount: parseFloat(amount),
      income_date: date,
      notes: notes || null,
    });
    if (error) {
      toast.error(language_ === "ta" ? "சேமிக்க முடியவில்லை" : "Could not save");
    } else {
      toast.success(language_ === "ta" ? "✅ வருமானம் சேமிக்கப்பட்டது!" : "✅ Income saved!");
      resetForm();
      setIsOpen(false);
    }
    setLoading(false);
  };

  const handleSaveMilk = async () => {
    if (!morningMilk && !eveningMilk) {
      toast.error(language_ === "ta" ? "பால் அளவை உள்ளிடவும்" : "Enter milk quantity");
      return;
    }
    setLoading(true);

    const { data: rateData } = await supabase
      .from("milk_rates")
      .select("rate_per_litre")
      .order("effective_from", { ascending: false })
      .limit(1)
      .single();

    const rate = rateData?.rate_per_litre || 0;

    const { error } = await supabase.from("milk_collections").insert({
      collection_date: date,
      morning_litres: parseFloat(morningMilk) || 0,
      evening_litres: parseFloat(eveningMilk) || 0,
      rate_per_litre: rate,
      farm_location: "Home",
    });
    if (error) {
      toast.error(language_ === "ta" ? "பால் சேமிக்க முடியவில்லை" : "Could not save milk");
    } else {
      toast.success(language_ === "ta" ? "✅ பால் சேமிக்கப்பட்டது!" : "✅ Milk saved!");
      resetForm();
      setIsOpen(false);
    }
    setLoading(false);
  };

  const actions = [
    { icon: "📤", key: "expense", label: language_ === "ta" ? "செலவு சேர்" : "Add Expense" },
    { icon: "💰", key: "income", label: language_ === "ta" ? "வருமானம் சேர்" : "Add Income" },
    { icon: "🥛", key: "milk", label: language_ === "ta" ? "பால் சேர்" : "Add Milk" },
  ];

  if (HIDDEN_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <>
      {(isOpen || activeForm) && (
        <div
          onClick={() => {
            setIsOpen(false);
            resetForm();
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
        />
      )}

      {activeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {activeForm === "expense" && (language_ === "ta" ? "📤 செலவு சேர்" : "📤 Add Expense")}
                {activeForm === "income" && (language_ === "ta" ? "💰 வருமானம் சேர்" : "💰 Add Income")}
                {activeForm === "milk" && (language_ === "ta" ? "🥛 பால் சேர்" : "🥛 Add Milk")}
              </h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">
                ×
              </button>
            </div>

            {activeForm === "expense" && (
              <div>
                <FarmCropSelector language={language_} farms={farms} filteredCrops={filteredCrops} selectedFarm={selectedFarm} setSelectedFarm={setSelectedFarm} selectedCrop={selectedCrop} setSelectedCrop={setSelectedCrop} />
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "செலவு வகை" : "Expense Type"} *
                  </label>
                  <select
                    value={expenseType}
                    onChange={(e) => setExpenseType(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">Select type</option>
                    <option value="seeds">Seeds</option>
                    <option value="fertilizer">Fertilizer</option>
                    <option value="labour">Labour</option>
                    <option value="transport">Transport</option>
                    <option value="miscellaneous">Miscellaneous</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "தொகை (₹)" : "Amount (₹)"} *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "தேதி" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={resetForm} className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                    {language_ === "ta" ? "ரத்து" : "Cancel"}
                  </button>
                  <button
                    onClick={handleSaveExpense}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? "..." : language_ === "ta" ? "சேமி" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {activeForm === "income" && (
              <div>
                <FarmCropSelector language={language_} farms={farms} filteredCrops={filteredCrops} selectedFarm={selectedFarm} setSelectedFarm={setSelectedFarm} selectedCrop={selectedCrop} setSelectedCrop={setSelectedCrop} />
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "தொகை (₹)" : "Amount (₹)"} *
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "தேதி" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "குறிப்பு" : "Notes"}
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language_ === "ta" ? "விருப்பமான குறிப்பு" : "Optional notes"}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={resetForm} className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                    {language_ === "ta" ? "ரத்து" : "Cancel"}
                  </button>
                  <button
                    onClick={handleSaveIncome}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? "..." : language_ === "ta" ? "சேமி" : "Save"}
                  </button>
                </div>
              </div>
            )}

            {activeForm === "milk" && (
              <div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "காலை பால் (லிட்டர்)" : "Morning Milk (litres)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={morningMilk}
                    onChange={(e) => setMorningMilk(e.target.value)}
                    placeholder="0.0"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-3">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "மாலை பால் (லிட்டர்)" : "Evening Milk (litres)"}
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={eveningMilk}
                    onChange={(e) => setEveningMilk(e.target.value)}
                    placeholder="0.0"
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="mb-4">
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                    {language_ === "ta" ? "தேதி" : "Date"}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={resetForm} className="flex-1 px-4 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-sm font-medium">
                    {language_ === "ta" ? "ரத்து" : "Cancel"}
                  </button>
                  <button
                    onClick={handleSaveMilk}
                    disabled={loading}
                    className="flex-1 px-4 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? "..." : language_ === "ta" ? "சேமி" : "Save"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="fixed bottom-6 left-6 z-40">
        {isOpen && (
          <div className="flex flex-col-reverse gap-2 mb-2">
            {actions.map((action, i) => (
              <button
                key={action.key}
                onClick={() => {
                  setActiveForm(action.key);
                  setIsOpen(false);
                }}
                className="flex items-center gap-2 bg-white dark:bg-slate-800 shadow-lg rounded-xl px-3 py-2.5 border border-gray-100 dark:border-slate-700 hover:bg-green-50 dark:hover:bg-slate-700 transition-all duration-200 whitespace-nowrap"
                style={{
                  animation: `slideUp 0.2s ease forwards`,
                  animationDelay: `${i * 60}ms`,
                  opacity: 0,
                }}
              >
                <span className="text-lg">{action.icon}</span>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{action.label}</span>
              </button>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center text-white text-2xl font-light transition-all duration-300 ${
            isOpen ? "bg-red-500 hover:bg-red-600 rotate-45" : "bg-[#2D6A4F] hover:bg-[#1B4332]"
          }`}
        >
          +
        </button>
      </div>

      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
}

function FarmCropSelector({
  language,
  farms,
  filteredCrops,
  selectedFarm,
  setSelectedFarm,
  selectedCrop,
  setSelectedCrop,
}: {
  language: string;
  farms: Farm[];
  filteredCrops: Cultivation[];
  selectedFarm: string;
  setSelectedFarm: (value: string) => void;
  selectedCrop: string;
  setSelectedCrop: (value: string) => void;
}) {
  return (
    <>
      <div className="mb-3">
        <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
          {language === "ta" ? "பண்ணை" : "Farm"} *
        </label>
        <select
          value={selectedFarm}
          onChange={(e) => {
            setSelectedFarm(e.target.value);
            setSelectedCrop("");
          }}
          className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">{language === "ta" ? "பண்ணை தேர்வு செய்க" : "Select Farm"}</option>
          {farms.map((farm) => (
            <option key={farm.id} value={farm.id}>
              {farm.name}
            </option>
          ))}
        </select>
      </div>

      {selectedFarm && (
        <div className="mb-3">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
            {language === "ta" ? "பயிர்" : "Crop"} *
          </label>
          <select
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">{language === "ta" ? "பயிர் தேர்வு செய்க" : "Select Crop"}</option>
            {filteredCrops.map((crop) => (
              <option key={crop.id} value={crop.id}>
                {crop.crop_type}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
