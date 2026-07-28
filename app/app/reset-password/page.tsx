"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const [lang] = useLang();
  const L = (en: string, ta: string) => (lang === "ta" ? ta : en);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError(L("Passwords do not match", "கடவுச்சொற்கள் பொருந்தவில்லை"));
      return;
    }

    if (password.length < 8) {
      setError(L("Password must be at least 8 characters", "கடவுச்சொல் குறைந்தது 8 எழுத்துகள் இருக்க வேண்டும்"));
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      setTimeout(() => router.push("/login"), 3000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔑</div>
          <h1 className="text-xl font-bold text-gray-900">{L("Set New Password", "புதிய கடவுச்சொல் அமைக்கவும்")}</h1>
        </div>

        {!success ? (
          <form onSubmit={handleReset}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={L("New password (min 8 chars)", "புதிய கடவுச்சொல் (குறைந்தது 8 எழுத்துகள்)")}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-3"
            />
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={L("Confirm new password", "புதிய கடவுச்சொல்லை உறுதிப்படுத்தவும்")}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 mb-4"
            />
            {error && <p className="text-red-500 text-xs mb-3">⚠️ {error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm disabled:opacity-60"
            >
              {loading ? "..." : L("Reset Password", "கடவுச்சொல்லை மீட்டமை")}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">✅</div>
            <p className="text-green-600 font-semibold">{L("Password reset successful!", "கடவுச்சொல் மீட்டமைக்கப்பட்டது!")}</p>
            <p className="text-gray-500 text-sm mt-2">{L("Redirecting to login...", "உள்நுழைவுக்கு திருப்பி விடப்படுகிறது...")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
