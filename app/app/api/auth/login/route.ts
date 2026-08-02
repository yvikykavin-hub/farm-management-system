import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, recordFailedAttempt, clearRateLimit } from "../../../../lib/loginRateLimit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts", remainingMinutes: rateCheck.remainingMinutes }, { status: 429 });
    }

    const { username, password } = await req.json();

    // Validate username format
    if (
      !username ||
      typeof username !== "string" ||
      username.length < 3 ||
      username.length > 20 ||
      !/^[a-z0-9]+$/.test(username)
    ) {
      return NextResponse.json({ error: "Invalid username" }, { status: 400 });
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Invalid password" }, { status: 400 });
    }

    // Service role, server side only: look up the email behind this username.
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email, display_name")
      .eq("username", username.toLowerCase())
      .single();

    if (profileError || !profile) {
      const after = await recordFailedAttempt(ip);
      if (!after.allowed) {
        return NextResponse.json({ error: "Too many attempts", remainingMinutes: after.remainingMinutes }, { status: 429 });
      }
      // Don't reveal whether the username exists — generic error either way.
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Sign in with the looked-up email, still server side — the email itself
    // never leaves this function, the browser only ever sees the session.
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    });

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email: profile.email,
      password,
    });

    if (signInError || !signInData.session) {
      const after = await recordFailedAttempt(ip);
      if (!after.allowed) {
        return NextResponse.json({ error: "Too many attempts", remainingMinutes: after.remainingMinutes }, { status: 429 });
      }
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    await clearRateLimit(ip);

    return NextResponse.json({
      displayName: profile.display_name,
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
