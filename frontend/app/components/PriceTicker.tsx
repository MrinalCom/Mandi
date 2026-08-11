"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

interface MandiPrice {
  id: string;
  crop_name: string;
  mandi_name: string;
  modal_price: string;
}

export default function PriceTicker() {
  const [prices, setPrices] = useState<MandiPrice[]>([]);

  useEffect(() => {
    api
      .get<{ prices: MandiPrice[] }>("/api/mandi-prices")
      .then((res) => setPrices(res.prices))
      .catch(() => setPrices([]));
  }, []);

  if (prices.length === 0) return null;

  const track = [...prices, ...prices];

  return (
    <div className="marquee marquee-light">
      <span className="marquee-label">LIVE MANDI PRICES</span>
      <div className="marquee-track marquee-track-fast">
        {track.map((p, i) => (
          <span className="marquee-item" key={`${p.id}-${i}`}>
            <b>{p.crop_name}</b>
            <span>{p.mandi_name} · ₹{(Number(p.modal_price) / 100).toFixed(2)}/kg</span>
          </span>
        ))}
      </div>
    </div>
  );
}
