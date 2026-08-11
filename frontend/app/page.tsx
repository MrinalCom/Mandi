"use client";

import Link from "next/link";
import { useLang } from "./lib/i18n";

export default function HomePage() {
  const { t } = useLang();

  return (
    <div>
      <div className="hero">
        <div className="container">
          <span className="badge badge-amber">Built for farmers, not middlemen</span>
          <h1>{t("tagline")}</h1>
          <p className="lead">
            Mandi is a direct farmer-to-buyer marketplace. Check today&apos;s real mandi price before you sell,
            list your harvest, or pool it with nearby farmers to meet a bulk buyer&apos;s order — all without
            handing 30–46% of the sale to a chain of intermediaries.
          </p>
          <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary">{t("listYourHarvest")}</Link>
            <Link href="/marketplace" className="btn btn-outline">{t("marketplace")}</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><b>30–46%</b><span>of the consumer price is typically taken by middlemen</span></div>
            <div className="hero-stat"><b>86%</b><span>of Indian farmers are small or marginal holders</span></div>
            <div className="hero-stat"><b>~30–40%</b><span>of the final price is what farmers usually keep</span></div>
          </div>
        </div>
      </div>

      <div className="container page">
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

        <div style={{ marginTop: 40 }} className="card">
          <h3>Why not just use eNAM or an existing agri app?</h3>
          <p>
            eNAM still assumes a trip to a physical mandi, and platforms built for bulk B2B supply chains or
            urban consumers weren&apos;t designed around a smallholder listing 80kg of okra. Low digital literacy
            and patchy connectivity further shut out the farmers who&apos;d benefit most. Mandi is scoped
            narrowly around that gap — see <code>PROBLEM.md</code> in the repo for sources and the full plan.
          </p>
        </div>
      </div>
    </div>
  );
}
