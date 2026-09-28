import React, { useEffect, useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { onBusy } from "../api";
import { buildNav, NavGroup, NavItem } from "../nav";
import { useApp } from "../store";
import Icon from "./Icons";
import { ThreadBar } from "./Loaders";

interface PaletteProps {
  nav: NavGroup[];
  onClose: () => void;
}

function Palette({ nav, onClose }: PaletteProps) {
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(0);
  const go = useNavigate();
  const all = useMemo(
    () =>
      nav
        .flatMap((g) => g.items.map((i) => ({ ...i, group: g.title })))
        .concat([{ label: "Dashboard", to: "/", icon: "loom", group: "Home", res: "" }]),
    [nav]
  );
  const rows = all.filter((i) => (i.label + i.group).toLowerCase().includes(q.toLowerCase())).slice(0, 9);
  const pick = (r: { to: string }) => {
    go(r.to);
    onClose();
  };

  return (
    <div className="veil center" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          placeholder="Jump to a screen…  (try “sales”, “size”, “stock”)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setHi(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") setHi((h) => Math.min(h + 1, rows.length - 1));
            else if (e.key === "ArrowUp") setHi((h) => Math.max(h - 1, 0));
            else if (e.key === "Enter" && rows[hi]) pick(rows[hi]);
            else if (e.key === "Escape") onClose();
          }}
        />
        {rows.map((r, i) => (
          <div key={r.to} className={"it" + (i === hi ? " on" : "")} onMouseEnter={() => setHi(i)} onClick={() => pick(r)}>
            <Icon name={r.icon || "button"} size={18} />
            <b>{r.label}</b>
            <span className="muted" style={{ marginLeft: "auto" }}>
              {r.group}
            </span>
          </div>
        ))}
        {!rows.length && <div className="it muted">Nothing matches “{q}”.</div>}
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, meta, can, logout, theme, setTheme } = useApp();
  const nav = useMemo(() => buildNav(meta, can), [meta, can]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [pal, setPal] = useState(false);
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const loc = useLocation();

  useEffect(() => {
    const unsub = onBusy(setBusy);
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => setOpen(false), [loc.pathname]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPal(true);
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, []);

  return (
    <div className="shell">
      {busy && <ThreadBar />}
      <aside className={"side" + (open ? " open" : "")}>
        <div className="brand">
          <Icon name="spool" size={38} style={{ color: "var(--tape)" }} />
          <div>
            <b>Loomline</b>
            <small>Garment manufacturing ERP</small>
          </div>
        </div>
        <NavLink to="/" end className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
          <Icon name="loom" size={19} />
          Dashboard
        </NavLink>
        {nav.map((g) => (
          <div key={g.title}>
            <div
              className="nav-title"
              role="button"
              onClick={() => setClosed((c) => ({ ...c, [g.title]: !c[g.title] }))}
            >
              <Icon name={g.icon} size={16} />
              {g.title}
            </div>
            {!closed[g.title] &&
              g.items.map((i: NavItem) => (
                <NavLink key={i.to} to={i.to} className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}>
                  <Icon name={i.icon || "button"} size={19} />
                  {i.label}
                </NavLink>
              ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <header className="top no-print">
          <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <button className="btn ghost sm" onClick={() => setPal(true)}>
            <Icon name="search" size={16} />
            Jump to… <kbd style={{ opacity: 0.6 }}>Ctrl K</kbd>
          </button>
          <div className="grow" />
          <button className="icon-btn" onClick={setTheme} title={theme === "light" ? "Night shift" : "Day shift"}>
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </button>
          <span className="row" style={{ gap: 6 }}>
            <Icon name="users" size={18} />
            <b>{user?.full_name}</b>
            <span className="muted">{user?.role}</span>
          </span>
          <button className="icon-btn" onClick={logout} title="Sign out">
            <Icon name="logout" />
          </button>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
      {pal && <Palette nav={nav} onClose={() => setPal(false)} />}
    </div>
  );
}
