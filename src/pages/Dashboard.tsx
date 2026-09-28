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

  useEffect(() => {
    api<DashboardData>("/dashboard").then(setD);
  }, []);

  if (!d) return <StitchLoader label="Counting the bolts…" />;

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
            <div className="kpi">
              <b>{d.low_stock}</b>
              <span>items below minimum stock</span>
            </div>
            <div className="kpi">
              <b>{qty(d.counts.stock_pcs)}</b>
              <span>units in stores</span>
            </div>
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
          <h3>Latest vouchers</h3>
          <div className="tbl-wrap">
            <table className="tbl">
              <tbody>
                {d.recent.map((r) => (
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
                {!d.recent.length && (
                  <tr>
                    <td className="muted" style={{ padding: 16 }}>
                      No vouchers yet — start with a sales order.
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
