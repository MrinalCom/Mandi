"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { useCart } from "../lib/CartContext";
import { getSocket } from "../lib/socket";
import StarRating from "../components/StarRating";

interface Order {
  id: string;
  listing_id: string;
  crop_name: string;
  quantity_kg: string;
  unit_price: string;
  total_price: string;
  status: string;
  payment_status: string;
  created_at: string;
  buyer_name?: string;
  farmer_name?: string;
  has_review?: boolean;
}

interface ListingDetail {
  id: string;
  crop_name: string;
  farmer_name: string;
  price_per_kg: string;
  quantity_kg: string;
  status: string;
}

const STEPS = ["pending", "confirmed", "picked_up", "delivered", "paid_out"];
const statusLabel: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed by farmer",
  picked_up: "Picked up",
  delivered: "Delivered",
  paid_out: "Payment settled",
  cancelled: "Cancelled",
};

const FILTERS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "all", label: "All", statuses: null },
  { key: "active", label: "In progress", statuses: ["pending", "confirmed", "picked_up"] },
  { key: "done", label: "Completed", statuses: ["delivered", "paid_out"] },
  { key: "cancelled", label: "Cancelled", statuses: ["cancelled"] },
];

function ReviewForm({ orderId, token, onDone }: { orderId: string; token: string | null; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/api/orders/${orderId}/review`, { rating, comment: comment || undefined }, token);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ marginTop: 12, padding: 14, background: "var(--surface-alt)", borderRadius: "var(--radius-md)" }}>
      <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: 14 }}>Rate this farmer</p>
      <StarRating value={rating} onChange={setRating} />
      <textarea
        placeholder="Optional comment (quality, timeliness, etc.)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        style={{ marginTop: 8 }}
      />
      {error && <p className="error-text">{error}</p>}
      <button className="btn btn-primary btn-sm" onClick={submit} disabled={submitting} style={{ marginTop: 8 }}>
        {submitting ? "Submitting..." : "Submit review"}
      </button>
    </div>
  );
}

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const { addItem } = useCart();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [reorderState, setReorderState] = useState<Record<string, "loading" | "added" | string>>({});

  async function load() {
    if (!token) return;
    const res = await api.get<{ orders: Order[] }>("/api/orders/mine", token);
    setOrders(res.orders);
    setLoading(false);
  }

  useEffect(() => {
    if (ready && !user) {
      router.push("/login");
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, token]);

  useEffect(() => {
    const socket = getSocket();
    for (const o of orders) socket.emit("order:subscribe", o.id);
    function onStatus({ orderId, status }: { orderId: string; status: string }) {
      setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
    }
    socket.on("order:status", onStatus);
    return () => {
      socket.off("order:status", onStatus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders.length]);

  async function advance(orderId: string, status: string) {
    await api.patch(`/api/orders/${orderId}/status`, { status }, token);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status } : o)));
  }

  async function buyAgain(o: Order) {
    setReorderState((prev) => ({ ...prev, [o.id]: "loading" }));
    try {
      const res = await api.get<{ listing: ListingDetail }>(`/api/listings/${o.listing_id}`);
      const listing = res.listing;
      if (listing.status !== "active" || Number(listing.quantity_kg) <= 0) {
        setReorderState((prev) => ({ ...prev, [o.id]: "This farmer doesn't have an active listing for this crop right now." }));
        return;
      }
      addItem({
        listingId: listing.id,
        cropName: listing.crop_name,
        farmerName: listing.farmer_name,
        pricePerKg: Number(listing.price_per_kg),
        quantityKg: Math.min(Number(o.quantity_kg), Number(listing.quantity_kg)),
        maxQuantityKg: Number(listing.quantity_kg),
      });
      setReorderState((prev) => ({ ...prev, [o.id]: "added" }));
    } catch {
      setReorderState((prev) => ({ ...prev, [o.id]: "That listing is no longer available." }));
    }
  }

  function nextAction(o: Order) {
    if (!user) return null;
    if (o.status === "cancelled" || o.status === "paid_out") return null;
    if (user.role === "farmer") {
      if (o.status === "pending") return { label: "Confirm order", status: "confirmed" };
      if (o.status === "confirmed") return { label: "Mark picked up", status: "picked_up" };
      if (o.status === "delivered") return { label: "Mark payment settled", status: "paid_out" };
    }
    if (user.role === "buyer") {
      if (o.status === "picked_up") return { label: "Confirm delivery received", status: "delivered" };
    }
    return null;
  }

  const visibleOrders = orders.filter((o) => {
    const f = FILTERS.find((x) => x.key === filter);
    return !f?.statuses || f.statuses.includes(o.status);
  });

  return (
    <div className="container page">
      <div className="section-title">
        <h1>Orders</h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              className={`btn btn-sm ${filter === f.key ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading && <p>Loading orders...</p>}
      {!loading && visibleOrders.length === 0 && <div className="empty-state">No orders in this view.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {visibleOrders.map((o) => {
          const action = nextAction(o);
          const currentIdx = STEPS.indexOf(o.status);
          const canReview = user?.role === "buyer" && ["delivered", "paid_out"].includes(o.status) && !o.has_review;
          const canReorder = user?.role === "buyer" && ["delivered", "paid_out"].includes(o.status);
          const reorderStatus = reorderState[o.id];
          return (
            <div key={o.id} className="card">
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                <div>
                  <h3 style={{ marginBottom: 2 }}>{o.crop_name} · {o.quantity_kg}kg</h3>
                  <p className="field-hint" style={{ margin: 0 }}>
                    {user?.role === "farmer" ? `Buyer: ${o.buyer_name}` : `Farmer: ${o.farmer_name}`} · ₹{o.total_price} total
                  </p>
                </div>
                <span className={`badge ${o.status === "cancelled" ? "badge-red" : "badge-green"}`}>{statusLabel[o.status]}</span>
              </div>

              {o.status !== "cancelled" && (
                <div className="timeline" style={{ marginTop: 16 }}>
                  {STEPS.map((step, i) => (
                    <div key={step} className="timeline-step">
                      <div className={`timeline-dot ${i <= currentIdx ? "done" : ""}`} />
                      <span style={{ fontSize: 14, color: i <= currentIdx ? "var(--ink)" : "var(--ink-faint)" }}>{statusLabel[step]}</span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {action && (
                  <button className="btn btn-primary btn-sm" onClick={() => advance(o.id, action.status)}>
                    {action.label}
                  </button>
                )}
                {canReorder && reorderStatus !== "added" && (
                  <button className="btn btn-secondary btn-sm" onClick={() => buyAgain(o)} disabled={reorderStatus === "loading"}>
                    {reorderStatus === "loading" ? "Checking..." : "Buy again"}
                  </button>
                )}
                {reorderStatus === "added" && <span className="badge badge-green">Added to cart ✓</span>}
              </div>
              {reorderStatus && reorderStatus !== "loading" && reorderStatus !== "added" && (
                <p className="error-text">{reorderStatus}</p>
              )}

              {o.has_review && <p className="field-hint" style={{ marginTop: 10 }}>✓ You reviewed this order</p>}

              {canReview && reviewingId !== o.id && (
                <button className="btn btn-secondary btn-sm" onClick={() => setReviewingId(o.id)} style={{ marginTop: 8 }}>
                  Rate this farmer
                </button>
              )}
              {canReview && reviewingId === o.id && (
                <ReviewForm
                  orderId={o.id}
                  token={token}
                  onDone={() => {
                    setOrders((prev) => prev.map((x) => (x.id === o.id ? { ...x, has_review: true } : x)));
                    setReviewingId(null);
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
