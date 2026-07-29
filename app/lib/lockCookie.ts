// Shared between client components (InactivityTimer, login page) and the
// edge middleware (proxy.ts). A "locked" session keeps the underlying
// Supabase session/cookies valid but requires re-verification (fingerprint
// or password) before any protected page is served again — enforced in
// proxy.ts, not just by a client-side redirect, so it can't be bypassed by
// direct URL navigation or the back button.
export const LOCK_COOKIE_NAME = "marutham_locked";

export const setLockedCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCK_COOKIE_NAME}=1; path=/; max-age=86400; samesite=lax`;
};

export const clearLockedCookie = () => {
  if (typeof document === "undefined") return;
  document.cookie = `${LOCK_COOKIE_NAME}=; path=/; max-age=0; samesite=lax`;
};
