"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import CropImage from "../../components/CropImage";

interface Farmer {
  id: string;
  name: string;
  village: string | null;
  district: string | null;
  state: string | null;
  created_at: string;
}

interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
  buyer_name: string;
}

interface Listing {
  id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: string;
  price_per_kg: string;
  quality_grade: string;
  photo_url: string | null;
}

interface Profile {
  farmer: Farmer;
  rating: string | null;
  ratingCount: number;
  completedOrders: number;
  verified: boolean;
  reviews: Review[];
  listings: Listing[];
}

export default function FarmerProfilePage() {
  const params = useParams<{ id: string }>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000"}/api/farmers/${params.id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Farmer not found");
        return res.json();
      })
      .then(setProfile)
      .catch(() => setError("This farmer profile couldn't be found."));
  }, [params.id]);

  if (error) return <div className="container page"><div className="empty-state">{error}</div></div>;
  if (!profile) return <div className="container page"><p>Loading profile...</p></div>;

  const { farmer, rating, ratingCount, verified, listings, reviews } = profile;

  return (
    <div className="container page">
      <div className="card" style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ marginBottom: 6 }}>{farmer.name}</h1>
            <p style={{ margin: 0 }}>
              {[farmer.village, farmer.district, farmer.state].filter(Boolean).join(", ") || "Location not set"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {verified && <span className="badge badge-amber">✓ Verified Farmer</span>}
            {rating && (
              <span className="rating-pill">★ {Number(rating).toFixed(1)} <span className="field-hint">({ratingCount} review{ratingCount === 1 ? "" : "s"})</span></span>
            )}
          </div>
        </div>
        <div className="stat-row" style={{ marginTop: 20 }}>
          <div className="stat-tile"><div className="stat-label">Completed orders</div><div className="stat-value">{profile.completedOrders}</div></div>
          <div className="stat-tile"><div className="stat-label">Active listings</div><div className="stat-value">{listings.length}</div></div>
          <div className="stat-tile"><div className="stat-label">On Mandi since</div><div className="stat-value" style={{ fontSize: 18 }}>{new Date(farmer.created_at).toLocaleDateString(undefined, { month: "short", year: "numeric" })}</div></div>
        </div>
      </div>

      <div className="section-title"><h2>Active listings</h2></div>
      {listings.length === 0 && <div className="empty-state" style={{ marginBottom: 28 }}>No active listings right now.</div>}
      <div className="card-grid" style={{ marginBottom: 40 }}>
        {listings.map((l) => (
          <div key={l.id} className="card">
            {l.photo_url ? (
              <div className="crop-image">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={l.photo_url} alt={l.crop_name} loading="lazy" />
              </div>
            ) : (
              <CropImage cropName={l.crop_name} />
            )}
            <h3 style={{ marginBottom: 4 }}>{l.crop_name}{l.variety ? ` — ${l.variety}` : ""}</h3>
            <p style={{ fontWeight: 700, color: "var(--ink)" }}>₹{l.price_per_kg}/kg</p>
            <p className="field-hint">Grade {l.quality_grade} · {l.quantity_kg}kg available</p>
          </div>
        ))}
      </div>

      <div className="section-title"><h2>Reviews</h2></div>
      {reviews.length === 0 && <div className="empty-state">No reviews yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {reviews.map((r, i) => (
          <div key={i} className="card">
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b>
              <span className="field-hint">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            {r.comment && <p style={{ marginTop: 8, marginBottom: 4 }}>{r.comment}</p>}
            <p className="field-hint" style={{ margin: 0 }}>— {r.buyer_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
