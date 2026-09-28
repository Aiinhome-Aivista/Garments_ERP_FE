import React, { useEffect, useState } from "react";
import { api, fdate, qty } from "../api";
import { Empty, Skeleton } from "../components/Loaders";

export default function Stock() {
  const [mode, setMode] = useState<"product" | "lot">("product");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    setRows(null);
    const t = setTimeout(() => api<any[]>(`/stock/report?mode=${mode}&q=${encodeURIComponent(q)}`).then(setRows), 200);
    return () => clearTimeout(t);
  }, [mode, q]);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Stock</h1>
          <p>Free stock is what is on hand minus quantities reserved by accepted production plans.</p>
        </div>
        <input placeholder="Search item or barcode…" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 260 }} />
      </div>
      <div className="tabs">
        <button className={mode === "product" ? "on" : ""} onClick={() => setMode("product")}>
          By item
        </button>
        <button className={mode === "lot" ? "on" : ""} onClick={() => setMode("lot")}>
          By barcode lot
        </button>
      </div>
      <div className="tbl-wrap">
        {rows === null ? (
          <Skeleton rows={8} />
        ) : !rows.length ? (
          <Empty icon="layers" title="No stock to show" />
        ) : mode === "product" ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>UOM</th>
                <th className="num">On hand</th>
                <th className="num">Reserved</th>
                <th className="num">Free</th>
                <th className="num">Minimum</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
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
                <th>Barcode</th>
                <th>Item</th>
                <th>Godown</th>
                <th>Bin</th>
                <th className="num">Balance</th>
                <th>Since</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
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
    </>
  );
}
