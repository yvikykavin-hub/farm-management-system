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
      <div className="flex-shrink-0 w-full md:w-auto bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200 rounded-2xl p-3 min-w-[160px] text-center shadow-sm animate-pulse">
        <div className="h-6 w-16 bg-blue-200/60 rounded mx-auto mb-2" />
        <div className="h-3 w-20 bg-blue-200/60 rounded mx-auto mb-2" />
        <div className="h-3 w-24 bg-blue-200/60 rounded mx-auto" />
      </div>
    );
  }

  const { icon: weatherIcon, en: weatherEn, ta: weatherTa } = weatherInfo(weather.weatherCode);
  const condition = language === "ta" ? weatherTa : weatherEn;

  return (
    <div className="flex-shrink-0 w-full md:w-auto bg-gradient-to-br from-blue-50 to-sky-100 border border-blue-200 rounded-2xl p-3 min-w-[160px] text-center shadow-sm relative overflow-hidden">
      {/* Animated background circle */}
      <div className="absolute top-0 right-0 w-12 h-12 bg-white/30 rounded-full -mr-4 -mt-4 animate-pulse" />

      <div className="relative z-10">
        {/* Weather icon + temp */}
        <div className="flex items-center justify-center gap-2 mb-1">
          <span className="text-2xl" style={{ animation: "float 3s ease-in-out infinite" }}>
            {weatherIcon}
          </span>
          <span className="text-xl font-bold text-gray-900">{weather.temperature}°C</span>
        </div>

        {/* Condition */}
        <p className="text-xs font-medium text-gray-700 mb-1">{condition}</p>

        {/* Details in one line */}
        <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
          <span>💧{weather.humidity}%</span>
          <span>•</span>
          <span>🌬️{weather.windSpeed}km/h</span>
        </div>

        {/* Location */}
        <p className="text-xs text-blue-500 mt-1">📍 Kangayam</p>
      </div>
    </div>
  );
}
