export type MilkCardRow = {
  date: string;
  morning: number;
  evening: number;
};

export async function extractMilkCardData(imageBase64: string): Promise<MilkCardRow[]> {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
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
    throw new Error("Could not read image. Please try a clearer photo.");
  }

  const text = data.candidates[0].content.parts[0].text;
  const clean = text.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(clean);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      throw new Error("No data found in image.");
    }
    return parsed;
  } catch {
    throw new Error("Could not read table. Please try a clearer photo.");
  }
}
