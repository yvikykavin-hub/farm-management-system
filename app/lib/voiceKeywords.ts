// ================================
// TAMIL NUMBER MAPPINGS
// ================================

const tamilNumbers: Record<string, number> = {
  // Basic numbers
  ஒண்ணு: 1, ஒரு: 1, ஒன்று: 1,
  ரெண்டு: 2, இரண்டு: 2,
  மூணு: 3, மூன்று: 3,
  நாலு: 4, நான்கு: 4,
  அஞ்சு: 5, ஐந்து: 5,
  ஆறு: 6,
  ஏழு: 7,
  எட்டு: 8,
  ஒன்பது: 9, ஒம்பது: 9,
  பத்து: 10,
  பதினஒன்று: 11, பதினொன்று: 11,
  பன்னிரண்டு: 12,
  பதிமூன்று: 13,
  பதினான்கு: 14,
  பதினஞ்சு: 15, பதினைந்து: 15,
  பதினாறு: 16,
  பதினேழு: 17,
  பதினெட்டு: 18,
  பத்தொன்பது: 19,
  இருபது: 20,
  முப்பது: 30,
  நாற்பது: 40,
  ஐம்பது: 50,
  அறுபது: 60,
  எழுபது: 70,
  எண்பது: 80,
  தொண்ணூறு: 90,
  நூறு: 100,
  இருநூறு: 200,
  முந்நூறு: 300,
  நானூறு: 400,
  ஐநூறு: 500,
  அறுநூறு: 600,
  எழுநூறு: 700,
  எண்ணூறு: 800,
  தொள்ளாயிரம்: 900,
  ஆயிரம்: 1000,
  ரெண்டாயிரம்: 2000,
  மூவாயிரம்: 3000,
  நாலாயிரம்: 4000,
  அஞ்சாயிரம்: 5000,
  பத்தாயிரம்: 10000,

  // Fractions
  அரை: 0.5,
  கால்: 0.25,
  முக்கால்: 0.75,

  // Common combinations
  ஒண்ணரை: 1.5, ஒன்னரை: 1.5,
  ரெண்டரை: 2.5, இரண்டரை: 2.5,
  மூணரை: 3.5, மூன்றரை: 3.5,
  நாலரை: 4.5, நான்கரை: 4.5,
  அஞ்சரை: 5.5, ஐந்தரை: 5.5,
  ஆறரை: 6.5,
  ஏழரை: 7.5,
  எட்டரை: 8.5,
};

// ================================
// KEYWORD LISTS
// ================================

const MILK_KEYWORDS = [
  // English
  "milk", "litre", "litres", "liter", "liters",
  "morning milk", "evening milk",
  "collected", "collection",
  // Tamil
  "பால்", "லிட்டர்", "கறந்தோம்",
  "கறந்துச்சு", "வந்துச்சு", "வந்தது",
  "சேகரிப்பு", "கறவை",
];

const EXPENSE_KEYWORDS = [
  // English
  "expense", "spent", "paid", "bought",
  "purchased", "cost", "rupees", "rs",
  "feed", "fodder", "medicine", "medical",
  "doctor", "vet", "veterinary",
  "labour", "labor", "worker",
  // Tamil
  "செலவு", "ரூபாய்", "வாங்கினோம்",
  "கொடுத்தோம்", "தீவனம்", "புல்",
  "கொட்டை", "வைக்கோல்", "மருந்து",
  "ஊசி", "டாக்டர்", "கூலி", "ஆள்",
];

const ANIMAL_KEYWORDS: Record<string, string[]> = {
  cow: [
    "cow", "cows", "cattle",
    "பசு", "மாடு", "மாடுகள்", "கறவை மாடு",
  ],
  buffalo: [
    "buffalo", "buffaloes",
    "எருமை", "எருமைகள்", "எருமை மாடு",
  ],
  goat: [
    "goat", "goats",
    "ஆடு", "ஆடுகள்", "வெள்ளாடு",
  ],
  hen: [
    "hen", "hens", "chicken",
    "chickens", "poultry",
    "கோழி", "கோழிகள்", "பறவை",
  ],
};

const DATE_KEYWORDS: Record<string, string> = {
  // English
  today: "today",
  now: "today",
  "this morning": "today",
  "this evening": "today",
  yesterday: "yesterday",
  "last night": "yesterday",
  // Tamil
  இன்று: "today",
  இன்னைக்கு: "today",
  இப்போ: "today",
  நேத்து: "yesterday",
  நேற்று: "yesterday",
  நேத்தைக்கு: "yesterday",
  "கடைசி நாள்": "yesterday",
};

const SESSION_KEYWORDS: Record<string, "morning" | "evening"> = {
  // English
  morning: "morning",
  am: "morning",
  evening: "evening",
  pm: "evening",
  night: "evening",
  afternoon: "evening",
  // Tamil
  காலை: "morning",
  காலையிலே: "morning",
  காலையில்: "morning",
  காலைல: "morning",
  மாலை: "evening",
  மாலையிலே: "evening",
  மாலையில்: "evening",
  மாலைல: "evening",
  இரவு: "evening",
  இரவிலே: "evening",
};

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Feed: [
    "feed", "fodder", "grass", "hay",
    "grain", "bran", "silage",
    "தீவனம்", "புல்", "கொட்டை",
    "வைக்கோல்", "தவிடு", "உணவு",
  ],
  Medicine: [
    "medicine", "tablet", "injection",
    "vaccine", "drug", "medical",
    "மருந்து", "ஊசி", "மாத்திரை",
    "தடுப்பூசி", "சிகிச்சை",
  ],
  Veterinary: [
    "doctor", "vet", "veterinary",
    "veterinarian", "checkup",
    "டாக்டர்", "கால்நடை டாக்டர்",
    "வைத்தியர்", "பரிசோதனை",
  ],
  Labour: [
    "labour", "labor", "worker",
    "help", "assistant", "wages",
    "கூலி", "ஆள்", "வேலையாள்",
    "உதவியாள்", "கூலிஆள்",
  ],
};

// ================================
// NUMBER EXTRACTION
// ================================

export function extractNumbers(text: string): number[] {
  const numbers: number[] = [];
  const lowerText = text.toLowerCase();

  // Extract Tamil numbers first
  for (const [word, value] of Object.entries(tamilNumbers)) {
    if (lowerText.includes(word)) {
      numbers.push(value);
    }
  }

  // Extract numeric values
  const numericMatches = text.match(/\d+(\.\d+)?/g);
  if (numericMatches) {
    numericMatches.forEach((n) => {
      const val = parseFloat(n);
      if (!isNaN(val) && !numbers.includes(val)) {
        numbers.push(val);
      }
    });
  }

  return numbers;
}

// ================================
// MAIN KEYWORD ENGINE
// ================================

export interface KeywordResult {
  module: "milk_collection" | "livestock_expense" | "unknown";
  animal_type: string;
  date: string;
  morning_litres?: number;
  evening_litres?: number;
  amount?: number;
  category?: string;
  confidence: number;
  missing: string[];
}

export function processKeywords(transcript: string): KeywordResult {
  const text = transcript.toLowerCase();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  let confidence = 0;
  const missing: string[] = [];

  // ── Detect Module ──
  // Named moduleType (not `module`) — Next.js's lint rules disallow shadowing
  // the CommonJS `module` global.
  let moduleType: KeywordResult["module"] = "unknown";

  const hasMilk = MILK_KEYWORDS.some((k) => text.includes(k.toLowerCase()));
  const hasExpense = EXPENSE_KEYWORDS.some((k) => text.includes(k.toLowerCase()));

  if (hasMilk && !hasExpense) {
    moduleType = "milk_collection";
    confidence += 30;
  } else if (hasExpense && !hasMilk) {
    moduleType = "livestock_expense";
    confidence += 30;
  } else if (hasMilk && hasExpense) {
    // Both found - milk takes priority if litre mentioned
    moduleType = text.includes("litre") || text.includes("லிட்டர்") ? "milk_collection" : "livestock_expense";
    confidence += 20;
  } else {
    missing.push("module");
  }

  // ── Detect Animal ──
  let animal_type = "cow"; // default
  let animalFound = false;

  for (const [animal, keywords] of Object.entries(ANIMAL_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k.toLowerCase()))) {
      animal_type = animal;
      animalFound = true;
      break;
    }
  }

  if (animalFound) {
    confidence += 20;
  } else {
    // Default to cow
    confidence += 10;
  }

  // ── Detect Date ──
  let date = today;
  let dateFound = false;

  for (const [keyword, value] of Object.entries(DATE_KEYWORDS)) {
    if (text.includes(keyword.toLowerCase())) {
      date = value === "yesterday" ? yesterday : today;
      dateFound = true;
      break;
    }
  }

  if (dateFound) {
    confidence += 10;
  }
  // Date defaults to today - no penalty

  // ── Extract Numbers ──
  const numbers = extractNumbers(transcript);

  // ── Detect Sessions (Milk) ──
  let morning_litres: number | undefined;
  let evening_litres: number | undefined;

  if (moduleType === "milk_collection") {
    const words = transcript.split(/\s+/);
    let lastSession: "morning" | "evening" | null = null;

    for (let i = 0; i < words.length; i++) {
      const word = words[i].toLowerCase();

      // Check if word is session keyword
      for (const [kw, session] of Object.entries(SESSION_KEYWORDS)) {
        if (word.includes(kw.toLowerCase())) {
          lastSession = session;
          break;
        }
      }

      // Check if word is a number
      const numVal = parseFloat(word);
      if (!isNaN(numVal) && lastSession) {
        if (lastSession === "morning") {
          morning_litres = numVal;
        } else {
          evening_litres = numVal;
        }
        lastSession = null;
      }

      // Check Tamil numbers
      for (const [tamilWord, value] of Object.entries(tamilNumbers)) {
        if (word.includes(tamilWord.toLowerCase()) && lastSession) {
          if (lastSession === "morning") {
            morning_litres = value;
          } else {
            evening_litres = value;
          }
          lastSession = null;
          break;
        }
      }
    }

    // If no session found but numbers exist, assign to morning first then evening
    if (morning_litres === undefined && evening_litres === undefined && numbers.length > 0) {
      if (numbers.length >= 2) {
        morning_litres = numbers[0];
        evening_litres = numbers[1];
      } else {
        morning_litres = numbers[0];
      }
    }

    if (morning_litres !== undefined || evening_litres !== undefined) {
      confidence += 20;
    } else {
      missing.push("litres");
    }
  }

  // ── Detect Amount (Expense) ──
  let amount: number | undefined;

  if (moduleType === "livestock_expense") {
    if (numbers.length > 0) {
      // Largest number is likely amount
      amount = Math.max(...numbers);
      confidence += 20;
    } else {
      missing.push("amount");
    }
  }

  // ── Detect Category (Expense) ──
  let category: string | undefined;

  if (moduleType === "livestock_expense") {
    for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
      if (keywords.some((k) => text.includes(k.toLowerCase()))) {
        category = cat;
        confidence += 20;
        break;
      }
    }

    if (!category) {
      category = "Other";
      // No penalty - default to Other
    }
  }

  return {
    module: moduleType,
    animal_type,
    date,
    morning_litres,
    evening_litres,
    amount,
    category,
    confidence,
    missing,
  };
}
