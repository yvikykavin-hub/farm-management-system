"use client";

import { useState } from "react";

export type Lang = "ta" | "en";

const STORAGE_KEY = "marutham_lang";
const CURRENT_USER_KEY = "marutham_current_user";
const perUserKey = (username: string) => `marutham_lang_${username}`;

function initialLang(): Lang {
  if (typeof window === "undefined") return "en";

  // A per-user preference (set at login, or by a previous toggle this
  // session) always wins over the generic key, so returning to the app
  // later on the same device still opens in that user's own language.
  const currentUser = window.localStorage.getItem(CURRENT_USER_KEY);
  if (currentUser) {
    const userLang = window.localStorage.getItem(perUserKey(currentUser));
    if (userLang === "en" || userLang === "ta") return userLang;
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "ta") return stored;
  return "en";
}

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(initialLang);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newLang);

      const currentUser = window.localStorage.getItem(CURRENT_USER_KEY);
      if (currentUser) {
        window.localStorage.setItem(perUserKey(currentUser), newLang);
      }
    }
  };

  return [lang, setLang];
}
