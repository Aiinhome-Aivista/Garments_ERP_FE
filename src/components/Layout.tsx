import React, { useEffect, useMemo, useRef, useState } from "react";
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
        .concat([{ label: "Dashboard", to: "/dashboard", icon: "loom", group: "Home", res: "" }]),
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
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("side_collapsed") === "true");
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const loc = useLocation();

  useEffect(() => {
    const unsub = onBusy(setBusy);
    return () => {
      unsub();
    };
  }, []);
  useEffect(() => {
    setOpen(false);
    setUserMenuOpen(false);
    
    let title = "Dashboard";
    if (loc.pathname.includes("masters")) title = "Masters";
    else if (loc.pathname.includes("vouchers")) title = "Vouchers";
    else if (loc.pathname.includes("planning")) title = "Production Planning";
    else if (loc.pathname.includes("requisitions")) title = "Requisitions";
    else if (loc.pathname.includes("logistics")) title = "Logistics";
    else if (loc.pathname.includes("stock")) title = "Stock";
    else if (loc.pathname.includes("admin")) title = "Admin Settings";
    document.title = `${title} | Loomline ERP`;
  }, [loc.pathname]);
  
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
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

  const toggleSidebar = () => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("side_collapsed", String(next));
      return next;
    });
  };

  return (
    <div className={"shell" + (collapsed ? " side-collapsed" : "")}>
      {busy && <ThreadBar />}
      <aside className={"side" + (open ? " open" : "") + (collapsed ? " collapsed" : "")}>
        <div className="brand">
          <div className="brand-header">
            <Icon name="spool" size={34} style={{ color: "var(--tape)", flexShrink: 0 }} />
            {!collapsed && (
              <div className="brand-text">
                <b>Loomline</b>
                <small>Garment manufacturing ERP</small>
              </div>
            )}
          </div>
          <button
            className="side-toggle"
            onClick={toggleSidebar}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={16} />
          </button>
        </div>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
          title="Dashboard"
        >
          <Icon name="loom" size={19} />
          {!collapsed && <span>Dashboard</span>}
        </NavLink>
        {nav.map((g) => (
          <div key={g.title}>
            <div
              className="nav-title"
              role="button"
              title={g.title}
              onClick={() => setOpened((c) => ({ ...c, [g.title]: !c[g.title] }))}
            >
              <Icon name={g.icon} size={16} />
              {!collapsed && <span>{g.title}</span>}
              {!collapsed && (
                <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.6 }}>
                  {!opened[g.title] ? "▶" : "▼"}
                </span>
              )}
            </div>
            {opened[g.title] &&
              g.items.map((i: NavItem) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) => "nav-item" + (isActive ? " active" : "")}
                  title={i.label}
                >
                  <Icon name={i.icon || "button"} size={19} />
                  {!collapsed && <span>{i.label}</span>}
                </NavLink>
              ))}
          </div>
        ))}
        <div style={{ marginTop: "auto" }} />
        <button
          className="nav-item"
          onClick={logout}
          title="Sign out"
          style={{ background: "transparent", border: "none", width: "100%", textAlign: "left", cursor: "pointer", color: "var(--red)" }}
        >
          <Icon name="logout" size={19} />
          {!collapsed && <span>Logout</span>}
        </button>
      </aside>
      <div className="main">
        <header className="top no-print">
          <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} aria-label="Menu">
            <Icon name="menu" />
          </button>
          <div className="grow" />
          <button className="icon-btn" onClick={setTheme} title={theme === "light" ? "Night shift" : "Day shift"}>
            <Icon name={theme === "light" ? "moon" : "sun"} />
          </button>
          <div className="user-menu-wrap" ref={userMenuRef}>
            <button
              className={"user-avatar-btn" + (userMenuOpen ? " active" : "")}
              onClick={() => setUserMenuOpen((o) => !o)}
              title={user?.full_name || "Profile"}
              aria-label="Profile menu"
            >
              <div className="avatar-circle">
                {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <Icon name="users" size={16} />}
              </div>
            </button>
            {userMenuOpen && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-avatar-large">
                    {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <Icon name="users" size={20} />}
                  </div>
                  <div className="user-info-text">
                    <b>{user?.full_name}</b>
                    <span className="user-role-badge">{user?.role}</span>
                    {user?.username && <small className="muted">@{user.username}</small>}
                  </div>
                </div>
                <div className="user-dropdown-divider" />
                <button className="user-dropdown-item danger" onClick={logout}>
                  <Icon name="logout" size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
      {pal && <Palette nav={nav} onClose={() => setPal(false)} />}
    </div>
  );
}
