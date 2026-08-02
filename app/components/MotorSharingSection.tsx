"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";
import DeleteConfirmDialog from "./DeleteConfirmDialog";
import { useDeleteConfirm } from "../hooks/useDeleteConfirm";

interface Partner {
  id?: string;
  partner_name: string;
  partner_phone: string;
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

export type MotorSharingSectionHandle = {
  save: () => Promise<void>;
};

const DAY_OPTIONS = [1, 2, 3, 4, 5];
const HOUR_OPTIONS = [1, 2, 3, 6, 12];
const HOURS_PER_DAY = 24;

const labelCls = "text-sm text-gray-600 dark:text-gray-400";
const valueInputCls =
  "w-full border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 block";
const sectionTitleCls = "text-sm font-semibold text-gray-700 dark:text-gray-300";

const MotorSharingSection = forwardRef<MotorSharingSectionHandle, { farmId: string; language?: "ta" | "en" }>(
  function MotorSharingSection({ farmId, language = "en" }, ref) {
    const [sharing, setSharing] = useState<MotorSharing | null>(null);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isShared, setIsShared] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showAddPartner, setShowAddPartner] = useState(false);
    const { isOpen: deleteOpen, confirmDelete, handleConfirm: handleDeleteConfirm, handleCancel: handleDeleteCancel } = useDeleteConfirm();

    // Form states
    const [turnOwner, setTurnOwner] = useState("me");
    const [turnStart, setTurnStart] = useState("");
    const [durationType, setDurationType] = useState<"hours" | "days">("days");
    const [turnDays, setTurnDays] = useState(2);
    const [turnHours, setTurnHours] = useState(12);
    const [newPartnerName, setNewPartnerName] = useState("");
    const [newPartnerPhone, setNewPartnerPhone] = useState("");
    const [newPartnerDays, setNewPartnerDays] = useState(2);

    const effectiveTurnDays = durationType === "hours" ? turnHours / HOURS_PER_DAY : turnDays;

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

        const storedDays = Number(sharingData.current_turn_days) || 2;
        if (storedDays < 1) {
          setDurationType("hours");
          setTurnHours(Math.round(storedDays * HOURS_PER_DAY));
        } else {
          setDurationType("days");
          setTurnDays(Math.round(storedDays));
        }

        const { data: partnersData } = await supabase
          .from("motor_sharing_neighbors")
          .select("*")
          .eq("motor_sharing_id", sharingData.id);

        if (partnersData) {
          setPartners(
            partnersData.map((p) => ({
              id: p.id,
              partner_name: p.neighbor_name,
              partner_phone: p.neighbor_phone,
              turn_days: p.turn_days,
            }))
          );
        }
      }
      setLoading(false);
    };

    const saveSharing = async () => {
      try {
        if (sharing?.id) {
          await supabase
            .from("motor_sharing")
            .update({
              is_shared: isShared,
              current_turn_owner: turnOwner,
              current_turn_start: turnStart || null,
              current_turn_days: effectiveTurnDays,
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
              current_turn_days: effectiveTurnDays,
            })
            .select()
            .single();

          if (data) setSharing(data);
        }
        fetchMotorSharing();
      } catch (err) {
        console.error("Error saving motor sharing:", err);
        throw err;
      }
    };

    useImperativeHandle(ref, () => ({ save: saveSharing }));

    const addPartner = async () => {
      if (!newPartnerName.trim()) return;
      if (!sharing?.id) {
        toast.error(
          language === "ta" ? "முதலில் மேலே உள்ள 'மாற்றங்களை சேமி' பொத்தானை அழுத்தவும்" : "Please click 'Save Changes' above first"
        );
        return;
      }

      const { error } = await supabase.from("motor_sharing_neighbors").insert({
        motor_sharing_id: sharing.id,
        neighbor_name: newPartnerName,
        neighbor_phone: newPartnerPhone || null,
        turn_days: newPartnerDays,
      });

      if (!error) {
        toast.success(language === "ta" ? "பகிர்வு கூட்டாளி சேர்க்கப்பட்டார்!" : "Shared partner added!");
        setShowAddPartner(false);
        setNewPartnerName("");
        setNewPartnerPhone("");
        setNewPartnerDays(2);
        fetchMotorSharing();
      } else {
        console.error("Error adding partner:", error);
        toast.error(language === "ta" ? "சேர்க்க முடியவில்லை" : "Could not add partner");
      }
    };

    const removePartner = (id: string) => {
      confirmDelete(async () => {
        await supabase.from("motor_sharing_neighbors").delete().eq("id", id);
        toast.success(language === "ta" ? "நீக்கப்பட்டது!" : "Removed!");
        fetchMotorSharing();
      });
    };

    // Calculate upcoming schedule. Duration is in fractional days (e.g. 0.5 =
    // 12 hours), so end time is computed in milliseconds rather than via
    // Date#setDate — which truncates fractional arguments to whole days.
    // Whole-day turns still snap their handover to 6 PM as before; turns
    // shorter than a day end exactly on time instead.
    const getSchedule = () => {
      if (!turnStart || !isShared) return [];

      const schedule = [];
      let currentDate = new Date(turnStart);
      const allParticipants = [
        { name: "me", days: effectiveTurnDays },
        ...partners.map((p) => ({ name: p.partner_name, days: p.turn_days })),
      ];

      let participantIndex = allParticipants.findIndex((p) => p.name === turnOwner);
      if (participantIndex === -1) participantIndex = 0;

      for (let i = 0; i < 6; i++) {
        const participant = allParticipants[participantIndex % allParticipants.length];
        const endDate = new Date(currentDate.getTime() + participant.days * HOURS_PER_DAY * 60 * 60 * 1000);
        if (participant.days >= 1) {
          endDate.setHours(18, 0, 0, 0);
        }

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
            <span className={sectionTitleCls}>{language === "ta" ? "🚰 பகிர்வு மோட்டார்" : "🚰 Shared Motor"}</span>
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
          <div className="space-y-2">
            {/* Current turn info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <p className={`${sectionTitleCls} mb-2`}>{language === "ta" ? "தற்போதைய முறை" : "Current Turn"}</p>

              <div className="space-y-2">
                {/* Who has current turn — dropdown */}
                <div>
                  <label className={`${labelCls} mb-1 block`}>{language === "ta" ? "தற்போது யாருடைய முறை?" : "Whose turn is it now?"}</label>
                  <select
                    value={turnOwner}
                    onChange={(e) => setTurnOwner(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="me">{language === "ta" ? "என் முறை" : "My Turn"}</option>
                    {partners.map((partner) => (
                      <option key={partner.id} value={partner.partner_name}>
                        {partner.partner_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Turn start date/time */}
                <div>
                  <label className={`${labelCls} mb-1 block`}>{language === "ta" ? "முறை தொடங்கிய நேரம்" : "Turn Started"}</label>
                  <input
                    type="datetime-local"
                    value={turnStart}
                    onChange={(e) => setTurnStart(e.target.value)}
                    className={valueInputCls}
                    style={{ colorScheme: "light", minWidth: 0, width: "100%" }}
                  />
                  {turnStart && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(turnStart).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </p>
                  )}
                </div>

                {/* Turn duration — hours or days */}
                <div>
                  <label className={`${labelCls} mb-1 block`}>{language === "ta" ? "கால அளவு" : "Duration"}</label>

                  <div className="flex gap-2 mb-2">
                    <button
                      onClick={() => setDurationType("hours")}
                      className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-all ${
                        durationType === "hours" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {language === "ta" ? "மணி நேரம்" : "Hours"}
                    </button>
                    <button
                      onClick={() => setDurationType("days")}
                      className={`flex-1 text-sm py-1.5 rounded-lg font-medium transition-all ${
                        durationType === "days" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      {language === "ta" ? "நாட்கள்" : "Days"}
                    </button>
                  </div>

                  {durationType === "hours" && (
                    <div className="flex gap-1 flex-wrap">
                      {HOUR_OPTIONS.map((hour) => (
                        <button
                          key={hour}
                          onClick={() => setTurnHours(hour)}
                          className={`px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            turnHours === hour ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {hour}
                          {language === "ta" ? "மணி" : "hr"}
                        </button>
                      ))}
                    </div>
                  )}

                  {durationType === "days" && (
                    <div className="flex gap-1">
                      {DAY_OPTIONS.map((day) => (
                        <button
                          key={day}
                          onClick={() => setTurnDays(day)}
                          className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                            turnDays === day ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shared Partners section */}
            <div>
              <p className={`${sectionTitleCls} mb-2`}>👥 {language === "ta" ? "பகிர்வு கூட்டாளிகள்" : "Shared Partners"}</p>

              {/* Existing partners */}
              {partners.map((partner) => (
                <div key={partner.id} className="flex items-center justify-between bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{partner.partner_name}</p>
                    <p className={labelCls}>
                      {partner.partner_phone && `📞 ${partner.partner_phone} • `}
                      {partner.turn_days} {language === "ta" ? "நாட்கள்" : "days/turn"}
                    </p>
                  </div>
                  <button onClick={() => removePartner(partner.id!)} className="min-h-[44px] min-w-[44px] text-red-400 hover:text-red-600 text-sm ml-2">
                    🗑️
                  </button>
                </div>
              ))}

              {/* Add partner toggle */}
              <button
                onClick={() => setShowAddPartner(true)}
                className="text-xs text-green-600 hover:text-green-700 font-medium flex items-center gap-1 mt-2"
              >
                + {language === "ta" ? "பகிர்வு கூட்டாளி சேர்க்கவும்" : "Add Shared Partner"}
              </button>

              {showAddPartner && (
                <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 space-y-2 mt-2">
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    placeholder={language === "ta" ? "பெயர் *" : "Name *"}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="tel"
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    placeholder={language === "ta" ? "தொலைபேசி (விருப்பமானது)" : "Phone (optional)"}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-500">{language === "ta" ? "நாட்கள்:" : "Days:"}</span>
                    {DAY_OPTIONS.map((day) => (
                      <button
                        key={day}
                        onClick={() => setNewPartnerDays(day)}
                        className={`w-7 h-7 rounded-lg text-sm font-medium ${
                          newPartnerDays === day ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300"
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowAddPartner(false);
                        setNewPartnerName("");
                        setNewPartnerPhone("");
                        setNewPartnerDays(2);
                      }}
                      className="flex-1 text-sm py-2 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300"
                    >
                      {language === "ta" ? "ரத்து" : "Cancel"}
                    </button>
                    <button onClick={addPartner} className="flex-1 text-sm py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium">
                      {language === "ta" ? "சேர்" : "Add"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Schedule preview */}
            <div>
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 font-medium mt-2"
              >
                📅 {showSchedule ? (language === "ta" ? "அட்டவணையை மறை" : "Hide Schedule") : language === "ta" ? "அட்டவணை காட்டு" : "View Schedule"}
                <span>{showSchedule ? "▲" : "▼"}</span>
              </button>

              {showSchedule && (
                <div className="mt-2 space-y-1">
                  {getSchedule()
                    .slice(0, 5)
                    .map((slot, i) => (
                      <div
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-1.5 text-xs ${
                          slot.isMe ? "bg-green-50 dark:bg-green-900/20" : "bg-gray-50 dark:bg-slate-700/50"
                        }`}
                      >
                        <span className={`font-medium ${slot.isMe ? "text-green-700 dark:text-green-300" : "text-gray-600 dark:text-gray-400"}`}>
                          {slot.isMe ? (language === "ta" ? "🟢 என் முறை" : "🟢 My turn") : `🔴 ${slot.owner}`}
                        </span>
                        <span className="text-gray-400">
                          {slot.start.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" → "}
                          {slot.end.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DeleteConfirmDialog isOpen={deleteOpen} onConfirm={handleDeleteConfirm} onCancel={handleDeleteCancel} language={language} />
      </div>
    );
  }
);

export default MotorSharingSection;
