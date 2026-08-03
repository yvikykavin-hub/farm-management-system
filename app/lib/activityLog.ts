import { supabase } from "./supabase";

export type ActionType = "added" | "updated" | "deleted";

export type ModuleType =
  | "Milk Collection"
  | "Cow Expense"
  | "Milk Payment"
  | "Milk Rate"
  | "Crop"
  | "Farm"
  | "Income"
  | "Expense"
  | "Animal"
  | "Tractor"
  | "Tractor Diesel"
  | "Tractor Usage"
  | "Tractor Oil"
  | "Tractor Maintenance"
  | "Land Details"
  | "Land Document"
  | "Motor Sharing"
  | "Goat Income"
  | "Goat Expense"
  | "Hen Income"
  | "Hen Expense"
  | "Payment";

const DISPLAY_NAMES: Record<string, string> = {
  kavin: "Kavin",
  sachin: "Sachin",
  madhu: "Madhu",
  unknown: "Unknown",
};

export async function logActivity(action: ActionType, module: ModuleType, description: string, recordId?: string) {
  try {
    const username = localStorage.getItem("marutham_current_user") || "unknown";
    const displayName = DISPLAY_NAMES[username] || username;

    await supabase.from("activity_logs").insert({
      username,
      display_name: displayName,
      action,
      module,
      description,
      record_id: recordId || null,
    });
  } catch (error) {
    console.error("Activity log error:", error);
  }
}

export const ActivityLog = {
  added: (module: ModuleType, description: string, id?: string) => logActivity("added", module, description, id),

  updated: (module: ModuleType, description: string, id?: string) => logActivity("updated", module, description, id),

  deleted: (module: ModuleType, description: string, id?: string) => logActivity("deleted", module, description, id),
};
