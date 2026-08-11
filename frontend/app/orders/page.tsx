"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../lib/api";
import { useAuth } from "../lib/AuthContext";
import { getSocket } from "../lib/socket";

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

export default function OrdersPage() {
  const router = useRouter();
  const { user, token, ready } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

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
            </div>
          );
        })}
      </div>
    </div>
  );
}
