import { EncryptJWT, jwtDecrypt } from "jose";

// Short-lived encrypted (not just signed) token carrying the looked-up email
// between the two login API routes. Because it's encrypted with a
// server-only symmetric key, the browser can hold this token without ever
// being able to read the email address inside it.
const TOKEN_TTL_SECONDS = 5 * 60; // 5 minutes

function secretKey(): Uint8Array {
  const secret = process.env.LOGIN_TOKEN_SECRET;
  if (!secret) throw new Error("LOGIN_TOKEN_SECRET is not set");
  return new Uint8Array(Buffer.from(secret, "base64"));
}

export async function encryptLoginToken(email: string): Promise<string> {
  return new EncryptJWT({ email })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .encrypt(secretKey());
}

export async function decryptLoginToken(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtDecrypt(token, secretKey());
    return typeof payload.email === "string" ? payload.email : null;
  } catch {
    return null;
  }
}
