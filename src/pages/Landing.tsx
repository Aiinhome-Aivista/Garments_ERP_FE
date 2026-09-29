import { Link } from "react-router-dom";
import Icon from "../components/Icons";
import "./Landing.css";

export default function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand">
          <Icon name="spool" size={32} />
          Loomline ERP
        </Link>
        <nav className="landing-nav">
          <a href="#overview">Overview</a>
          <a href="#modules">Modules</a>
          <a href="#workflow">Workflow</a>
          <a href="#impact">Impact</a>
          <a href="#contact">Contact</a>
        </nav>
        <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
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

      <section className="landing-section" id="modules" style={{ background: "rgba(0,0,0,0.02)" }}>
        <h2 className="section-title">Key ERP Modules</h2>
        <div className="obj-grid">
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="box" size={32} />
            </div>
            <h3>Inventory & Stock</h3>
            <p>Maintain accurate real-time stock levels, track raw materials like fabric and threads, and easily manage warehouse locations to minimize wastage.</p>
          </div>
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="clipboard" size={32} />
            </div>
            <h3>Production Planning</h3>
            <p>Schedule production runs across different stations, monitor machine capacity, and ensure timely delivery of high-quality garments.</p>
          </div>
          <div className="obj-card">
            <div className="obj-icon">
              <Icon name="truck" size={32} />
            </div>
            <h3>Logistics & Vendors</h3>
            <p>Coordinate seamlessly with suppliers, generate gate passes, and track inbound/outbound logistics efficiently without costly delays.</p>
          </div>
        </div>
      </section>

      <section className="landing-section" id="workflow">
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
              <li><a href="#overview">Overview</a></li>
              <li><a href="#modules">Features</a></li>
              <li><a href="#workflow">Workflow</a></li>
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
