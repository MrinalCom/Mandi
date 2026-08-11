import Link from "next/link";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-brand">🌾 Mandi</div>
          <p>
            A direct farmer-to-buyer produce marketplace — real mandi price transparency,
            no middleman cut, and group selling so small holdings can meet bulk orders.
          </p>
        </div>
        <div>
          <h4>Marketplace</h4>
          <div className="footer-links">
            <Link href="/marketplace">Browse produce</Link>
            <Link href="/mandi-prices">Mandi prices</Link>
            <Link href="/pools">Group selling</Link>
          </div>
        </div>
        <div>
          <h4>For farmers</h4>
          <div className="footer-links">
            <Link href="/listings/new">List your harvest</Link>
            <Link href="/dashboard">Earnings dashboard</Link>
            <Link href="/orders">Orders</Link>
          </div>
        </div>
        <div>
          <h4>Account</h4>
          <div className="footer-links">
            <Link href="/login">Log in</Link>
            <Link href="/register">Sign up</Link>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} Mandi. Built for farmers, not middlemen.</span>
        <span>Mandi price data seeded in the shape of data.gov.in&apos;s Agmarknet dataset.</span>
      </div>
    </footer>
  );
}
