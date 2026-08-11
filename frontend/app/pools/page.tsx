"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useLang } from "../lib/i18n";
import CropImage from "../components/CropImage";

interface Pool {
  id: string;
  crop_name: string;
  mandi_zone: string;
  price_per_kg: string;
  target_quantity_kg: string;
  current_quantity_kg: string;
  status: string;
  created_by_name: string;
}

export default function PoolsPage() {
  const { user, token } = useAuth();
  const { t } = useLang();
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [joinQty, setJoinQty] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ cropName: "", mandiZone: "", pricePerKg: "", targetQuantityKg: "" });

  async function load() {
    setLoading(true);
    const res = await api.get<{ pools: Pool[] }>("/api/pools");
    setPools(res.pools);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function createPool(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/api/pools", createForm, token);
      setShowCreate(false);
      setCreateForm({ cropName: "", mandiZone: "", pricePerKg: "", targetQuantityKg: "" });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  async function join(poolId: string) {
    const quantityKg = Number(joinQty[poolId] || 0);
    if (!quantityKg) return;
    try {
      await api.post(`/api/pools/${poolId}/join`, { quantityKg }, token);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    }
  }

  return (
    <div className="container page">
      <div className="section-title">
        <h1>{t("pools")}</h1>
        {user?.role === "farmer" && (
          <button className="btn btn-primary" onClick={() => setShowCreate((s) => !s)}>
            {showCreate ? "Cancel" : "+ Start a pool"}
          </button>
        )}
      </div>
      <p className="field-hint" style={{ marginBottom: 20 }}>
        Small farmers selling the same crop in the same mandi zone combine listings into one lot that meets a
        bulk buyer&apos;s minimum order — and gain the bargaining power a single small holding doesn&apos;t have.
      </p>

      {showCreate && (
        <form onSubmit={createPool} className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
          <div className="field">
            <label>Crop</label>
            <input required value={createForm.cropName} onChange={(e) => setCreateForm((f) => ({ ...f, cropName: e.target.value }))} />
          </div>
          <div className="field">
            <label>Mandi zone (e.g. district/city)</label>
            <input required value={createForm.mandiZone} onChange={(e) => setCreateForm((f) => ({ ...f, mandiZone: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="field">
              <label>Asking price per kg (₹)</label>
              <input required type="number" min={0.5} step={0.5} value={createForm.pricePerKg} onChange={(e) => setCreateForm((f) => ({ ...f, pricePerKg: e.target.value }))} />
            </div>
            <div className="field">
              <label>Target quantity (kg)</label>
              <input required type="number" min={1} value={createForm.targetQuantityKg} onChange={(e) => setCreateForm((f) => ({ ...f, targetQuantityKg: e.target.value }))} />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn btn-primary btn-block">Create pool</button>
        </form>
      )}

      {loading && <p>Loading pools...</p>}
      {!loading && pools.length === 0 && <div className="empty-state">No open pools right now.</div>}

      <div className="card-grid">
        {pools.map((p) => {
          const pct = Math.min(100, (Number(p.current_quantity_kg) / Number(p.target_quantity_kg)) * 100);
          return (
            <div key={p.id} className="card">
              <CropImage cropName={p.crop_name} />
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3>{p.crop_name}</h3>
                <span className="badge badge-amber">{p.mandi_zone}</span>
              </div>
              <p>₹{p.price_per_kg}/kg · started by {p.created_by_name}</p>
              <div style={{ background: "var(--surface-alt)", borderRadius: 999, height: 10, overflow: "hidden", margin: "10px 0" }}>
                <div style={{ background: "var(--green)", width: `${pct}%`, height: "100%" }} />
              </div>
              <p className="field-hint" style={{ marginBottom: 14 }}>
                {p.current_quantity_kg}kg / {p.target_quantity_kg}kg filled
              </p>
              {user?.role === "farmer" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number"
                    min={1}
                    placeholder="kg to add"
                    style={{ minHeight: 40 }}
                    value={joinQty[p.id] || ""}
                    onChange={(e) => setJoinQty((q) => ({ ...q, [p.id]: e.target.value }))}
                  />
                  <button className="btn btn-secondary btn-sm" onClick={() => join(p.id)}>{t("joinPool")}</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
