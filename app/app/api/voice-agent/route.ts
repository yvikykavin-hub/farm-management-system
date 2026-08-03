import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript" }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key missing" }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Simplified prompt - NO questions!
    const prompt = `
You are a Tamil Nadu farm data extractor.
TODAY: ${today}
YESTERDAY: ${yesterday}

Extract farm data from this voice input.
Language may be Tamil, English or mixed.

Tamil numbers:
ஒண்ணு=1,ரெண்டு=2,மூணு=3,நாலு=4,
அஞ்சு=5,ஆறு=6,ஏழு=7,எட்டு=8,
ஒன்பது=9,பத்து=10,நூறு=100,
ஆயிரம்=1000,ரெண்டாயிரம்=2000,
நாலரை=4.5,மூணரை=3.5,ரெண்டரை=2.5,
ஒண்ணரை=1.5,அஞ்சரை=5.5,ஆறரை=6.5,
அரை=0.5,கால்=0.25

Time: இன்று/today=${today}, நேத்து/yesterday=${yesterday}
Animal: பசு/மாடு=cow, எருமை=buffalo,
        ஆடு=goat, கோழி=hen

RULES (VERY IMPORTANT):
1. NEVER ask questions
2. ALWAYS return JSON
3. Use smart defaults:
   - Missing date → ${today}
   - Missing animal → cow
   - Missing amount → 0
   - Missing session → use 0
4. Return your BEST GUESS always
5. No markdown, no explanation

RETURN FORMAT:
{
  "module": "milk_collection" OR "livestock_expense",
  "animal_type": "cow|buffalo|goat|hen",
  "date": "YYYY-MM-DD",
  "morning_litres": 0,
  "evening_litres": 0,
  "amount": 0,
  "category": "Feed|Medicine|Veterinary|Labour|Other",
  "description": "",
  "confidence": 0.0-1.0
}

Voice input: "${transcript}"
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 300,
          },
        }),
      }
    );

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(clean);
      return NextResponse.json({
        success: true,
        result: parsed,
      });
    } catch {
      return NextResponse.json({
        success: false,
        error: "Parse error",
      });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
