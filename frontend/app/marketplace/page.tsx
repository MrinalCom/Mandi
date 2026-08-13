"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useCart } from "../lib/CartContext";
import { useLang } from "../lib/i18n";
import CropImage from "../components/CropImage";

const VERIFIED_THRESHOLD = 3;

interface Listing {
  id: string;
  farmer_id: string;
  crop_name: string;
  variety: string | null;
  quantity_kg: string;
  price_per_kg: string;
  quality_grade: string;
  village: string | null;
  district: string | null;
  state: string | null;
  farmer_name: string;
  photo_url: string | null;
  farmer_rating: string | null;
  farmer_rating_count: string;
  farmer_completed_orders: string;
}

interface Location {
  state: string;
  district: string;
}

function MarketplaceContent() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [crop, setCrop] = useState(searchParams.get("crop") ?? "");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [loading, setLoading] = useState(true);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [wishlisted, setWishlisted] = useState<Set<string>>(new Set());
  const { user, token } = useAuth();
  const { addItem } = useCart();
  const { t } = useLang();

  async function load(cropFilter: string, stateFilter: string, districtFilter: string) {
    setLoading(true);
    const params = new URLSearchParams();
    if (cropFilter) params.set("crop", cropFilter);
    if (stateFilter) params.set("state", stateFilter);
    if (districtFilter) params.set("district", districtFilter);
    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await api.get<{ listings: Listing[] }>(`/api/listings${query}`);
    setListings(res.listings);
    setLoading(false);
  }

  useEffect(() => {
    load(crop, state, district);
    api.get<{ locations: Location[] }>("/api/listings/locations").then((res) => setLocations(res.locations));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (user?.role === "buyer" && token) {
      api.get<{ items: { listing_id: string }[] }>("/api/wishlist", token).then((res) => {
        setWishlisted(new Set(res.items.map((i) => i.listing_id)));
      });
    }
  }, [user, token]);

  async function toggleWishlist(listingId: string) {
    const isSaved = wishlisted.has(listingId);
    setWishlisted((prev) => {
      const next = new Set(prev);
      isSaved ? next.delete(listingId) : next.add(listingId);
      return next;
    });
    if (isSaved) {
      await api.delete(`/api/wishlist/${listingId}`, token);
    } else {
      await api.post("/api/wishlist", { listingId }, token);
    }
  }

  const states = useMemo(() => Array.from(new Set(locations.map((l) => l.state))).sort(), [locations]);
  const districts = useMemo(
    () => Array.from(new Set(locations.filter((l) => !state || l.state === state).map((l) => l.district))).sort(),
    [locations, state]
  );

  return (
    <div className="container page">
      <div className="section-title">
        <h1>{t("marketplace")}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(crop, state, district);
          }}
          className="filter-row"
        >
          <input placeholder="Search crop (e.g. Tomato)" value={crop} onChange={(e) => setCrop(e.target.value)} />
          <select value={state} onChange={(e) => { setState(e.target.value); setDistrict(""); }}>
            <option value="">All states</option>
            {states.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={district} onChange={(e) => setDistrict(e.target.value)}>
            <option value="">All districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <button className="btn btn-secondary">Search</button>
        </form>
      </div>

      {loading && <p>Loading listings...</p>}
      {!loading && listings.length === 0 && <div className="empty-state">No active listings match that search.</div>}

      <div className="card-grid">
        {listings.map((l) => {
          const rating = l.farmer_rating ? Number(l.farmer_rating) : null;
          const isVerified = Number(l.farmer_completed_orders) >= VERIFIED_THRESHOLD;
          const isSaved = wishlisted.has(l.id);
          return (
            <div key={l.id} className="card" style={{ position: "relative" }}>
              {user?.role === "buyer" && (
                <button
                  onClick={() => toggleWishlist(l.id)}
                  aria-label={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                  title={isSaved ? "Remove from wishlist" : "Save to wishlist"}
                  style={{
                    position: "absolute", top: 14, right: 14, zIndex: 2,
                    background: "rgba(255,255,255,0.9)", border: "none", borderRadius: "50%",
                    width: 34, height: 34, cursor: "pointer", fontSize: 16,
                  }}
                >
                  {isSaved ? "❤️" : "🤍"}
                </button>
              )}
              {l.photo_url ? (
                <div className="crop-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={l.photo_url} alt={l.crop_name} loading="lazy" />
                </div>
              ) : (
                <CropImage cropName={l.crop_name} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                <h3 style={{ marginBottom: 4 }}>{l.crop_name}{l.variety ? ` — ${l.variety}` : ""}</h3>
                <span className="badge badge-green">Grade {l.quality_grade}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <Link href={`/farmers/${l.farmer_id}`} style={{ fontWeight: 600, textDecoration: "underline" }}>{l.farmer_name}</Link>
                {isVerified && <span className="badge badge-amber">✓ Verified</span>}
                {rating !== null && (
                  <span className="rating-pill">★ {rating.toFixed(1)} <span className="field-hint">({l.farmer_rating_count})</span></span>
                )}
              </div>
              <p style={{ marginBottom: 6 }}>
                {[l.village, l.district, l.state].filter(Boolean).join(", ") || "Location not set"}
              </p>
              <p style={{ fontWeight: 700, color: "var(--ink)", marginBottom: 4, fontSize: 20 }}>
                ₹{l.price_per_kg}{t("perKg")}
              </p>
              <p className="field-hint" style={{ marginBottom: 14 }}>{t("quantityAvailable")}: {l.quantity_kg}kg</p>
              {user?.role === "buyer" && (
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    addItem({
                      listingId: l.id,
                      cropName: l.crop_name,
                      farmerName: l.farmer_name,
                      pricePerKg: Number(l.price_per_kg),
                      quantityKg: Math.min(10, Number(l.quantity_kg)),
                      maxQuantityKg: Number(l.quantity_kg),
                    });
                    setAddedId(l.id);
                    setTimeout(() => setAddedId((cur) => (cur === l.id ? null : cur)), 1500);
                  }}
                >
                  {addedId === l.id ? "Added ✓" : t("addToCart")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={<div className="container page"><p>Loading marketplace...</p></div>}>
      <MarketplaceContent />
    </Suspense>
  );
}
