"use client";

const BIOMETRIC_ID_KEY = "marutham_biometric_id";
const BIOMETRIC_EMAIL_KEY = "marutham_biometric_email";

// Check if biometric is supported
export const isBiometricSupported = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!(window.PublicKeyCredential && navigator.credentials && typeof navigator.credentials.create === "function");
};

// Check if user has registered biometric
export const hasBiometricRegistered = (): boolean => {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(BIOMETRIC_ID_KEY);
};

export const getRegisteredBiometricEmail = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(BIOMETRIC_EMAIL_KEY);
};

// Register biometric after login. Only the credential's public rawId and the
// account email are stored — the private key never leaves the device's
// secure enclave/TPM, so nothing secret is written to localStorage here.
export const registerBiometric = async (userEmail: string): Promise<boolean> => {
  try {
    if (!isBiometricSupported()) return false;

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
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;

    if (credential) {
      localStorage.setItem(BIOMETRIC_ID_KEY, btoa(String.fromCharCode(...new Uint8Array(credential.rawId))));
      localStorage.setItem(BIOMETRIC_EMAIL_KEY, userEmail);
      return true;
    }
    return false;
  } catch (error) {
    console.error("Biometric registration failed:", error);
    return false;
  }
};

// Authenticate with biometric. Returns the registered email on success — this
// only proves the enrolled person is present; it is not itself a login. The
// caller is responsible for checking there's still a valid session for that
// email before treating this as "signed in".
export const authenticateWithBiometric = async (): Promise<string | null> => {
  try {
    if (!isBiometricSupported()) return null;
    if (!hasBiometricRegistered()) return null;

    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const storedId = localStorage.getItem(BIOMETRIC_ID_KEY);
    if (!storedId) return null;

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

    if (assertion) {
      return localStorage.getItem(BIOMETRIC_EMAIL_KEY);
    }
    return null;
  } catch (error) {
    console.error("Biometric auth failed:", error);
    return null;
  }
};

// Remove biometric registration
export const removeBiometric = (): void => {
  localStorage.removeItem(BIOMETRIC_ID_KEY);
  localStorage.removeItem(BIOMETRIC_EMAIL_KEY);
};
