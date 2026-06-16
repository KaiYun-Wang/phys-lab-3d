"use client";

import { useLocaleContext } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/locales";

const localeLabels: Record<Locale, string> = {
  en: "EN",
  "zh-CN": "中",
};

export function LanguageSwitcher() {
  const { locale, setLocale } = useLocaleContext();

  const toggleLocale = () => {
    const next = locale === "en" ? "zh-CN" : "en";
    setLocale(next as Locale);
  };

  return (
    <button
      onClick={toggleLocale}
      className="p-2.5 glass rounded-full hover:scale-105 transition-transform text-sm font-medium"
      title={locale === "en" ? "切换至中文" : "Switch to English"}
    >
      {localeLabels[locale]}
    </button>
  );
}
