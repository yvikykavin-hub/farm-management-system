"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebar from "../../components/Sidebar";
import PullToRefresh from "../../components/PullToRefresh";
import { SkeletonList } from "../../components/Skeleton";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";

type ActivityLogRow = {
  id: string;
  username: string;
  display_name: string | null;
  action: string;
  module: string;
  description: string;
  record_id: string | null;
  created_at: string;
};

const MODULES = [
  "Milk Collection",
  "Milk Rate",
  "Milk Payment",
  "Cow Expense",
  "Farm",
  "Crop",
  "Income",
  "Expense",
  "Animal",
  "Tractor",
  "Tractor Diesel",
  "Tractor Usage",
  "Tractor Oil",
  "Tractor Maintenance",
  "Land Details",
  "Land Document",
  "Motor Sharing",
  "Goat Income",
  "Goat Expense",
  "Hen Income",
  "Hen Expense",
  "Payment",
];

export default function ActivityPage() {
  const [lang, setLang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [logs, setLogs] = useState<ActivityLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState("all");
  const [filterModule, setFilterModule] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUser, filterModule, filterDate]);

  const fetchLogs = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    let query = supabase.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100);

    if (filterUser !== "all") {
      query = query.eq("username", filterUser);
    }
    if (filterModule !== "all") {
      query = query.eq("module", filterModule);
    }
    if (filterDate === "today") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      query = query.gte("created_at", today.toISOString());
    } else if (filterDate === "week") {
      const week = new Date();
      week.setDate(week.getDate() - 7);
      query = query.gte("created_at", week.toISOString());
    } else if (filterDate === "month") {
      const month = new Date();
      month.setDate(month.getDate() - 30);
      query = query.gte("created_at", month.toISOString());
    }

    const { data } = await query;
    if (data) setLogs(data);

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "added":
        return "➕";
      case "updated":
        return "✏️";
      case "deleted":
        return "🗑️";
      default:
        return "📝";
    }
  };

  const getActionStyle = (action: string) => {
    switch (action) {
      case "added":
        return "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-800/30";
      case "updated":
        return "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-800/30";
      case "deleted":
        return "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-800/30";
      default:
        return "bg-gray-50 dark:bg-slate-700 text-gray-600 border border-gray-100 dark:border-slate-600";
    }
  };

  const getUserStyle = (username: string) => {
    const styles: Record<string, string> = {
      kavin: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      sachin: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      madhu: "bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400",
    };
    return styles[username] || "bg-gray-100 dark:bg-slate-600 text-gray-600 dark:text-gray-300";
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return L("Just now", "இப்போதே");
    if (minutes < 60) return `${minutes}m ${L("ago", "முன்பு")}`;
    if (hours < 24) return `${hours}h ${L("ago", "முன்பு")}`;
    if (days < 7) return `${days}d ${L("ago", "முன்பு")}`;

    return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-page">
      <Sidebar lang={lang} setLang={setLang} />

      <main className="flex-1 overflow-y-auto p-4">
        <PullToRefresh onRefresh={() => fetchLogs(true)} language={lang}>
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between flex-wrap gap-2"
            >
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-primary">
                  📋 {L("Activity Log", "செயல்பாடு பதிவு")}
                </h1>
                {logs.length > 0 && (
                  <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                    {logs.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(true)}
                  disabled={refreshing}
                  className="flex items-center gap-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-slate-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors disabled:opacity-50 min-h-[44px] sm:min-h-0"
                >
                  <span className={refreshing ? "animate-spin" : ""}>🔄</span>
                  <span className="hidden sm:block text-xs">{L("Refresh", "புதுப்பி")}</span>
                </button>
                <button
                  onClick={() => setLang(lang === "ta" ? "en" : "ta")}
                  className="px-3 py-1.5 rounded-lg border border-primary/40 text-primary text-sm font-medium hover:bg-green-50 transition"
                >
                  {lang === "ta" ? "English" : "தமிழ்"}
                </button>
              </div>
            </motion.div>

            {/* Filters */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-4"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* User filter */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    👤 {L("User", "பயனர்")}
                  </label>
                  <select
                    value={filterUser}
                    onChange={(e) => setFilterUser(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">{L("All Users", "அனைவரும்")}</option>
                    <option value="kavin">Kavin</option>
                    <option value="sachin">Sachin</option>
                    <option value="madhu">Madhu</option>
                  </select>
                </div>

                {/* Module filter */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    📁 {L("Module", "பிரிவு")}
                  </label>
                  <select
                    value={filterModule}
                    onChange={(e) => setFilterModule(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">{L("All Modules", "அனைத்து பிரிவு")}</option>
                    {MODULES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date filter */}
                <div>
                  <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                    📅 {L("Period", "காலம்")}
                  </label>
                  <select
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full text-sm border border-gray-200 dark:border-slate-600 rounded-xl px-3 py-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="all">{L("All Time", "எல்லா நேரமும்")}</option>
                    <option value="today">{L("Today", "இன்று")}</option>
                    <option value="week">{L("This Week", "இந்த வாரம்")}</option>
                    <option value="month">{L("This Month", "இந்த மாதம்")}</option>
                  </select>
                </div>
              </div>
            </motion.div>

            {/* Log entries */}
            {loading ? (
              <SkeletonList count={5} />
            ) : logs.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-16"
              >
                <div className="text-5xl mb-3">📋</div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {L("No activity yet", "செயல்பாடு இல்லை")}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  {L("Actions will appear here", "செயல்கள் இங்கே தெரியும்")}
                </p>
              </motion.div>
            ) : (
              <AnimatePresence mode="popLayout">
                <div className="space-y-2">
                  {logs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -8 }}
                      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.3 }}
                      className="bg-white dark:bg-slate-800 rounded-2xl p-3 shadow-sm border border-gray-100 dark:border-slate-700 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start gap-3">
                        {/* Action icon */}
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-sm ${getActionStyle(log.action)}`}
                        >
                          {getActionIcon(log.action)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            {/* User badge */}
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getUserStyle(log.username)}`}>
                              {log.display_name || log.username}
                            </span>

                            {/* Module badge */}
                            <span className="text-xs bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">
                              {log.module}
                            </span>
                          </div>

                          {/* Description */}
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-snug">{log.description}</p>

                          {/* Time */}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            🕐 {formatTime(log.created_at)}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </AnimatePresence>
            )}

            {/* Bottom note */}
            {logs.length === 100 && (
              <p className="text-xs text-center text-gray-400 dark:text-gray-500">
                {L("Showing latest 100 entries", "கடைசி 100 பதிவுகள் காட்டுகிறது")}
              </p>
            )}
          </div>
        </PullToRefresh>
      </main>
    </div>
  );
}
