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
    { data: fertilizerApplications },
    { data: weedRemovals },
    { data: harvestRecords },
    { data: irrigationRecords },
  ] = await Promise.all([
    supabase.from("farms").select("*"),
    supabase.from("cultivations").select("*").order("created_at", { ascending: false }).limit(75),
    supabase.from("income_records").select("*").order("income_date", { ascending: false }).limit(75),
    supabase.from("expense_records").select("*").order("expense_date", { ascending: false }).limit(75),
    supabase.from("cows").select("*"),
    supabase.from("milk_collections").select("*").order("collection_date", { ascending: false }).limit(75),
    supabase.from("milk_payments").select("*").order("payment_date", { ascending: false }).limit(75),
    supabase.from("tractor_usage").select("*").order("date", { ascending: false }).limit(75),
    supabase.from("tractor_diesel").select("*").order("date", { ascending: false }).limit(75),
    supabase.from("coconut_details").select("*"),
    supabase.from("turmeric_details").select("*"),
    supabase.from("kuchi_kilangu_details").select("*"),
    supabase.from("ellu_details").select("*"),
    supabase.from("nell_details").select("*"),
    supabase.from("goat_income").select("*").limit(75),
    supabase.from("goat_expenses").select("*").limit(75),
    supabase.from("hen_income").select("*").limit(75),
    supabase.from("hen_expenses").select("*").limit(75),
    supabase.from("cow_expenses").select("*").limit(75),
    supabase.from("milk_rates").select("*"),
    supabase.from("tractor_engine_oil").select("*").limit(75),
    supabase.from("tractor_settings").select("*"),
    supabase.from("rotavator_blades").select("*").limit(75),
    supabase.from("kalappai_blades").select("*").limit(75),
    supabase.from("goats").select("*"),
    supabase.from("hens").select("*"),
    supabase.from("fertilizer_applications").select("*").order("application_date", { ascending: false }).limit(500),
    supabase.from("weed_removals").select("*").order("start_date", { ascending: false }).limit(500),
    supabase.from("harvest_records").select("*").order("harvest_date", { ascending: false }).limit(500),
    supabase.from("irrigation_records").select("*").order("irrigation_date", { ascending: false }).limit(500),
  ]);

  // Sugarcane, onion, and fodder corn have no dedicated *_details table — their
  // variety/quantity info lives directly on each cultivation row, so derive a
  // sugarcane-specific slice from cultivations rather than querying a table
  // that doesn't exist.
  const sugarcaneDetails = cultivations?.filter((c) => c.crop_type === "sugarcane");

  const farmContext = `
You are an expert AI farm advisor for Marutham Farm
Management System owned by a Tamil Nadu farmer.

You have access to COMPLETE historical farm data
spanning multiple years. Use ALL this data for:
1. Answering factual questions accurately
2. Identifying patterns and trends
3. Making predictions and recommendations
4. Reconstructing complete cultivation processes

LANGUAGE: Answer in ${language === "ta" ? "Tamil" : "English"} only.

FORMAT RULES:
- Use ₹ for money with Indian number format
- Use emojis to make answers readable
- Structure answers with clear sections
- For predictions: show year-by-year comparison
- For processes: show month-by-month timeline
- Keep answers clear and practical for farmers

PREDICTION RULES:
When asked for best crop or recommendations:
1. Compare ALL crops across ALL years
2. Calculate average profit per crop
3. Identify which conditions gave best results
4. Recommend based on patterns
5. Give confidence level (High/Medium/Low)

PROCESS RECONSTRUCTION RULES:
When asked about cultivation process:
1. Find ALL records for that crop
2. Sort chronologically
3. Build complete timeline:
   - Planting details (variety, quantity, date)
   - Monthly fertilizer applications
   - Pesticide/spray schedule
   - Weed removal activities
   - Labour and costs
   - Harvest details
   - Income and profit
4. Present as actionable guide

CALCULATION RULES:
- Always calculate totals when asked
- Show profit = income - expense
- Show year-wise comparison when relevant
- Calculate averages across seasons

FARM DATA (Complete Historical Records):
═══════════════════════════════════════

FARMS:
${JSON.stringify(farms)}

CULTIVATIONS (All years):
${JSON.stringify(cultivations)}

INCOME RECORDS (All years):
${JSON.stringify(incomeRecords)}

EXPENSE RECORDS (All years):
${JSON.stringify(expenseRecords)}

COWS:
${JSON.stringify(cows)}

MILK COLLECTIONS (All records):
${JSON.stringify(milkCollections)}

MILK PAYMENTS:
${JSON.stringify(milkPayments)}

MILK RATES HISTORY:
${JSON.stringify(milkRates)}

COW EXPENSES:
${JSON.stringify(cowExpenses)}

GOATS:
${JSON.stringify(goats)}

GOAT INCOME:
${JSON.stringify(goatIncome)}

GOAT EXPENSES:
${JSON.stringify(goatExpenses)}

HENS:
${JSON.stringify(hens)}

HEN INCOME:
${JSON.stringify(henIncome)}

HEN EXPENSES:
${JSON.stringify(henExpenses)}

TRACTOR USAGE (All records):
${JSON.stringify(tractorUsage)}

TRACTOR DIESEL:
${JSON.stringify(tractorDiesel)}

TRACTOR ENGINE OIL:
${JSON.stringify(tractorEngineOil)}

TRACTOR SETTINGS:
${JSON.stringify(tractorSettings)}

ROTAVATOR BLADES:
${JSON.stringify(rotavatorBlades)}

KALAPPAI BLADES:
${JSON.stringify(kalappaiBlades)}

COCONUT DETAILS:
${JSON.stringify(coconutDetails)}

TURMERIC DETAILS:
${JSON.stringify(turmericDetails)}

SUGARCANE DETAILS:
${JSON.stringify(sugarcaneDetails)}

NELL/RICE DETAILS:
${JSON.stringify(nellDetails)}

KUCHI KILANGU DETAILS:
${JSON.stringify(kuchiKilanguDetails)}

ELLU DETAILS:
${JSON.stringify(elluDetails)}

FERTILIZER APPLICATIONS:
${JSON.stringify(fertilizerApplications)}

WEED REMOVAL RECORDS:
${JSON.stringify(weedRemovals)}

HARVEST RECORDS:
${JSON.stringify(harvestRecords)}

IRRIGATION RECORDS:
${JSON.stringify(irrigationRecords)}

═══════════════════════════════════════

USER QUESTION: ${message}

IMPORTANT:
- Base ALL answers on the actual data above
- Never make up data that is not in the records
- If data is insufficient for prediction,
  say so honestly and explain what data is needed
- For Tamil questions, answer in Tamil
- For English questions, answer in English
- Always be helpful and practical
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
          maxOutputTokens: 1500,
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
