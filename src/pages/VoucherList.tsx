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
  const [expandedIds, setExpandedIds] = useState<Record<number, boolean>>({});
  const [itemsById, setItemsById] = useState<Record<number, any[]>>({});
  const [loadingIds, setLoadingIds] = useState<Record<number, boolean>>({});
  const [errorIds, setErrorIds] = useState<Record<number, string>>({});

  useEffect(() => {
    setRows(null);
    setPage(1);
    setFilters({});
    setQ("");
    setExpandedIds({});
    setItemsById({});
    setLoadingIds({});
    setErrorIds({});
  }, [doc, sp]);

  const toggleExpand = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    const isExpanded = !!expandedIds[id];
    setExpandedIds((prev) => ({ ...prev, [id]: !isExpanded }));
    if (!isExpanded && !itemsById[id] && !loadingIds[id]) {
      setLoadingIds((prev) => ({ ...prev, [id]: true }));
      setErrorIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      try {
        const res = await api<any>(`/vouchers/${doc}/${id}`, { quiet: true });
        setItemsById((prev) => ({ ...prev, [id]: res?.items || [] }));
      } catch (err: any) {
        setErrorIds((prev) => ({ ...prev, [id]: err?.message || "Failed to load line items" }));
      } finally {
        setLoadingIds((prev) => ({ ...prev, [id]: false }));
      }
    }
  };

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
                <th style={{ width: 40 }} />
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Voucher No
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
                <th className="num">Total Value</th>
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
                <React.Fragment key={r.id}>
                  <tr className="click" onClick={() => nav(`/vouchers/${doc}/${r.id}`)}>
                    <td style={{ width: 40, textAlign: "center" }} onClick={(e) => toggleExpand(e, r.id)}>
                      <button
                        type="button"
                        className="icon-btn"
                        aria-label={expandedIds[r.id] ? "Collapse line items" : "Expand line items"}
                        title={expandedIds[r.id] ? "Hide items" : "Show items"}
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid var(--line)",
                          borderRadius: 4,
                          background: expandedIds[r.id] ? "var(--tape)" : "var(--paper)",
                          color: expandedIds[r.id] ? "var(--denim-950)" : "var(--ink)",
                        }}
                      >
                        <Icon name={expandedIds[r.id] ? "minus" : "plus"} size={14} />
                      </button>
                    </td>
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
                  {expandedIds[r.id] && (
                    <tr className="expanded-row">
                      <td colSpan={8} style={{ padding: "12px 16px 16px 48px", background: "var(--chalk)", borderBottom: "1px solid var(--line)" }}>
                        {loadingIds[r.id] ? (
                          <div className="muted" style={{ padding: "8px 0" }}>Loading line items…</div>
                        ) : errorIds[r.id] ? (
                          <div style={{ color: "var(--red)", padding: "8px 0" }}>{errorIds[r.id]}</div>
                        ) : !(itemsById[r.id]?.length) ? (
                          <div className="muted" style={{ padding: "8px 0" }}>No line items found.</div>
                        ) : (
                          <div style={{ border: "1px solid var(--line)", borderRadius: 6, overflow: "hidden", background: "var(--paper)" }}>
                            <table className="tbl" style={{ fontSize: "13.5px" }}>
                              <thead>
                                <tr>
                                  <th style={{ width: 50, textAlign: "center" }}>#</th>
                                  <th>Item Name</th>
                                  <th>UOM</th>
                                  <th className="num">Qty</th>
                                  <th className="num">Rate</th>
                                  <th className="num">Disc %</th>
                                  <th className="num">GST %</th>
                                  <th className="num">Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {itemsById[r.id].map((it: any, idx: number) => (
                                  <tr key={it.id || idx}>
                                    <td style={{ textAlign: "center" }} className="muted">{it.line_no ?? idx + 1}</td>
                                    <td>
                                      <b>{it.product_id__label || it.description || "—"}</b>
                                      {it.description && it.product_id__label && it.description !== it.product_id__label && (
                                        <div className="muted" style={{ fontSize: 12 }}>{it.description}</div>
                                      )}
                                    </td>
                                    <td className="muted">{it.uom || "—"}</td>
                                    <td className="num">{qty(it.qty)}</td>
                                    <td className="num">{money(it.rate)}</td>
                                    <td className="num">{Number(it.disc_pct || 0) > 0 ? `${it.disc_pct}%` : "—"}</td>
                                    <td className="num">{it.gst_rate != null ? `${it.gst_rate}%` : "—"}</td>
                                    <td className="num"><b>{money(it.net_amount)}</b></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
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
