"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import { supabase } from "../../../../lib/supabase";
import { t } from "../../../../lib/labels";
import { useLang } from "../../../../lib/useLang";

type AnimalType = "cow" | "buffalo";

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
  animal_type: AnimalType | null;
};

const STATUS_BADGE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  sold: "bg-blue-100 text-blue-700",
  deceased: "bg-gray-200 text-gray-600",
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};

const inputCls =
  "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-1 text-xs font-medium text-gray-700";

export default function CowDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lang, setLang] = useLang();
  const [cow, setCow] = useState<Cow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchCow();
  }, [id]);

  const fetchCow = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("cows").select("*").eq("id", id).single();
    if (!error && data) setCow(data);
    setLoading(false);
  };

  const isBuffalo = cow?.animal_type === "buffalo";
  const emoji = isBuffalo ? "🐃" : "🐄";

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
      toast.error(t(lang, "nameGenderRequired"));
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
        toast.error(t(lang, "saveFailedMessage"));
      } else {
        setEditingOverview(false);
        fetchCow();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingOverview(false);
  };

  const handleDeleteAnimal = async () => {
    if (!window.confirm(t(lang, "deleteConfirmAnimal"))) return;

    const { error } = await supabase.from("cows").delete().eq("id", id);

    if (error) {
      toast.error(t(lang, "couldNotDelete"));
    } else {
      toast.success(t(lang, "deletedSuccessfully"));
      router.push("/livestock/cows");
    }
  };

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
        <div className="max-w-3xl mx-auto flex flex-col gap-3">

          <Link href="/livestock/cows" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToCows")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-primary">{emoji} {cow?.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`${STATUS_BADGE[cow?.current_status ?? "active"]} text-xs font-semibold px-2 py-1 rounded-full`}>
                {cow?.current_status}
              </span>
              <button
                onClick={() => setLang(lang === "ta" ? "en" : "ta")}
                className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
              >
                {lang === "ta" ? "English" : "தமிழ்"}
              </button>
            </div>
          </div>

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
                <div><span className="text-gray-500">{t(lang, "animalType")}:</span> <span className="font-medium text-gray-800">{emoji} {isBuffalo ? t(lang, "buffalo") : t(lang, "cow")}</span></div>
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
                <div className="sm:col-span-2 pt-3 border-t border-gray-100">
                  <button
                    onClick={handleDeleteAnimal}
                    className="bg-red-50 hover:bg-red-100 text-red-600 rounded-lg px-4 py-2 text-sm font-semibold transition"
                  >
                    🗑️ {t(lang, "deleteAnimal")}
                  </button>
                </div>
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
        </div>
      </main>
    </div>
  );
}
