import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkRateLimit, recordFailedAttempt } from "../../../../lib/loginRateLimit";
import { encryptLoginToken } from "../../../../lib/loginToken";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";

    const rateCheck = await checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: "Too many attempts", remainingMinutes: rateCheck.remainingMinutes }, { status: 429 });
    }

    const { username } = await req.json();

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

    // Service role, server side only.
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false },
    });

    const { data, error } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("username", username.toLowerCase())
      .single();

    if (error || !data) {
      const after = await recordFailedAttempt(ip);
      if (!after.allowed) {
        return NextResponse.json({ error: "Too many attempts", remainingMinutes: after.remainingMinutes }, { status: 429 });
      }
      // Don't reveal whether the username exists — generic error either way.
      return NextResponse.json({ error: "Invalid credentials" }, { status: 404 });
    }

    // Encrypted (not just base64) token — the real password check happens in
    // /api/auth/verify, server side, so the email itself never reaches the browser.
    const token = await encryptLoginToken(data.email);

    return NextResponse.json({
      found: true,
      displayName: data.display_name,
      token,
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
