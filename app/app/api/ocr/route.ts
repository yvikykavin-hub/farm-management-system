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
                text: `This is a milk collection table.
Extract each row with date, morning litres, evening litres.
Return ONLY valid JSON array like this example:
[{"date":"01/06/2026","morning":4.5,"evening":3.0}]
No explanation. No markdown. Just the JSON array.`,
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
