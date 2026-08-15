"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ user: any; token: string }>("/api/auth/login", { phone: phone.trim(), password });
      login(res.user, res.token);
      router.push(res.user.role === "farmer" ? "/listings/mine" : "/marketplace");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 420 }}>
      <h1>Log in</h1>
      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label>Phone number</label>
          <input required value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? "Logging in..." : "Log in"}</button>
        <p style={{ marginTop: 12, fontSize: 14 }}>
          No account? <Link href="/register" style={{ color: "var(--green)", fontWeight: 700 }}>Sign up</Link>
        </p>
        <p className="field-hint">
          Demo: Farmer 9800000001 / Buyer 9800000003 — password: password123
        </p>
      </form>
    </div>
  );
}
