"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

interface MandiPrice {
  mandi_name: string;
  modal_price: string;
}

export default function NewListingPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const [form, setForm] = useState({
    cropName: "",
    variety: "",
    quantityKg: "100",
    pricePerKg: "",
    qualityGrade: "A",
  });
  const [mandiHint, setMandiHint] = useState<MandiPrice[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && (!user || user.role !== "farmer")) router.push("/login");
  }, [ready, user, router]);

  async function checkMandiPrice() {
    if (!form.cropName) return;
    const res = await api.get<{ prices: MandiPrice[] }>(`/api/mandi-prices?crop=${encodeURIComponent(form.cropName)}`);
    setMandiHint(res.prices.slice(0, 3));
  }

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/listings", form, token);
      router.push("/listings/mine");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 520 }}>
      <h1>List your harvest</h1>
      <form onSubmit={onSubmit} className="card">
        <div className="field">
          <label>Crop name</label>
          <input required value={form.cropName} onChange={(e) => update("cropName", e.target.value)} onBlur={checkMandiPrice} placeholder="e.g. Tomato" />
        </div>

        {mandiHint && mandiHint.length > 0 && (
          <div className="card" style={{ background: "var(--amber-soft)", border: "none", marginBottom: 16 }}>
            <b>{"Today's mandi price"} for {form.cropName}:</b>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {mandiHint.map((p, i) => (
                <li key={i}>{p.mandi_name}: ₹{(Number(p.modal_price) / 100).toFixed(2)}/kg (modal)</li>
              ))}
            </ul>
          </div>
        )}

        <div className="field">
          <label>Variety (optional)</label>
          <input value={form.variety} onChange={(e) => update("variety", e.target.value)} />
        </div>

        <div className="form-row">
          <div className="field">
            <label>Quantity (kg)</label>
            <input required type="number" min={1} step={1} value={form.quantityKg} onChange={(e) => update("quantityKg", e.target.value)} />
          </div>
          <div className="field">
            <label>Price per kg (₹)</label>
            <input required type="number" min={0.5} step={0.5} value={form.pricePerKg} onChange={(e) => update("pricePerKg", e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Quality grade</label>
          <select value={form.qualityGrade} onChange={(e) => update("qualityGrade", e.target.value)}>
            <option value="A">A — best</option>
            <option value="B">B — good</option>
            <option value="C">C — standard</option>
          </select>
        </div>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" disabled={loading}>{loading ? "Publishing..." : "Publish listing"}</button>
      </form>
    </div>
  );
}
