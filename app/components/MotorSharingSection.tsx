"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import toast from "react-hot-toast";
import { supabase } from "../lib/supabase";

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

const labelCls = "text-sm text-gray-600 dark:text-gray-400";
const valueInputCls =
  "w-full border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 min-h-[44px] text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500";
const sectionTitleCls = "text-sm font-semibold text-gray-700 dark:text-gray-300";

const MotorSharingSection = forwardRef<MotorSharingSectionHandle, { farmId: string; language?: "ta" | "en" }>(
  function MotorSharingSection({ farmId, language = "en" }, ref) {
    const [sharing, setSharing] = useState<MotorSharing | null>(null);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [isShared, setIsShared] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showSchedule, setShowSchedule] = useState(false);
    const [showAddPartner, setShowAddPartner] = useState(false);

    // Form states
    const [turnOwner, setTurnOwner] = useState("me");
    const [turnStart, setTurnStart] = useState("");
    const [turnDays, setTurnDays] = useState(2);
    const [newPartnerName, setNewPartnerName] = useState("");
    const [newPartnerPhone, setNewPartnerPhone] = useState("");
    const [newPartnerDays, setNewPartnerDays] = useState(2);

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

    const removePartner = async (id: string) => {
      if (!window.confirm(language === "ta" ? "இந்த பகிர்வு கூட்டாளியை நீக்கவா?" : "Remove this partner?")) return;

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
        ...partners.map((p) => ({ name: p.partner_name, days: p.turn_days })),
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
          <div className="space-y-4">
            {/* Current turn info */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
              <p className={`${sectionTitleCls} mb-2`}>{language === "ta" ? "தற்போதைய முறை" : "Current Turn"}</p>

              <div className="space-y-3">
                {/* Who has current turn — pill buttons */}
                <div>
                  <p className={`${labelCls} mb-1`}>{language === "ta" ? "இப்போது யாருடைய முறை?" : "Whose turn is it now?"}</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <button
                      onClick={() => setTurnOwner("me")}
                      className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        turnOwner === "me" ? "bg-green-600 text-white" : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                      }`}
                    >
                      🟢 {language === "ta" ? "என் முறை" : "My Turn"}
                    </button>
                    {partners.map((partner) => (
                      <button
                        key={partner.id}
                        onClick={() => setTurnOwner(partner.partner_name)}
                        className={`min-h-[44px] px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                          turnOwner === partner.partner_name
                            ? "bg-red-500 text-white"
                            : "bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400"
                        }`}
                      >
                        {partner.partner_name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Turn start date/time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-center">
                  <label className={labelCls}>{language === "ta" ? "தொடங்கிய நேரம்" : "Turn Started"}</label>
                  <input type="datetime-local" value={turnStart} onChange={(e) => setTurnStart(e.target.value)} className={valueInputCls} />
                </div>

                {/* Turn duration — tap buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:items-center">
                  <label className={labelCls}>{language === "ta" ? "கால அளவு" : "Duration"}</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={labelCls}>{language === "ta" ? "நாட்கள்:" : "Days:"}</span>
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
                  </div>
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
                <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-3 space-y-2 mt-2">
                  <input
                    type="text"
                    value={newPartnerName}
                    onChange={(e) => setNewPartnerName(e.target.value)}
                    placeholder={language === "ta" ? "பெயர் *" : "Name *"}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 min-h-[44px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="tel"
                    value={newPartnerPhone}
                    onChange={(e) => setNewPartnerPhone(e.target.value)}
                    placeholder={language === "ta" ? "தொலைபேசி (விருப்பமானது)" : "Phone (optional)"}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-3 py-2 min-h-[44px] bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">{language === "ta" ? "நாட்கள்:" : "Days:"}</span>
                    {DAY_OPTIONS.map((day) => (
                      <button
                        key={day}
                        onClick={() => setNewPartnerDays(day)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium ${
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
                      className="flex-1 text-xs py-2 rounded-lg bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300"
                    >
                      {language === "ta" ? "ரத்து" : "Cancel"}
                    </button>
                    <button onClick={addPartner} className="flex-1 text-xs py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-medium">
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
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium mt-2"
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
      </div>
    );
  }
);

export default MotorSharingSection;
