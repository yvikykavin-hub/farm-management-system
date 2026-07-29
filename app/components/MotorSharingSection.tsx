"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

interface Neighbor {
  id?: string;
  neighbor_name: string;
  neighbor_phone: string;
  turn_days: number;
}

interface MotorSharing {
  id?: string;
  farm_id: string;
  is_shared: boolean;
  current_turn_owner: string;
  current_turn_start: string;
  current_turn_days: number;
  notes?: string;
}

export default function MotorSharingSection({
  farmId,
  language = "en",
}: {
  farmId: string;
  language?: "ta" | "en";
}) {
  const [sharing, setSharing] = useState<MotorSharing | null>(null);
  const [neighbors, setNeighbors] = useState<Neighbor[]>([]);
  const [isShared, setIsShared] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  // Form states
  const [turnOwner, setTurnOwner] = useState("me");
  const [turnStart, setTurnStart] = useState("");
  const [turnDays, setTurnDays] = useState(2);
  const [newNeighborName, setNewNeighborName] = useState("");
  const [newNeighborPhone, setNewNeighborPhone] = useState("");
  const [newNeighborDays, setNewNeighborDays] = useState(2);

  useEffect(() => {
    fetchMotorSharing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId]);

  const fetchMotorSharing = async () => {
    setLoading(true);
    const { data: sharingData } = await supabase
      .from("motor_sharing")
      .select("*")
      .eq("farm_id", farmId)
      .maybeSingle();

    if (sharingData) {
      setSharing(sharingData);
      setIsShared(sharingData.is_shared);
      setTurnOwner(sharingData.current_turn_owner || "me");
      setTurnStart(sharingData.current_turn_start ? new Date(sharingData.current_turn_start).toISOString().slice(0, 16) : "");
      setTurnDays(sharingData.current_turn_days || 2);

      const { data: neighborsData } = await supabase
        .from("motor_sharing_neighbors")
        .select("*")
        .eq("motor_sharing_id", sharingData.id);

      if (neighborsData) setNeighbors(neighborsData);
    }
    setLoading(false);
  };

  const saveSharing = async () => {
    setSaving(true);
    try {
      if (sharing?.id) {
        await supabase
          .from("motor_sharing")
          .update({
            is_shared: isShared,
            current_turn_owner: turnOwner,
            current_turn_start: turnStart || null,
            current_turn_days: turnDays,
            updated_at: new Date().toISOString(),
          })
          .eq("id", sharing.id);
      } else {
        const { data } = await supabase
          .from("motor_sharing")
          .insert({
            farm_id: farmId,
            is_shared: isShared,
            current_turn_owner: turnOwner,
            current_turn_start: turnStart || null,
            current_turn_days: turnDays,
          })
          .select()
          .single();

        if (data) setSharing(data);
      }
      toast.success(language === "ta" ? "✅ சேமிக்கப்பட்டது!" : "✅ Saved!");
      fetchMotorSharing();
    } catch (err) {
      console.error("Error saving motor sharing:", err);
      toast.error(language === "ta" ? "சேமிக்க முடியவில்லை" : "Could not save");
    }
    setSaving(false);
  };

  const addNeighbor = async () => {
    if (!newNeighborName.trim()) return;
    if (!sharing?.id) {
      toast.error(language === "ta" ? "முதலில் பகிர்வு மோட்டாரை சேமிக்கவும்" : "Save motor sharing first");
      return;
    }

    const { error } = await supabase.from("motor_sharing_neighbors").insert({
      motor_sharing_id: sharing.id,
      neighbor_name: newNeighborName,
      neighbor_phone: newNeighborPhone || null,
      turn_days: newNeighborDays,
    });

    if (!error) {
      toast.success(language === "ta" ? "நபர் சேர்க்கப்பட்டார்!" : "Neighbor added!");
      setNewNeighborName("");
      setNewNeighborPhone("");
      setNewNeighborDays(2);
      fetchMotorSharing();
    } else {
      console.error("Error adding neighbor:", error);
      toast.error(language === "ta" ? "சேர்க்க முடியவில்லை" : "Could not add neighbor");
    }
  };

  const removeNeighbor = async (id: string) => {
    if (!window.confirm(language === "ta" ? "இந்த நபரை நீக்கவா?" : "Remove this neighbor?")) return;

    await supabase.from("motor_sharing_neighbors").delete().eq("id", id);

    fetchMotorSharing();
  };

  // Calculate upcoming schedule
  const getSchedule = () => {
    if (!turnStart || !isShared) return [];

    const schedule = [];
    let currentDate = new Date(turnStart);
    const allParticipants = [
      { name: "me", days: turnDays },
      ...neighbors.map((n) => ({ name: n.neighbor_name, days: n.turn_days })),
    ];

    let participantIndex = allParticipants.findIndex((p) => p.name === turnOwner);
    if (participantIndex === -1) participantIndex = 0;

    for (let i = 0; i < 6; i++) {
      const participant = allParticipants[participantIndex % allParticipants.length];
      const endDate = new Date(currentDate);
      endDate.setDate(endDate.getDate() + participant.days);
      endDate.setHours(18, 0, 0, 0);

      schedule.push({
        owner: participant.name,
        start: new Date(currentDate),
        end: endDate,
        isMe: participant.name === "me",
      });

      currentDate = new Date(endDate);
      participantIndex++;
    }

    return schedule;
  };

  const formatDateTime = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const isMyTurnNow = () => {
    if (!sharing?.current_turn_start) return false;
    const schedule = getSchedule();
    const now = new Date();
    const myTurn = schedule.find((s) => s.isMe);
    if (!myTurn) return false;
    return now >= myTurn.start && now <= myTurn.end;
  };

  if (loading) return null;

  return (
    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-700">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🚰</span>
          <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
            {language === "ta" ? "பகிர்வு மோட்டார்" : "Shared Motor"}
          </span>
          {isMyTurnNow() && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium animate-pulse">
              🟢 {language === "ta" ? "உங்கள் முறை!" : "Your turn!"}
            </span>
          )}
        </div>

        {/* Toggle */}
        <button
          onClick={() => setIsShared(!isShared)}
          className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${isShared ? "bg-green-500" : "bg-gray-300 dark:bg-slate-600"}`}
        >
          <div
            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
              isShared ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      {/* Shared motor details */}
      {isShared && (
        <div className="space-y-4">
          {/* Current turn info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
            <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2">
              {language === "ta" ? "தற்போதைய முறை" : "Current Turn"}
            </p>

            <div className="space-y-2">
              {/* Who has current turn */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  {language === "ta" ? "இப்போது யாருடைய முறை?" : "Whose turn is it now?"}
                </label>
                <select
                  value={turnOwner}
                  onChange={(e) => setTurnOwner(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="me">{language === "ta" ? "என் முறை" : "My Turn"}</option>
                  {neighbors.map((n) => (
                    <option key={n.id} value={n.neighbor_name}>
                      {n.neighbor_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Turn start date/time */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  {language === "ta" ? "முறை தொடங்கிய நேரம்" : "Turn started at"}
                </label>
                <input
                  type="datetime-local"
                  value={turnStart}
                  onChange={(e) => setTurnStart(e.target.value)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {/* Turn duration */}
              <div>
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  {language === "ta" ? "இந்த முறை எத்தனை நாட்கள்?" : "How many days for this turn?"}
                </label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={turnDays}
                  onChange={(e) => setTurnDays(parseInt(e.target.value) || 1)}
                  className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* Neighbors section */}
          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              👥 {language === "ta" ? "பக்கத்து வீட்டினர்" : "Neighbors"}
            </p>

            {/* Existing neighbors */}
            {neighbors.map((neighbor) => (
              <div key={neighbor.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 mb-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{neighbor.neighbor_name}</p>
                  <p className="text-xs text-gray-500">
                    {neighbor.neighbor_phone && `📞 ${neighbor.neighbor_phone} • `}
                    {neighbor.turn_days} {language === "ta" ? "நாட்கள்" : "days/turn"}
                  </p>
                </div>
                <button onClick={() => removeNeighbor(neighbor.id!)} className="text-red-400 hover:text-red-600 text-sm ml-2">
                  🗑️
                </button>
              </div>
            ))}

            {/* Add neighbor */}
            <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {language === "ta" ? "+ புதிய நபர் சேர்க்கவும்" : "+ Add Neighbor"}
              </p>
              <input
                type="text"
                value={newNeighborName}
                onChange={(e) => setNewNeighborName(e.target.value)}
                placeholder={language === "ta" ? "பெயர்" : "Name"}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <input
                type="tel"
                value={newNeighborPhone}
                onChange={(e) => setNewNeighborPhone(e.target.value)}
                placeholder={language === "ta" ? "தொலைபேசி (விருப்பமானது)" : "Phone (optional)"}
                className="w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={newNeighborDays}
                  onChange={(e) => setNewNeighborDays(parseInt(e.target.value) || 1)}
                  className="w-24 border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <span className="text-xs text-gray-500">{language === "ta" ? "நாட்கள்" : "days/turn"}</span>
                <button onClick={addNeighbor} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 rounded-lg">
                  {language === "ta" ? "சேர்" : "Add"}
                </button>
              </div>
            </div>
          </div>

          {/* Schedule preview */}
          <div>
            <button
              onClick={() => setShowSchedule(!showSchedule)}
              className="w-full text-xs text-blue-600 hover:underline text-left flex items-center gap-1"
            >
              📅{" "}
              {showSchedule
                ? language === "ta"
                  ? "அட்டவணையை மறை"
                  : "Hide schedule"
                : language === "ta"
                ? "அட்டவணை காட்டு"
                : "Show upcoming schedule"}
            </button>

            {showSchedule && (
              <div className="mt-2 space-y-1">
                {getSchedule().map((slot, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                      slot.isMe ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-slate-700"
                    }`}
                  >
                    <span className={`font-medium ${slot.isMe ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"}`}>
                      {slot.isMe ? (language === "ta" ? "🟢 உங்கள் முறை" : "🟢 Your turn") : `🔴 ${slot.owner}`}
                    </span>
                    <span className="text-gray-500">
                      {formatDateTime(slot.start)} → {formatDateTime(slot.end)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Save button */}
          <button
            onClick={saveSharing}
            disabled={saving}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
          >
            {saving ? "..." : language === "ta" ? "💾 சேமி" : "💾 Save Motor Sharing"}
          </button>
        </div>
      )}

      {/* If not shared, just save toggle */}
      {!isShared && sharing?.is_shared !== isShared && (
        <button
          onClick={saveSharing}
          disabled={saving}
          className="w-full bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 font-medium py-2 rounded-xl text-sm mt-2"
        >
          {saving ? "..." : language === "ta" ? "சேமி" : "Save"}
        </button>
      )}
    </div>
  );
}
