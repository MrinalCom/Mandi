"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useCart } from "../lib/CartContext";
import { useLang } from "../lib/i18n";

interface Listing {
  id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: string;
  price_per_kg: string;
  quality_grade: string;
  village: string | null;
  district: string | null;
  state: string | null;
  farmer_name: string;
}

export default function MarketplacePage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [crop, setCrop] = useState("");
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { addItem } = useCart();
  const { t } = useLang();

  async function load() {
    setLoading(true);
    const query = crop ? `?crop=${encodeURIComponent(crop)}` : "";
    const res = await api.get<{ listings: Listing[] }>(`/api/listings${query}`);
    setListings(res.listings);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container page">
      <div className="section-title">
        <h1>{t("marketplace")}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load();
          }}
          style={{ display: "flex", gap: 8 }}
        >
          <input placeholder="Search crop (e.g. Tomato)" value={crop} onChange={(e) => setCrop(e.target.value)} />
          <button className="btn btn-secondary">Search</button>
        </form>
      </div>

      {loading && <p>Loading listings...</p>}
      {!loading && listings.length === 0 && <div className="empty-state">No active listings match that search.</div>}

      <div className="card-grid">
        {listings.map((l) => (
          <div key={l.id} className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
              <h3 style={{ marginBottom: 4 }}>{l.crop_name}{l.variety ? ` — ${l.variety}` : ""}</h3>
              <span className="badge badge-green">Grade {l.quality_grade}</span>
            </div>
            <p style={{ marginBottom: 6 }}>
              {l.farmer_name} · {[l.village, l.district, l.state].filter(Boolean).join(", ") || "Location not set"}
            </p>
            <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4 }}>
              ₹{l.price_per_kg}{t("perKg")}
            </p>
            <p className="field-hint" style={{ marginBottom: 14 }}>{t("quantityAvailable")}: {l.quantity_kg}kg</p>
            {user?.role === "buyer" && (
              <button
                className="btn btn-primary btn-block"
                onClick={() =>
                  addItem({
                    listingId: l.id,
                    cropName: l.crop_name,
                    farmerName: l.farmer_name,
                    pricePerKg: Number(l.price_per_kg),
                    quantityKg: Math.min(10, Number(l.quantity_kg)),
                    maxQuantityKg: Number(l.quantity_kg),
                  })
                }
              >
                {t("addToCart")}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
