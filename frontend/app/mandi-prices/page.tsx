"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useLang } from "../lib/i18n";
import CropImage from "../components/CropImage";

interface MandiPrice {
  id: string;
  crop_name: string;
  mandi_name: string;
  district: string;
  state: string;
  min_price: string;
  max_price: string;
  modal_price: string;
  price_date: string;
}

interface TrendPoint {
  price_date: string;
  avg_modal_price: string;
}

export default function MandiPricesPage() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [crop, setCrop] = useState("");
  const [state, setState] = useState("");
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<TrendPoint[] | null>(null);
  const [watching, setWatching] = useState(false);
  const [watchedCrops, setWatchedCrops] = useState<string[]>([]);
  const { t } = useLang();
  const { user, token } = useAuth();

  async function load(cropFilter: string, stateFilter: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (cropFilter) params.set("crop", cropFilter);
    if (stateFilter) params.set("state", stateFilter);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get<{ prices: MandiPrice[] }>(`/api/mandi-prices${query}`);
    setPrices(res.prices);
    setLoading(false);

    if (cropFilter.trim()) {
      const trendRes = await api.get<{ trend: TrendPoint[] }>(`/api/mandi-prices/trend?crop=${encodeURIComponent(cropFilter)}`);
      setTrend(trendRes.trend);
    } else {
      setTrend(null);
    }
  }

  function loadWatchlist() {
    if (!token) return;
    api.get<{ watches: { crop_name: string }[] }>("/api/mandi-prices/watch", token).then((res) => {
      setWatchedCrops(res.watches.map((w) => w.crop_name));
    });
  }

  useEffect(() => {
    load(crop, state);
    api.get<{ states: string[] }>("/api/mandi-prices/states").then((res) => setStates(res.states));
    loadWatchlist();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isWatched = crop.trim() && watchedCrops.some((c) => c.toLowerCase() === crop.trim().toLowerCase());

  async function toggleWatch() {
    if (!user || !crop.trim()) return;
    setWatching(true);
    try {
      if (isWatched) {
        await api.delete(`/api/mandi-prices/watch/${encodeURIComponent(crop.trim())}`, token);
      } else {
        await api.post("/api/mandi-prices/watch", { cropName: crop.trim() }, token);
      }
      loadWatchlist();
    } finally {
      setWatching(false);
    }
  }

  const chartData = (trend ?? []).map((p) => ({
    date: new Date(p.price_date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    price: Number(p.avg_modal_price) / 100,
  }));

  return (
    <div className="container page">
      <div className="section-title">
        <h1>{t("mandiPrices")}</h1>
        <form onSubmit={(e) => { e.preventDefault(); load(crop, state); }} className="filter-row">
          <input placeholder="Filter by crop" value={crop} onChange={(e) => setCrop(e.target.value)} />
          <select value={state} onChange={(e) => setState(e.target.value)}>
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="btn btn-secondary">Filter</button>
        </form>
      </div>
      <p className="field-hint" style={{ marginBottom: 20 }}>
        Prices are per quintal (100kg), the standard unit used by government mandi data, updated daily.
        Divide by 100 to compare against a per-kg listing price.
      </p>

      {loading && <p>Loading prices...</p>}

      {chartData.length > 1 && (
        <div className="card" style={{ marginBottom: 24, height: 260 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ marginBottom: 0 }}>{crop} price trend, last 14 days (₹/kg)</h3>
            {user && (
              <button className="btn btn-sm" onClick={toggleWatch} disabled={watching}
                style={isWatched ? { background: "var(--amber-soft)", color: "var(--amber)" } : { background: "var(--surface-alt)", color: "var(--ink)" }}>
                {isWatched ? "★ Watching" : "☆ Watch this crop"}
              </button>
            )}
          </div>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip formatter={(v) => `₹${Number(v).toFixed(2)}`} />
              <Line type="monotone" dataKey="price" stroke="#2f6b3a" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Crop</th>
              <th>Mandi</th>
              <th>District / State</th>
              <th>Min</th>
              <th>Max</th>
              <th>Modal</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((p) => (
              <tr key={p.id}>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CropImage cropName={p.crop_name} className="crop-image-thumb-sm" />
                    {p.crop_name}
                  </div>
                </td>
                <td>{p.mandi_name}</td>
                <td>{p.district}, {p.state}</td>
                <td>₹{p.min_price}</td>
                <td>₹{p.max_price}</td>
                <td style={{ fontWeight: 700 }}>₹{p.modal_price}</td>
                <td>{new Date(p.price_date).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && prices.length === 0 && <div className="empty-state">No price data for that crop yet.</div>}
      </div>
    </div>
  );
}
