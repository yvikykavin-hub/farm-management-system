export type MilkCardRow = {
  date: string;
  morning: number;
  evening: number;
};

export async function extractMilkCardData(imageBase64: string): Promise<MilkCardRow[]> {
  const response = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64 }),
  });

  if (!response.ok) {
    throw new Error("Could not read image. Please try a clearer photo.");
  }

  const { data } = await response.json();
  return data;
}
