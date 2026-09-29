import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Btn } from "../components/Loaders";
import Icon from "../components/Icons";
import { useApp } from "../store";

export default function Login() {
  const { login, register } = useApp();
  const loc = useLocation();
  const [isReg, setIsReg] = useState(new URLSearchParams(loc.search).get("mode") === "register");
  
  const [u, setU] = useState("");
  const [em, setEm] = useState("");
  const [fn, setFn] = useState("");
  const [p, setP] = useState("");
  const [role, setRole] = useState("Sales & dispatch");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      if (isReg) {
        await register(u, em, fn, p, role);
      } else {
        await login(u, p);
      }
    } catch (x: any) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <div className="login-art">
        <div className="row">
          <Icon name="spool" size={44} style={{ color: "var(--tape)" }} />
          <b style={{ font: "700 30px var(--f-head)" }}>Loomline</b>
        </div>
        <div>
          <h1>From order to dispatch, stitched together.</h1>
          <p>Sales orders, production planning, stores and invoicing on one thread.</p>
        </div>
        <div className="tape-side" />
      </div>
      <div className="login-form" style={{ position: "relative", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <Link to="/" style={{ position: "absolute", top: 30, right: 30, textDecoration: "none", color: "var(--muted)", display: "flex", alignItems: "center", gap: "6px", fontSize: "14px", fontWeight: 500 }}>
          <Icon name="chevronLeft" size={16} /> Home
        </Link>
        
        <form className="card tag" onSubmit={go} style={{ width: "100%", maxWidth: "380px", padding: "40px" }}>
          <h2 style={{ marginBottom: 24, fontSize: "1.8rem", color: "var(--denim-900)" }}>{isReg ? "Create an account" : "Sign in"}</h2>
          
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: "16px" }}>
            {isReg && (
              <label className="fld">
                <span style={{ fontWeight: 600 }}>Full Name</span>
                <input autoFocus={isReg} value={fn} onChange={(e) => setFn(e.target.value)} required minLength={2} placeholder="John Doe" />
              </label>
            )}
            {isReg && (
              <label className="fld">
                <span style={{ fontWeight: 600 }}>Email Address</span>
                <input type="email" value={em} onChange={(e) => setEm(e.target.value)} required placeholder="name@company.com" />
              </label>
            )}
            {isReg && (
              <label className="fld">
                <span style={{ fontWeight: 600 }}>Role</span>
                <select value={role} onChange={(e) => setRole(e.target.value)} required>
                  <option value="Sales & dispatch">Sales & dispatch</option>
                  <option value="Stores & purchase">Stores & purchase</option>
                </select>
              </label>
            )}
            <label className="fld">
              <span style={{ fontWeight: 600 }}>{isReg ? "Username" : "Username or Email"}</span>
              <input autoFocus={!isReg} value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required placeholder={isReg ? "Choose a username" : "Enter username or email"} />
            </label>
            <label className="fld">
              <span style={{ fontWeight: 600 }}>Password</span>
              <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete={isReg ? "new-password" : "current-password"} required minLength={isReg ? 8 : 1} placeholder="••••••••" />
            </label>
          </div>
          
          {err && (
            <div className="banner err" style={{ marginTop: 16 }}>
              <Icon name="alert" size={18} />
              {err}
            </div>
          )}
          
          <Btn className="tape" busy={busy} type="submit" style={{ marginTop: 24, width: "100%", justifyContent: "center", fontSize: "1rem", padding: "12px" }}>
            {isReg ? "Sign up" : "Sign in"}
          </Btn>
          
          <div style={{ marginTop: 20, textAlign: "center", fontSize: "0.95rem" }}>
            {isReg ? (
              <span style={{ color: "var(--muted)" }}>
                Already have an account? <button type="button" onClick={() => { setIsReg(false); setErr(""); }} style={{ color: "var(--denim-700)", fontWeight: 600, border: "none", background: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>Sign in</button>
              </span>
            ) : (
              <span style={{ color: "var(--muted)" }}>
                Don't have an account? <button type="button" onClick={() => { setIsReg(true); setErr(""); }} style={{ color: "var(--denim-700)", fontWeight: 600, border: "none", background: "none", padding: 0, cursor: "pointer", textDecoration: "underline" }}>Sign up</button>
              </span>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
