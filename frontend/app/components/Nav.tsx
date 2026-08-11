"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "../lib/AuthContext";
import { useLang } from "../lib/i18n";
import { useCart } from "../lib/CartContext";
import NotificationBell from "./NotificationBell";

export default function Nav() {
  const pathname = usePathname();
  const { user, ready, logout } = useAuth();
  const { lang, setLang, t } = useLang();
  const { count } = useCart();

  const links = user?.role === "farmer"
    ? [
        { href: "/marketplace", label: t("marketplace") },
        { href: "/mandi-prices", label: t("mandiPrices") },
        { href: "/pools", label: t("pools") },
        { href: "/listings/mine", label: t("myListings") },
        { href: "/dashboard", label: t("dashboard") },
        { href: "/orders", label: t("orders") },
      ]
    : [
        { href: "/marketplace", label: t("marketplace") },
        { href: "/mandi-prices", label: t("mandiPrices") },
        { href: "/pools", label: t("pools") },
        { href: "/orders", label: t("orders") },
      ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/" className="brand">🌾 Mandi</Link>
        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={`nav-link ${pathname === l.href ? "active" : ""}`}>
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          <div className="lang-toggle">
            <button className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>EN</button>
            <button className={lang === "hi" ? "active" : ""} onClick={() => setLang("hi")}>हिं</button>
          </div>
          {user?.role === "buyer" && (
            <Link href="/cart" className="btn btn-outline btn-sm">{t("cart")} ({count})</Link>
          )}
          <NotificationBell />
          {ready && !user && (
            <>
              <Link href="/login" className="btn btn-secondary btn-sm">{t("login")}</Link>
              <Link href="/register" className="btn btn-primary btn-sm">{t("register")}</Link>
            </>
          )}
          {ready && user && (
            <button className="btn btn-secondary btn-sm" onClick={logout}>{t("logout")}</button>
          )}
        </div>
      </div>
    </nav>
  );
}
