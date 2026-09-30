import { useState } from "react";
import { Link } from "react-router-dom";
import Icon from "../components/Icons";
import "./Landing.css";

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [vol, setVol] = useState(5000);
  const [waste, setWaste] = useState(12);

  // Example simple calculation: 12 months * price per unit ($10) * current waste * 30% reduction
  const savings = (vol * 12 * 10 * (waste / 100) * 0.3).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <Icon name="spool" size={32} />
          Loomline ERP
        </Link>
        <button className="mobile-menu-btn" onClick={() => setMenuOpen(!menuOpen)}>
          <Icon name={menuOpen ? "x" : "menu"} size={24} />
        </button>
        <nav className={`landing-nav ${menuOpen ? "open" : ""}`}>
          <a href="#features" onClick={() => setMenuOpen(false)}>Features</a>
          <a href="#modules" onClick={() => setMenuOpen(false)}>Modules</a>
          <a href="#production-flow" onClick={() => setMenuOpen(false)}>Production Flow</a>
          <a href="#factory-gallery" onClick={() => setMenuOpen(false)}>Factory Gallery</a>
          <a href="#roi-calculator" onClick={() => setMenuOpen(false)}>ROI</a>
          <a href="#faq" onClick={() => setMenuOpen(false)}>FAQ</a>
        </nav>
        <div className="header-actions" style={{ display: "flex", gap: "16px", alignItems: "center" }}>
          <Link to="/login" className="btn ghost" style={{ padding: "8px 24px", borderRadius: "20px", textDecoration: "none" }}>
            Login
          </Link>
          <Link to="/login?mode=register" className="btn btn-primary" style={{ padding: "8px 24px", borderRadius: "20px", textDecoration: "none" }}>
            Sign Up
          </Link>
        </div>
      </header>

      <section className="landing-hero" id="overview">
        <div className="hero-grid">
          <div className="hero-text-content">
            <h1>Stitching Success in<br />Garment Manufacturing</h1>
            <p>
              Loomline ERP is an all-in-one platform built specifically for the apparel industry. 
              Manage everything from raw material requisitions and logistics to production planning and final dispatch—all seamlessly connected on one thread.
            </p>
            <Link to="/login" className="hero-cta">Go to Dashboard</Link>
          </div>
          <div className="hero-image-wrap">
            <img src="/hero-img.jpg" alt="Garment ERP Dashboard" className="floating-img" />
          </div>
        </div>
      </section>

      <section className="landing-section" id="features">
        <h2 className="section-title">Core Features</h2>
        <div className="features-grid">
          <div className="feature-item slide-up">
            <div className="f-icon"><Icon name="check" size={24} /></div>
            <div>
              <h3>Real-time Tracking</h3>
              <p>Monitor operations live across all factory departments.</p>
            </div>
          </div>
          <div className="feature-item slide-up" style={{ animationDelay: "0.1s" }}>
            <div className="f-icon"><Icon name="check" size={24} /></div>
            <div>
              <h3>Automated Indents</h3>
              <p>Auto-generate purchase requests when stock falls below minimums.</p>
            </div>
          </div>
          <div className="feature-item slide-up" style={{ animationDelay: "0.2s" }}>
            <div className="f-icon"><Icon name="check" size={24} /></div>
            <div>
              <h3>Barcode Scanning</h3>
              <p>Seamlessly scan raw materials and dispatch boxes.</p>
            </div>
          </div>
          <div className="feature-item slide-up" style={{ animationDelay: "0.3s" }}>
            <div className="f-icon"><Icon name="check" size={24} /></div>
            <div>
              <h3>Multi-Branch Support</h3>
              <p>Manage multiple warehouses from a single dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="modules" style={{ background: "rgba(0,0,0,0.02)" }}>
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <h2 className="section-title" style={{ marginBottom: 16 }}>Key ERP Modules</h2>
          <p style={{ color: "var(--muted)", maxWidth: 700, margin: "0 auto", fontSize: "1.1rem" }}>Everything you need to run a modern, efficient garment factory in one integrated suite.</p>
        </div>
        <div className="obj-grid">
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="box" size={32} />
            </div>
            <h3>Inventory & Stock</h3>
            <p>Maintain accurate real-time stock levels, track raw materials like fabric and threads, and easily manage warehouse locations to minimize wastage.</p>
            <ul className="obj-list">
              <li>Multi-location tracking</li>
              <li>Auto minimum level alerts</li>
              <li>Material valuation (FIFO)</li>
            </ul>
          </div>
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="clipboard" size={32} />
            </div>
            <h3>Production Planning</h3>
            <p>Schedule production runs across different stations, monitor machine capacity, and ensure timely delivery of high-quality garments.</p>
            <ul className="obj-list">
              <li>Bill of Materials (BOM)</li>
              <li>Work order generation</li>
              <li>Daily output logs</li>
            </ul>
          </div>
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="truck" size={32} />
            </div>
            <h3>Logistics & Vendors</h3>
            <p>Coordinate seamlessly with suppliers, generate gate passes, and track inbound/outbound logistics efficiently without costly delays.</p>
            <ul className="obj-list">
              <li>Supplier purchase orders</li>
              <li>Gate entry / GRN</li>
              <li>Vehicle dispatch tracking</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="landing-section" id="production-flow">
        <div className="workflow-container">
          <div className="workflow-text">
            <h2 style={{ fontSize: "2.5rem", marginBottom: "20px", fontFamily: "var(--f-head)" }}>How It Works</h2>
            <p style={{ color: "var(--denim-600)", fontSize: "1.1rem", lineHeight: "1.6", marginBottom: "30px" }}>
              Our platform bridges the gap between the factory floor and the administrative office. We eliminate paper trails by digitizing the complete lifecycle of a garment order.
            </p>
            <ul className="workflow-list">
              <li>
                <div className="w-icon"><Icon name="edit" size={20} /></div>
                <div>
                  <h4>1. Requisitions & Orders</h4>
                  <span>Raise material requests and log incoming sales orders automatically.</span>
                </div>
              </li>
              <li>
                <div className="w-icon"><Icon name="machine" size={20} /></div>
                <div>
                  <h4>2. Manufacturing Line</h4>
                  <span>Pass materials through cutting, stitching, and finishing processes.</span>
                </div>
              </li>
              <li>
                <div className="w-icon"><Icon name="check" size={20} /></div>
                <div>
                  <h4>3. Quality & Dispatch</h4>
                  <span>Audit finished goods, generate vouchers, and release stock for shipping.</span>
                </div>
              </li>
            </ul>
          </div>
          <div className="workflow-image">
            <div className="glass-panel">
              <Icon name="factory" size={100} style={{ color: "var(--tape)", marginBottom: "20px" }} />
              <h3>Streamlined Factory Floor</h3>
              <p>Reduce bottlenecks and increase daily output.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="factory-gallery">
        <div style={{ textAlign: "center", marginBottom: 60 }}>
          <div className="section-badge">Real-World Apparel Operations</div>
          <h2 className="section-title" style={{ marginBottom: 20 }}>Inside Modern Garment Manufacturing</h2>
          <p style={{ color: "var(--denim-600)", fontSize: "1.1rem", maxWidth: 700, margin: "0 auto" }}>
            See how Loomline powers production planning, automated cutting lines, and warehouse management.
          </p>
        </div>
        <div className="gallery-grid">
          <div className="gallery-card image-card hover-lift">
            <img src="/gallery-1.jpg" alt="Digital Production Planning" className="g-img" />
            <div className="g-overlay">
              <div className="g-title">Digital Production Planning</div>
              <div className="g-subtitle">Real-time batch schedules & cutting plans</div>
            </div>
          </div>
          <div className="gallery-card image-card hover-lift">
            <img src="/gallery-2.jpg" alt="Precision Fabric Cutting" className="g-img" />
            <div className="g-overlay">
              <div className="g-title">Precision Fabric Cutting</div>
              <div className="g-subtitle">Laser guide markers & zero-waste monitoring</div>
            </div>
          </div>
          <div className="gallery-card image-card hover-lift">
            <img src="/gallery-3.jpg" alt="Fabric & Garment Warehouse" className="g-img" />
            <div className="g-overlay">
              <div className="g-title">Fabric & Garment Warehouse</div>
              <div className="g-subtitle">Barcode scanning & multi-godown stock sync</div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="roi-calculator">
        <h2 className="section-title">ROI Calculator</h2>
        <div className="roi-container">
          <div className="roi-panel">
            <h3 style={{ marginBottom: 24, fontSize: "1.6rem", color: "var(--denim-900)" }}>Estimate Your Savings</h3>
            <div className="roi-input-group">
              <label>
                <span style={{ fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Monthly Order Volume (Pcs)</span>
                <input type="number" value={vol} onChange={(e) => setVol(Number(e.target.value) || 0)} className="roi-input" min={0} />
              </label>
              <label>
                <span style={{ fontWeight: 600, color: "var(--muted)", marginBottom: 8, display: "block" }}>Average Material Waste (%)</span>
                <input type="number" value={waste} onChange={(e) => setWaste(Number(e.target.value) || 0)} className="roi-input" min={0} max={100} />
              </label>
            </div>
            <div className="roi-result">
              <div style={{ fontSize: "1.1rem", color: "var(--muted)", fontWeight: 600 }}>Estimated Annual Savings</div>
              <div className="roi-value" style={{ color: "var(--tape)", fontSize: "3rem", fontWeight: 800, margin: "10px 0" }}>{savings}</div>
              <p style={{ fontSize: "0.95rem", color: "var(--muted)", lineHeight: 1.5 }}>Based on a 30% reduction in material waste and improved operational efficiency.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section" id="faq" style={{ background: "rgba(0,0,0,0.02)" }}>
        <h2 className="section-title">Frequently Asked Questions</h2>
        <div className="faq-container">
          <details className="faq-item" open>
            <summary>How long does it take to deploy?</summary>
            <div className="faq-content">Most factories are fully onboarded and trained within 2 to 4 weeks depending on the modules required.</div>
          </details>
          <details className="faq-item">
            <summary>Do you support barcode scanning?</summary>
            <div className="faq-content">Yes, Loomline supports barcode scanning out-of-the-box for inventory and production tracking.</div>
          </details>
          <details className="faq-item">
            <summary>Can I integrate my existing accounting software?</summary>
            <div className="faq-content">We provide standard APIs that allow easy integration with popular accounting tools.</div>
          </details>
        </div>
      </section>

      <section className="landing-section" id="impact" style={{ textAlign: "center", background: "var(--denim-900)", color: "white" }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "40px", fontFamily: "var(--f-head)" }}>Why Choose Loomline?</h2>
        <div className="impact-grid">
          <div className="impact-item">
            <div className="impact-number">30%</div>
            <div className="impact-label">Faster Production Cycles</div>
          </div>
          <div className="impact-item">
            <div className="impact-number">Zero</div>
            <div className="impact-label">Paper Wastage</div>
          </div>
          <div className="impact-item">
            <div className="impact-number">100%</div>
            <div className="impact-label">Traceability of Materials</div>
          </div>
        </div>
      </section>

      <footer className="landing-footer" id="contact">
        <div className="footer-content">
          <div className="footer-brand">
            <h2>Loomline ERP</h2>
            <p>Next-generation garment<br/>manufacturing software.</p>
          </div>
          <div className="footer-links">
            <h4>Application</h4>
            <ul>
              <li><a href="#features">Features</a></li>
              <li><a href="#modules">Modules</a></li>
              <li><a href="#production-flow">Production Flow</a></li>
              <li><a href="#faq">FAQ</a></li>
            </ul>
          </div>
          <div className="footer-links">
            <h4>Get in Touch</h4>
            <ul>
              <li><a href="mailto:loomline.dummy@gmail.com">loomline.dummy@gmail.com</a></li>
              <li><a href="tel:+911234567890">+91 12345 67890</a></li>
              <li><a href="#">Support Center</a></li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: "center", fontSize: "14px" }}>
          © {new Date().getFullYear()} Loomline ERP. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
