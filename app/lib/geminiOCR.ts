export type MilkCardRow = {
  date: string;
  morning: number;
  evening: number;
};

export async function extractMilkCardData(imageBase64: string): Promise<MilkCardRow[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.NEXT_PUBLIC_GEMINI_API_KEY}`,
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
                text: `This is a printed milk collection card/table with English numbers.
Extract every row from the table.
Each row has: date, morning milk litres, evening milk litres.
Return ONLY a raw JSON array. No markdown. No explanation. No backticks.
Format: [{"date":"01/06/2026","morning":4.5,"evening":3.0}]
If a value is unclear, make best guess based on surrounding context.`,
              },
            ],
          },
        ],
      }),
    }
  );

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini OCR returned no readable content");
  }
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}
