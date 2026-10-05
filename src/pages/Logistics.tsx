import React, { useEffect, useState } from "react";
import { api, fdate, money } from "../api";
import { Input } from "../components/Field";
import Lookup from "../components/Lookup";
import { Btn, Empty, Skeleton } from "../components/Loaders";
import { OverlayPanel } from "primereact/overlaypanel";
import { useApp } from "../store";
import { ExcelFilter } from "../components/ExcelFilter";

const F: [string, string, string][] = [
  ["einvoice_no", "E-invoice no", "text"],
  ["einvoice_date", "E-invoice date", "date"],
  ["eway_bill_no", "E-way bill no", "text"],
  ["eway_bill_date", "E-way bill date", "date"],
  ["courier_slip_no", "Courier slip no", "text"],
  ["courier_slip_date", "Courier slip date", "date"],
  ["transporter_id", "Transporter name", "ref"],
  ["transporter_cn_no", "Transporter consignment no", "text"],
  ["transporter_cn_date", "Consignment date", "date"],
  ["freight_amount", "Freight amount", "decimal"],
];

export default function Logistics() {
  const { toast, can } = useApp();
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const filterPanel = React.useRef<OverlayPanel>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [cur, setCur] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => api<any[]>(`/logistics`, { quiet: true })
      .then(setRows)
      .finally(() => setLoading(false)), 200);
    return () => clearTimeout(t);
  }, []);

  const pick = async (id: number) => setCur(await api(`/logistics/${id}`));

  const save = async () => {
    if (!cur) return;
    setBusy(true);
    try {
      await api(`/logistics/${cur.id}`, { method: "PUT", body: cur });
      toast(`Logistics saved for ${cur.voucher_no}`);
      setCur(null);
      api<any[]>(`/logistics`).then(setRows);
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const filteredRows = rows?.filter(r => {
    if (q && !r.voucher_no.toLowerCase().includes(q.toLowerCase()) && !r.party_name.toLowerCase().includes(q.toLowerCase())) return false;
    for (const [k, v] of Object.entries(filters)) {
      if (!v || v.length === 0) continue;
      if (k === "status") {
        const isUpdated = r.eway_bill_no || r.transporter_cn_no || r.courier_slip_no;
        if (v.includes("open") && isUpdated) return false;
        if (v.includes("updated") && !isUpdated) return false;
      } else {
        if (!v.includes(String(r[k] || ""))) return false;
      }
    }
    return true;
  }) || null;

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Logistics updation</h1>
          <p>Adds e-invoice, e-way bill, courier and transporter details to an approved sales invoice.</p>
        </div>
      </div>
      <div className="grid" style={{ gridTemplateColumns: "minmax(320px,1fr) minmax(360px,1.2fr)", alignItems: "start" }}>
        <div>
          <div className="row" style={{ marginBottom: 12 }}>
            <input
              placeholder="Search here"
              style={{ width: "100%" }}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <OverlayPanel ref={filterPanel}>
              {activeFilterCol && (
                <div style={{ minWidth: 200 }}>
                  {activeFilterCol === "status" ? (
                    <div style={{ padding: "8px" }}>
                      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>
                        Filter Status
                      </div>
                      <select
                        style={{ width: "100%", padding: "6px", fontSize: 14 }}
                        value={filters.status?.[0] || ""}
                        onChange={(e) => { setFilters({ ...filters, status: [e.target.value] }); filterPanel.current?.hide(); }}
                      >
                        <option value="">All Statuses</option>
                        <option value="open">Open</option>
                        <option value="updated">Updated</option>
                      </select>
                    </div>
                  ) : (
                    <ExcelFilter
                      rows={rows || []}
                      column={activeFilterCol}
                      filters={filters}
                      setFilters={setFilters}
                    />
                  )}
                </div>
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
              <Skeleton />
            ) : !filteredRows.length ? (
              <Empty icon="truck" title="No invoices match filters" />
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Invoice
                        <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.voucher_no ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("voucher_no"); filterPanel.current?.toggle(e); }} />
                      </div>
                    </th>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Party
                        <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.party_name ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("party_name"); filterPanel.current?.toggle(e); }} />
                      </div>
                    </th>
                    <th className="num">Value</th>
                    <th>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        Status
                        <i className="pi pi-caret-down" style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.status ? "var(--denim-600)" : "var(--muted)" }} onClick={(e) => { setActiveFilterCol("status"); filterPanel.current?.toggle(e); }} />
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((r) => (
                    <tr
                      key={r.id}
                      className="click"
                      onClick={() => pick(r.id)}
                      style={cur?.id === r.id ? { background: "var(--tape-soft)" } : undefined}
                    >
                      <td>
                        <b>{r.voucher_no}</b>
                        <div className="muted">{fdate(r.voucher_date)}</div>
                      </td>
                      <td>{r.party_name}</td>
                      <td className="num">{money(r.total_value)}</td>
                      <td>
                        {r.eway_bill_no || r.transporter_cn_no || r.courier_slip_no ? (
                          <span className="htag Approved">Updated</span>
                        ) : (
                          <span className="htag Pending">Open</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card tag">
          {!cur ? (
            <Empty icon="truck" title="Select an invoice">
              Its logistics fields appear here.
            </Empty>
          ) : (
            <>
              <h3>
                {cur.voucher_no} · {cur.party_id__label}
              </h3>
              <div className="grid">
                {F.map(([k, l, t]) => (
                  <label className="fld" key={k}>
                    <span>{l}</span>
                    <Input
                      f={{ name: k, label: l, type: t, ref: "ledger", filter: { ledger_type: "Transporter" } }}
                      value={cur[k]}
                      label={cur[k + "__label"]}
                      disabled={!can("logistics", "edit")}
                      onChange={(v, r) => setCur({ ...cur, [k]: v, [k + "__label"]: r?.label })}
                    />
                  </label>
                ))}
              </div>
              {can("logistics", "edit") && (
                <Btn className="tape" icon="check" busy={busy} onClick={save} style={{ marginTop: 16 }}>
                  Save logistics
                </Btn>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
