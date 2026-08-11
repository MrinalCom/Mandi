"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCart } from "../lib/CartContext";
import { useAuth } from "../lib/AuthContext";
import { api, ApiError } from "../lib/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();
  const { token, user } = useAuth();
  const [pickupNote, setPickupNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function placeOrder() {
    if (!user) {
      router.push("/login");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      for (const item of items) {
        await api.post(
          "/api/orders",
          { listingId: item.listingId, quantityKg: item.quantityKg, pickupNote: pickupNote || undefined },
          token
        );
      }
      clear();
      router.push("/orders");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container page" style={{ maxWidth: 520 }}>
      <h1>Checkout</h1>
      <div className="card">
        <h3>Order summary</h3>
        {items.map((item) => (
          <div key={item.listingId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span>{item.cropName} × {item.quantityKg}kg</span>
            <span>₹{(item.pricePerKg * item.quantityKg).toFixed(2)}</span>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
          <span>Total</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>

        <div className="field" style={{ marginTop: 20 }}>
          <label>Pickup / delivery note (optional)</label>
          <textarea rows={3} value={pickupNote} onChange={(e) => setPickupNote(e.target.value)} placeholder="Preferred pickup time, address details, etc." />
        </div>

        <p className="field-hint">
          Payment is held until you confirm delivery (escrow), so the farmer isn&apos;t paid until you have the produce.
        </p>

        {error && <p className="error-text">{error}</p>}
        <button className="btn btn-primary btn-block" onClick={placeOrder} disabled={loading || items.length === 0}>
          {loading ? "Placing order..." : "Place order"}
        </button>
      </div>
    </div>
  );
}
