"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

export type Role = "farmer" | "buyer" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  phone: string;
  role: Role;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  language_pref?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  ready: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("mandi_token");
    const storedUser = localStorage.getItem("mandi_user");
    if (storedToken && storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      } catch {
        localStorage.removeItem("mandi_token");
        localStorage.removeItem("mandi_user");
      }
    }
    setReady(true);
  }, []);

  function login(newUser: AuthUser, newToken: string) {
    localStorage.setItem("mandi_token", newToken);
    localStorage.setItem("mandi_user", JSON.stringify(newUser));
    setUser(newUser);
    setToken(newToken);
  }

  function logout() {
    localStorage.removeItem("mandi_token");
    localStorage.removeItem("mandi_user");
    setUser(null);
    setToken(null);
    router.push("/");
  }

  return (
    <AuthContext.Provider value={{ user, token, ready, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
