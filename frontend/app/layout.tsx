import "./globals.css";
import type { ReactNode } from "react";
import { AuthProvider } from "./lib/AuthContext";
import { CartProvider } from "./lib/CartContext";
import { LangProvider } from "./lib/i18n";
import Nav from "./components/Nav";
import Footer from "./components/Footer";

export const metadata = {
  title: "Mandi — Sell your harvest directly",
  description: "A direct farmer-to-buyer marketplace with real mandi price transparency.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LangProvider>
          <AuthProvider>
            <CartProvider>
              <div className="app-shell">
                <Nav />
                <main className="app-main">{children}</main>
                <Footer />
              </div>
            </CartProvider>
          </AuthProvider>
        </LangProvider>
      </body>
    </html>
  );
}
