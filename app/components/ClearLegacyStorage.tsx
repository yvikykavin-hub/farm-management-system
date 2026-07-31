"use client";

import { useEffect } from "react";

// One-time cleanup of localStorage keys left behind by the removed
// fingerprint/biometric login feature. "marutham_pwd" was never actually
// written by this app (storing a password client-side was rejected as a
// security risk), but it's cleared here too as a defensive no-op.
const LEGACY_KEYS = [
  "marutham_biometric_id",
  "marutham_biometric_email",
  "marutham_webauthn_enabled",
  "marutham_webauthn_credential",
  "marutham_pwd",
];

export default function ClearLegacyStorage() {
  useEffect(() => {
    LEGACY_KEYS.forEach((key) => localStorage.removeItem(key));
  }, []);

  return null;
}
