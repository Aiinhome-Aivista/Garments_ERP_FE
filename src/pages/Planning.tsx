import React, { useCallback, useEffect, useState } from "react";
import { api, fdate, qty } from "../api";
import Icon from "../components/Icons";
import { Btn, Empty, Skeleton } from "../components/Loaders";
import { useApp } from "../store";

type ColDef = [string, string, (number | boolean)?, ((val: any, row?: any) => React.ReactNode)?];

const T = ({ rows, cols }: { rows: any[]; cols: ColDef[] }) => (
  <div className="tbl-wrap">
    <table className="tbl">
      <thead>
        <tr>
          {cols.map(([, l, num]) => (
            <th key={l} className={num ? "num" : ""}>
              {l}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {cols.map(([k, l, num, fmt]) => (
              <td key={l} className={num ? "num" : ""}>
                {fmt ? fmt(r[k], r) : num ? qty(r[k]) : r[k]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default function Planning() {
  const { toast, can } = useApp();
  const [orders, setOrders] = useState<any[] | null>(null);
  const [sel, setSel] = useState<number[]>([]);
  const [res, setRes] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[] | null>(null);
  const [planStatus, setPlanStatus] = useState("");
  const [busy, setBusy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [view, setView] = useState<any | null>(null);

  const filteredPlans = plans?.filter(p => !planStatus || p.status === planStatus) || null;

  const load = useCallback(() => {
    api<any[]>("/planning/open-orders").then(setOrders);
    api<any[]>("/planning").then(setPlans);
  }, []);

  useEffect(load, [load]);

  const toggle = (id: number) => {
    setRes(null);
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const analyse = async () => {
    setBusy("an");
    try {
      setRes(await api("/planning/analyze", { method: "POST", body: { order_ids: sel } }));
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  const accept = async () => {
    setBusy("ok");
    try {
      const r = await api<{ plan_no: string; requisition_no?: string }>("/planning", {
        method: "POST",
        body: { order_ids: sel, remarks },
      });
      toast(
        `Plan ${r.plan_no} accepted${
          r.requisition_no ? ` · requisition ${r.requisition_no} raised` : " · no purchase needed"
        }`
      );
      setSel([]);
      setRes(null);
      setRemarks("");
      load();
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  const cancel = async (p: any) => {
    if (!confirm(`Cancel plan ${p.plan_no}? Reserved stock is released and its requisition is cancelled.`)) return;
    try {
      await api(`/planning/${p.id}/cancel`, { method: "POST" });
      toast("Plan cancelled");
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const complete = async (p: any) => {
    if (!confirm(`Complete production for plan ${p.plan_no}? This will consume reserved raw materials and receive finished goods into stock.`)) return;
    try {
      await api(`/planning/${p.id}/complete`, { method: "POST" });
      toast("Production completed and stock updated.");
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const open = async (p: any) => setView(await api(`/planning/${p.id}`));

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Production planning</h1>
          <p>
            Choose approved sales orders. The plan checks free finished stock, explodes the BOM for the balance, checks raw
            material stock and open POs, then raises the requisition and reserves stock when you accept.
          </p>
        </div>
      </div>
      <div className="card">
        <h3>1 · Open sales orders</h3>
        {orders === null ? (
          <Skeleton />
        ) : !orders.length ? (
          <Empty icon="cart" title="No orders waiting for a plan">
            Approved sales orders with pending quantity appear here.
          </Empty>
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th />
                  <th>Order</th>
                  <th>Date</th>
                  <th>Party</th>
                  <th className="num">Lines</th>
                  <th className="num">Pending qty</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="click" onClick={() => toggle(o.id)}>
                    <td>
                      <input type="checkbox" checked={sel.includes(o.id)} readOnly />
                    </td>
                    <td>
                      <b>{o.voucher_no}</b>
                    </td>
                    <td>{fdate(o.voucher_date)}</td>
                    <td>{o.party}</td>
                    <td className="num">{o.lines}</td>
                    <td className="num">{qty(o.pending_qty)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 12 }}>
          <Btn icon="loom" disabled={!sel.length} busy={busy === "an"} onClick={analyse}>
            Analyse {sel.length || ""} order{sel.length === 1 ? "" : "s"}
          </Btn>
        </div>
      </div>

      {res && (
        <>
          <div className="section card">
            <h3>2 · Finished goods: stock against demand</h3>
            <T
              rows={res.fg}
              cols={[
                ["item_name", "Item"],
                ["required_qty", "Ordered", 1],
                ["free_stock", "Free stock", 1],
                ["balance_qty", "To produce", 1],
              ]}
            />
          </div>
          <div className="section card">
            <h3>3 · Material required (process-wise BOM)</h3>
            {res.no_bom.length > 0 && (
              <div className="banner err">
                <Icon name="alert" size={18} />
                No process / BOM defined for: {res.no_bom.join(", ")}. Add it in Products so materials can be planned.
              </div>
            )}
            {res.materials.length ? (
              <T
                rows={res.materials}
                cols={[
                  ["item_name", "Material"],
                  ["uom", "UOM"],
                  ["required_qty", "Required", 1],
                  ["free_stock", "Free stock", 1],
                  ["po_pending", "On order (PO)", 1],
                  [
                    "shortfall_qty",
                    "To purchase",
                    1,
                    (v: number) => <b style={{ color: v > 0 ? "var(--red)" : "var(--moss)" }}>{qty(v)}</b>,
                  ],
                ]}
              />
            ) : (
              <p className="muted">No materials needed for the balance.</p>
            )}
            <details style={{ marginTop: 12 }}>
              <summary style={{ cursor: "pointer" }}>
                <b>Process-wise detail</b>
              </summary>
              <T
                rows={res.detail}
                cols={[
                  ["fg", "Finished item"],
                  ["process", "Process"],
                  ["part_name", "Part"],
                  ["material", "Material"],
                  ["per_unit", "Qty / unit", 1],
                  ["required", "Required", 1],
                  ["out_status", "Output"],
                ]}
              />
            </details>
          </div>
          {can("planning", "create") && (
            <div className="section card no-print">
              <div className="row">
                <input
                  style={{ maxWidth: 380 }}
                  placeholder="Remarks (optional)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
                <Btn className="tape" icon="check" busy={busy === "ok"} onClick={accept}>
                  Accept plan · raise requisition · reserve stock
                </Btn>
              </div>
            </div>
          )}
        </>
      )}

      <div className="section">
        <div className="sec-head">
          <h3>Plans</h3>
          <select value={planStatus} onChange={(e) => setPlanStatus(e.target.value)} style={{ width: 140, marginLeft: "auto" }}>
            <option value="">All Statuses</option>
            <option value="Accepted">Accepted</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="tbl-wrap">
          {filteredPlans === null ? (
            <Skeleton />
          ) : !filteredPlans.length ? (
            <Empty icon="clipboard" title="No plans yet" />
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Plan</th>
                  <th>Date</th>
                  <th className="num">Orders</th>
                  <th>Requisition</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPlans.map((p) => (
                  <tr key={p.id} className="click" onClick={() => open(p)}>
                    <td>
                      <b>{p.plan_no}</b>
                    </td>
                    <td>{fdate(p.plan_date)}</td>
                    <td className="num">{p.orders}</td>
                    <td>{p.req_no || "—"}</td>
                    <td>
                      <span className={"htag " + p.status}>{p.status}</span>
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {p.status === "Accepted" && can("planning", "edit") && (
                        <button className="btn ghost sm" style={{ color: "var(--moss)", marginRight: 8 }} onClick={() => complete(p)}>
                          Complete
                        </button>
                      )}
                      {p.status === "Accepted" && can("planning", "delete") && (
                        <button className="btn ghost sm" onClick={() => cancel(p)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {view && (
        <div className="veil center">
          <div className="modal">
            <div className="modal-head">
              <h2>{view.plan_no}</h2>
              <span className={"htag " + view.status}>{view.status}</span>
              <button className="icon-btn" onClick={() => setView(null)}>
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <p className="muted">
                Orders: {view.orders.map((o: any) => o.voucher_no).join(", ")} · Requisition: {view.req_no || "none"}
              </p>
              <T
                rows={view.fg}
                cols={[
                  ["item_name", "Finished item"],
                  ["required_qty", "Ordered", 1],
                  ["free_stock", "Free stock", 1],
                  ["balance_qty", "To produce", 1],
                ]}
              />
              <div style={{ height: 12 }} />
              <T
                rows={view.materials}
                cols={[
                  ["item_name", "Material"],
                  ["required_qty", "Required", 1],
                  ["free_stock", "Free stock", 1],
                  ["po_pending", "On order", 1],
                  ["shortfall_qty", "To purchase", 1],
                ]}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
