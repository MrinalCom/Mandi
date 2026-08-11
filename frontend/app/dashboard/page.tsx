"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";

interface Sale {
  order_id: string;
  crop_name: string;
  quantity_kg: string;
  unit_price: string;
  total_price: string;
  mandi_price_per_kg: number | null;
  earned_vs_mandi_pct: number | null;
  created_at: string;
}

interface DashboardData {
  totals: { total_orders: string; total_earned: string; total_kg_sold: string };
  activeListings: number;
  sales: Sale[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (ready && (!user || user.role !== "farmer")) {
      router.push("/login");
      return;
    }
    if (token) {
      api.get<DashboardData>("/api/farmer/dashboard", token).then(setData);
    }
  }, [ready, user, token, router]);

  function exportCsv() {
    if (!data) return;
    const header = ["Date", "Crop", "Quantity (kg)", "Your price (₹/kg)", "Mandi avg (₹/kg)", "Vs mandi (%)", "Total (₹)"];
    const rows = data.sales.map((s) => [
      new Date(s.created_at).toLocaleDateString(),
      s.crop_name,
      s.quantity_kg,
      s.unit_price,
      s.mandi_price_per_kg?.toFixed(2) ?? "",
      s.earned_vs_mandi_pct ?? "",
      s.total_price,
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mandi-earnings-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!data) return <div className="container page"><p>Loading dashboard...</p></div>;

  const chartData = data.sales
    .filter((s) => s.mandi_price_per_kg !== null)
    .slice(0, 8)
    .reverse()
    .map((s) => ({
      name: s.crop_name,
      "Your price": Number(s.unit_price),
      "Mandi avg": s.mandi_price_per_kg,
    }));

  return (
    <div className="container page">
      <h1>My earnings</h1>

      <div className="stat-row" style={{ marginBottom: 28 }}>
        <div className="stat-tile"><div className="stat-label">Total earned</div><div className="stat-value">₹{Number(data.totals.total_earned).toLocaleString()}</div></div>
        <div className="stat-tile"><div className="stat-label">Orders fulfilled</div><div className="stat-value">{data.totals.total_orders}</div></div>
        <div className="stat-tile"><div className="stat-label">kg sold</div><div className="stat-value">{data.totals.total_kg_sold}</div></div>
        <div className="stat-tile"><div className="stat-label">Active listings</div><div className="stat-value">{data.activeListings}</div></div>
      </div>

      {chartData.length > 0 && (
        <div className="card" style={{ marginBottom: 28, height: 320 }}>
          <h3>Your price vs mandi average (₹/kg)</h3>
          <ResponsiveContainer width="100%" height="90%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Your price" fill="#2f6b3a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Mandi avg" fill="#c07a1e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 style={{ marginBottom: 0 }}>Sale history</h3>
          {data.sales.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={exportCsv}>⬇ Export CSV</button>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>Crop</th><th>Qty</th><th>Your price</th><th>Mandi avg</th><th>Vs mandi</th><th>Total</th>
            </tr>
          </thead>
          <tbody>
            {data.sales.map((s) => (
              <tr key={s.order_id}>
                <td>{s.crop_name}</td>
                <td>{s.quantity_kg}kg</td>
                <td>₹{s.unit_price}</td>
                <td>{s.mandi_price_per_kg ? `₹${s.mandi_price_per_kg.toFixed(2)}` : "—"}</td>
                <td>
                  {s.earned_vs_mandi_pct !== null ? (
                    <span className={`badge ${s.earned_vs_mandi_pct >= 0 ? "badge-green" : "badge-red"}`}>
                      {s.earned_vs_mandi_pct >= 0 ? "+" : ""}{s.earned_vs_mandi_pct}%
                    </span>
                  ) : "—"}
                </td>
                <td>₹{s.total_price}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.sales.length === 0 && <div className="empty-state">No sales yet — list your harvest to get started.</div>}
      </div>
    </div>
  );
}
