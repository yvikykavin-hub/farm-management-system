// Check if date is in future
export const isFutureDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return date > today;
};

// Check if date A is after date B
export const isDateAfter = (dateStr: string, afterDateStr: string): boolean => {
  if (!dateStr || !afterDateStr) return true;
  return new Date(dateStr) > new Date(afterDateStr);
};

// Bilingual error messages
export const getValidationMessage = (key: string, language: string): string => {
  const messages: Record<string, { en: string; ta: string }> = {
    required: {
      en: "This field is required",
      ta: "இந்த தகவல் அவசியம்",
    },
    negative: {
      en: "Value cannot be negative",
      ta: "மதிப்பு எதிர்மறையாக இருக்கக்கூடாது",
    },
    zero_rate: {
      en: "Milk rate cannot be zero",
      ta: "பால் விலை பூஜ்யமாக இருக்கக்கூடாது",
    },
    future_date: {
      en: "Future date not allowed",
      ta: "எதிர்கால தேதி அனுமதிக்கப்படவில்லை",
    },
    min_litres: {
      en: "Litres must be greater than 0",
      ta: "லிட்டர் 0 ஐ விட அதிகமாக இருக்க வேண்டும்",
    },
    min_hours: {
      en: "Hours must be greater than 0",
      ta: "மணி நேரம் 0 ஐ விட அதிகமாக இருக்க வேண்டும்",
    },
    harvest_before_plant: {
      en: "Harvest date must be after planting date",
      ta: "அறுவடை தேதி நடவு தேதிக்கு பிறகு இருக்க வேண்டும்",
    },
    sold_before_purchase: {
      en: "Sold date must be after purchase date",
      ta: "விற்பனை தேதி வாங்கிய தேதிக்கு பிறகு இருக்க வேண்டும்",
    },
    duplicate_milk: {
      en: "Milk entry already exists for this date. Update it?",
      ta: "இந்த தேதிக்கு பால் பதிவு ஏற்கனவே உள்ளது. புதுப்பிக்கவா?",
    },
    min_rate: {
      en: "Rate must be at least ₹1",
      ta: "விலை குறைந்தது ₹1 இருக்க வேண்டும்",
    },
    min_area: {
      en: "Area must be greater than 0",
      ta: "பரப்பளவு 0 ஐ விட அதிகமாக இருக்க வேண்டும்",
    },
    max_litres: {
      en: "Litres cannot exceed 999",
      ta: "லிட்டர் 999 ஐ தாண்டக்கூடாது",
    },
    max_amount: {
      en: "Amount is too large",
      ta: "தொகை மிகவும் அதிகமாக உள்ளது",
    },
    min_chars: {
      en: "Minimum 2 characters required",
      ta: "குறைந்தது 2 எழுத்துக்கள் தேவை",
    },
    max_chars: {
      en: "Too many characters entered",
      ta: "எழுத்துக்கள் அதிகமாக உள்ளன",
    },
    category_required: {
      en: "Please select a category",
      ta: "வகையை தேர்வு செய்யவும்",
    },
    period_invalid: {
      en: "Period end must be after period start",
      ta: "முடிவு தேதி தொடக்க தேதிக்கு பிறகு இருக்க வேண்டும்",
    },
    partner_name: {
      en: "Partner name is required",
      ta: "பகிர்வு கூட்டாளி பெயர் அவசியம்",
    },
    turn_days: {
      en: "Turn days must be at least 1",
      ta: "முறை நாட்கள் குறைந்தது 1 இருக்க வேண்டும்",
    },
    turn_days_whole: {
      en: "Turn days must be a whole number",
      ta: "முறை நாட்கள் முழு எண்ணாக இருக்க வேண்டும்",
    },
  };

  const msg = messages[key];
  if (!msg) return key;
  return language === "ta" ? msg.ta : msg.en;
};
