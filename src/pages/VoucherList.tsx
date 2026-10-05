import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { OverlayPanel } from "primereact/overlaypanel";
import { api, fdate, money, qs, qty } from "../api";
import Icon from "../components/Icons";
import { Empty, Skeleton } from "../components/Loaders";
import Pagination from "../components/Pagination";
import { ExcelFilter } from "../components/ExcelFilter";
import { useApp } from "../store";

export default function VoucherList() {
  const { doc } = useParams<{ doc: string }>();
  const { meta, can } = useApp();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const cfg = meta?.vouchers?.[doc || ""];
  const filterPanel = useRef<OverlayPanel>(null);

  const [rows, setRows] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    setPage(1);
    setFilters({});
    setQ("");
  }, [doc, sp]);

  useEffect(() => {
    if (!doc) return;
    const searchQs = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && v.length > 0).map(([k, v]) => ["s_" + k, Array.isArray(v) ? v.join(",") : v]));
    const t = setTimeout(
      () =>
        api<any>(`/vouchers/${doc}${qs({ q, page, page_size: 10, ...searchQs })}`)
          .then((r) => {
            setRows(r.rows);
            setTotal(r.total);
          })
          .catch(() => setRows([])),
      200
    );
    return () => clearTimeout(t);
  }, [doc, q, filters, page]);

  if (!cfg) return <Empty title="Unknown document" />;

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>{cfg.plural}</h1>
        </div>
        {can(doc!, "create") && (
          <Link className="btn tape" to={`/vouchers/${doc}/new`}>
            <Icon name="plus" size={17} />
            New {cfg.label.replace(/ \(.*\)/, "").toLowerCase()}
          </Link>
        )}
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input
          placeholder="Search here"
          style={{ width: 260 }}
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <OverlayPanel ref={filterPanel}>
          {activeFilterCol && (
            <ExcelFilter
              rows={rows || []}
              column={activeFilterCol}
              filters={filters}
              setFilters={(f) => { setFilters(f); setPage(1); }}
            />
          )}
        </OverlayPanel>
      </div>
      <div className="tbl-wrap">
        {rows === null ? (
          <Skeleton rows={8} />
        ) : !rows.length ? (
          <Empty icon={cfg.icon} title={`No ${cfg.plural.toLowerCase()} found`}>
            {can(doc!, "create") && "Start one with the button above."}
          </Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Voucher no
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.voucher_no ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("voucher_no"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Date
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.voucher_date ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("voucher_date"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Party
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.party_name ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("party_name"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Series
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.txn_type ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("txn_type"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th className="num">Qty</th>
                <th className="num">Total value</th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Status
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.status ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("status"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/vouchers/${doc}/${r.id}`)}>
                  <td>
                    <b>{r.voucher_no}</b>{" "}
                    {r.source_channel === "api" && (
                      <span className="htag Closed" title="Created through the API">
                        API
                      </span>
                    )}
                  </td>
                  <td>{fdate(r.voucher_date)}</td>
                  <td>{r.party_name}</td>
                  <td className="muted">{r.txn_type}</td>
                  <td className="num">{qty(r.total_qty)}</td>
                  <td className="num">{money(r.total_value)}</td>
                  <td>
                    <span className={"htag " + r.approval_status}>{r.approval_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {total > 10 && (
        <Pagination page={page} total={total} size={10} onChange={setPage} itemName="vouchers" />
      )}
    </>
  );
}
