"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { getSocket } from "../lib/socket";
import StarRating from "../components/StarRating";

interface Order {
  id: string;
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

const STEPS = ["pending", "confirmed", "picked_up", "delivered", "paid_out"];
const statusLabel: Record<string, string> = {
  pending: "Order placed",
  confirmed: "Confirmed by farmer",
  picked_up: "Picked up",
  delivered: "Delivered",
  paid_out: "Payment settled",
  cancelled: "Cancelled",
};

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
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

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

  return (
    <div className="container page">
      <h1>Orders</h1>
      {loading && <p>Loading orders...</p>}
      {!loading && orders.length === 0 && <div className="empty-state">No orders yet.</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {orders.map((o) => {
          const action = nextAction(o);
          const currentIdx = STEPS.indexOf(o.status);
          const canReview = user?.role === "buyer" && ["delivered", "paid_out"].includes(o.status) && !o.has_review;
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

              {action && (
                <button className="btn btn-primary btn-sm" onClick={() => advance(o.id, action.status)} style={{ marginTop: 8 }}>
                  {action.label}
                </button>
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
