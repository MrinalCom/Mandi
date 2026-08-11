"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import CropImage from "../../components/CropImage";

interface Listing {
  id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: string;
  price_per_kg: string;
  status: string;
  quality_grade: string;
}

const statusBadge: Record<string, string> = {
  active: "badge-green",
  pooled: "badge-amber",
  sold: "badge-gray",
  expired: "badge-gray",
  cancelled: "badge-red",
};

export default function MyListingsPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ready && (!user || user.role !== "farmer")) {
      router.push("/login");
      return;
    }
    if (token) {
      api.get<{ listings: Listing[] }>("/api/listings/mine", token).then((res) => {
        setListings(res.listings);
        setLoading(false);
      });
    }
  }, [ready, user, token, router]);

  async function markSold(id: string) {
    await api.patch(`/api/listings/${id}`, { status: "sold" }, token);
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status: "sold" } : l)));
  }

  return (
    <div className="container page">
      <div className="section-title">
        <h1>My listings</h1>
        <Link href="/listings/new" className="btn btn-primary">+ List your harvest</Link>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && listings.length === 0 && (
        <div className="empty-state">
          You haven&apos;t listed any produce yet.
          <div style={{ marginTop: 16 }}>
            <Link href="/listings/new" className="btn btn-primary">List your first harvest</Link>
          </div>
        </div>
      )}

      <div className="card-grid">
        {listings.map((l) => (
          <div key={l.id} className="card">
            <CropImage cropName={l.crop_name} />
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <h3>{l.crop_name}{l.variety ? ` — ${l.variety}` : ""}</h3>
              <span className={`badge ${statusBadge[l.status] ?? "badge-gray"}`}>{l.status}</span>
            </div>
            <p>Grade {l.quality_grade} · {l.quantity_kg}kg remaining</p>
            <p style={{ fontWeight: 700, color: "var(--ink)" }}>₹{l.price_per_kg}/kg</p>
            {l.status === "active" && (
              <button className="btn btn-secondary btn-sm" onClick={() => markSold(l.id)}>Mark sold offline</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
