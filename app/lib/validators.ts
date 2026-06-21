// Shared validation helpers used across forms (crops, livestock, machinery, farms).
// Errors block save; warnings are informational only and never block save.

export const isValidIndianMobile = (value: string) => /^[6-9]\d{9}$/.test(value.trim());

export const phoneError = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  if (!isValidIndianMobile(value)) {
    return lang === "ta" ? "சரியான 10 இலக்க மொபைல் எண் உள்ளிடவும்" : "Enter valid 10-digit mobile number";
  }
  return "";
};

export const dateRangeError = (startDate: string, endDate: string, lang: "ta" | "en"): string => {
  if (!startDate || !endDate) return "";
  if (endDate <= startDate) {
    return lang === "ta" ? "முடிவு தேதி தொடக்க தேதிக்கு பிறகு இருக்க வேண்டும்" : "End date must be after start date";
  }
  return "";
};

export const positiveAmountError = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  if (parseFloat(value) <= 0) {
    return lang === "ta" ? "தொகை பூஜ்யத்தை விட அதிகமாக இருக்க வேண்டும்" : "Amount must be greater than zero";
  }
  return "";
};

export const positiveQuantityError = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  if (parseFloat(value) <= 0) {
    return lang === "ta" ? "அளவு பூஜ்யத்தை விட அதிகமாக இருக்க வேண்டும்" : "Quantity must be greater than zero";
  }
  return "";
};

export const areaError = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  const n = parseFloat(value);
  if (n <= 0 || n >= 1000) {
    return lang === "ta" ? "பரப்பளவு 0 முதல் 1000 ஏக்கருக்கு இடையில் இருக்க வேண்டும்" : "Area must be greater than 0 and less than 1000 acres";
  }
  return "";
};

export const nameError = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  const trimmed = value.trim();
  if (trimmed.length < 2 || /^\d+$/.test(trimmed) || /^[^a-zA-Z0-9஀-௿]+$/.test(trimmed)) {
    return lang === "ta" ? "சரியான பெயரை உள்ளிடவும் (குறைந்தது 2 எழுத்துகள்)" : "Enter a valid name (min 2 characters)";
  }
  return "";
};

export const milkRateWarning = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  const n = parseFloat(value);
  if (n > 200 || n < 10) {
    return lang === "ta" ? "⚠️ விலை வழக்கத்திற்கு மாறானது (₹10–₹200 இடையில் இருக்க வேண்டும்)" : "⚠️ Rate looks unusual (expected ₹10–₹200/litre)";
  }
  return "";
};

export const pricePerKgWarning = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  const n = parseFloat(value);
  if (n > 10000) {
    return lang === "ta" ? "⚠️ விலை வழக்கத்திற்கு மாறானது (கிலோவுக்கு ₹10,000 க்கும் அதிகம்)" : "⚠️ Price looks unusual (over ₹10,000/kg)";
  }
  return "";
};

export const futureDateWarning = (value: string, lang: "ta" | "en"): string => {
  if (!value.trim()) return "";
  const today = new Date().toISOString().slice(0, 10);
  if (value > today) {
    return lang === "ta" ? "⚠️ தேதி எதிர்காலத்தில் உள்ளது" : "⚠️ Date is in the future";
  }
  return "";
};
