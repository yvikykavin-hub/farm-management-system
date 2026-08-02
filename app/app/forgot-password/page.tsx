"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabase";
import { useLang } from "../../lib/useLang";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang] = useLang();

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (!error) setSent(true);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🔐</div>
          <h1 className="text-xl font-bold text-gray-900">
            {lang === "ta" ? "கடவுச்சொல் மீட்டமை" : "Forgot Password"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {lang === "ta" ? "உங்கள் மின்னஞ்சலை உள்ளிடுங்கள்" : "Enter your email to reset password"}
          </p>
        </div>

        {!sent ? (
          <form onSubmit={handleReset}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={lang === "ta" ? "மின்னஞ்சல் முகவரி" : "Email address"}
              required
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1 mb-4">
              {lang === "ta" ? "உங்கள் பதிவு செய்த மின்னஞ்சல் முகவரி உள்ளிடவும்" : "Enter your registered email address"}
            </p>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {loading ? "..." : lang === "ta" ? "இணைப்பு அனுப்பு" : "Send Reset Link"}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <div className="text-4xl mb-3">📧</div>
            <p className="text-green-600 font-semibold">
              {lang === "ta" ? "மின்னஞ்சல் அனுப்பப்பட்டது!" : "Email sent!"}
            </p>
            <p className="text-gray-500 text-sm mt-2">
              {lang === "ta" ? "உங்கள் மின்னஞ்சலை சரிபாருங்கள்" : "Check your email for reset link"}
            </p>
          </div>
        )}

        {/* Back to login */}
        <p className="text-center text-sm text-gray-500 mt-4">
          <a href="/login" className="text-green-600 hover:underline font-medium">
            {lang === "ta" ? "← உள்நுழைவுக்கு திரும்பு" : "← Back to Login"}
          </a>
        </p>
      </div>
    </div>
  );
}
