"use client";

import { useState, useEffect } from "react";

const LATITUDE = 11.4235;
const LONGITUDE = 77.5892;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000;

const WEATHER_API_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LATITUDE}&longitude=${LONGITUDE}` +
  `&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m` +
  `&daily=weather_code,precipitation_sum,temperature_2m_max,temperature_2m_min&timezone=Asia%2FKolkata&forecast_days=3`;

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
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    precipitation_sum: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
};

type ForecastDay = { icon: string; max: number; min: number };

type WeatherState = {
  temperature: number;
  humidity: number;
  precipitation: number;
  windSpeed: number;
  weatherCode: number;
  forecast: ForecastDay[];
};

const getFarmAdvice = (code: number, rain: number, language: "ta" | "en") => {
  if (rain > 10) {
    return language === "ta"
      ? "⚠️ அதிக மழை — பூச்சிக்கொல்லி தெளிக்க வேண்டாம்"
      : "⚠️ Heavy rain — avoid spraying pesticides";
  }
  if (code >= 95) {
    return language === "ta"
      ? "⛈️ புயல் எச்சரிக்கை — வெளியே செல்ல வேண்டாம்"
      : "⛈️ Storm warning — stay indoors";
  }
  if (rain > 0) {
    return language === "ta"
      ? "🌧️ மழை உள்ளது — நீர்ப்பாசனம் தேவையில்லை"
      : "🌧️ Rain expected — skip irrigation today";
  }
  if (code === 0) {
    return language === "ta"
      ? "✅ தெளிவான வானிலை — விவசாய பணிகளுக்கு ஏற்றது"
      : "✅ Clear weather — great day for farm work";
  }
  return language === "ta" ? "🌤️ வானிலை சாதகமாக உள்ளது" : "🌤️ Weather is favorable for farming";
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

      const forecast: ForecastDay[] = data.daily.time.map((_, i) => ({
        icon: weatherInfo(data.daily.weather_code[i]).icon,
        max: Math.round(data.daily.temperature_2m_max[i]),
        min: Math.round(data.daily.temperature_2m_min[i]),
      }));

      setWeather({
        temperature: Math.round(data.current.temperature_2m),
        humidity: Math.round(data.current.relative_humidity_2m),
        precipitation: data.current.precipitation,
        windSpeed: Math.round(data.current.wind_speed_10m),
        weatherCode: data.current.weather_code,
        forecast,
      });
    } catch (err) {
      console.error("Error fetching weather:", err);
    }
    setLoading(false);
  };

  if (loading || !weather) {
    return (
      <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden w-full animate-pulse">
        <div className="h-3 w-32 bg-white/20 rounded mb-3" />
        <div className="flex items-center gap-3 mb-3">
          <div className="h-12 w-12 bg-white/20 rounded-full" />
          <div>
            <div className="h-8 w-20 bg-white/20 rounded mb-1" />
            <div className="h-3 w-24 bg-white/20 rounded" />
          </div>
        </div>
        <div className="h-8 w-full bg-white/10 rounded-xl mb-3" />
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex-1 h-16 bg-white/10 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const { icon: weatherIcon, en: weatherEn, ta: weatherTa } = weatherInfo(weather.weatherCode);
  const weatherDescription = language === "ta" ? weatherTa : weatherEn;

  return (
    <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden w-full">
      {/* Animated background circles */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-8 -mt-8 animate-pulse" />
      <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-4 -mb-4" />

      <div className="relative z-10">
        {/* Location */}
        <p className="text-blue-100 text-xs mb-1">📍 Sivagiri, Tamil Nadu</p>

        {/* Temperature + animated icon */}
        <div className="flex items-center gap-3 mb-2">
          <div className="text-5xl" style={{ animation: "float 3s ease-in-out infinite" }}>
            {weatherIcon}
          </div>
          <div>
            <p className="text-4xl font-bold">{weather.temperature}°C</p>
            <p className="text-blue-100 text-sm">{weatherDescription}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex gap-3 text-xs text-blue-100 mb-3 flex-wrap">
          <span>💧 {weather.humidity}%</span>
          <span>🌧️ {weather.precipitation}mm</span>
          <span>💨 {weather.windSpeed}km/h</span>
        </div>

        {/* Farm advice */}
        <div className="bg-white/20 rounded-xl px-3 py-2 text-xs mb-3">
          {getFarmAdvice(weather.weatherCode, weather.precipitation, language)}
        </div>

        {/* 3 day forecast */}
        <div className="flex gap-2">
          {weather.forecast.map((day, i) => (
            <div key={i} className="flex-1 bg-white/15 rounded-xl p-2 text-center text-xs">
              <p className="text-blue-100 mb-1">
                {i === 0
                  ? language === "ta"
                    ? "இன்று"
                    : "Today"
                  : i === 1
                  ? language === "ta"
                    ? "நாளை"
                    : "Tomorrow"
                  : language === "ta"
                  ? "2 நாள்"
                  : "Day 3"}
              </p>
              <p className="text-xl">{day.icon}</p>
              <p className="font-medium">{day.max}°</p>
              <p className="text-blue-200">{day.min}°</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
