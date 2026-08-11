"use client";

import Link from "next/link";
import { useCart } from "../lib/CartContext";
import { useLang } from "../lib/i18n";
import CropImage from "../components/CropImage";

export default function CartPage() {
  const { items, removeItem, updateQuantity, subtotal } = useCart();
  const { t } = useLang();

  if (items.length === 0) {
    return (
      <div className="container page">
        <h1>{t("cart")}</h1>
        <div className="empty-state">
          Your cart is empty. <Link href="/marketplace" className="btn btn-primary" style={{ marginTop: 12 }}>Browse the marketplace</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page" style={{ maxWidth: 820 }}>
      <h1>{t("cart")}</h1>
      <div className="card">
        {items.map((item) => (
          <div key={item.listingId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", borderBottom: "1px solid var(--line)", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <CropImage cropName={item.cropName} className="crop-image-thumb" />
              <div>
                <b>{item.cropName}</b>
                <p style={{ margin: 0 }} className="field-hint">from {item.farmerName} · ₹{item.pricePerKg}/kg</p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="number"
                min={1}
                max={item.maxQuantityKg}
                value={item.quantityKg}
                onChange={(e) => updateQuantity(item.listingId, Math.min(item.maxQuantityKg, Number(e.target.value)))}
                style={{ width: 80, minHeight: 40 }}
              />
              <span>kg</span>
              <b>₹{(item.pricePerKg * item.quantityKg).toFixed(2)}</b>
              <button className="btn btn-danger btn-sm" onClick={() => removeItem(item.listingId)}>Remove</button>
            </div>
          </div>
        ))}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
          <b>Subtotal</b>
          <b>₹{subtotal.toFixed(2)}</b>
        </div>
        <Link href="/checkout" className="btn btn-primary btn-block" style={{ marginTop: 16 }}>{t("checkout")}</Link>
      </div>
    </div>
  );
}
