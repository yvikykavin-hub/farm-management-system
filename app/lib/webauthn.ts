"use client";

const BIOMETRIC_ID_KEY = "marutham_biometric_id";
const BIOMETRIC_EMAIL_KEY = "marutham_biometric_email";

type BiometricResult = { success: boolean; error?: string };
type BiometricAuthResult = { success: boolean; email?: string; error?: string };

// Check if biometric is supported
export const isBiometricSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === "function");
};

// Check if user has registered biometric. Requires BOTH the credential id and the
// email to be present — a mobile crash mid-registration can leave only one of the
// two localStorage writes committed, and a half-written state must count as "not
// registered" rather than showing a button that can only ever fail.
export const hasBiometricRegistered = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(BIOMETRIC_ID_KEY) && !!localStorage.getItem(BIOMETRIC_EMAIL_KEY);
};

export const getRegisteredBiometricEmail = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BIOMETRIC_EMAIL_KEY);
};

const errorMessage = (error: unknown): string => {
  const err = error as { name?: string; message?: string };
  if (err?.name === "NotAllowedError") return "Permission denied or timed out";
  if (err?.name === "SecurityError") return "Security error - try again";
  return err?.message || "Something went wrong";
};

// Register biometric after login. Only the credential's public rawId and the
// account email are stored — the private key never leaves the device's
// secure enclave/TPM, so nothing secret (and no password) is written to
// localStorage here.
export const registerBiometric = async (userEmail: string): Promise<BiometricResult> => {
  try {
    if (!isBiometricSupported()) {
      return { success: false, error: "Not supported on this device" };
    }

    if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === "function") {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        return { success: false, error: "No biometric sensor found" };
      }
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const userId = new TextEncoder().encode(userEmail);

    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: "Marutham FMS",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: userEmail,
          displayName: userEmail,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (!credential) {
      return { success: false, error: "Registration cancelled" };
    }

    localStorage.setItem(BIOMETRIC_ID_KEY, btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
    localStorage.setItem(BIOMETRIC_EMAIL_KEY, userEmail);
    return { success: true };
  } catch (error) {
    console.error("Biometric registration failed:", error);
    const err = error as { name?: string };
    if (err?.name === "InvalidStateError") {
      return { success: false, error: "Already registered on this device" };
    }
    return { success: false, error: errorMessage(error) };
  }
};

// Authenticate with biometric. Returns the registered email on success — this
// only proves the enrolled person is present; it is not itself a login. The
// caller is responsible for checking there's still a valid session for that
// email before treating this as "signed in".
export const authenticateWithBiometric = async (): Promise<BiometricAuthResult> => {
  try {
    if (!isBiometricSupported()) {
      return { success: false, error: "Not supported" };
    }
    if (!hasBiometricRegistered()) {
      return { success: false, error: "Not registered" };
    }

    const storedId = localStorage.getItem(BIOMETRIC_ID_KEY);
    const email = localStorage.getItem(BIOMETRIC_EMAIL_KEY);
    if (!storedId || !email) {
      // Half-written state (shouldn't happen given hasBiometricRegistered's check,
      // but belt-and-braces) — clear it so the UI falls back to password login.
      removeBiometric();
      return { success: false, error: "Registration data missing" };
    }

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credentialId = Uint8Array.from(atob(storedId), (c) => c.charCodeAt(0));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            id: credentialId,
            type: "public-key",
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    if (!assertion) {
      return { success: false, error: "Verification cancelled" };
    }

    return { success: true, email };
  } catch (error) {
    console.error("Biometric auth failed:", error);
    const err = error as { name?: string };
    if (err?.name === "InvalidStateError") {
      // The registered credential no longer matches this device/browser
      // (e.g. it changed, or the platform authenticator was reset) — clear
      // the stale registration rather than leaving a button that can only fail.
      removeBiometric();
      return { success: false, error: "Device changed - please re-register" };
    }
    return { success: false, error: errorMessage(error) };
  }
};

// Remove biometric registration
export const removeBiometric = (): void => {
  localStorage.removeItem(BIOMETRIC_ID_KEY);
  localStorage.removeItem(BIOMETRIC_EMAIL_KEY);
};
