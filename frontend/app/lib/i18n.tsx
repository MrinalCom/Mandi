"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

// Small hand-maintained dictionary rather than a full i18n framework — the goal
// here is just to not force English fluency on farmers using the core flows,
// per the digital-literacy gap noted in PROBLEM.md.
const dict = {
  en: {
    tagline: "Sell your harvest directly. No middleman price cut.",
    marketplace: "Marketplace",
    mandiPrices: "Mandi Prices",
    pools: "Group Selling",
    myListings: "My Listings",
    dashboard: "Dashboard",
    orders: "Orders",
    cart: "Cart",
    login: "Log in",
    register: "Sign up",
    logout: "Log out",
    listYourHarvest: "List your harvest",
    addToCart: "Add to cart",
    perKg: "/kg",
    quantityAvailable: "Available",
    checkout: "Checkout",
    placeOrder: "Place order",
    todaysMandiPrice: "Today's mandi price",
    joinPool: "Join this pool",
  },
  hi: {
    tagline: "सीधे अपनी फसल बेचें। बिचौलिए का हिस्सा नहीं।",
    marketplace: "बाज़ार",
    mandiPrices: "मंडी भाव",
    pools: "समूह में बिक्री",
    myListings: "मेरी फसल सूची",
    dashboard: "डैशबोर्ड",
    orders: "ऑर्डर",
    cart: "कार्ट",
    login: "लॉग इन",
    register: "साइन अप",
    logout: "लॉग आउट",
    listYourHarvest: "अपनी फसल दर्ज करें",
    addToCart: "कार्ट में डालें",
    perKg: "/किलो",
    quantityAvailable: "उपलब्ध मात्रा",
    checkout: "चेकआउट",
    placeOrder: "ऑर्डर करें",
    todaysMandiPrice: "आज का मंडी भाव",
    joinPool: "इस समूह में जुड़ें",
  },
} as const;

export type Lang = keyof typeof dict;
type Key = keyof (typeof dict)["en"];

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: Key) => string;
}

const LangContext = createContext<LangContextValue | undefined>(undefined);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  useEffect(() => {
    const stored = localStorage.getItem("mandi_lang") as Lang | null;
    if (stored === "en" || stored === "hi") setLangState(stored);
  }, []);

  function setLang(l: Lang) {
    localStorage.setItem("mandi_lang", l);
    setLangState(l);
  }

  function t(key: Key) {
    return dict[lang][key] ?? dict.en[key];
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>;
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}
