"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_KEY = "login_attempts";

type RateCheck = { allowed: true; remaining: number } | { allowed: false; remainingMinutes: number };

const readAttempts = (): { count: number; lastAttempt: number } => {
  try {
    return JSON.parse(localStorage.getItem(RATE_LIMIT_KEY) || '{"count": 0, "lastAttempt": 0}');
  } catch {
    return { count: 0, lastAttempt: 0 };
  }
};

const checkRateLimit = (): RateCheck => {
  const attempts = readAttempts();
  const now = Date.now();

  // Lockout window has passed since the last attempt — reset the counter.
  if (now - attempts.lastAttempt > LOCKOUT_TIME) {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: 0, lastAttempt: now }));
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    const remainingMinutes = Math.ceil((LOCKOUT_TIME - (now - attempts.lastAttempt)) / 60000);
    return { allowed: false, remainingMinutes };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - attempts.count };
};

const recordFailedAttempt = () => {
  const attempts = readAttempts();
  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify({ count: attempts.count + 1, lastAttempt: Date.now() }));
};

const clearAttempts = () => localStorage.removeItem(RATE_LIMIT_KEY);

export default function LoginPage() {
  const router = useRouter();
  const [lang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateCheck, setRateCheck] = useState<RateCheck>(() =>
    typeof window !== "undefined" ? checkRateLimit() : { allowed: true, remaining: MAX_ATTEMPTS }
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const check = checkRateLimit();
    setRateCheck(check);
    if (!check.allowed) {
      setError(
        L(
          `Too many attempts! Please wait ${check.remainingMinutes} minutes.`,
          `அதிக முயற்சிகள்! ${check.remainingMinutes} நிமிடம் காத்திருங்கள்.`
        )
      );
      return;
    }

    if (!email.trim() || !password) {
      setError(L("Email and password are required.", "மின்னஞ்சல் மற்றும் கடவுச்சொல் தேவை."));
      return;
    }

    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      recordFailedAttempt();
      const after = checkRateLimit();
      setRateCheck(after);

      if (!after.allowed) {
        setError(
          L(
            `Too many attempts! Please wait ${after.remainingMinutes} minutes.`,
            `அதிக முயற்சிகள்! ${after.remainingMinutes} நிமிடம் காத்திருங்கள்.`
          )
        );
      } else if (after.remaining <= 2) {
        setError(
          L(`Wrong password. ${after.remaining} attempts remaining.`, `தவறான கடவுச்சொல். ${after.remaining} முயற்சிகள் மீதம்.`)
        );
      } else {
        setError(L("Invalid email or password.", "தவறான மின்னஞ்சல் அல்லது கடவுச்சொல்."));
      }
      setLoading(false);
      return;
    }

    clearAttempts();
    setRateCheck({ allowed: true, remaining: MAX_ATTEMPTS });
    setLoading(false);
    router.push("/");
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex flex-col items-center mb-4">
          <div className="text-6xl mb-4">👨‍🌾</div>
          <h1 className="text-2xl font-bold text-gray-900 text-center">Marutham Farm Management System</h1>
          <p className="text-sm text-gray-500 text-center mt-2">
            {L("Rooted in Tradition, Driven by Data", "உழைப்பே உயர்வு")}
          </p>
        </div>

        {!rateCheck.allowed && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center mb-4">
            <div className="text-2xl mb-2">🔒</div>
            <p className="text-red-700 font-semibold text-sm">
              {L("Account temporarily locked", "கணக்கு தற்காலிகமாக பூட்டப்பட்டது")}
            </p>
            <p className="text-red-500 text-xs mt-1">
              {L(`Try again in ${rateCheck.remainingMinutes} minutes`, `${rateCheck.remainingMinutes} நிமிடம் பிறகு முயற்சிக்கவும்`)}
            </p>
          </div>
        )}

        {rateCheck.allowed && rateCheck.remaining <= 3 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center mb-4">
            <p className="text-amber-700 text-xs">
              ⚠️ {L(`Only ${rateCheck.remaining} attempts remaining`, `${rateCheck.remaining} முயற்சிகள் மட்டுமே மீதம்`)}
            </p>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-3">
          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">{L("Email", "மின்னஞ்சல்")}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block mb-1 text-xs font-medium text-gray-600">{L("Password", "கடவுச்சொல்")}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 px-3 text-xs text-gray-500 hover:text-primary"
              >
                {showPassword ? L("Hide", "மறை") : L("Show", "காட்டு")}
              </button>
            </div>
          </div>

          <div className="text-right">
            <a href="/forgot-password" className="text-xs text-green-600 hover:underline">
              {L("Forgot password?", "கடவுச்சொல் மறந்துவிட்டதா?")}
            </a>
          </div>

          {error && (
            <p className="text-xs text-danger bg-danger/10 border border-danger/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !rateCheck.allowed}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/40 text-white rounded-lg py-2.5 text-sm font-semibold transition"
          >
            {loading ? L("Signing in...", "உள்நுழைகிறது...") : L("Sign In", "உள்நுழை")}
          </button>
        </form>
      </div>
    </div>
  );
}
