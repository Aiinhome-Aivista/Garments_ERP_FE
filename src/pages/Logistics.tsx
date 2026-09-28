import React, { useEffect, useState } from "react";
import { api, fdate, money } from "../api";
import { Input } from "../components/Field";
import { Btn, Empty, Skeleton } from "../components/Loaders";
import { useApp } from "../store";

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
  const [rows, setRows] = useState<any[] | null>(null);
  const [cur, setCur] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => api<any[]>(`/logistics?q=${encodeURIComponent(q)}`).then(setRows), 200);
    return () => clearTimeout(t);
  }, [q]);

  const pick = async (id: number) => setCur(await api(`/logistics/${id}`));

  const save = async () => {
    if (!cur) return;
    setBusy(true);
    try {
      await api(`/logistics/${cur.id}`, { method: "PUT", body: cur });
      toast(`Logistics saved for ${cur.voucher_no}`);
      setCur(null);
      api<any[]>(`/logistics?q=${encodeURIComponent(q)}`).then(setRows);
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

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
          <input placeholder="Find invoice or party…" value={q} onChange={(e) => setQ(e.target.value)} style={{ marginBottom: 10 }} />
          <div className="tbl-wrap">
            {rows === null ? (
              <Skeleton />
            ) : !rows.length ? (
              <Empty icon="truck" title="No approved invoices" />
            ) : (
              <table className="tbl">
                <tbody>
                  {rows.map((r) => (
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
