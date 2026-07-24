"use client";

import { useState } from "react";

export type Lang = "ta" | "en";

const STORAGE_KEY = "marutham_lang";

export function useLang(): [Lang, (lang: Lang) => void] {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "ta") return stored;
    }
    return "en";
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, newLang);
    }
  };

  return [lang, setLang];
}
