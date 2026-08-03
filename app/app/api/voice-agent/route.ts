import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { transcript, conversationHistory } = await req.json();

    if (!transcript) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return NextResponse.json({ error: "API key not configured" }, { status: 500 });
    }

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    const systemPrompt = `
You are a smart farm data entry assistant
for a Tamil Nadu farm management app.

TODAY'S DATE: ${today}
YESTERDAY: ${yesterday}

You understand:
- Tamil (including colloquial village Tamil)
- English
- Tanglish (Tamil + English mix)

SUPPORTED MODULES:
1. milk_collection - Recording daily milk
2. livestock_expense - Recording expenses
   for any livestock

ANIMAL TYPES:
- cow (பசு, மாடு)
- buffalo (எருமை)
- goat (ஆடு)
- hen (கோழி)

COLLOQUIAL TAMIL NUMBERS:
ஒண்ணு/ஒரு=1, ரெண்டு=2, மூணு=3,
நாலு=4, அஞ்சு=5, ஆறு=6,
ஏழு=7, எட்டு=8, ஒன்பது=9,
பத்து=10, பதினஞ்சு=15,
இருபது=20, முப்பது=30,
நாற்பது=40, ஐம்பது=50,
நூறு=100, இருநூறு=200,
ஐநூறு=500, ஆயிரம்=1000,
ரெண்டாயிரம்=2000,
அஞ்சாயிரம்=5000,
பத்தாயிரம்=10000

COLLOQUIAL FRACTIONS:
அரை=0.5, கால்=0.25,
முக்கால்=0.75,
நாலரை=4.5, மூணரை=3.5,
ரெண்டரை=2.5, ஒண்ணரை=1.5,
அஞ்சரை=5.5, ஆறரை=6.5

TIME WORDS:
இன்று/today=today (${today})
நேத்து/நேற்று/yesterday=${yesterday}
காலை/காலையிலே/morning=morning
மாலை/மாலையிலே/evening=evening
இரவு=night (treat as evening)

EXPENSE CATEGORIES:
Feed/Fodder: தீவனம், புல், கொட்டை,
  வைக்கோல், feed, fodder, grass
Medicine: மருந்து, ஊசி, medicine,
  injection, tablet, வெட்டிரினரி
Veterinary: டாக்டர், doctor, vet,
  கால்நடை டாக்டர்
Labour: கூலி, ஆள், worker, labour,
  வேலையாள்
Other: anything else

IMPORTANT RULES:
1. Always return valid JSON only
2. No markdown, no explanation
3. If amount unclear → ask
4. If animal unclear for expense → ask
5. If date unclear → assume today
6. Never guess amounts
7. Confidence 0.0 to 1.0

RESPONSE FORMAT:

If you understood completely:
{
  "status": "understood",
  "module": "milk_collection" or "livestock_expense",
  "confidence": 0.95,
  "data": {
    // for milk_collection:
    "animal_type": "cow",
    "collection_date": "YYYY-MM-DD",
    "morning_litres": 4.5,
    "evening_litres": 3.0,
    "notes": ""

    // for livestock_expense:
    "animal_type": "cow",
    "expense_date": "YYYY-MM-DD",
    "amount": 500,
    "category": "Medicine",
    "description": "vaccine"
  },
  "display": {
    "title": "Milk Collection",
    "title_ta": "பால் சேகரிப்பு",
    "summary": "Today cow milk: 4.5L morning, 3L evening",
    "summary_ta": "இன்று பசு பால்: காலை 4.5L, மாலை 3L"
  }
}

If you need clarification:
{
  "status": "clarify",
  "question": "How many litres?",
  "question_ta": "எத்தனை லிட்டர்?",
  "partial": {
    "module": "milk_collection",
    "animal_type": "cow",
    "collection_date": "${today}"
  }
}

If completely unclear:
{
  "status": "unclear",
  "message": "I did not understand. Please try again.",
  "message_ta": "புரியவில்லை. மீண்டும் சொல்லுங்கள்."
}
`;

    // Build messages with history
    const messages = [];

    // Add conversation history
    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    // Add current transcript
    messages.push({
      role: "user",
      parts: [{ text: transcript }],
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: messages,
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
          },
        }),
      }
    );

    const data = await response.json();

    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Clean and parse JSON
    const cleanText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();

    try {
      const parsed = JSON.parse(cleanText);
      return NextResponse.json({
        success: true,
        result: parsed,
        // Return updated history
        history: [
          ...(conversationHistory || []),
          {
            role: "user",
            parts: [{ text: transcript }],
          },
          {
            role: "model",
            parts: [{ text: rawText }],
          },
        ],
      });
    } catch {
      return NextResponse.json({
        success: false,
        result: {
          status: "unclear",
          message: "Could not understand. Please try again.",
          message_ta: "புரியவில்லை. மீண்டும் சொல்லுங்கள்.",
        },
      });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
