import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { message, language, accessToken } = await req.json();

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }

  // Authenticate the server-side client with the caller's session token so
  // RLS policies (scoped to the `authenticated` role) actually return rows —
  // a client built with only the anon key and no forwarded session would see
  // nothing on every table.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : undefined
  );

  const [
    { data: farms },
    { data: cultivations },
    { data: incomeRecords },
    { data: expenseRecords },
    { data: cows },
    { data: milkCollections },
    { data: milkPayments },
    { data: tractorUsage },
    { data: tractorDiesel },
    { data: coconutDetails },
    { data: turmericDetails },
    { data: kuchiKilanguDetails },
    { data: elluDetails },
    { data: nellDetails },
    { data: goatIncome },
    { data: goatExpenses },
    { data: henIncome },
    { data: henExpenses },
    { data: cowExpenses },
    { data: milkRates },
    { data: tractorEngineOil },
    { data: tractorSettings },
    { data: rotavatorBlades },
    { data: kalappaiBlades },
    { data: goats },
    { data: hens },
  ] = await Promise.all([
    supabase.from("farms").select("*"),
    supabase.from("cultivations").select("*").order("created_at", { ascending: false }).limit(20),
    supabase.from("income_records").select("*").order("income_date", { ascending: false }).limit(20),
    supabase.from("expense_records").select("*").order("expense_date", { ascending: false }).limit(20),
    supabase.from("cows").select("*"),
    supabase.from("milk_collections").select("*").order("collection_date", { ascending: false }).limit(30),
    supabase.from("milk_payments").select("*").order("payment_date", { ascending: false }).limit(10),
    supabase.from("tractor_usage").select("*").order("date", { ascending: false }).limit(10),
    supabase.from("tractor_diesel").select("*").order("date", { ascending: false }).limit(10),
    supabase.from("coconut_details").select("*"),
    supabase.from("turmeric_details").select("*"),
    supabase.from("kuchi_kilangu_details").select("*"),
    supabase.from("ellu_details").select("*"),
    supabase.from("nell_details").select("*"),
    supabase.from("goat_income").select("*").limit(10),
    supabase.from("goat_expenses").select("*").limit(10),
    supabase.from("hen_income").select("*").limit(10),
    supabase.from("hen_expenses").select("*").limit(10),
    supabase.from("cow_expenses").select("*").limit(10),
    supabase.from("milk_rates").select("*"),
    supabase.from("tractor_engine_oil").select("*").limit(5),
    supabase.from("tractor_settings").select("*"),
    supabase.from("rotavator_blades").select("*").limit(5),
    supabase.from("kalappai_blades").select("*").limit(5),
    supabase.from("goats").select("*"),
    supabase.from("hens").select("*"),
  ]);

  const farmContext = `
You are an expert farm assistant AI for Marutham FMS.
You have access to ALL farm data below.
Always perform calculations when asked (totals, averages, differences, profit/loss etc).
Be specific with numbers — never say data not available if it exists in the context.
Answer in ${language === "ta" ? "Tamil" : "English"} only.
Use ₹ for money. Format numbers with Indian number system.

FARM DATA:
Farms: ${JSON.stringify(farms)}
Active Cultivations: ${JSON.stringify(cultivations?.filter((c) => !c.end_date))}
Completed Cultivations: ${JSON.stringify(cultivations?.filter((c) => c.end_date))}
Recent Income: ${JSON.stringify(incomeRecords)}
Recent Expenses: ${JSON.stringify(expenseRecords)}

Coconut Details: ${JSON.stringify(coconutDetails)}
Turmeric Details: ${JSON.stringify(turmericDetails)}
Kuchi Kilangu Details: ${JSON.stringify(kuchiKilanguDetails)}
Ellu Details: ${JSON.stringify(elluDetails)}
Nell (Rice) Details: ${JSON.stringify(nellDetails)}
(Note: Sugarcane, Onion, and Fodder Corn variety/quantity info is stored directly on each cultivation's variety_name/quantity/quantity_unit fields above, not in a separate details table.)

Cows: ${JSON.stringify(cows)}
Cow Expenses: ${JSON.stringify(cowExpenses)}
Milk Rates: ${JSON.stringify(milkRates)}
Recent Milk Collections: ${JSON.stringify(milkCollections)}
Milk Payments: ${JSON.stringify(milkPayments)}

Goats: ${JSON.stringify(goats)}
Goat Income: ${JSON.stringify(goatIncome)}
Goat Expenses: ${JSON.stringify(goatExpenses)}

Hens: ${JSON.stringify(hens)}
Hen Income: ${JSON.stringify(henIncome)}
Hen Expenses: ${JSON.stringify(henExpenses)}

Tractor Usage: ${JSON.stringify(tractorUsage)}
Tractor Diesel: ${JSON.stringify(tractorDiesel)}
Tractor Engine Oil: ${JSON.stringify(tractorEngineOil)}
Tractor Settings: ${JSON.stringify(tractorSettings)}
Rotavator Blades: ${JSON.stringify(rotavatorBlades)}
Kalappai Blades: ${JSON.stringify(kalappaiBlades)}

Answer the following question based on this data:
${message}

Keep answer short and clear.
Use emojis where appropriate.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: farmContext }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 500,
        },
      }),
    }
  );

  const data = await response.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!answer) {
    console.error("Gemini chat error response:", JSON.stringify(data));
    return NextResponse.json({
      reply:
        language === "ta"
          ? "மன்னிக்கவும், பதில் கிடைக்கவில்லை. மீண்டும் முயற்சிக்கவும்."
          : "Sorry, could not get a response. Please try again.",
    });
  }

  return NextResponse.json({ reply: answer });
}
