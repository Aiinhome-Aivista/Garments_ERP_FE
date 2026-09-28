import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, fdate, money, qs, qty } from "../api";
import Icon from "../components/Icons";
import { Empty, Skeleton } from "../components/Loaders";
import { useApp } from "../store";

export default function VoucherList() {
  const { doc } = useParams<{ doc: string }>();
  const { meta, can } = useApp();
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const cfg = meta?.vouchers?.[doc || ""];

  const [rows, setRows] = useState<any[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ q: "", status: sp.get("status") || "", from: "", to: "" });

  useEffect(() => {
    setRows(null);
    setPage(1);
    setF({ q: "", status: sp.get("status") || "", from: "", to: "" });
  }, [doc, sp]);

  useEffect(() => {
    if (!doc) return;
    const t = setTimeout(
      () =>
        api<any>(`/vouchers/${doc}${qs({ ...f, page })}`)
          .then((r) => {
            setRows(r.rows);
            setTotal(r.total);
          })
          .catch(() => setRows([])),
      200
    );
    return () => clearTimeout(t);
  }, [doc, f, page]);

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
          placeholder="Voucher no or party…"
          style={{ width: 240 }}
          value={f.q}
          onChange={(e) => {
            setF({ ...f, q: e.target.value });
            setPage(1);
          }}
        />
        <div className="chips">
          {["", "Pending", "Approved", "Rejected"].map((s) => (
            <button
              key={s}
              className={"chip" + (f.status === s ? " on" : "")}
              onClick={() => {
                setF({ ...f, status: s });
                setPage(1);
              }}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <label className="row muted">
          From{" "}
          <input
            type="date"
            style={{ width: 150 }}
            value={f.from}
            onChange={(e) => setF({ ...f, from: e.target.value })}
          />
        </label>
        <label className="row muted">
          To{" "}
          <input
            type="date"
            style={{ width: 150 }}
            value={f.to}
            onChange={(e) => setF({ ...f, to: e.target.value })}
          />
        </label>
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
                <th>Voucher no</th>
                <th>Date</th>
                <th>Party</th>
                <th>Series</th>
                <th className="num">Qty</th>
                <th className="num">Total value</th>
                <th>Status</th>
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
      {total > 30 && (
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </button>
          <span className="muted">
            Page {page} of {Math.ceil(total / 30)} · {total} vouchers
          </span>
          <button className="btn ghost sm" disabled={page * 30 >= total} onClick={() => setPage(page + 1)}>
            Next
          </button>
        </div>
      )}
    </>
  );
}
