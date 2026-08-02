"use client";

import { useState, useEffect } from "react";

const LATITUDE = 11.4823;
const LONGITUDE = 77.7947;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

const WEATHER_API_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=Asia%2FKolkata`;

type WeatherIconInfo = { icon: string; en: string; ta: string };

const WEATHER_CODE_INFO: Record<number, WeatherIconInfo> = {
  0: { icon: "☀️", en: "Clear", ta: "தெளிவான வானிலை" },
  1: { icon: "⛅", en: "Partly cloudy", ta: "பகுதி மேகமூட்டம்" },
  2: { icon: "⛅", en: "Partly cloudy", ta: "பகுதி மேகமூட்டம்" },
  3: { icon: "⛅", en: "Partly cloudy", ta: "பகுதி மேகமூட்டம்" },
  45: { icon: "🌫️", en: "Foggy", ta: "பனிமூட்டம்" },
  48: { icon: "🌫️", en: "Foggy", ta: "பனிமூட்டம்" },
  51: { icon: "🌦️", en: "Drizzle", ta: "தூறல்" },
  53: { icon: "🌦️", en: "Drizzle", ta: "தூறல்" },
  55: { icon: "🌦️", en: "Drizzle", ta: "தூறல்" },
  61: { icon: "🌧️", en: "Rain", ta: "மழை" },
  63: { icon: "🌧️", en: "Rain", ta: "மழை" },
  65: { icon: "🌧️", en: "Rain", ta: "மழை" },
  80: { icon: "🌧️", en: "Showers", ta: "மழை தூறல்" },
  81: { icon: "🌧️", en: "Showers", ta: "மழை தூறல்" },
  82: { icon: "🌧️", en: "Showers", ta: "மழை தூறல்" },
  95: { icon: "⛈️", en: "Thunderstorm", ta: "இடி மின்னலுடன் கூடிய மழை" },
};

const weatherInfo = (code: number): WeatherIconInfo =>
  WEATHER_CODE_INFO[code] ?? { icon: "🌤️", en: "Weather", ta: "வானிலை" };

// Time-of-day gradient for the weather banner. Each entry pairs the
// gradient color stops with a matching border tint (light + dark mode).
const getWeatherGradient = () => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 8) {
    // Early morning - warm pink/orange
    return "from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-900/20 dark:via-amber-900/20 dark:to-yellow-900/20 border-orange-100 dark:border-orange-800/30";
  } else if (hour >= 8 && hour < 12) {
    // Morning - bright sky blue
    return "from-sky-50 via-blue-50 to-cyan-50 dark:from-sky-900/20 dark:via-blue-900/20 dark:to-cyan-900/20 border-sky-100 dark:border-sky-800/30";
  } else if (hour >= 12 && hour < 15) {
    // Afternoon - bright warm
    return "from-amber-50 via-yellow-50 to-lime-50 dark:from-amber-900/20 dark:via-yellow-900/20 dark:to-lime-900/20 border-amber-100 dark:border-amber-800/30";
  } else if (hour >= 15 && hour < 18) {
    // Late afternoon - golden
    return "from-yellow-50 via-amber-50 to-orange-50 dark:from-yellow-900/20 dark:via-amber-900/20 dark:to-orange-900/20 border-yellow-100 dark:border-yellow-800/30";
  } else if (hour >= 18 && hour < 20) {
    // Evening - purple/pink sunset
    return "from-purple-50 via-pink-50 to-orange-50 dark:from-purple-900/20 dark:via-pink-900/20 dark:to-orange-900/20 border-purple-100 dark:border-purple-800/30";
  } else {
    // Night - deep blue/indigo
    return "from-indigo-50 via-blue-50 to-slate-50 dark:from-indigo-900/30 dark:via-blue-900/30 dark:to-slate-900/30 border-indigo-100 dark:border-indigo-800/30";
  }
};

const RAIN_CODES = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95];
const CLOUD_CODES = [1, 2, 3, 45, 48];

// Farming advice keys off the raw weather code (language-independent),
// not the already-translated condition text — matching on localized text
// against English substrings would silently break for Tamil users.
const farmAdvice = (code: number, language: "ta" | "en") => {
  if (RAIN_CODES.includes(code)) {
    return {
      text: language === "ta" ? "🌧️ தெளிப்பதை தவிர்க்கவும்" : "🌧️ Skip spraying",
      className: "bg-blue-100 text-blue-700",
    };
  }
  if (CLOUD_CODES.includes(code)) {
    return {
      text: language === "ta" ? "☁️ வேலைக்கு ஏற்றது" : "☁️ Good for work",
      className: "bg-gray-100 text-gray-700",
    };
  }
  return {
    text: language === "ta" ? "☀️ விவசாயத்திற்கு ஏற்றது" : "☀️ Good for farming",
    className: "bg-green-100 text-green-700",
  };
};

type OpenMeteoResponse = {
  current: {
    temperature_2m: number;
    relative_humidity_2m: number;
    weather_code: number;
    wind_speed_10m: number;
  };
};

type WeatherState = {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
};

export default function WeatherWidget({ language = "en" }: { language?: "ta" | "en" }) {
  const [weather, setWeather] = useState<WeatherState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWeather();
    const interval = setInterval(fetchWeather, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const fetchWeather = async () => {
    try {
      const response = await fetch(WEATHER_API_URL);
      const data: OpenMeteoResponse = await response.json();
      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
      });
    } catch (err) {
      console.error("Error fetching weather:", err);
    }
    setLoading(false);
  };

  if (loading || !weather) {
    return <div className="w-full overflow-hidden rounded-xl shadow-sm h-11 bg-gray-100 animate-pulse" />;
  }

  const { icon: weatherIcon, en: weatherEn, ta: weatherTa } = weatherInfo(weather.weatherCode);
  const condition = language === "ta" ? weatherTa : weatherEn;
  const advice = farmAdvice(weather.weatherCode, language);
  const weatherGradient = getWeatherGradient();

  return (
    <div className={`w-full overflow-hidden rounded-xl border shadow-sm relative ${weatherGradient}`}>
      {/* Soft gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-r ${weatherGradient}`} />

      {/* Content */}
      <div className="relative z-10 px-4 py-2.5 flex items-center justify-between gap-2 overflow-x-auto">
        {/* Left: animated weather icon + temp */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xl animate-bounce" style={{ animationDuration: "2s" }}>
            {weatherIcon}
          </span>
          <span className="text-sm font-bold text-gray-700">{weather.temperature}°C</span>
          <span className="text-xs hidden sm:block text-gray-500">{condition}</span>
        </div>

        {/* Middle: location with pin animation */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs animate-pulse" style={{ animationDuration: "3s" }}>
            📍
          </span>
          <span className="text-xs font-medium text-sky-500">V. Karukkampalayam, Sivagiri</span>
        </div>

        {/* Right: weather details */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-sm">💧</span>
            <span className="text-xs text-gray-400">{weather.humidity}%</span>
          </div>
          <div className="items-center gap-1 hidden sm:flex">
            <span className="text-sm">🌬️</span>
            <span className="text-xs text-gray-400">{weather.windSpeed}km/h</span>
          </div>
          {/* Farming advice based on weather */}
          <div
            className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap hidden sm:block ${advice.className}`}
          >
            {advice.text}
          </div>
        </div>
      </div>
    </div>
  );
}
