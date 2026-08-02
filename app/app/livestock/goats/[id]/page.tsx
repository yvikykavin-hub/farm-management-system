"use client";

import toast from "react-hot-toast";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Sidebar from "../../../../components/Sidebar";
import DeleteConfirmDialog from "../../../../components/DeleteConfirmDialog";
import { useDeleteConfirm } from "../../../../hooks/useDeleteConfirm";
import { supabase } from "../../../../lib/supabase";
import { t } from "../../../../lib/labels";
import { useLang } from "../../../../lib/useLang";

type Goat = {
  id: string;
  name: string;
  tag_number: string | null;
  breed: string | null;
  gender: string | null;
  date_of_birth: string | null;
  purchase_date: string | null;
  purchase_price: number | null;
  weight_kg: number | null;
  current_status: string;
  sold_date: string | null;
  sold_price: number | null;
  notes: string | null;
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

export default function GoatDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lang, setLang] = useLang();
  const [goat, setGoat] = useState<Goat | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchGoat();
  }, [id]);

  const fetchGoat = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("goats").select("*").eq("id", id).single();
    if (!error && data) setGoat(data);
    setLoading(false);
  };

  // ---------------- Overview ----------------
  const [editingOverview, setEditingOverview] = useState(false);
  const [ovForm, setOvForm] = useState<Record<string, string>>({});
  const [savingOverview, setSavingOverview] = useState(false);
  const { isOpen: deleteOpen, confirmDelete, handleConfirm: handleDeleteConfirm, handleCancel: handleDeleteCancel } = useDeleteConfirm();

  const startEditOverview = () => {
    if (!goat) return;
    setOvForm({
      name: goat.name,
      tag_number: goat.tag_number ?? "",
      breed: goat.breed ?? "",
      gender: goat.gender ?? "",
      date_of_birth: goat.date_of_birth ?? "",
      purchase_date: goat.purchase_date ?? "",
      purchase_price: goat.purchase_price != null ? String(goat.purchase_price) : "",
      weight_kg: goat.weight_kg != null ? String(goat.weight_kg) : "",
      current_status: goat.current_status,
      sold_date: goat.sold_date ?? "",
      sold_price: goat.sold_price != null ? String(goat.sold_price) : "",
      notes: goat.notes ?? "",
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
        .from("goats")
        .update({
          name: ovForm.name.trim(),
          tag_number: ovForm.tag_number.trim() || null,
          breed: ovForm.breed.trim() || null,
          gender: ovForm.gender,
          date_of_birth: ovForm.date_of_birth || null,
          purchase_date: ovForm.purchase_date || null,
          purchase_price: ovForm.purchase_price ? parseFloat(ovForm.purchase_price) : null,
          weight_kg: ovForm.weight_kg ? parseFloat(ovForm.weight_kg) : null,
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
        fetchGoat();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      toast.error(t(lang, "saveFailedMessage"));
    }
    setSavingOverview(false);
  };

  const handleDeleteAnimal = () => {
    confirmDelete(async () => {
    const { error } = await supabase.from("goats").delete().eq("id", id);

    if (error) {
      toast.error(t(lang, "couldNotDelete"));
    } else {
      toast.success(t(lang, "deletedSuccessfully"));
      router.push("/livestock/goats");
    }
    });
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

          <Link href="/livestock/goats" className="text-primary hover:text-primary text-sm font-semibold">
            ← {t(lang, "backToGoats")}
          </Link>

          <div className="flex items-center justify-between flex-wrap gap-2">
            <h1 className="text-xl font-bold text-primary">🐐 {goat?.name}</h1>
            <div className="flex items-center gap-2">
              <span className={`${STATUS_BADGE[goat?.current_status ?? "active"]} text-xs font-semibold px-2 py-1 rounded-full`}>
                {goat?.current_status}
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
                <div><span className="text-gray-500">{t(lang, "tagNumber")}:</span> <span className="font-medium text-gray-800">{goat?.tag_number || "—"}</span></div>
                <div><span className="text-gray-500">{t(lang, "breed")}:</span> <span className="font-medium text-gray-800">{goat?.breed || "—"}</span></div>
                <div><span className="text-gray-500">{t(lang, "gender")}:</span> <span className="font-medium text-gray-800">{goat?.gender || "—"}</span></div>
                <div><span className="text-gray-500">{t(lang, "dateOfBirth")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.date_of_birth)}</span></div>
                <div><span className="text-gray-500">{t(lang, "weight")}:</span> <span className="font-medium text-gray-800">{goat?.weight_kg != null ? `${goat.weight_kg} kg` : "—"}</span></div>
                <div><span className="text-gray-500">{t(lang, "purchaseDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.purchase_date)}</span></div>
                <div><span className="text-gray-500">{t(lang, "purchasePrice")}:</span> <span className="font-medium text-gray-800">{goat?.purchase_price != null ? inr(Number(goat.purchase_price)) : "—"}</span></div>
                {goat?.current_status === "sold" && (
                  <>
                    <div><span className="text-gray-500">{t(lang, "soldDate")}:</span> <span className="font-medium text-gray-800">{formatDMY(goat?.sold_date)}</span></div>
                    <div><span className="text-gray-500">{t(lang, "soldPrice")}:</span> <span className="font-medium text-gray-800">{goat?.sold_price != null ? inr(Number(goat.sold_price)) : "—"}</span></div>
                  </>
                )}
                <div className="sm:col-span-2"><span className="text-gray-500">{t(lang, "notes")}:</span> <span className="font-medium text-gray-800">{goat?.notes || "—"}</span></div>
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
                  <label className={labelCls}>{t(lang, "weight")}</label>
                  <input type="number" value={ovForm.weight_kg} onChange={(e) => setOvForm({ ...ovForm, weight_kg: e.target.value })} className={inputCls} />
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
      <DeleteConfirmDialog isOpen={deleteOpen} onConfirm={handleDeleteConfirm} onCancel={handleDeleteCancel} language={lang} />
    </div>
  );
}
