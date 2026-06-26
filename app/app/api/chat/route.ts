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
  ]);

  const farmContext = `
You are an AI assistant for Marutham Farm Management System.
You help farmers understand their farm data and answer questions.
Answer in ${language === "ta" ? "Tamil" : "English"}.
Be concise and helpful. Use ₹ for money. Format numbers with Indian number system.

FARM DATA:
Farms: ${JSON.stringify(farms)}
Active Cultivations: ${JSON.stringify(cultivations?.filter((c) => !c.end_date))}
Completed Cultivations: ${JSON.stringify(cultivations?.filter((c) => c.end_date))}
Recent Income: ${JSON.stringify(incomeRecords)}
Recent Expenses: ${JSON.stringify(expenseRecords)}
Cows: ${JSON.stringify(cows)}
Recent Milk Collections: ${JSON.stringify(milkCollections)}
Milk Payments: ${JSON.stringify(milkPayments)}
Tractor Usage: ${JSON.stringify(tractorUsage)}
Tractor Diesel: ${JSON.stringify(tractorDiesel)}

Answer the following question based on this data:
${message}

If data is not available, say so politely.
Keep answer short and clear.
Use emojis where appropriate.
`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
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
