"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
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

export default function MandiPricesPage() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);
  const [crop, setCrop] = useState("");
  const [loading, setLoading] = useState(true);
  const { t } = useLang();

  async function load() {
    setLoading(true);
    const query = crop ? `?crop=${encodeURIComponent(crop)}` : "";
    const res = await api.get<{ prices: MandiPrice[] }>(`/api/mandi-prices${query}`);
    setPrices(res.prices);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container page">
      <div className="section-title">
        <h1>{t("mandiPrices")}</h1>
        <form onSubmit={(e) => { e.preventDefault(); load(); }} style={{ display: "flex", gap: 8 }}>
          <input placeholder="Filter by crop" value={crop} onChange={(e) => setCrop(e.target.value)} />
          <button className="btn btn-secondary">Filter</button>
        </form>
      </div>
      <p className="field-hint" style={{ marginBottom: 20 }}>
        Prices are per quintal (100kg), the standard unit used by government mandi data, updated daily.
        Divide by 100 to compare against a per-kg listing price.
      </p>

      {loading && <p>Loading prices...</p>}

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
