import { NextRequest, NextResponse } from "next/server";
import { createRateLimiter, getClientIp } from "../../../lib/rateLimit";

const rateLimit = createRateLimiter(20, 60 * 1000); // 20 requests per minute per IP

export async function POST(req: NextRequest) {
  if (!rateLimit(getClientIp(req))) {
    return NextResponse.json({ error: "Too many requests. Please wait." }, { status: 429 });
  }

  const { imageBase64 } = await req.json();

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "Image is required" }, { status: 400 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: imageBase64,
                },
              },
              {
                text: `This is a printed milk collection table.
Extract each row with these fields:
- date: just the day number (1, 2, 3... or 01, 02...)
- morning: morning milk in litres (decimal number)
- evening: evening milk in litres (decimal number)

Return ONLY valid JSON array like:
[{"date":"1","morning":4.5,"evening":3.0},{"date":"2","morning":4.0,"evening":3.5}]

Important:
- Extract ONLY the day number, not the full date
- Use 0 if morning or evening is empty/blank
- Skip rows with no milk data
- No explanation, no markdown, just JSON`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 2048,
        },
      }),
    }
  );

  const data = await response.json();

  if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
    console.error("Gemini error response:", JSON.stringify(data));
    return NextResponse.json({ error: "Could not read image" }, { status: 400 });
  }

  const text = data.candidates[0].content.parts[0].text;
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return NextResponse.json({ error: "No data found in image." }, { status: 400 });
    }
    return NextResponse.json({ data: parsed });
  } catch {
    return NextResponse.json({ error: "Could not parse response" }, { status: 400 });
  }
}
