"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { locales, defaultLocale, type Locale } from "./locales";
import en from "./dictionaries/en.json";
import zhCN from "./dictionaries/zh-CN.json";

type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  "zh-CN": zhCN,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dict: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: defaultLocale,
  setLocale: () => {},
  dict: dictionaries[defaultLocale],
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored && locales.includes(stored)) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    if (newLocale === defaultLocale) {
      localStorage.removeItem("locale");
    } else {
      localStorage.setItem("locale", newLocale);
    }
    document.documentElement.setAttribute("lang", newLocale);
  }, []);

  const dict = dictionaries[locale] ?? dictionaries[defaultLocale];

  return (
    <LocaleContext.Provider value={{ locale, setLocale, dict }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocaleContext() {
  return useContext(LocaleContext);
}
