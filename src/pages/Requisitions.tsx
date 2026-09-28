import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, fdate, qty as fq, today } from "../api";
import Icon from "../components/Icons";
import Lookup from "../components/Lookup";
import { Btn, Empty, Skeleton, StitchLoader } from "../components/Loaders";
import { useApp } from "../store";

export function Requisitions() {
  const { can } = useApp();
  const nav = useNavigate();
  const [rows, setRows] = useState<any[] | null>(null);
  const [st, setSt] = useState("");

  useEffect(() => {
    setRows(null);
    api<any[]>(`/requisitions${st ? "?status=" + st : ""}`).then(setRows);
  }, [st]);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Requisition for PO</h1>
          <p>Posted automatically from accepted plans, or raised by hand against minimum stock levels.</p>
        </div>
        {can("requisition", "create") && (
          <Link className="btn tape" to="/requisitions/new">
            <Icon name="plus" size={17} />
            New requisition
          </Link>
        )}
      </div>
      <div className="chips" style={{ marginBottom: 12 }}>
        {["", "Open", "Closed", "Cancelled"].map((s) => (
          <button key={s} className={"chip" + (st === s ? " on" : "")} onClick={() => setSt(s)}>
            {s || "All"}
          </button>
        ))}
      </div>
      <div className="tbl-wrap">
        {rows === null ? (
          <Skeleton rows={6} />
        ) : !rows.length ? (
          <Empty icon="tag" title="No requisitions" />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>No</th>
                <th>Date</th>
                <th>Source</th>
                <th className="num">Lines</th>
                <th className="num">Qty</th>
                <th className="num">Ordered</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="click" onClick={() => nav(`/requisitions/${r.id}`)}>
                  <td>
                    <b>{r.req_no}</b>
                  </td>
                  <td>{fdate(r.req_date)}</td>
                  <td>
                    {r.source}
                    {r.plan_no ? ` · ${r.plan_no}` : ""}
                  </td>
                  <td className="num">{r.line_count}</td>
                  <td className="num">{fq(r.qty)}</td>
                  <td className="num">{fq(r.ordered)}</td>
                  <td>
                    <span className={"htag " + r.status}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

export function RequisitionForm() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const { toast, can } = useApp();
  const [r, setR] = useState<any | null>(null);
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (id) api(`/requisitions/${id}`).then(setR);
    else setR({ req_date: today(), remarks: "", source: "Manual", status: "Open", items: [{ qty: "" }] });
  }, [id]);

  if (!r) return <StitchLoader />;

  const editable =
    (!id || (r.source === "Manual" && r.status === "Open" && !Number(r.ordered))) &&
    can("requisition", id ? "edit" : "create");

  const setItem = (i: number, p: any) =>
    setR({ ...r, items: r.items.map((x: any, j: number) => (j === i ? { ...x, ...p } : x)) });

  const suggest = async () => {
    const s = await api<any[]>("/requisitions/suggest");
    if (!s.length) return toast("Every item is at or above its minimum level.");
    setR({
      ...r,
      items: [
        ...r.items.filter((x: any) => x.product_id),
        ...s.filter((x: any) => !r.items.some((y: any) => y.product_id === x.product_id)),
      ],
    });
  };

  const save = async () => {
    setBusy("s");
    try {
      const v = await api(`/requisitions${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: r });
      toast(`Requisition ${v.req_no} saved`);
      if (!id) nav(`/requisitions/${v.id}`, { replace: true });
      else setR(v);
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  const close = async () => {
    await api(`/requisitions/${id}/close`, { method: "POST" });
    toast("Closed");
    nav("/requisitions");
  };

  const del = async () => {
    if (!confirm("Delete this requisition?")) return;
    try {
      await api(`/requisitions/${id}`, { method: "DELETE" });
      nav("/requisitions");
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <>
      <div className="vhead">
        <Icon name="tag" size={34} style={{ color: "var(--denim-600)" }} />
        <div>
          <div className="muted">Requisition for PO · {r.source}</div>
          <div className="vno">{r.req_no || "New"}</div>
        </div>
        {id && <span className={"htag " + r.status}>{r.status}</span>}
        <div style={{ flex: 1 }} />
        {id && r.status === "Open" && can("requisition", "edit") && (
          <Btn className="ghost" onClick={close}>
            Close
          </Btn>
        )}
        {id && r.source === "Manual" && editable && can("requisition", "delete") && (
          <Btn className="ghost danger-cursor" icon="trash" onClick={del}>
            Delete
          </Btn>
        )}
        {editable && (
          <Btn icon="check" busy={busy === "s"} onClick={save}>
            Save
          </Btn>
        )}
      </div>
      {!editable && id && (
        <div className="banner">
          <Icon name="alert" size={18} />
          {r.source === "Planning"
            ? "Created by a production plan, so it can't be edited."
            : "This requisition is closed or already used by purchase orders."}
        </div>
      )}
      <div className="card tag">
        <div className="grid">
          <label className="fld">
            <span>Date</span>
            <input
              type="date"
              disabled={!editable}
              value={String(r.req_date).slice(0, 10)}
              onChange={(e) => setR({ ...r, req_date: e.target.value })}
            />
          </label>
          <label className="fld span2">
            <span>Remarks</span>
            <input disabled={!editable} value={r.remarks || ""} onChange={(e) => setR({ ...r, remarks: e.target.value })} />
          </label>
        </div>
      </div>
      <div className="section">
        <div className="sec-head">
          <h3>Items</h3>
          {editable && (
            <Btn className="ghost sm" icon="layers" onClick={suggest}>
              Suggest from minimum stock
            </Btn>
          )}
        </div>
        <div className="tbl-wrap">
          <table className="tbl grid-tbl">
            <thead>
              <tr>
                <th className="sl">#</th>
                <th style={{ width: 340 }}>Item</th>
                <th>UOM</th>
                <th className="num" style={{ width: 120 }}>
                  Qty
                </th>
                {id && <th className="num">Ordered</th>}
                <th>Remark</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {r.items.map((x: any, i: number) => (
                <tr key={i}>
                  <td className="sl">{i + 1}</td>
                  <td>
                    <Lookup
                      master="product"
                      value={x.product_id}
                      label={x.product_id__label}
                      disabled={!editable}
                      onChange={(v, row) =>
                        setItem(i, { product_id: v, product_id__label: row?.label, uom: row?.uom_id__label })
                      }
                    />
                  </td>
                  <td className="muted">{x.uom}</td>
                  <td>
                    <input
                      className="n"
                      disabled={!editable}
                      value={x.qty ?? ""}
                      onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setItem(i, { qty: e.target.value })}
                    />
                  </td>
                  {id && <td className="num">{fq(x.ordered)}</td>}
                  <td>
                    <input
                      disabled={!editable}
                      value={x.remark || ""}
                      onChange={(e) => setItem(i, { remark: e.target.value })}
                    />
                  </td>
                  <td>
                    {editable && (
                      <button
                        className="icon-btn del"
                        onClick={() => setR({ ...r, items: r.items.filter((_: any, j: number) => j !== i) })}
                      >
                        <Icon name="scissors" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {editable && (
          <button
            className="btn ghost sm"
            style={{ marginTop: 8 }}
            onClick={() => setR({ ...r, items: [...r.items, { qty: "" }] })}
          >
            <Icon name="plus" size={16} />
            Add line
          </button>
        )}
      </div>
    </>
  );
}
