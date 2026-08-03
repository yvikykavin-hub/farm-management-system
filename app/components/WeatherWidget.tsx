"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";

// Karukkampalayam, Sivagiri, Erode (Kodumudi Taluk)
const LATITUDE = 11.0943;
const LONGITUDE = 77.8141;
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

interface TimeConfig {
  gradient: string;
  particles: string[];
  particleEmoji: string;
  shimmerColor: string;
}

// Time-of-day background for the weather banner: a gradient plus the
// floating-particle emoji set and shimmer tint that animate over it.
const getTimeConfig = (): TimeConfig => {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 8) {
    // Early Morning - Sunrise
    return {
      gradient: "from-orange-100 via-amber-50 to-yellow-100",
      particles: ["🌅", "🌤️", "✨"],
      particleEmoji: "🌅",
      shimmerColor: "from-orange-200/30 via-yellow-100/50 to-orange-200/30",
    };
  } else if (hour >= 8 && hour < 12) {
    // Morning - Bright Sky
    return {
      gradient: "from-sky-100 via-blue-50 to-cyan-100",
      particles: ["☀️", "🌤️", "🌿"],
      particleEmoji: "☀️",
      shimmerColor: "from-sky-200/30 via-blue-100/50 to-sky-200/30",
    };
  } else if (hour >= 12 && hour < 15) {
    // Afternoon - Hot Sun
    return {
      gradient: "from-yellow-100 via-amber-50 to-lime-100",
      particles: ["🌞", "🌾", "🌻"],
      particleEmoji: "🌞",
      shimmerColor: "from-yellow-200/30 via-amber-100/50 to-yellow-200/30",
    };
  } else if (hour >= 15 && hour < 18) {
    // Late Afternoon - Golden Hour
    return {
      gradient: "from-amber-100 via-orange-50 to-yellow-100",
      particles: ["🌾", "🍃", "✨"],
      particleEmoji: "🌾",
      shimmerColor: "from-amber-200/30 via-orange-100/50 to-amber-200/30",
    };
  } else if (hour >= 18 && hour < 21) {
    // Evening - Sunset
    return {
      gradient: "from-purple-100 via-pink-50 to-orange-100",
      particles: ["🌇", "🌙", "⭐"],
      particleEmoji: "🌇",
      shimmerColor: "from-purple-200/30 via-pink-100/50 to-purple-200/30",
    };
  } else {
    // Night - Stars
    return {
      gradient: "from-indigo-100 via-blue-50 to-slate-100",
      particles: ["🌙", "⭐", "🌟"],
      particleEmoji: "🌙",
      shimmerColor: "from-indigo-200/30 via-blue-100/50 to-indigo-200/30",
    };
  }
};

// Weather-condition override — takes over from the time-of-day background
// above when it applies; clear/sunny has no special case and falls through
// to whatever getTimeConfig() returned.
const getWeatherConfig = (code: number, timeConfig: TimeConfig): TimeConfig => {
  // Rain
  if ([51, 53, 55, 61, 63, 65, 71, 73, 75, 80, 81, 82].includes(code)) {
    return {
      gradient: "from-slate-100 via-blue-50 to-slate-100",
      particles: ["🌧️", "💧", "☁️"],
      particleEmoji: "🌧️",
      shimmerColor: "from-slate-200/30 via-blue-100/50 to-slate-200/30",
    };
  }
  // Thunderstorm
  if ([95, 96, 99].includes(code)) {
    return {
      gradient: "from-gray-200 via-slate-100 to-gray-200",
      particles: ["⛈️", "🌩️", "💨"],
      particleEmoji: "⛈️",
      shimmerColor: "from-gray-300/30 via-slate-200/50 to-gray-300/30",
    };
  }
  // Cloudy
  if ([2, 3, 45, 48].includes(code)) {
    return {
      gradient: "from-gray-100 via-slate-50 to-gray-100",
      particles: ["☁️", "🌤️", "💨"],
      particleEmoji: "☁️",
      shimmerColor: "from-gray-200/30 via-slate-100/50 to-gray-200/30",
    };
  }
  // Default → use time config
  return timeConfig;
};

// Fixed floating-particle positions/timings — deliberately varied so the
// four particles don't all bob in perfect unison.
const FLOATING_PARTICLES = [
  { x: "10%", delay: 0, duration: 8 },
  { x: "35%", delay: 2, duration: 10 },
  { x: "60%", delay: 1, duration: 9 },
  { x: "80%", delay: 3, duration: 11 },
];

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
  const timeConfig = getTimeConfig();
  const config = getWeatherConfig(weather.weatherCode, timeConfig);

  return (
    <div
      className={`w-full overflow-hidden rounded-xl shadow-sm border border-white/50 dark:border-slate-700/50 relative bg-gradient-to-r ${config.gradient} dark:from-slate-800/80 dark:via-slate-800/60 dark:to-slate-800/80`}
    >
      {/* Animated shimmer sweep */}
      <motion.div
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
        className={`absolute inset-0 bg-gradient-to-r ${config.shimmerColor} pointer-events-none skew-x-12`}
      />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {FLOATING_PARTICLES.map((particle, i) => (
          <motion.div
            key={i}
            animate={{ y: ["-10px", "10px", "-10px"], opacity: [0.3, 0.7, 0.3], scale: [0.8, 1.1, 0.8] }}
            transition={{ duration: particle.duration, repeat: Infinity, delay: particle.delay, ease: "easeInOut" }}
            style={{ left: particle.x }}
            className="absolute top-2 text-lg opacity-30"
          >
            {config.particles[i % config.particles.length]}
          </motion.div>
        ))}
      </div>

      {/* Pulsing background glow */}
      <motion.div
        animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        className={`absolute inset-0 bg-gradient-to-br ${config.gradient} dark:from-slate-700/40 dark:via-slate-600/20 dark:to-slate-700/40 opacity-30 pointer-events-none`}
      />

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
