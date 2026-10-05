import React, { useEffect, useState, useRef } from "react";
import { api, fdate, qty } from "../api";
import { OverlayPanel } from "primereact/overlaypanel";
import { Empty, Skeleton } from "../components/Loaders";
import Lookup from "../components/Lookup";
import Pagination from "../components/Pagination";
import { ExcelFilter } from "../components/ExcelFilter";

export default function Stock() {
  const [mode, setMode] = useState<"product" | "lot">("product");
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [category, setCategory] = useState<{ id: any; label: string }>({ id: "", label: "" });
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const filterPanel = useRef<OverlayPanel>(null);
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
  }, [mode]);

  useEffect(() => {
    setPage(1);
    setLoading(true);
    const t = setTimeout(() => api<any[]>(`/stock/report?mode=${mode}&q=${encodeURIComponent(q)}`, { quiet: true })
      .then(setRows)
      .finally(() => setLoading(false)), 200);
    return () => clearTimeout(t);
  }, [mode, q]);

  const filteredRows = rows?.filter(r => {
    if (category.id && r.category !== category.label) return false;
    for (const [k, v] of Object.entries(filters)) {
      if (!v || v.length === 0) continue;
      if (!v.includes(String(r[k] || ""))) return false;
    }
    return true;
  }) || null;

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Stock</h1>
          <p>Free stock is what is on hand minus quantities reserved by accepted production plans.</p>
        </div>
      </div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input
          placeholder="Search here"
          style={{ width: 260 }}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <select value={mode} onChange={(e) => setMode(e.target.value as "product" | "lot")} style={{ width: 180 }}>
          <option value="product">View by item</option>
          <option value="lot">View by barcode lot</option>
        </select>
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
      <div className="tbl-wrap" style={{ position: "relative" }}>
        {loading && filteredRows !== null && (
          <div style={{ position: "absolute", inset: 0, background: "var(--bg)", opacity: 0.6, display: "flex", justifyContent: "center", paddingTop: 60, zIndex: 10 }}>
            <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem", color: "var(--tape)" }}></i>
          </div>
        )}
        {filteredRows === null ? (
          <Skeleton rows={8} />
        ) : !filteredRows.length ? (
          <Empty icon="layers" title="No stock to show" />
        ) : mode === "product" ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Item
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.item_name ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("item_name"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Category
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.category ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("category"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>UOM</th>
                <th className="num">On hand</th>
                <th className="num">Reserved</th>
                <th className="num">Free</th>
                <th className="num">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice((page - 1) * 10, page * 10).map((r) => {
                const low = r.min_stock && r.free < r.min_stock;
                return (
                  <tr key={r.product_id}>
                    <td>
                      <b>{r.item_name}</b>
                    </td>
                    <td>{r.category}</td>
                    <td>{r.uom}</td>
                    <td className="num">{qty(r.on_hand)}</td>
                    <td className="num">{qty(r.reserved)}</td>
                    <td className="num">
                      <b style={{ color: low ? "var(--red)" : "inherit" }}>{qty(r.free)}</b>
                    </td>
                    <td className="num">
                      {r.min_stock ? qty(r.min_stock) : "—"} {low && <span className="htag Pending">Low</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Barcode
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.barcode ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("barcode"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Item
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.item_name ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("item_name"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Godown
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.godown ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("godown"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Bin
                    <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.bin_no ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("bin_no"); filterPanel.current?.toggle(e); }} />
                  </div>
                </th>
                <th className="num">Balance</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.slice((page - 1) * 10, page * 10).map((r, i) => (
                <tr key={i}>
                  <td style={{ fontFamily: "ui-monospace,monospace" }}>{r.barcode}</td>
                  <td>{r.item_name}</td>
                  <td>{r.godown}</td>
                  <td>{r.bin_no}</td>
                  <td className="num">
                    {qty(r.balance)} {r.uom}
                  </td>
                  <td>{fdate(r.since)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {filteredRows && (
        <Pagination page={page} total={filteredRows.length} size={10} onChange={setPage} itemName="items" />
      )}
    </>
  );
}
