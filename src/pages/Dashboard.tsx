import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, fdate, money, qty } from "../api";
import Icon from "../components/Icons";
import { StitchLoader } from "../components/Loaders";
import { useApp } from "../store";

const STAGES: [string, string, string, string][] = [
  ["orders_open", "Open orders", "cart", "/vouchers/sales_order"],
  ["plans", "Live plans", "clipboard", "/planning"],
  ["req_open", "Requisitions", "tag", "/requisitions"],
  ["po_open", "POs to receive", "box", "/vouchers/purchase_order"],
  ["challan_uninvoiced", "Packed, not invoiced", "truck", "/vouchers/challan"],
  ["grn_uninvoiced", "GRNs to bill", "receipt", "/vouchers/grn"],
];

interface DashboardData {
  flow: Record<string, number>;
  pending_approvals: Record<string, number>;
  low_stock: number;
  counts: {
    stock_pcs: number;
  };
  sales_trend: { ym: string; v: number }[];
  recent: {
    id: number;
    doc_type: string;
    voucher_no: string;
    party_name: string;
    voucher_date: string;
    total_value: number;
    approval_status: string;
  }[];
}

export default function Dashboard() {
  const { user, meta } = useApp();
  const nav = useNavigate();
  const [d, setD] = useState<DashboardData | null>(null);
  const [tab, setTab] = useState<"all" | "sales" | "purchase">("all");

  useEffect(() => {
    api<DashboardData>("/dashboard").then(setD);
  }, []);

  if (!d) return <StitchLoader label="Counting the bolts…" />;

  const isSales = (doc: string) => meta?.vouchers?.[doc]?.module === "Sales" || doc.startsWith("sales") || doc === "challan";
  const isPurchase = (doc: string) => meta?.vouchers?.[doc]?.module === "Procurement" || doc.startsWith("purchase") || doc === "grn";

  const allVouchers = d.recent || [];
  const salesCount = allVouchers.filter((r) => isSales(r.doc_type)).length;
  const purchaseCount = allVouchers.filter((r) => isPurchase(r.doc_type)).length;

  const filteredVouchers = allVouchers.filter((r) => {
    if (tab === "sales") return isSales(r.doc_type);
    if (tab === "purchase") return isPurchase(r.doc_type);
    return true;
  });

  const max = Math.max(1, ...d.sales_trend.map((s) => s.v));
  const pend = Object.entries(d.pending_approvals);
  const docLabel = (k: string) => meta?.vouchers?.[k]?.label || k;

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Good day, {user?.full_name?.split(" ")[0]}</h1>
          <p>Here is where every order, plan and delivery stands right now.</p>
        </div>
      </div>

      <div className="line" role="list">
        <svg className="thread" viewBox="0 0 600 30" preserveAspectRatio="none">
          <path
            d="M40 15H560"
            stroke="var(--tape)"
            strokeWidth="3"
            strokeDasharray="10 8"
            fill="none"
            style={{ animation: "trail 1.6s linear infinite" }}
          />
        </svg>
        {STAGES.map(([k, label, icon, to]) => (
          <Link key={k} to={to} className="station" role="listitem">
            <div className="dot">
              <Icon name={icon} size={26} />
            </div>
            <b>{d.flow[k] ?? 0}</b>
            <span>{label}</span>
          </Link>
        ))}
      </div>

      <div className="section grid" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(420px,1fr))", alignItems: "start" }}>
        <div className="card">
          <h3>Waiting for approval</h3>
          {!pend.length ? (
            <p className="muted">Nothing is waiting. The desk is clear.</p>
          ) : (
            pend.map(([k, n]) => (
              <Link
                key={k}
                to={`/vouchers/${k}?status=Pending`}
                className="row"
                style={{
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px dashed var(--line)",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <span>{docLabel(k)}</span>
                <span className="htag Pending">{n} pending</span>
              </Link>
            ))
          )}
          <hr className="seam" />
          <div className="kpis">
            <Link to="/stock?low=true" className="kpi" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <b>{d.low_stock}</b>
              <span>items below minimum stock</span>
            </Link>
            <Link to="/stock" className="kpi" style={{ textDecoration: "none", color: "inherit", cursor: "pointer" }}>
              <b>{qty(d.counts.stock_pcs)}</b>
              <span>units in stores</span>
            </Link>
          </div>
        </div>

        <div className="card">
          <h3>Invoiced sales, last months</h3>
          {!d.sales_trend.length ? (
            <p className="muted">Approved sales invoices will chart here.</p>
          ) : (
            <div className="bars">
              {d.sales_trend.map((s) => (
                <div className="bar" key={s.ym}>
                  <span>{money(s.v).replace(/\.00$/, "")}</span>
                  <i style={{ height: `${(s.v / max) * 100}%` }} />
                  <span>
                    {s.ym.slice(5)}/{s.ym.slice(2, 4)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card" style={{ gridColumn: "1 / -1" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Latest vouchers</h3>
            <div className="tabs" style={{ margin: 0, borderBottom: "none" }}>
              <button
                type="button"
                className={tab === "all" ? "on" : ""}
                style={{ cursor: "pointer", fontSize: "14px", padding: "6px 14px" }}
                onClick={() => setTab("all")}
              >
                All ({allVouchers.length})
              </button>
              <button
                type="button"
                className={tab === "sales" ? "on" : ""}
                style={{ cursor: "pointer", fontSize: "14px", padding: "6px 14px" }}
                onClick={() => setTab("sales")}
              >
                Sales ({salesCount})
              </button>
              <button
                type="button"
                className={tab === "purchase" ? "on" : ""}
                style={{ cursor: "pointer", fontSize: "14px", padding: "6px 14px" }}
                onClick={() => setTab("purchase")}
              >
                Purchase ({purchaseCount})
              </button>
            </div>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Voucher No</th>
                  <th>Type</th>
                  <th>Party Name</th>
                  <th>Date</th>
                  <th className="num">Total Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((r) => (
                  <tr key={r.id} className="click" onClick={() => nav(`/vouchers/${r.doc_type}/${r.id}`)}>
                    <td>
                      <b>{r.voucher_no}</b>
                    </td>
                    <td>{docLabel(r.doc_type)}</td>
                    <td>{r.party_name}</td>
                    <td>{fdate(r.voucher_date)}</td>
                    <td className="num">{money(r.total_value)}</td>
                    <td>
                      <span className={"htag " + r.approval_status}>{r.approval_status}</span>
                    </td>
                  </tr>
                ))}
                {!filteredVouchers.length && (
                  <tr>
                    <td colSpan={6} className="muted" style={{ padding: 24, textAlign: "center" }}>
                      No {tab === "sales" ? "sales" : tab === "purchase" ? "purchase" : ""} vouchers to show.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
