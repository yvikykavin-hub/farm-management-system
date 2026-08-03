"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import { ActivityLog } from "../lib/activityLog";

interface VoiceBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  language: string;
}

type VoiceState = "idle" | "listening" | "processing" | "understood" | "clarify" | "unclear" | "saving" | "saved";

type AnimalOption = { id: string; name: string };

export default function VoiceBottomSheet({ isOpen, onClose, language }: VoiceBottomSheetProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [editedData, setEditedData] = useState<any>(null);
  const [clarifyInput, setClarifyInput] = useState("");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [animalOptions, setAnimalOptions] = useState<AnimalOption[]>([]);
  const [selectedAnimalId, setSelectedAnimalId] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  // recognition.onend fires with a closure over the transcript/liveTranscript
  // state from when startListening ran, which is always stale by the time
  // speech actually finishes — a ref is the only way to read the latest value.
  const latestTranscriptRef = useRef("");

  const L = (en: string, ta: string) => (language === "ta" ? ta : en);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      // Deferred via microtask rather than called synchronously in the effect body —
      // avoids the cascading-render lint warning while still resetting before paint.
      Promise.resolve().then(() => {
        stopListening();
        setVoiceState("idle");
        setTranscript("");
        setLiveTranscript("");
        setResult(null);
        setEditedData(null);
        setClarifyInput("");
        setConversationHistory([]);
        setAnimalOptions([]);
        setSelectedAnimalId("");
      });
    }
  }, [isOpen]);

  // Goat/hen expenses require a specific animal record (goat_id / hen_id) —
  // there's no farm-wide expense table for them the way cow_expenses covers
  // both cow and buffalo, so fetch the farm's animals of that type whenever
  // the edited data points at one.
  useEffect(() => {
    const needsAnimalPick =
      voiceState === "understood" &&
      result?.module === "livestock_expense" &&
      (editedData?.animal_type === "goat" || editedData?.animal_type === "hen");

    if (!needsAnimalPick) {
      // Deferred via microtask rather than called synchronously in the effect body.
      Promise.resolve().then(() => {
        setAnimalOptions([]);
        setSelectedAnimalId("");
      });
      return;
    }

    const table = editedData.animal_type === "goat" ? "goats" : "hens";
    supabase
      .from(table)
      .select("id, name")
      .eq("current_status", "active")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const options = data || [];
        setAnimalOptions(options);
        setSelectedAnimalId(options.length > 0 ? options[0].id : "");
      });
  }, [voiceState, result?.module, editedData?.animal_type]);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error(
        L("Voice not supported in this browser. Use Chrome.", "இந்த browser-ல் voice support இல்லை. Chrome பயன்படுத்தவும்.")
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    // Support both Tamil and English
    recognition.lang = language === "ta" ? "ta-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setVoiceState("listening");
      setLiveTranscript("");
      latestTranscriptRef.current = "";
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      latestTranscriptRef.current = final || interim;
      setLiveTranscript(final || interim);
      if (final) setTranscript(final);
    };

    recognition.onend = () => {
      if (latestTranscriptRef.current) {
        processTranscript(latestTranscriptRef.current);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "no-speech") {
        toast.error(L("No speech detected. Try again.", "பேச்சு கேட்கவில்லை. மீண்டும் முயற்சிக்கவும்."));
        setVoiceState("idle");
      }
    };

    recognition.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  const processTranscript = async (text: string) => {
    if (!text.trim()) return;

    setVoiceState("processing");

    try {
      const response = await fetch("/api/voice-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text, language, conversationHistory }),
      });

      const data = await response.json();

      if (data.success) {
        setConversationHistory(data.history || []);
        const result = data.result;

        if (result.status === "understood" && result.confidence >= 0.7) {
          setResult(result);
          setEditedData({ ...result.data });
          setVoiceState("understood");
        } else if (result.status === "clarify") {
          setResult(result);
          setVoiceState("clarify");
        } else {
          setResult(result);
          setVoiceState("unclear");
        }
      } else {
        setResult(data.result || null);
        setVoiceState("unclear");
      }
    } catch {
      setVoiceState("unclear");
      toast.error(L("Error processing voice. Try again.", "பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."));
    }
  };

  const handleClarifySubmit = () => {
    if (!clarifyInput.trim()) return;
    setTranscript(clarifyInput);
    setLiveTranscript(clarifyInput);
    processTranscript(clarifyInput);
    setClarifyInput("");
  };

  const handleSave = async () => {
    if (!editedData) return;

    if (result.module === "milk_collection" && editedData.animal_type !== "cow" && editedData.animal_type !== "buffalo") {
      toast.error(L("Milk collection is only supported for cow and buffalo.", "பால் சேகரிப்பு பசு/எருமைக்கு மட்டுமே ஆதரிக்கப்படுகிறது."));
      return;
    }
    if (
      result.module === "livestock_expense" &&
      (editedData.animal_type === "goat" || editedData.animal_type === "hen") &&
      !selectedAnimalId
    ) {
      toast.error(
        L(
          `Please add a ${editedData.animal_type} first from the ${editedData.animal_type === "goat" ? "Goats" : "Hens"} page.`,
          "முதலில் அந்த கால்நடையை சேர்க்கவும்."
        )
      );
      return;
    }

    setVoiceState("saving");

    try {
      if (result.module === "milk_collection") {
        await saveMilkCollection(editedData);
      } else if (result.module === "livestock_expense") {
        await saveLivestockExpense(editedData);
      }

      setVoiceState("saved");

      // Auto close after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      toast.error(L("Error saving data. Try again.", "சேமிக்க பிழை. மீண்டும் முயற்சிக்கவும்."));
      setVoiceState("understood");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveMilkCollection = async (data: any) => {
    // Buffalo tracks its milk rate in a separate table from cow/legacy entries.
    const rateTable = data.animal_type === "buffalo" ? "buffalo_milk_rates" : "milk_rates";
    const { data: rates } = await supabase
      .from(rateTable)
      .select("rate_per_litre, effective_from")
      .order("effective_from", { ascending: false });

    const ratesList = rates || [];
    const applicable = ratesList
      .filter((r) => r.effective_from <= data.collection_date)
      .sort((a, b) => b.effective_from.localeCompare(a.effective_from));
    const rate = applicable.length
      ? Number(applicable[0].rate_per_litre)
      : ratesList.length
      ? Number(ratesList[0].rate_per_litre)
      : 0;

    if (rate === 0) {
      throw new Error("No milk rate configured");
    }

    const morningLitres = Number(data.morning_litres) || 0;
    const eveningLitres = Number(data.evening_litres) || 0;
    const totalLitres = morningLitres + eveningLitres;

    // Check for an existing entry for this date/animal — matches the manual
    // entry form's behaviour of updating instead of creating a duplicate.
    // A null animal_type is a legacy cow entry, so cow lookups include it too.
    const existingQuery = supabase.from("milk_collections").select("id").eq("collection_date", data.collection_date);
    const { data: existingRows } =
      data.animal_type === "cow"
        ? await existingQuery.or("animal_type.eq.cow,animal_type.is.null").limit(1)
        : await existingQuery.eq("animal_type", data.animal_type).limit(1);
    const existing = existingRows && existingRows.length > 0 ? existingRows[0] : null;

    // total_litres and daily_income are DB-generated columns — never send them explicitly.
    if (existing) {
      const { error } = await supabase
        .from("milk_collections")
        .update({
          morning_litres: morningLitres,
          evening_litres: eveningLitres,
          rate_per_litre: rate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("milk_collections").insert({
        farm_location: "Home",
        collection_date: data.collection_date,
        animal_type: data.animal_type,
        morning_litres: morningLitres,
        evening_litres: eveningLitres,
        rate_per_litre: rate,
        month_year: data.collection_date.slice(0, 7),
      });
      if (error) throw error;
    }

    await ActivityLog.added("Milk Collection", `Voice: ${data.animal_type} milk ${totalLitres.toFixed(1)}L`);

    toast.success(L("✅ Milk collection saved!", "✅ பால் சேகரிப்பு சேமிக்கப்பட்டது!"));
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const saveLivestockExpense = async (data: any) => {
    const tableMap: Record<string, string> = {
      cow: "cow_expenses",
      buffalo: "cow_expenses",
      goat: "goat_expenses",
      hen: "hen_expenses",
    };
    const table = tableMap[data.animal_type] || "cow_expenses";
    const amount = Number(data.amount) || 0;

    // cow_expenses is shared across cow/buffalo (no animal_type column of its
    // own); goat_expenses/hen_expenses instead key off a specific goat_id/hen_id.
    if (table === "cow_expenses") {
      const { error } = await supabase.from("cow_expenses").insert({
        farm_location: "Home",
        expense_date: data.expense_date,
        expense_type: data.category || "Other",
        amount,
        description: data.description || null,
      });
      if (error) throw error;
    } else if (table === "goat_expenses") {
      const { error } = await supabase.from("goat_expenses").insert({
        goat_id: selectedAnimalId,
        farm_location: "Home",
        expense_date: data.expense_date,
        expense_type: data.category || "Other",
        amount,
        description: data.description || null,
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.from("hen_expenses").insert({
        hen_id: selectedAnimalId,
        farm_location: "Home",
        expense_date: data.expense_date,
        expense_type: data.category || "Other",
        amount,
        description: data.description || null,
      });
      if (error) throw error;
    }

    const moduleMap: Record<string, "Cow Expense" | "Goat Expense" | "Hen Expense"> = {
      cow: "Cow Expense",
      buffalo: "Cow Expense",
      goat: "Goat Expense",
      hen: "Hen Expense",
    };
    await ActivityLog.added(moduleMap[data.animal_type] || "Cow Expense", `Voice: ${data.animal_type} ${data.category} ₹${amount}`);

    toast.success(L("✅ Expense saved!", "✅ செலவு சேமிக்கப்பட்டது!"));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
          />

          {/* Bottom Sheet */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[81] bg-white dark:bg-slate-800 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-slate-600" />
            </div>

            <div className="px-5 pb-8">
              {/* Header */}
              <div className="flex items-center justify-between py-3 mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎤</span>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">{L("Voice Input", "குரல் உள்ளீடு")}</h3>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-gray-500 text-sm"
                >
                  ✕
                </button>
              </div>

              {/* IDLE STATE */}
              {voiceState === "idle" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5 py-6">
                  {/* Mic button */}
                  <motion.button
                    onClick={startListening}
                    whileTap={{ scale: 0.95 }}
                    className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg flex items-center justify-center text-white text-4xl"
                  >
                    🎤
                  </motion.button>

                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{L("Tap to speak", "பேச தட்டவும்")}</p>

                  {/* Examples */}
                  <div className="w-full bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-4">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{L("Examples:", "எடுத்துக்காட்டு:")}</p>
                    <div className="space-y-2">
                      {[
                        {
                          en: '"Today cow milk 4.5L morning 3L evening"',
                          ta: '"இன்று பசு காலை நாலரை மாலை மூணு லிட்டர்"',
                        },
                        {
                          en: '"Spent 500 on cattle feed today"',
                          ta: '"இன்று மாட்டுக்கு தீவனம் 500 ரூபாய்"',
                        },
                        {
                          en: '"Goat medicine 200 rupees yesterday"',
                          ta: '"நேத்து ஆட்டுக்கு மருந்து 200 ரூபாய்"',
                        },
                      ].map((ex, i) => (
                        <p key={i} className="text-xs text-gray-600 dark:text-gray-400 italic">
                          {language === "ta" ? ex.ta : ex.en}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* LISTENING STATE */}
              {voiceState === "listening" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-5 py-6">
                  {/* Animated mic */}
                  <div className="relative">
                    <motion.div
                      animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full bg-green-400"
                    />
                    <motion.div
                      animate={{ scale: [1, 1.5, 1], opacity: [0.2, 0.4, 0.2] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                      className="absolute -inset-3 rounded-full bg-green-300"
                    />
                    <button
                      onClick={stopListening}
                      className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg flex items-center justify-center text-4xl z-10"
                    >
                      🎤
                    </button>
                  </div>

                  <motion.p
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="text-sm font-medium text-green-600 dark:text-green-400"
                  >
                    {L("Listening...", "கேட்கிறோம்...")}
                  </motion.p>

                  {/* Live transcript */}
                  {liveTranscript && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800/30"
                    >
                      <p className="text-sm text-green-800 dark:text-green-300 text-center italic">&quot;{liveTranscript}&quot;</p>
                    </motion.div>
                  )}

                  <button onClick={stopListening} className="px-6 py-2.5 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm font-medium text-gray-600 dark:text-gray-400">
                    ⏹ {L("Stop", "நிறுத்து")}
                  </button>
                </motion.div>
              )}

              {/* PROCESSING STATE */}
              {voiceState === "processing" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-4xl">
                    🌾
                  </motion.div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{L("Understanding...", "புரிந்துகொள்கிறோம்...")}</p>
                  {transcript && (
                    <div className="w-full bg-gray-50 dark:bg-slate-700/50 rounded-2xl p-3">
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center italic">&quot;{transcript}&quot;</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* UNDERSTOOD STATE */}
              {voiceState === "understood" && result && editedData && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  {/* What I heard */}
                  <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                    <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">{L("You said:", "நீங்கள் சொன்னது:")}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-300 italic">&quot;{transcript}&quot;</p>
                  </div>

                  {/* Understood card */}
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 border border-green-100 dark:border-green-800/30">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{result.module === "milk_collection" ? "🥛" : "💰"}</span>
                      <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                        {result.module === "milk_collection" ? L("Milk Collection", "பால் சேகரிப்பு") : L("Livestock Expense", "கால்நடை செலவு")}
                      </p>
                      <span className="ml-auto text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                        {Math.round(result.confidence * 100)}% {L("sure", "உறுதி")}
                      </span>
                    </div>

                    {/* Editable fields */}
                    <div className="space-y-3">
                      {/* Animal type */}
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{L("Animal", "கால்நடை")}</label>
                        <select
                          value={editedData.animal_type || ""}
                          onChange={(e) => setEditedData({ ...editedData, animal_type: e.target.value })}
                          className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                        >
                          <option value="cow">🐄 {L("Cow", "பசு")}</option>
                          <option value="buffalo">🐃 {L("Buffalo", "எருமை")}</option>
                          <option value="goat">🐐 {L("Goat", "ஆடு")}</option>
                          <option value="hen">🐓 {L("Hen", "கோழி")}</option>
                        </select>
                      </div>

                      {/* Specific goat/hen picker — required since goat_expenses/hen_expenses
                          key off a specific animal, unlike the shared cow_expenses table. */}
                      {result.module === "livestock_expense" && (editedData.animal_type === "goat" || editedData.animal_type === "hen") && (
                        <div>
                          <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                            {editedData.animal_type === "goat" ? L("Which goat?", "எந்த ஆடு?") : L("Which hen?", "எந்த கோழி?")}
                          </label>
                          {animalOptions.length > 0 ? (
                            <select
                              value={selectedAnimalId}
                              onChange={(e) => setSelectedAnimalId(e.target.value)}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            >
                              {animalOptions.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-danger">
                              {L(
                                `No active ${editedData.animal_type}s found. Add one from the ${editedData.animal_type === "goat" ? "Goats" : "Hens"} page first.`,
                                "செயலில் உள்ள கால்நடை இல்லை. முதலில் சேர்க்கவும்."
                              )}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Date */}
                      <div>
                        <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{L("Date", "தேதி")}</label>
                        <input
                          type="date"
                          value={editedData.collection_date || editedData.expense_date || ""}
                          max={new Date().toISOString().split("T")[0]}
                          onChange={(e) =>
                            setEditedData({
                              ...editedData,
                              collection_date: result.module === "milk_collection" ? e.target.value : undefined,
                              expense_date: result.module === "livestock_expense" ? e.target.value : undefined,
                            })
                          }
                          className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      {/* Milk specific fields */}
                      {result.module === "milk_collection" && (
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">☀️ {L("Morning (L)", "காலை (L)")}</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editedData.morning_litres || 0}
                              onChange={(e) => setEditedData({ ...editedData, morning_litres: Number(e.target.value) })}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">🌙 {L("Evening (L)", "மாலை (L)")}</label>
                            <input
                              type="number"
                              min="0"
                              step="0.1"
                              value={editedData.evening_litres || 0}
                              onChange={(e) => setEditedData({ ...editedData, evening_litres: Number(e.target.value) })}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </div>
                      )}

                      {/* Expense specific fields */}
                      {result.module === "livestock_expense" && (
                        <>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{L("Amount (₹)", "தொகை (₹)")}</label>
                            <input
                              type="number"
                              min="0"
                              value={editedData.amount || 0}
                              onChange={(e) => setEditedData({ ...editedData, amount: Number(e.target.value) })}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{L("Category", "வகை")}</label>
                            <select
                              value={editedData.category || "Other"}
                              onChange={(e) => setEditedData({ ...editedData, category: e.target.value })}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            >
                              <option value="Feed/Fodder">{L("Feed/Fodder", "தீவனம்")}</option>
                              <option value="Medicine">{L("Medicine", "மருந்து")}</option>
                              <option value="Veterinary">{L("Veterinary", "கால்நடை டாக்டர்")}</option>
                              <option value="Labour">{L("Labour", "கூலி")}</option>
                              <option value="Other">{L("Other", "மற்றவை")}</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{L("Description", "விவரம்")}</label>
                            <input
                              type="text"
                              value={editedData.description || ""}
                              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
                              placeholder={L("Optional details", "கூடுதல் விவரம்")}
                              className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        setVoiceState("idle");
                        setTranscript("");
                        setLiveTranscript("");
                        setResult(null);
                        setEditedData(null);
                        setConversationHistory([]);
                      }}
                      className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      🔄 {L("Try Again", "மீண்டும்")}
                    </button>
                    <button onClick={handleSave} className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-medium">
                      ✅ {L("Save", "சேமி")}
                    </button>
                  </div>
                </motion.div>
              )}

              {/* CLARIFY STATE */}
              {voiceState === "clarify" && result && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 py-4">
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/30">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-300 mb-1">🤔 {L("Need more info", "கூடுதல் தகவல் தேவை")}</p>
                    <p className="text-sm text-amber-700 dark:text-amber-400">{language === "ta" ? result.question_ta : result.question}</p>
                  </div>

                  {/* Voice again or type */}
                  <div className="flex gap-3">
                    <button
                      onClick={startListening}
                      className="flex-1 py-3 rounded-xl bg-green-600 text-white text-sm font-medium flex items-center justify-center gap-2"
                    >
                      🎤 {L("Speak", "பேசு")}
                    </button>
                    <button
                      onClick={() => setVoiceState("idle")}
                      className="flex-1 py-3 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm font-medium text-gray-600 dark:text-gray-400"
                    >
                      ↩️ {L("Start Over", "மீண்டும் தொடங்கு")}
                    </button>
                  </div>

                  {/* Or type answer */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={clarifyInput}
                      onChange={(e) => setClarifyInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleClarifySubmit();
                      }}
                      placeholder={L("Or type your answer...", "அல்லது தட்டச்சு செய்யுங்கள்...")}
                      className="flex-1 text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2.5 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    <button onClick={handleClarifySubmit} className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm">
                      →
                    </button>
                  </div>
                </motion.div>
              )}

              {/* UNCLEAR STATE */}
              {voiceState === "unclear" && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-4 py-6">
                  <div className="text-4xl">😕</div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                    {result
                      ? language === "ta"
                        ? result.message_ta
                        : result.message
                      : L("Could not understand. Please try again.", "புரியவில்லை. மீண்டும் முயற்சிக்கவும்.")}
                  </p>
                  <button
                    onClick={() => {
                      setVoiceState("idle");
                      setTranscript("");
                      setLiveTranscript("");
                      setConversationHistory([]);
                    }}
                    className="px-6 py-3 rounded-xl bg-green-600 text-white text-sm font-medium"
                  >
                    🔄 {L("Try Again", "மீண்டும் முயற்சி")}
                  </button>
                </motion.div>
              )}

              {/* SAVING STATE */}
              {voiceState === "saving" && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-4xl">
                    🌾
                  </motion.div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{L("Saving...", "சேமிக்கிறோம்...")}</p>
                </motion.div>
              )}

              {/* SAVED STATE */}
              {voiceState === "saved" && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-8">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
                  >
                    <motion.svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                      <motion.path
                        d="M8 20 L16 28 L32 12"
                        stroke="#16a34a"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </motion.svg>
                  </motion.div>
                  <p className="text-sm font-semibold text-green-700 dark:text-green-400">{L("Saved!", "சேமிக்கப்பட்டது!")}</p>
                </motion.div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
