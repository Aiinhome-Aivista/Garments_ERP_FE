import React, { useState } from "react";
import { Btn } from "../components/Loaders";
import Icon from "../components/Icons";
import { useApp } from "../store";

export default function Login() {
  const { login } = useApp();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const go = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await login(u, p);
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
      <div className="login-form">
        <form className="card tag" onSubmit={go}>
          <h2 style={{ marginBottom: 14 }}>Sign in</h2>
          <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
            <label className="fld">
              <span>Username</span>
              <input autoFocus value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" />
            </label>
            <label className="fld">
              <span>Password</span>
              <input type="password" value={p} onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
            </label>
          </div>
          {err && (
            <div className="banner err" style={{ marginTop: 12 }}>
              <Icon name="alert" size={18} />
              {err}
            </div>
          )}
          <Btn className="tape" busy={busy} type="submit" style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
            Sign in
          </Btn>
        </form>
      </div>
    </div>
  );
}
