"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export type CropFieldOption = { value: string; en: string; ta: string };

export type CropField = {
  key: string;
  en: string;
  ta: string;
  type: "date" | "text" | "number" | "textarea" | "select";
  required?: boolean;
  isCost?: boolean;
  mustBePositive?: boolean;
  numericOnly?: boolean;
  isDedupKey?: boolean;
  options?: CropFieldOption[];
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
  cultivationId: string;
  fields: CropField[]; // all columns in display/input order, excluding notes
  hasNotes?: boolean;
  onChanged?: () => void;
};

const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const formatDMY = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const todayISO = () => new Date().toISOString().slice(0, 10);

const inputCls =
  "w-full border border-gray-300 rounded-lg px-2 py-1.5 text-xs bg-white text-gray-900 placeholder:text-xs placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary";
const labelCls = "block mb-0.5 text-xs font-medium text-gray-600";

export default function CropRecordSection({
  lang,
  table,
  titleEn,
  titleTa,
  icon,
  dateField,
  cultivationId,
  fields,
  hasNotes = true,
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
  const dedupFields = fields.filter((f) => f.isDedupKey).map((f) => f.key);

  useEffect(() => {
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, cultivationId]);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase.from(table).select("*").eq("cultivation_id", cultivationId).order(dateField, { ascending: false });
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

  const validate = (): string | null => {
    for (const f of fields) {
      const raw = (formValues[f.key] ?? "").trim();
      if (f.required && !raw) {
        return L("Please fill all required fields.", "தேவையான அனைத்து புலங்களையும் நிரப்பவும்.");
      }
      if (f.type === "date" && raw && raw > todayISO()) {
        return L("Date cannot be in the future.", "தேதி எதிர்காலத்தில் இருக்கக்கூடாது.");
      }
      if ((f.isCost || f.mustBePositive) && raw && parseFloat(raw) <= 0) {
        return L("Amount/quantity must be a positive number.", "தொகை/அளவு நேர்மறை எண்ணாக இருக்க வேண்டும்.");
      }
      if (f.numericOnly && raw && !/^\d+$/.test(raw)) {
        return L("This field must contain numbers only.", "இந்த புலத்தில் எண்கள் மட்டும் இருக்க வேண்டும்.");
      }
    }
    return null;
  };

  const save = async () => {
    const validationError = validate();
    if (validationError) {
      alert(validationError);
      return;
    }

    if (!editingId && dedupFields.length >= 0) {
      const dateVal = formValues[dateField];
      const isDuplicate = records.some((r) => {
        const sameDate = String(r[dateField] ?? "") === dateVal;
        const sameDedup = dedupFields.every((k) => String(r[k] ?? "") === (formValues[k] ?? ""));
        return sameDate && sameDedup;
      });
      if (isDuplicate) {
        const proceed = confirm(L("A record for this date already exists. Save anyway?", "இந்த தேதிக்கான பதிவு ஏற்கனவே உள்ளது. இருந்தும் சேமிக்கவா?"));
        if (!proceed) return;
      }
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { cultivation_id: cultivationId };
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

  const displayValue = (f: CropField, v: unknown) => {
    if (f.type === "date") return formatDMY(v as string | undefined);
    if (f.isCost) return inr(Number(v ?? 0));
    if (f.type === "select" && f.options) {
      const opt = f.options.find((o) => o.value === v);
      return opt ? L(opt.en, opt.ta) : (v != null && v !== "" ? String(v) : "—");
    }
    return v != null && v !== "" ? String(v) : "—";
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-green-100 p-3">
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-gray-800">{icon} {L(titleEn, titleTa)}</h2>
        <button onClick={openAdd} className="bg-primary hover:bg-primary/90 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition">
          + {L("Add", "சேர்க்க")}
        </button>
      </div>

      {costField && (
        <p className="text-xs text-gray-500 mb-2">
          {L("Total", "மொத்தம்")}: <span className="font-semibold text-danger">{inr(totalSpent)}</span>
        </p>
      )}

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
                    🌾 {L("No rice records found", "நெல் பதிவுகள் இல்லை")}
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={String(r.id)} className="border-b border-gray-50">
                    {fields.map((f) => (
                      <td key={f.key} className={`py-1 px-1 text-gray-900 ${f.isCost ? "text-danger font-medium" : ""}`}>
                        {displayValue(f, r[f.key])}
                      </td>
                    ))}
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
                  ) : f.type === "select" ? (
                    <select
                      value={formValues[f.key] ?? ""}
                      onChange={(e) => setFormValues({ ...formValues, [f.key]: e.target.value })}
                      className={inputCls}
                    >
                      <option value="">{L("Select", "தேர்வு செய்க")}</option>
                      {f.options?.map((o) => (
                        <option key={o.value} value={o.value}>{L(o.en, o.ta)}</option>
                      ))}
                    </select>
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
