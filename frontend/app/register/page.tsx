"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [role, setRole] = useState<"farmer" | "buyer">("farmer");
  const [form, setForm] = useState({ name: "", phone: "", password: "", village: "", district: "", state: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ user: any; token: string }>("/api/auth/register", { ...form, role });
      login(res.user, res.token);
      router.push(role === "farmer" ? "/listings/mine" : "/marketplace");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 480 }}>
      <h1>Create an account</h1>

      <div className="field">
        <label>I am a</label>
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" className={`btn ${role === "farmer" ? "btn-primary" : "btn-secondary"}`} onClick={() => setRole("farmer")}>
            Farmer — I sell produce
          </button>
          <button type="button" className={`btn ${role === "buyer" ? "btn-primary" : "btn-secondary"}`} onClick={() => setRole("buyer")}>
            Buyer — I purchase produce
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label>Full name</label>
          <input required value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="field">
          <label>Phone number</label>
          <input required maxLength={10} value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="98XXXXXXXX" />
        </div>
        <div className="field">
          <label>Password</label>
          <input required type="password" minLength={6} value={form.password} onChange={(e) => update("password", e.target.value)} />
        </div>
        <div className="form-row">
          <div className="field">
            <label>Village</label>
            <input value={form.village} onChange={(e) => update("village", e.target.value)} />
          </div>
          <div className="field">
            <label>District</label>
            <input value={form.district} onChange={(e) => update("district", e.target.value)} />
          </div>
        </div>
        <div className="field">
          <label>State</label>
          <input value={form.state} onChange={(e) => update("state", e.target.value)} />
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
    </div>
  );
}
