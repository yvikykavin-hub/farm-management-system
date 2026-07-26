"use client";

import { useState, useEffect } from "react";

const LATITUDE = 11.4235;
const LONGITUDE = 77.5892;
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
    return (
      <div className="w-full bg-gradient-to-r from-blue-50 to-sky-100 border border-blue-200 rounded-xl px-4 py-2 h-9 animate-pulse" />
    );
  }

  const { icon: weatherIcon, en: weatherEn, ta: weatherTa } = weatherInfo(weather.weatherCode);
  const condition = language === "ta" ? weatherTa : weatherEn;

  return (
    <div className="w-full bg-gradient-to-r from-blue-50 to-sky-100 border border-blue-200 rounded-xl px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto">
      {/* Left: icon + temp + condition */}
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <span className="text-base sm:text-lg" style={{ animation: "float 3s ease-in-out infinite" }}>
          {weatherIcon}
        </span>
        <span className="text-xs sm:text-sm font-bold text-gray-900">{weather.temperature}°C</span>
        <span className="text-xs text-gray-600">{condition}</span>
      </div>

      {/* Middle: location */}
      <div className="flex items-center gap-1 shrink-0">
        <span className="text-xs text-blue-500">📍 Kangayam</span>
      </div>

      {/* Right: humidity + wind */}
      <div className="flex items-center gap-2 sm:gap-3 text-xs text-gray-500 shrink-0">
        <span>💧 {weather.humidity}%</span>
        <span>🌬️ {weather.windSpeed}km/h</span>
      </div>
    </div>
  );
}
