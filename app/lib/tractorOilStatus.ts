import { supabase } from "./supabase";

export type TractorOilStatus = {
  totalHours: number;
  hoursRemaining: number;
  isUrgent: boolean;
  isWarning: boolean;
  isOk: boolean;
};

export const DEFAULT_OIL_CHANGE_INTERVAL_HOURS = 300;

export const getTractorOilStatus = async (tractorId: string): Promise<TractorOilStatus> => {
  const [{ data: usageData }, { data: lastOil }, { data: tractorData }] = await Promise.all([
    supabase.from("tractor_usage").select("duration_hours").eq("tractor_id", tractorId),
    supabase.from("tractor_engine_oil").select("hours_at_service").eq("tractor_id", tractorId).order("date", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("tractors").select("oil_change_interval_hours").eq("id", tractorId).maybeSingle(),
  ]);

  const totalHours = (usageData ?? []).reduce((sum, u) => sum + (Number(u.duration_hours) || 0), 0);
  const interval = tractorData?.oil_change_interval_hours ? Number(tractorData.oil_change_interval_hours) : DEFAULT_OIL_CHANGE_INTERVAL_HOURS;
  const lastOilHours = lastOil?.hours_at_service ? Number(lastOil.hours_at_service) : 0;
  const hoursSinceOil = totalHours - lastOilHours;
  const hoursRemaining = interval - hoursSinceOil;

  return {
    totalHours,
    hoursRemaining,
    isUrgent: hoursRemaining <= 20,
    isWarning: hoursRemaining <= 50 && hoursRemaining > 20,
    isOk: hoursRemaining > 50,
  };
};
