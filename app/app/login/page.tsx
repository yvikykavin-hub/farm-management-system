"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";
import DarkModeToggle from "../../components/DarkModeToggle";
import { clearLockedCookie } from "../../lib/lockCookie";

const REMEMBER_ME_KEY = "marutham_remember_me";
const CURRENT_USER_KEY = "marutham_current_user";
const LANG_KEY = "marutham_lang";

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

// Applies this user's own remembered language (falling back to whatever's
// currently active, which becomes their saved preference from now on).
const applyPerUserLanguage = (username: string) => {
  const userLangKey = `marutham_lang_${username}`;
  const savedLang = localStorage.getItem(userLangKey);
  if (savedLang) {
    localStorage.setItem(LANG_KEY, savedLang);
  } else {
    const currentLang = localStorage.getItem(LANG_KEY) || "en";
    localStorage.setItem(userLangKey, currentLang);
  }
  localStorage.setItem(CURRENT_USER_KEY, username);
};

export default function LoginPage() {
  const router = useRouter();
  const [lang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateCheck, setRateCheck] = useState<RateCheck>(() =>
    typeof window !== "undefined" ? checkRateLimit() : { allowed: true, remaining: MAX_ATTEMPTS }
  );
  const [rememberMe, setRememberMe] = useState(false);

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

    const cleanUsername = username.toLowerCase().trim();

    if (!cleanUsername || cleanUsername.length < 3) {
      setError(L("Please enter a valid username.", "சரியான பயனர்பெயர் உள்ளிடவும்."));
      return;
    }

    if (!password) {
      setError(L("Please enter your password.", "கடவுச்சொல் உள்ளிடவும்."));
      return;
    }

    setLoading(true);

    const failLogin = (afterCheck: RateCheck) => {
      if (!afterCheck.allowed) {
        setError(
          L(
            `Too many attempts! Please wait ${afterCheck.remainingMinutes} minutes.`,
            `அதிக முயற்சிகள்! ${afterCheck.remainingMinutes} நிமிடம் காத்திருங்கள்.`
          )
        );
      } else if (afterCheck.remaining <= 2) {
        setError(
          L(
            `Invalid username or password. ${afterCheck.remaining} attempts remaining.`,
            `தவறான பயனர்பெயர் அல்லது கடவுச்சொல். ${afterCheck.remaining} முயற்சிகள் மட்டுமே.`
          )
        );
      } else {
        setError(L("Invalid username or password.", "தவறான பயனர்பெயர் அல்லது கடவுச்சொல்."));
      }
    };

    try {
      // Step 1: look up the username server-side.
      const lookupRes = await fetch("/api/auth/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: cleanUsername }),
      });

      if (lookupRes.status === 429) {
        const data = await lookupRes.json();
        setRateCheck({ allowed: false, remainingMinutes: data.remainingMinutes });
        setError(
          L(
            `Too many attempts! Please wait ${data.remainingMinutes} minutes.`,
            `அதிக முயற்சிகள்! ${data.remainingMinutes} நிமிடம் காத்திருங்கள்.`
          )
        );
        setLoading(false);
        return;
      }

      if (!lookupRes.ok) {
        recordFailedAttempt();
        failLogin(checkRateLimit());
        setLoading(false);
        return;
      }

      const { displayName, token } = await lookupRes.json();

      // Step 2: verify the password server-side. The email address behind this
      // username never reaches the browser at any point in this flow.
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      if (verifyRes.status === 429) {
        const data = await verifyRes.json();
        setRateCheck({ allowed: false, remainingMinutes: data.remainingMinutes });
        setError(
          L(
            `Too many attempts! Please wait ${data.remainingMinutes} minutes.`,
            `அதிக முயற்சிகள்! ${data.remainingMinutes} நிமிடம் காத்திருங்கள்.`
          )
        );
        setLoading(false);
        return;
      }

      if (!verifyRes.ok) {
        recordFailedAttempt();
        failLogin(checkRateLimit());
        setLoading(false);
        return;
      }

      const { session } = await verifyRes.json();
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (setSessionError) {
        setError(L("An error occurred. Please try again.", "பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."));
        setLoading(false);
        return;
      }

      clearAttempts();
      setRateCheck({ allowed: true, remaining: MAX_ATTEMPTS });
      clearLockedCookie();

      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, "true");
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      applyPerUserLanguage(cleanUsername);

      toast.success(L(`Welcome ${displayName}! 👋`, `வணக்கம் ${displayName}! 👋`));

      setLoading(false);
      router.push("/");
      router.refresh();
    } catch {
      setError(L("An error occurred. Please try again.", "பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்."));
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-page p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-green-100 p-6">
        <div className="flex justify-end mb-1">
          <DarkModeToggle />
        </div>
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
            <label className="block mb-1 text-xs font-medium text-gray-600">{L("Username", "பயனர்பெயர்")}</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ""))}
              placeholder={L("Enter your username", "உங்கள் பயனர்பெயர்")}
              maxLength={20}
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 accent-green-600 rounded cursor-pointer"
              />
              <label htmlFor="rememberMe" className="text-xs text-gray-600 cursor-pointer">
                {L("Remember me for 30 days", "30 நாட்கள் நினைவில் வை")}
              </label>
            </div>
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

        <p className="text-center text-xs text-gray-400 mt-4">
          {L("By logging in you agree to our", "உள்நுழையும்போது எங்கள்")}{" "}
          <a href="/privacy-policy" className="text-green-600 hover:underline">
            {L("Privacy Policy", "தனியுரிமைக் கொள்கையை")}
          </a>
          {lang === "ta" && " ஒப்புக்கொள்கிறீர்கள்"}
        </p>
      </div>
    </div>
  );
}
