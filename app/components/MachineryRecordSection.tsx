"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type MachineryField = {
  key: string;
  en: string;
  ta: string;
  type: "date" | "text" | "number" | "textarea";
  required?: boolean;
  isCost?: boolean;
  placeholderEn?: string;
  placeholderTa?: string;
};

type Props = {
  lang: "ta" | "en";
  table: string;
  titleEn: string;
  titleTa: string;
  icon: string;
  dateField: string;
  fields: MachineryField[]; // all columns in display/input order, excluding notes
  hasNotes?: boolean;
  showLastDate?: boolean;
  onChanged?: () => void;
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

export default function MachineryRecordSection({
  lang,
  table,
  titleEn,
  titleTa,
  icon,
  dateField,
  fields,
  hasNotes = true,
  showLastDate = false,
  onChanged,
}: Props) {
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [records, setRecords] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const costField = fields.find((f) => f.isCost)?.key;

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select("*").order(dateField, { ascending: false });
    if (data) setRecords(data);
    setLoading(false);
  };

  const totalSpent = costField ? records.reduce((s, r) => s + Number(r[costField] ?? 0), 0) : 0;

  const openAdd = () => {
    setEditingId(null);
    setFormValues({});
    setNotes("");
    setModalOpen(true);
  };

  const openEdit = (r: Record<string, unknown>) => {
    setEditingId(String(r.id));
    const vals: Record<string, string> = {};
    fields.forEach((f) => {
      const v = r[f.key];
      vals[f.key] = v != null ? String(v) : "";
    });
    setFormValues(vals);
    setNotes(r.notes != null ? String(r.notes) : "");
    setModalOpen(true);
  };

  const save = async () => {
    const missing = fields.some((f) => f.required && !formValues[f.key]);
    if (missing) {
      alert(L("Please fill all required fields.", "தேவையான அனைத்து புலங்களையும் நிரப்பவும்."));
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};
      fields.forEach((f) => {
        const raw = formValues[f.key] ?? "";
        if (f.type === "number") {
          payload[f.key] = raw ? parseFloat(raw) : null;
        } else {
          payload[f.key] = raw.trim() ? raw.trim() : null;
        }
      });
      if (hasNotes) payload.notes = notes.trim() || null;

      const { error } = editingId
        ? await supabase.from(table).update(payload).eq("id", editingId)
        : await supabase.from(table).insert(payload);

      if (error) {
        console.error(`Error saving ${table}:`, error);
        alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
      } else {
        setModalOpen(false);
        fetchRecords();
        onChanged?.();
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      alert(L("Could not save. Please try again.", "சேமிக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if (!confirm(L("Delete this record?", "இந்த பதிவை நீக்கவா?"))) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) {
      console.error(`Error deleting ${table}:`, error);
      alert(L("Could not delete. Please try again.", "நீக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."));
    } else {
      fetchRecords();
      onChanged?.();
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{icon} {L(titleEn, titleTa)}</h2>
        <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
          + {L("Add", "சேர்க்க")}
        </button>
      </div>

      {showLastDate && (
        <p className="text-xs text-gray-600 mb-2">
          {L("Last replaced", "கடைசியாக மாற்றப்பட்டது")}: <span className="font-semibold text-gray-900">{formatDMY(records[0]?.[dateField] as string | undefined)}</span>
        </p>
      )}

      <p className="text-xs text-gray-500 mb-2">
        {L("Total Spent", "மொத்த செலவு")}: <span className="font-semibold text-danger">{inr(totalSpent)}</span>
      </p>

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-gray-500 uppercase text-[10px] tracking-wide border-b">
                {fields.map((f) => (
                  <th key={f.key} className="py-1 px-1">{L(f.en, f.ta)}</th>
                ))}
                {hasNotes && <th className="py-1 px-1">{L("Notes", "குறிப்பு")}</th>}
                <th className="py-1 px-1"></th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={fields.length + (hasNotes ? 2 : 1)} className="text-center py-6 text-gray-500">
                    🔧 {L("No records yet", "பதிவுகள் இல்லை")}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={String(r.id)} className="border-b border-gray-50">
                    {fields.map((f) => {
                      const v = r[f.key];
                      const display =
                        f.type === "date"
                          ? formatDMY(v as string | undefined)
                          : f.isCost
                          ? inr(Number(v ?? 0))
                          : (v != null && v !== "" ? String(v) : "—");
                      return (
                        <td key={f.key} className={`py-1 px-1 text-gray-900 ${f.isCost ? "text-danger font-medium" : ""}`}>
                          {display}
                        </td>
                      );
                    })}
                    {hasNotes && <td className="py-1 px-1 text-gray-600">{(r.notes as string) || "—"}</td>}
                    <td className="py-1 px-1 whitespace-nowrap">
                      <button onClick={() => openEdit(r)} className="mr-2 hover:text-primary">✏️</button>
                      <button onClick={() => remove(String(r.id))} className="hover:text-danger">🗑️</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 sm:p-0">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-primary">
                {editingId ? L("Edit", "திருத்து") : L("Add", "சேர்க்க")} {L(titleEn, titleTa)}
              </h2>
              <button onClick={() => setModalOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="space-y-3">
              {fields.map((f) => (
                <div key={f.key}>
                  <label className={labelCls}>
                    {L(f.en, f.ta)} {f.required && "*"}
                  </label>
                  {f.type === "textarea" ? (
                    <textarea
                      value={formValues[f.key] ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                      className={inputCls}
                      rows={2}
                      placeholder={f.placeholderEn ? L(f.placeholderEn, f.placeholderTa ?? "") : undefined}
                    />
                  ) : (
                    <input
                      type={f.type}
                      value={formValues[f.key] ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                      className={inputCls}
                      placeholder={f.placeholderEn ? L(f.placeholderEn, f.placeholderTa ?? "") : undefined}
                    />
                  )}
                </div>
              ))}
              {hasNotes && (
                <div>
                  <label className={labelCls}>{L("Notes", "குறிப்பு")}</label>
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={inputCls} rows={2} />
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={save} disabled={saving} className="flex-1 bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2 text-sm font-semibold transition">
                  {saving ? "..." : L("Save", "சேமி")}
                </button>
                <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg py-2 text-sm font-semibold transition">
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
