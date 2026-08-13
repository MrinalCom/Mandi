"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useCart } from "../lib/CartContext";
import CropImage from "../components/CropImage";

interface WishlistItem {
  wishlist_id: string;
  listing_id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: string;
  price_per_kg: string;
  quality_grade: string;
  status: string;
  photo_url: string | null;
  farmer_name: string;
}

export default function WishlistPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const { addItem } = useCart();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && (!user || user.role !== "buyer")) {
      router.push("/login");
      return;
    }
    if (token) {
      api.get<{ items: WishlistItem[] }>("/api/wishlist", token).then((res) => {
        setItems(res.items);
        setLoading(false);
      });
    }
  }, [ready, user, token, router]);

  async function remove(listingId: string) {
    setItems((prev) => prev.filter((i) => i.listing_id !== listingId));
    await api.delete(`/api/wishlist/${listingId}`, token);
  }

  return (
    <div className="container page">
      <h1>My wishlist</h1>
      {loading && <p>Loading...</p>}
      {!loading && items.length === 0 && (
        <div className="empty-state">You haven&apos;t saved any listings yet.</div>
      )}
      <div className="card-grid">
        {items.map((l) => (
          <div key={l.wishlist_id} className="card">
            {l.photo_url ? (
              <div className="crop-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photo_url} alt={l.crop_name} loading="lazy" />
              </div>
            ) : (
              <CropImage cropName={l.crop_name} />
            )}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3 style={{ marginBottom: 4 }}>{l.crop_name}{l.variety ? ` — ${l.variety}` : ""}</h3>
              {l.status !== "active" && <span className="badge badge-gray">{l.status}</span>}
            </div>
            <p className="field-hint" style={{ marginBottom: 6 }}>{l.farmer_name} · Grade {l.quality_grade}</p>
            <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 14 }}>₹{l.price_per_kg}/kg</p>
            <div style={{ display: "flex", gap: 8 }}>
              {l.status === "active" ? (
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() =>
                    addItem({
                      listingId: l.listing_id,
                      cropName: l.crop_name,
                      farmerName: l.farmer_name,
                      pricePerKg: Number(l.price_per_kg),
                      quantityKg: Math.min(10, Number(l.quantity_kg)),
                      maxQuantityKg: Number(l.quantity_kg),
                    })
                  }
                >
                  Add to cart
                </button>
              ) : (
                <button className="btn btn-secondary" style={{ flex: 1 }} disabled>No longer available</button>
              )}
              <button className="btn btn-danger btn-sm" onClick={() => remove(l.listing_id)}>Remove</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
