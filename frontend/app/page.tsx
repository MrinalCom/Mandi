"use client";

import Link from "next/link";
import { useLang } from "./lib/i18n";
import { FARMER_HERO_IMAGE, getCropImageUrl } from "./lib/cropImages";
import CropImage from "./components/CropImage";
import LangMarquee from "./components/LangMarquee";
import PriceTicker from "./components/PriceTicker";
import StatCounter from "./components/StatCounter";

const GALLERY_CROPS = ["Tomato", "Onion", "Potato", "Wheat", "Rice", "Mango"];

const STEPS = [
  {
    title: "Check the mandi price",
    body: "See today's min/max/modal price for your crop across nearby mandis before you decide what to ask.",
  },
  {
    title: "List or pool your harvest",
    body: "Post a listing directly, or join a pool with nearby farmers selling the same crop to meet a bulk order.",
  },
  {
    title: "Buyer orders, you track it",
    body: "A buyer commits and pays into escrow. Track pickup and delivery status in real time on the Orders page.",
  },
  {
    title: "Get paid, see the gap",
    body: "Payment releases on delivery. Your dashboard shows exactly how your price compared to the mandi average.",
  },
];

export default function HomePage() {
  const { t } = useLang();

  return (
    <div>
      <div className="hero">
        <div className="hero-bg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${FARMER_HERO_IMAGE}?w=1800&h=1000&fit=crop&q=80`} alt="" />
        </div>
        <div className="container">
          <span className="badge" style={{ background: "rgba(255,255,255,0.16)", color: "#fff" }}>
            Built for farmers, not middlemen
          </span>
          <h1>{t("tagline")}</h1>
          <p className="lead">
            Mandi is a direct farmer-to-buyer marketplace. Check today&apos;s real mandi price before you sell,
            list your harvest, or pool it with nearby farmers to meet a bulk buyer&apos;s order — all without
            handing 30–46% of the sale to a chain of intermediaries.
          </p>
          <div style={{ display: "flex", gap: 14, marginTop: 28, flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">{t("listYourHarvest")}</Link>
            <Link href="/marketplace" className="btn btn-lg" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}>
              {t("marketplace")}
            </Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b>30–46%</b><span>of the consumer price is typically taken by middlemen</span></div>
            <div className="hero-stat"><b>86%</b><span>of Indian farmers are small or marginal holders</span></div>
            <div className="hero-stat"><b>~30–40%</b><span>of the final price is what farmers usually keep</span></div>
          </div>
        </div>
      </div>

      <LangMarquee />
      <PriceTicker />

      <div className="container page">
        <div className="section-title"><h2>Fresh from the field</h2></div>
        <div className="card-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 18 }}>
          {GALLERY_CROPS.map((crop) => (
            <Link key={crop} href={`/marketplace?crop=${encodeURIComponent(crop)}`} className="card" style={{ padding: 0, textAlign: "center" }}>
              <CropImage cropName={crop} className="crop-image-flush" />
              <div style={{ padding: "14px 12px", fontWeight: 700 }}>{crop}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 56 }}>
        <div className="section-title"><h2>How it works</h2></div>
        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div key={s.title} className="step-card">
              <div className="step-number">{i + 1}</div>
              <h3 style={{ fontSize: 18 }}>{s.title}</h3>
              <p style={{ marginBottom: 0 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 56 }}>
        <div className="section-title"><h2>What's already live</h2></div>
        <div className="counter-row">
          <StatCounter target={0} suffix="%" label="Commission taken by Mandi" />
          <StatCounter target={9} suffix="+" label="Crops on the price board" />
          <StatCounter target={8} label="Mandis tracked for pricing" />
          <StatCounter target={2} label="Languages, more on the way" />
        </div>
      </div>

      <div className="container" style={{ paddingBottom: 0 }}>
        <div className="section-title"><h2>The problem</h2></div>
        <div className="card-grid">
          <div className="card">
            <h3>No price visibility</h3>
            <p>A farmer usually learns the day&apos;s rate only after arriving at the mandi with the harvest already
            cut — too late to negotiate or hold out. Mandi&apos;s price board shows today&apos;s min/max/modal price
            per crop, per mandi, before you decide what to ask.</p>
          </div>
          <div className="card">
            <h3>Forced distress sales</h3>
            <p>Without cold storage or a buyer lined up, perishable produce gets "crash sold" at whatever is
            offered. Direct listings let a buyer commit before harvest, and pooled group-selling gets small
            lots to bulk buyers faster.</p>
          </div>
          <div className="card">
            <h3>No bargaining power alone</h3>
            <p>A single small farmer can&apos;t meet a wholesale buyer&apos;s minimum order. Pool groups combine
            several farmers&apos; harvest of the same crop in the same mandi zone into one lot.</p>
          </div>
        </div>

        <div style={{ marginTop: 40, marginBottom: 56 }} className="card">
          <h3>Why not just use eNAM or an existing agri app?</h3>
          <p>
            eNAM still assumes a trip to a physical mandi, and platforms built for bulk B2B supply chains or
            urban consumers weren&apos;t designed around a smallholder listing 80kg of okra. Low digital literacy
            and patchy connectivity further shut out the farmers who&apos;d benefit most. Mandi is scoped
            narrowly around that gap — see <code>PROBLEM.md</code> in the repo for sources and the full plan.
          </p>
        </div>

        <div className="cta-banner">
          <div className="cta-banner-bg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={getCropImageUrl("Wheat", "w=1600&h=700&fit=crop&q=80")} alt="" />
          </div>
          <h2>Ready to skip the middleman?</h2>
          <p>List your harvest in minutes, or browse the marketplace to buy directly from farmers near you.</p>
          <div style={{ display: "flex", gap: 14, marginTop: 22, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">{t("listYourHarvest")}</Link>
            <Link href="/marketplace" className="btn btn-lg" style={{ background: "rgba(255,255,255,0.14)", color: "#fff", border: "1.5px solid rgba(255,255,255,0.4)" }}>
              {t("marketplace")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
