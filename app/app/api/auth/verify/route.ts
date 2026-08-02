import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "../../../../lib/loginRateLimit";
import { decryptLoginToken } from "../../../../lib/loginToken";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts", remainingMinutes: rateCheck.remainingMinutes }, { status: 429 });
    }

    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || !password || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Decrypt server side only — the email never travels to or lives in the browser.
    const email = await decryptLoginToken(token);
    if (!email) {
      return NextResponse.json({ error: "Session expired, please try again" }, { status: 400 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.session) {
      const after = await recordFailedAttempt(ip);
      if (!after.allowed) {
        return NextResponse.json({ error: "Too many attempts", remainingMinutes: after.remainingMinutes }, { status: 429 });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await clearRateLimit(ip);

    return NextResponse.json({
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
