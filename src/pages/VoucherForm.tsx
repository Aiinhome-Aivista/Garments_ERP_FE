import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, fdate, money, qs, qty as fq, today } from "../api";
import { calcItem, calcTotals } from "../lib_calc";
import Icon from "../components/Icons";
import Lookup from "../components/Lookup";
import { Btn, Skeleton, StitchLoader } from "../components/Loaders";
import { useApp } from "../store";

const NUMERIC = ["qty", "rate", "disc_pct", "disc_amt"];
const KEEP = [
  "barcode",
  "godown_id",
  "bin_no",
  "product_id",
  "description",
  "customer_item_name",
  "qty",
  "pricelist_id",
  "rate",
  "disc_pct",
  "disc_amt",
  "delivery_date",
  "salesman_id",
  "broker_id",
  "retailer_name",
  "src_header_id",
  "src_item_id",
  "req_item_id",
  "ref_no",
  "indent_no",
];

function beep(ok = true) {
  try {
    const a = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = ok ? 1480 : 240;
    o.type = ok ? "square" : "sawtooth";
    g.gain.value = 0.05;
    o.connect(g);
    g.connect(a.destination);
    o.start();
    o.stop(a.currentTime + (ok ? 0.08 : 0.25));
  } catch {
    /* audio blocked */
  }
}

interface SourcePickerProps {
  doc: string;
  src: any;
  partyId?: number | null;
  excludeId?: string | number | null;
  onClose: () => void;
  onPick: (lines: any[]) => void;
}

/* ------------------------------------------------------------- source picker */
function SourcePicker({ doc, src, partyId, excludeId, onClose, onPick }: SourcePickerProps) {
  const [lines, setLines] = useState<any[] | null>(null);
  const [sel, setSel] = useState<Record<string, any>>({});
  const [one, setOne] = useState<any>(null);

  useEffect(() => {
    api<any[]>(
      `/vouchers/${doc}/pending-source${qs({ party_id: src.kind === "requisition" ? "" : partyId, exclude: excludeId || 0 })}`
    ).then(setLines);
  }, []); // eslint-disable-line

  const groups = useMemo(() => {
    const g = new Map<any, any[]>();
    (lines || []).forEach((l) => {
      if (!g.has(l.src_header_id)) g.set(l.src_header_id, []);
      g.get(l.src_header_id)!.push(l);
    });
    return [...g.entries()];
  }, [lines]);

  const key = (l: any) => l.src_item_id || l.req_item_id;

  const toggleDoc = (ls: any[], on: boolean) =>
    setSel((s) => {
      const n = { ...s };
      ls.forEach((l) => {
        if (on) n[key(l)] = n[key(l)] ?? l.pending_qty;
        else delete n[key(l)];
      });
      return n;
    });

  const chosen = src.multi
    ? (lines || []).filter((l) => sel[key(l)] !== undefined).map((l) => ({ ...l, take: Number(sel[key(l)]) || 0 }))
    : (groups.find(([id]) => id === one)?.[1] || []).map((l) => ({ ...l, take: Number(l.pending_qty) }));

  return (
    <div className="veil center">
      <div className="modal">
        <div className="modal-head">
          <Icon name="clipboard" size={24} />
          <h2>Pick from {src.label.toLowerCase()}</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          {lines === null ? (
            <Skeleton rows={5} />
          ) : !groups.length ? (
            <div className="banner">
              <Icon name="alert" size={18} />
              Nothing pending{src.kind !== "requisition" && !partyId ? " — choose the party first" : " for this party"}.
              Only approved documents with balance quantity show up here.
            </div>
          ) : (
            groups.map(([id, ls]) => (
              <div key={id} className="section" style={{ marginTop: 10 }}>
                <label className="row pick" style={{ marginBottom: 4 }}>
                  {src.multi ? (
                    <input
                      type="checkbox"
                      checked={ls.every((l: any) => sel[key(l)] !== undefined)}
                      onChange={(e) => toggleDoc(ls, e.target.checked)}
                    />
                  ) : (
                    <input type="radio" name="one" checked={one === id} onClick={() => setOne(one === id ? "" : id)} onChange={() => {}} />
                  )}
                  <b style={{ font: "700 18px var(--f-head)" }}>{ls[0].src_no}</b>
                  <span className="muted">{fdate(ls[0].src_date)}</span>
                </label>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        {src.multi && <th />}
                        <th>Item</th>
                        <th className="num">Pending</th>
                        {src.multi && <th className="num">Take</th>}
                        <th className="num">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ls.map((l: any) => (
                        <tr key={key(l)}>
                          {src.multi && (
                            <td style={{ width: 30 }}>
                              <input
                                type="checkbox"
                                checked={sel[key(l)] !== undefined}
                                onChange={(e) => toggleDoc([l], e.target.checked)}
                              />
                            </td>
                          )}
                          <td>
                            {l.item_name}
                            {l.barcode && <span className="muted"> · {l.barcode}</span>}
                          </td>
                          <td className="num">
                            {fq(l.pending_qty)} {l.uom}
                          </td>
                          {src.multi && (
                            <td style={{ width: 110 }}>
                              <input
                                className="n"
                                style={{ textAlign: "right" }}
                                disabled={sel[key(l)] === undefined}
                                value={sel[key(l)] ?? ""}
                                onChange={(e) =>
                                  /^\d*\.?\d*$/.test(e.target.value) && setSel({ ...sel, [key(l)]: e.target.value })
                                }
                              />
                            </td>
                          )}
                          <td className="num">{l.rate != null ? money(l.rate) : ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="modal-foot">
          <Btn className="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn className="tape" icon="check" disabled={!chosen.length} onClick={() => onPick(chosen.filter((c) => c.take > 0))}>
            Add {chosen.length || ""} line{chosen.length === 1 ? "" : "s"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- main form */
export default function VoucherForm() {
  const { doc, id } = useParams<{ doc: string; id: string }>();
  const nav = useNavigate();
  const { meta, can, toast } = useApp();
  const cfg = meta?.vouchers?.[doc || ""];
  const cols = meta?.item_cols || {};

  const [h, setH] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [pays, setPays] = useState<any[]>([]);
  const [rec, setRec] = useState<any | null>(null);
  const [busy, setBusy] = useState("");
  const [picker, setPicker] = useState(false);
  const [refOpts, setRefOpts] = useState<any[]>([]);
  const [picked, setPicked] = useState<any[]>([]);
  const [flash, setFlash] = useState(-1);
  const [err, setErr] = useState<Record<string, string>>({});

  const pool = useRef<any[] | null>(null);
  const scanRef = useRef<HTMLInputElement | null>(null);

  const locked = !!rec?.locked;
  const isNew = !id;
  const src = cfg?.source;

  const blankItem = () => ({ qty: "", rate: "", disc_pct: "", disc_amt: "" });

  const base = useCallback(async () => {
    if (!doc || !cfg) return;
    const tts = await api<any[]>(`/lookup/txn_type?f_txn_kind=${encodeURIComponent(cfg.kind)}&limit=5`);
    const tt = tts[0];
    const next = tt ? await api<{ voucher_no: string }>(`/vouchers/${doc}/next-number?txn_type_id=${tt.id}`) : null;
    const tm = tt ? (await api<{ terms: any[] }>(`/masters/txn_type/${tt.id}`)).terms : [];

    setH({ txn_type_id: tt?.id, txn_type_id__label: tt?.label, voucher_no: next?.voucher_no || "", voucher_date: today(), party_id: null });
    setItems(src?.required ? [] : [blankItem()]);
    setLedgers([]);
    setTerms(tm.map((t: any) => ({ description: t.description })));
    setPays([]);
    setRec(null);
    setPicked([]);
    if (!tt) toast(`Create a transaction type for “${cfg.kind}” first (Masters › Transaction types).`, "err");
  }, [doc, cfg]); // eslint-disable-line

  const hydrate = (v: any) => {
    setRec(v);
    setH({ ...v });
    setItems(v.items.map((i: any) => ({ ...i, uom: i.uom })));
    setLedgers(v.ledgers);
    setTerms(v.terms);
    setPays(v.payments);
    setPicked([...new Set(v.items.map((i: any) => i.src_header_id).filter(Boolean))]);
  };

  useEffect(() => {
    setH(null);
    setErr({});
    pool.current = null;
    if (id && doc)
      api(`/vouchers/${doc}/${id}`)
        .then(hydrate)
        .catch((e) => {
          toast(e.message, "err");
          nav(`/vouchers/${doc}`);
        });
    else base();
  }, [doc, id]); // eslint-disable-line

  useEffect(() => {
    if (!cfg?.return_of || !h?.party_id || !doc) {
      setRefOpts([]);
      return;
    }
    api<any[]>(`/vouchers/${doc}/ref-vouchers?party_id=${h.party_id}`, { quiet: true })
      .then(setRefOpts)
      .catch(() => {});
  }, [h?.party_id, doc]); // eslint-disable-line

  const totals = useMemo(() => calcTotals(items, ledgers), [items, ledgers]);

  const setHead = (patch: any) => setH((p: any) => ({ ...p, ...patch }));

  const setItem = (i: number, patch: any) =>
    setItems((rows) =>
      rows.map((r, j) => {
        if (j !== i) return r;
        const n = { ...r, ...patch };
        if ("disc_pct" in patch && Number(patch.disc_pct) > 0) n.disc_amt = calcItem(n).disc_amt;
        if ("disc_amt" in patch) n.disc_pct = "";
        Object.assign(n, calcItem(n));
        return n;
      })
    );

  const chooseType = async (tid: any, row: any) => {
    setHead({ txn_type_id: tid, txn_type_id__label: row?.label });
    if (!tid || !doc) return;
    const nx = await api<{ voucher_no: string }>(`/vouchers/${doc}/next-number?txn_type_id=${tid}`);
    setHead({ voucher_no: nx.voucher_no });
    if (isNew && !terms.length) {
      const ttData = await api<{ terms: any[] }>(`/masters/txn_type/${tid}`);
      setTerms(ttData.terms.map((t) => ({ description: t.description })));
    }
  };

  const chooseParty = (pid: any, row: any) => {
    const patch: any = {
      party_id: pid,
      party_id__label: row?.label,
      party_account: row?.ledger_account_id__label,
      party_state: row?.state,
    };
    (cfg?.header || []).forEach((f: any) => {
      if (f.party_default && row) {
        patch[f.name] = row[f.party_default];
        patch[f.name + "__label"] = row[f.party_default + "__label"];
      }
    });
    setHead(patch);
    pool.current = null;
  };

  const chooseProduct = async (i: number, pid: any, row: any) => {
    if (!pid) {
      setItem(i, { product_id: null, product_id__label: "" });
      return;
    }
    setItem(i, { product_id: pid, product_id__label: row.label, uom: row.uom_id__label });
    if (h?.party_id) {
      const p = await api<any>(
        `/pricing/resolve?party_id=${h.party_id}&product_id=${pid}&date=${h.voucher_date}`,
        { quiet: true }
      );
      setItems((rows) =>
        rows.map((r, j) => {
          if (j !== i) return r;
          const n = { ...r };
          if (!Number(n.rate)) {
            n.rate = p.rate || "";
            n.pricelist_id = p.pricelist_id;
            n.pricelist_id__label = p.pricelist_label;
            n.disc_pct = p.disc_pct || "";
            n.disc_amt = p.disc_amt || "";
          }
          if (!n.customer_item_name && p.customer_item_name) n.customer_item_name = p.customer_item_name;
          return { ...n, ...calcItem(n) };
        })
      );
    }
  };

  const choosePricelist = async (i: number, plid: any, row: any) => {
    setItem(i, { pricelist_id: plid, pricelist_id__label: row?.label });
    const pid = items[i].product_id;
    if (plid && pid) {
      const r = await api<{ rate: any; disc_pct: any; disc_amt: any }>(
        `/pricing/pricelist-rate?pricelist_id=${plid}&product_id=${pid}`,
        { quiet: true }
      );
      setItem(i, { rate: r.rate || "", disc_pct: r.disc_pct || "", disc_amt: r.disc_amt || "" });
    }
  };

  const fromLine = (l: any) => {
    const n: any = {
      product_id: l.product_id,
      product_id__label: l.item_name,
      uom: l.uom,
      description: l.description,
      customer_item_name: l.customer_item_name,
      qty: l.take,
      pricelist_id: l.pricelist_id,
      pricelist_id__label: l.pricelist_label,
      rate: l.rate ?? "",
      disc_pct: Number(l.disc_pct) || "",
      disc_amt: Number(l.disc_pct) ? "" : Number(l.disc_amt) || "",
      delivery_date: l.delivery_date,
      barcode: l.barcode || "",
      godown_id: l.godown_id,
      godown_id__label: l.godown_label,
      bin_no: l.bin_no,
      salesman_id: l.salesman_id || l.h_salesman_id,
      salesman_id__label: l.h_salesman_label,
      broker_id: l.broker_id || l.h_broker_id,
      broker_id__label: l.h_broker_label,
      retailer_name: l.retailer_name || l.h_retailer_name,
    };
    if (src.kind === "requisition") {
      n.req_item_id = l.req_item_id;
      n.indent_no = l.indent_no;
      n.qty = l.take;
      n.rate = "";
    } else {
      n.src_header_id = l.src_header_id;
      n.src_item_id = l.src_item_id;
      n.src_no = l.src_no;
      n.ref_no = ["sales_order", "purchase_order"].includes(src.kind) ? l.src_no : l.ref_no;
      n.indent_no = l.indent_no;
    }
    return { ...n, ...calcItem(n) };
  };

  const onPick = (lines: any[]) => {
    const mapped = lines.map(fromLine);
    if (src.link) {
      setItems(mapped);
      setHead({ [src.link]: lines[0].src_header_id, [src.link + "__label"]: lines[0].src_no });
    } else setItems((cur) => [...cur.filter((r) => r.product_id), ...mapped]);

    setPicked((p) => [...new Set([...p, ...lines.map((l) => l.src_header_id).filter(Boolean)])]);
    pool.current = null;
    setPicker(false);
    if (src.kind !== "requisition") {
      const l0 = lines[0];
      if (l0.h_salesman_id && !h.salesman_id && cfg.header.some((f: any) => f.name === "salesman_id")) {
        setHead({ salesman_id: l0.h_salesman_id });
      }
    }
  };

  /* ---- barcode scan ---- */
  const getPool = async () => {
    if (!pool.current && doc) {
      const all = await api<any[]>(
        `/vouchers/${doc}/pending-source${qs({ party_id: h.party_id, exclude: id || 0 })}`,
        { quiet: true }
      );
      pool.current = all.filter((l) => picked.includes(l.src_header_id));
    }
    return pool.current || [];
  };

  const bad = (m: string) => {
    beep(false);
    toast(m, "err");
  };

  const scan = async (code: string) => {
    if (!h.party_id) return bad("Choose the party before scanning.");
    if (cfg.return_of && !h.ref_voucher_id) return bad("Choose the invoice being returned first.");
    let r: any;
    try {
      r = await api(`/stock/scan/${encodeURIComponent(code)}${qs({ ref_voucher_id: cfg.return_of ? h.ref_voucher_id : "" })}`, {
        quiet: true,
      });
    } catch (e: any) {
      return bad(e.message);
    }
    const lot = r.lots[0];
    const pr = r.product;
    if (!lot) return bad(`${pr.item_name} has no stock right now.`);
    if (items.some((x) => x.barcode === lot.barcode && x.godown_id === lot.godown_id && (x.bin_no || "") === (lot.bin_no || "")))
      return bad(`Barcode ${lot.barcode} is already on this voucher.`);

    const balance = Number(lot.balance);
    let idx = items.findIndex((x) => x.product_id === pr.product_id && !x.barcode);
    const fill = (n: any, q: any) => ({
      ...n,
      barcode: lot.barcode,
      godown_id: lot.godown_id,
      godown_id__label: lot.godown_label,
      bin_no: lot.bin_no,
      qty: q,
    });

    if (idx >= 0) {
      const q = cfg.stock < 0 ? Math.min(Number(items[idx].qty) || balance, balance) : items[idx].qty;
      setItems((rows) =>
        rows.map((x, j) => {
          if (j !== idx) return x;
          const n = fill(x, q);
          return { ...n, ...calcItem(n) };
        })
      );
    } else {
      let row: any;
      if (src) {
        const pl = await getPool();
        const used = (l: any) =>
          items.filter((x) => x.src_item_id === l.src_item_id).reduce((s, x) => s + Number(x.qty || 0), 0);
        const line = pl.find((l) => l.product_id === pr.product_id && Number(l.pending_qty) - used(l) > 0);
        if (!line) return bad(`${pr.item_name} isn't pending on the selected ${src.label.toLowerCase()}.`);
        row = fromLine({ ...line, take: Math.min(balance, Number(line.pending_qty) - used(line)) });
        row = { ...row, ...fill(row, row.qty), ...{ src_no: line.src_no } };
      } else {
        const ri = r.ref_item || {};
        row = fill(
          {
            product_id: pr.product_id,
            product_id__label: pr.item_name,
            uom: pr.uom,
            description: ri.description,
            customer_item_name: ri.customer_item_name,
            pricelist_id: ri.pricelist_id,
            rate: ri.rate ?? "",
            disc_pct: Number(ri.disc_pct) || "",
            disc_amt: Number(ri.disc_pct) ? "" : ri.disc_amt || "",
            salesman_id: ri.salesman_id,
            broker_id: ri.broker_id,
            retailer_name: ri.retailer_name,
            ref_no: ri.ref_no,
          },
          1
        );
      }
      row = { ...row, ...calcItem(row) };
      setItems((rows) => [...rows.filter((x) => x.product_id), row]);
      idx = items.filter((x) => x.product_id).length;
    }
    beep(true);
    setFlash(idx);
    setTimeout(() => setFlash(-1), 1200);
  };

  /* ---- save / actions ---- */
  const payload = () => ({
    ...Object.fromEntries(
      [
        "txn_type_id",
        "voucher_date",
        "party_id",
        "salesman_id",
        "broker_id",
        "retailer_name",
        "remarks",
        "ref_voucher_id",
        "ref_doc_no",
        "ref_doc_date",
        "packing_list_id",
      ].map((k) => [k, h[k] ?? null])
    ),
    items: items.filter((i) => i.product_id).map((i) => Object.fromEntries(KEEP.map((k) => [k, i[k] ?? null]))),
    ledgers: ledgers
      .filter((l) => l.ledger_id)
      .map((l) => ({ ledger_id: l.ledger_id, rate: l.rate || 0, rate_in: l.rate_in || "percent", rate_on: l.rate_on || "auto" })),
    terms,
    payments: pays,
  });

  const save = async () => {
    setBusy("save");
    setErr({});
    try {
      const v = await api(`/vouchers/${doc}${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: payload() });
      toast(`${cfg.label} ${v.voucher_no} saved`);
      if (isNew) nav(`/vouchers/${doc}/${v.id}`, { replace: true });
      else hydrate(v);
    } catch (e: any) {
      if (e.field) setErr({ [e.field]: e.message });
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  const act = async (a: string) => {
    setBusy(a);
    try {
      const v = await api(`/vouchers/${doc}/${id}/${a}`, { method: "POST" });
      hydrate(v);
      toast(a === "approve" ? "Approved" : a === "reject" ? "Rejected" : "Moved back to pending");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this voucher?")) return;
    try {
      await api(`/vouchers/${doc}/${id}`, { method: "DELETE" });
      toast("Deleted");
      nav(`/vouchers/${doc}`);
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const applyGst = async () => {
    setBusy("gst");
    try {
      const r = await api<{ lines: any[]; inter_state: boolean }>(`/vouchers/${doc}/gst-suggest`, {
        method: "POST",
        body: { party_id: h.party_id, branch_id: h.branch_id, items: items.filter((i) => i.product_id) },
      });
      setLedgers((cur) => [...cur.filter((l) => !r.lines.some((x: any) => x.ledger_id === l.ledger_id)), ...r.lines]);
      toast(r.inter_state ? "IGST applied (different state)" : "CGST + SGST applied");
    } catch (e: any) {
      toast(e.message, "err");
    } finally {
      setBusy("");
    }
  };

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s" && !locked && h) {
        e.preventDefault();
        save();
      }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }); // eslint-disable-line

  if (!h || !cfg) return <StitchLoader label="Laying out the pattern…" />;

  const editable = !locked && can(doc!, isNew ? "create" : "edit");
  const colKeys: string[] = cfg.cols.flatMap((c: string) => (c === "product_id" ? [c, "uom"] : [c]));
  const status = rec?.approval_status;

  const cell = (i: number, row: any, c: string) => {
    const def = cols[c] || { label: "UOM", type: "text", readonly: true };
    const off = !editable;
    if (c === "uom") return <span className="muted">{row.uom}</span>;
    if (c === "net_amount")
      return (
        <span className="num" style={{ display: "block", padding: "0 8px", fontWeight: 700 }}>
          {money(calcItem(row).net_amount)}
        </span>
      );
    if (["ref_no", "indent_no", "src_no"].includes(c))
      return <span className="muted" style={{ padding: "0 8px" }}>{row[c]}</span>;
    if (c === "barcode")
      return cfg.auto_barcode ? (
        <span className="muted" style={{ padding: "0 8px" }}>
          {row.barcode || "Auto on save"}
        </span>
      ) : (
        <input
          value={row.barcode || ""}
          disabled={off || cfg.scan}
          placeholder={cfg.scan ? "Scan above" : ""}
          style={{ fontFamily: "ui-monospace,monospace" }}
          onChange={(e) => setItem(i, { barcode: e.target.value })}
        />
      );
    if (c === "product_id")
      return (
        <Lookup
          master="product"
          value={row.product_id}
          label={row.product_id__label}
          disabled={off || !!row.src_item_id || !!row.req_item_id}
          onChange={(v, r) => chooseProduct(i, v, r)}
        />
      );
    if (c === "pricelist_id")
      return (
        <Lookup
          master="pricelist"
          value={row.pricelist_id}
          label={row.pricelist_id__label}
          disabled={off}
          onChange={(v, r) => choosePricelist(i, v, r)}
        />
      );
    if (def.type === "ref")
      return (
        <Lookup
          master={def.ref}
          filter={def.filter || {}}
          value={row[c]}
          label={row[c + "__label"]}
          disabled={off}
          onChange={(v, r) => setItem(i, { [c]: v, [c + "__label"]: r?.label })}
        />
      );
    if (def.type === "date")
      return (
        <input
          type="date"
          value={row[c] ? String(row[c]).slice(0, 10) : ""}
          disabled={off}
          onChange={(e) => setItem(i, { [c]: e.target.value || null })}
        />
      );
    if (NUMERIC.includes(c))
      return (
        <input
          className="n"
          inputMode="decimal"
          value={row[c] ?? ""}
          disabled={off}
          onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setItem(i, { [c]: e.target.value })}
        />
      );
    return <input value={row[c] ?? ""} disabled={off} onChange={(e) => setItem(i, { [c]: e.target.value })} />;
  };

  return (
    <>
      <div className="vhead no-print">
        <Icon name={cfg.icon} size={34} style={{ color: "var(--denim-600)" }} />
        <div>
          <div className="muted">{cfg.label}</div>
          <div className="vno">{isNew ? (h.voucher_no ? h.voucher_no + " (next)" : "New") : h.voucher_no}</div>
        </div>
        {status && <span className={"htag " + status}>{status}</span>}
        <div style={{ flex: 1 }} />
        {!isNew && can(doc!, "approve") && status === "Pending" && (
          <>
            <Btn className="tape" icon="approve" busy={busy === "approve"} onClick={() => act("approve")}>
              Approve
            </Btn>
            <Btn className="ghost" busy={busy === "reject"} onClick={() => act("reject")}>
              Reject
            </Btn>
          </>
        )}
        {!isNew && can(doc!, "approve") && status === "Approved" && (
          <Btn className="ghost" busy={busy === "unapprove"} onClick={() => act("unapprove")}>
            Un-approve
          </Btn>
        )}
        {!isNew && (
          <Btn className="ghost" icon="print" onClick={() => window.print()}>
            Print
          </Btn>
        )}
        {!isNew && can(doc!, "delete") && !locked && (
          <Btn className="ghost danger-cursor" icon="trash" onClick={remove}>
            Delete
          </Btn>
        )}
        {editable && (
          <Btn icon="check" busy={busy === "save"} onClick={save}>
            Save
          </Btn>
        )}
      </div>

      {locked && (
        <div className="banner no-print">
          <Icon name="alert" size={18} />
          This voucher is {status === "Approved" ? "approved" : "in use"}, so it's read-only.{" "}
          {status === "Approved" && "Un-approve it to make changes (only possible while nothing was created from it)."}
        </div>
      )}
      {status === "Approved" && (
        <div className="muted" style={{ marginBottom: 8 }}>
          Approved by <b>{h.approver_name}</b> on {fdate(h.approved_at)}
        </div>
      )}

      <div className="card tag">
        <div className="grid">
          <label className="fld">
            <span>Transaction type *</span>
            <Lookup
              master="txn_type"
              filter={{ txn_kind: cfg.kind }}
              value={h.txn_type_id}
              label={h.txn_type_id__label}
              disabled={!isNew || !editable}
              onChange={chooseType}
            />
          </label>
          <label className="fld">
            <span>Voucher no</span>
            <input readOnly value={h.voucher_no || ""} placeholder="Assigned on save" />
          </label>
          <label className="fld">
            <span>Date *</span>
            <input
              type="date"
              value={String(h.voucher_date || "").slice(0, 10)}
              disabled={!editable}
              onChange={(e) => setHead({ voucher_date: e.target.value })}
            />
          </label>
          <label className="fld span2">
            <span>{cfg.party_label} *</span>
            <Lookup
              master="ledger"
              filter={{ ledger_type: cfg.party_types.join(",") }}
              value={h.party_id}
              label={h.party_id__label}
              disabled={!editable || (!isNew && items.some((i) => i.src_item_id))}
              invalid={!!err.party_id}
              onChange={chooseParty}
              autoFocus={isNew}
            />
          </label>
          <label className="fld">
            <span>Party A/c</span>
            <input readOnly value={h.party_account || ""} placeholder="From ledger" />
          </label>
          {(cfg.header || []).map((f: any) => (
            <label key={f.name} className={"fld" + (f.span === 2 ? " span2" : "")}>
              <span>
                {f.label}
                {f.required && " *"}
              </span>
              {f.type === "ref" ? (
                <Lookup
                  master={f.ref}
                  filter={f.filter}
                  value={h[f.name]}
                  label={h[f.name + "__label"]}
                  disabled={!editable}
                  onChange={(v, r) => setHead({ [f.name]: v, [f.name + "__label"]: r?.label })}
                />
              ) : f.type === "voucher" ? (
                <select
                  disabled={!editable}
                  className={err[f.name] ? "err" : ""}
                  value={h[f.name] || ""}
                  onChange={(e) => setHead({ [f.name]: Number(e.target.value) || null })}
                >
                  <option value="">{h.party_id ? "Select…" : "Choose the party first"}</option>
                  {h[f.name] && !refOpts.some((o) => o.id === h[f.name]) && (
                    <option value={h[f.name]}>{h[f.name + "__label"]}</option>
                  )}
                  {refOpts.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.voucher_no} · {fdate(o.voucher_date)} · {money(o.total_value)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={f.type === "date" ? "date" : "text"}
                  value={
                    h[f.name] ? String(h[f.name]).slice(f.type === "date" ? 0 : 0, f.type === "date" ? 10 : 999) : ""
                  }
                  disabled={!editable}
                  onChange={(e) => setHead({ [f.name]: e.target.value })}
                />
              )}
              {err[f.name] && <span className="hint" style={{ color: "var(--red)" }}>{err[f.name]}</span>}
            </label>
          ))}
          {src?.link && (
            <label className="fld">
              <span>{src.label} *</span>
              <input readOnly value={h[src.link + "__label"] || ""} placeholder="Pick below" className={err[src.link] ? "err" : ""} />
            </label>
          )}
        </div>
      </div>

      {src && editable && (
        <div className="section no-print">
          <div className="banner" style={{ background: "var(--denim-100)", borderColor: "var(--denim-600)" }}>
            <Icon name="clipboard" size={22} />
            <span style={{ flex: 1 }}>
              {src.required ? (
                <>
                  Lines come from <b>{src.label.toLowerCase()}</b>
                  {src.link ? " (one only)" : ""}.
                </>
              ) : (
                <>
                  You can pull lines in from <b>{src.label.toLowerCase()}</b>, or type them in.
                </>
              )}
              {picked.length > 0 && src.kind !== "requisition" && (
                <span className="muted"> {picked.length} selected.</span>
              )}
            </span>
            <Btn
              className="tape"
              icon="plus"
              disabled={src.kind !== "requisition" && !h.party_id}
              onClick={() => setPicker(true)}
            >
              {src.link ? "Choose" : "Pick"} {src.label.toLowerCase()}
            </Btn>
          </div>
        </div>
      )}

      {cfg.scan && editable && (
        <div className="section no-print">
          <div className="scanbar">
            <Icon name="scan" size={26} style={{ color: "var(--tape)" }} />
            <input
              ref={scanRef}
              autoFocus
              placeholder="Scan or type a barcode, then press Enter"
              onKeyDown={(e: any) => {
                if (e.key === "Enter" && e.target.value.trim()) {
                  scan(e.target.value.trim());
                  e.target.value = "";
                }
              }}
            />
            <span style={{ color: "var(--denim-300)", fontSize: 13 }}>
              {cfg.return_of ? "Barcodes must be on the chosen invoice" : "Fills godown, bin and order details"}
            </span>
          </div>
        </div>
      )}

      <div className="section">
        <div className="sec-head">
          <h3>
            <Icon name="shirt" size={20} />
            Items
          </h3>
          <span className="muted">{items.filter((i) => i.product_id).length} line(s)</span>
        </div>
        <div className="tbl-wrap">
          <table
            className="tbl grid-tbl"
            style={{ minWidth: colKeys.reduce((s: number, c: string) => s + (cols[c]?.width || 70), 80) }}
          >
            <thead>
              <tr>
                <th className="sl">Sl No.</th>
                {colKeys.map((c) => (
                  <th
                    key={c}
                    className={NUMERIC.concat("net_amount").includes(c) ? "num" : ""}
                    style={{ width: cols[c]?.width }}
                  >
                    {cols[c]?.label || "UOM"}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row, i) => (
                <tr key={i} className={flash === i ? "flash" : ""}>
                  <td className="sl">{i + 1}</td>
                  {colKeys.map((c) => (
                    <td key={c}>{cell(i, row, c)}</td>
                  ))}
                  <td>
                    {editable && (
                      <button
                        type="button"
                        className="icon-btn del"
                        title="Remove line"
                        onClick={() => setItems(items.filter((_, j) => j !== i))}
                      >
                        <Icon name="trash" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr>
                  <td colSpan={colKeys.length + 2} className="empty" style={{ padding: 22 }}>
                    {src?.required ? `Pick ${src.label.toLowerCase()} to bring in the lines.` : "No lines yet."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && !src?.required && !cfg.scan && (
          <button
            type="button"
            className="btn ghost sm no-print"
            style={{ marginTop: 8 }}
            onClick={() => setItems([...items, blankItem()])}
          >
            <Icon name="plus" size={16} />
            Add line
          </button>
        )}
      </div>

      <div className="section">
        <div className="sec-head">
          <h3>
            <Icon name="receipt" size={20} />
            Ledger section
          </h3>
          <span className="muted">Taxes, freight, discounts</span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl grid-tbl">
            <thead>
              <tr>
                <th className="sl">Sl No.</th>
                <th style={{ width: 240 }}>Ledger name</th>
                <th className="num" style={{ width: 110 }}>
                  Rate
                </th>
                <th style={{ width: 120 }}>Rate in</th>
                <th style={{ width: 200 }}>Rate on</th>
                <th className="num" style={{ width: 130 }}>
                  Amount
                </th>
                <th />
              </tr>
            </thead>
            <tbody>
              {ledgers.map((l, i) => (
                <tr key={i}>
                  <td className="sl">{i + 1}</td>
                  <td>
                    <Lookup
                      master="ledger"
                      value={l.ledger_id}
                      label={l.ledger_id__label}
                      disabled={!editable}
                      onChange={(v, r) =>
                        setLedgers(
                          ledgers.map((x, j) =>
                            j === i ? { ...x, ledger_id: v, ledger_id__label: r?.label, ledger_type: r?.ledger_type } : x
                          )
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      className="n"
                      inputMode="decimal"
                      disabled={!editable}
                      value={l.rate ?? ""}
                      onChange={(e) =>
                        /^-?\d*\.?\d*$/.test(e.target.value) &&
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td>
                    <select
                      disabled={!editable}
                      value={l.rate_in || "percent"}
                      onChange={(e) =>
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate_in: e.target.value } : x)))
                      }
                    >
                      {meta?.rate_in?.map((o: string) => (
                        <option key={o} value={o}>
                          {o === "percent" ? "Percent" : "Value"}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      disabled={!editable}
                      value={l.rate_on || "auto"}
                      onChange={(e) =>
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate_on: e.target.value } : x)))
                      }
                    >
                      {meta?.rate_on?.map((o: any) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="num">
                    <b>{money(totals.ledgers[i]?.amount)}</b>
                  </td>
                  <td>
                    {editable && (
                      <button type="button" className="icon-btn del" onClick={() => setLedgers(ledgers.filter((_, j) => j !== i))}>
                        <Icon name="trash" size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!ledgers.length && (
                <tr>
                  <td colSpan={7} className="muted" style={{ padding: 12 }}>
                    No extra ledger lines.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editable && (
          <div className="row no-print" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn ghost sm"
              onClick={() =>
                setLedgers([...ledgers, { rate: "", rate_in: "percent", rate_on: "total_product_value" }])
              }
            >
              <Icon name="plus" size={16} />
              Add ledger line
            </button>
            <Btn
              className="ghost sm"
              icon="receipt"
              busy={busy === "gst"}
              disabled={!h.party_id || !items.some((i) => i.product_id)}
              onClick={applyGst}
            >
              Apply GST from item rates
            </Btn>
          </div>
        )}
      </div>

      {[
        ["Payment terms", pays, setPays, cfg.payment_terms],
        ["Terms & conditions", terms, setTerms, true],
      ]
        .filter((x) => x[3])
        .map(([title, list, setList]: any) => (
          <div className="section" key={title}>
            <div className="sec-head">
              <h3>{title}</h3>
            </div>
            <div className="tbl-wrap">
              <table className="tbl grid-tbl">
                <tbody>
                  {list.map((t: any, i: number) => (
                    <tr key={i}>
                      <td className="sl">{i + 1}</td>
                      <td>
                        <input
                          value={t.description}
                          disabled={!editable}
                          onChange={(e) =>
                            setList(list.map((x: any, j: number) => (j === i ? { ...x, description: e.target.value } : x)))
                          }
                        />
                      </td>
                      <td style={{ width: 40 }}>
                        {editable && (
                          <button
                            type="button"
                            className="icon-btn del"
                            onClick={() => setList(list.filter((_: any, j: number) => j !== i))}
                          >
                            <Icon name="trash" size={18} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {!list.length && (
                    <tr>
                      <td className="muted" style={{ padding: 12 }}>
                        None.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {editable && (
              <button
                type="button"
                className="btn ghost sm no-print"
                style={{ marginTop: 8 }}
                onClick={() => setList([...list, { description: "" }])}
              >
                <Icon name="plus" size={16} />
                Add line
              </button>
            )}
          </div>
        ))}

      <div className="totals">
        <div className="t">
          <span>Total qty</span>
          <b>{fq(totals.total_qty)}</b>
        </div>
        <div className="t">
          <span>Product value</span>
          <b>{money(totals.product_value)}</b>
        </div>
        <div className="t">
          <span>Ledger adjustments</span>
          <b>{money(totals.total - totals.product_value)}</b>
        </div>
        <div className="grow" />
        <div className="t big">
          <span>Total value</span>
          <b>₹ {money(totals.total)}</b>
        </div>
      </div>

      {picker && (
        <SourcePicker
          doc={doc!}
          src={src}
          partyId={h.party_id}
          excludeId={id}
          onClose={() => setPicker(false)}
          onPick={onPick}
        />
      )}
    </>
  );
}
