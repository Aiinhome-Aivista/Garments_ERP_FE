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

let sharedAudioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        sharedAudioCtx = new AudioCtxClass();
      }
    }
    if (sharedAudioCtx && sharedAudioCtx.state === "suspended") {
      sharedAudioCtx.resume().catch(() => {});
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playOscillator(a: AudioContext, ok: boolean) {
  try {
    const o = a.createOscillator();
    const g = a.createGain();
    o.frequency.value = ok ? 1480 : 280;
    o.type = ok ? "sine" : "sawtooth";
    const now = a.currentTime;
    g.gain.setValueAtTime(0.25, now);
    g.gain.exponentialRampToValueAtTime(0.005, now + (ok ? 0.12 : 0.28));
    o.connect(g);
    g.connect(a.destination);
    o.start(now);
    o.stop(now + (ok ? 0.12 : 0.28));
  } catch {
    /* ignored */
  }
}

function beep(ok = true) {
  try {
    const a = getAudioContext();
    if (!a) return;
    if (a.state === "suspended") {
      a.resume().then(() => playOscillator(a, ok)).catch(() => {});
    } else {
      playOscillator(a, ok);
    }
  } catch {
    /* audio blocked */
  }
}

interface SourcePickerProps {
  doc: string;
  src: any;
  isOutward?: boolean;
  partyId?: number | null;
  partyLabel?: string | null;
  excludeId?: string | number | null;
  existingKeys?: Set<string>;
  onClose: () => void;
  onPick: (lines: any[]) => void;
}

/* ------------------------------------------------------------- source picker (flat table format) */
function SourcePicker({ doc, src, isOutward = false, partyId, partyLabel, excludeId, existingKeys, onClose, onPick }: SourcePickerProps) {
  const { toast } = useApp();
  const [lines, setLines] = useState<any[] | null>(null);
  const [sel, setSel] = useState<Record<string, any>>({});
  const [one, setOne] = useState<any>(null);

  // Filters
  const [q, setQ] = useState("");
  const [filterOrder, setFilterOrder] = useState("");
  const [filterItem, setFilterItem] = useState("");
  const [filterParty, setFilterParty] = useState("");
  const [filterDesc, setFilterDesc] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);

  useEffect(() => {
    if (src.kind !== "requisition" && !partyId) {
      setLines([]);
      return;
    }
    api<any[]>(
      `/vouchers/${doc}/pending-source${qs({ party_id: src.kind === "requisition" ? "" : partyId, exclude: excludeId || 0 })}`
    ).then((res) => {
      const filtered = (res || [])
        .filter((l: any) => {
          if (src.kind === "requisition") return true;
          if (!partyId) return false;
          return String(l.party_id) === String(partyId);
        })
        .filter((l: any) => {
          const k = String(l.src_item_id || l.req_item_id);
          return !existingKeys || !existingKeys.has(k);
        });
      setLines(filtered);
    });
  }, [doc, partyId, excludeId, src.kind, existingKeys]);

  const key = (l: any) => String(l.src_item_id || l.req_item_id);

  const hasStockCol = useMemo(() => isOutward && (lines || []).some((l: any) => l.stock_qty !== undefined), [lines, isOutward]);
  const hasPartyCol = useMemo(
    () => src.kind === "requisition" || (lines || []).some((l: any) => l.party_name && String(l.party_id) !== String(partyId)),
    [lines, src.kind, partyId]
  );
  const hasDescCol = useMemo(() => (lines || []).some((l: any) => l.description), [lines]);
  const hasIndentCol = useMemo(() => (lines || []).some((l: any) => l.indent_no || l.ref_no || l.delivery_date), [lines]);

  // Real-time filtered lines
  const filteredLines = useMemo(() => {
    if (!lines) return [];
    return lines.filter((l) => {
      if (inStockOnly && isOutward && l.stock_qty !== undefined && Number(l.stock_qty) <= 0) return false;
      if (filterOrder && !(l.src_no || "").toLowerCase().includes(filterOrder.toLowerCase())) return false;
      if (filterItem) {
        const itemMatch =
          (l.item_name || "").toLowerCase().includes(filterItem.toLowerCase()) ||
          (l.barcode || "").toLowerCase().includes(filterItem.toLowerCase());
        if (!itemMatch) return false;
      }
      if (filterParty && !(l.party_name || "").toLowerCase().includes(filterParty.toLowerCase())) return false;
      if (filterDesc && !(l.description || "").toLowerCase().includes(filterDesc.toLowerCase())) return false;
      if (q) {
        const term = q.toLowerCase();
        const fullMatch =
          (l.src_no || "").toLowerCase().includes(term) ||
          (l.item_name || "").toLowerCase().includes(term) ||
          (l.barcode || "").toLowerCase().includes(term) ||
          (l.party_name || "").toLowerCase().includes(term) ||
          (l.description || "").toLowerCase().includes(term) ||
          (l.indent_no || "").toLowerCase().includes(term) ||
          (l.ref_no || "").toLowerCase().includes(term);
        if (!fullMatch) return false;
      }
      return true;
    });
  }, [lines, inStockOnly, isOutward, filterOrder, filterItem, filterParty, filterDesc, q]);

  const hasActiveFilters = Boolean(q || filterOrder || filterItem || filterParty || filterDesc || inStockOnly);

  const clearFilters = () => {
    setQ("");
    setFilterOrder("");
    setFilterItem("");
    setFilterParty("");
    setFilterDesc("");
    setInStockOnly(false);
  };

  const getDefaultTake = (l: any) => {
    const pend = Number(l.pending_qty) || 0;
    const maxAvail = isOutward && l.stock_qty !== undefined ? Number(l.stock_qty) : Infinity;
    return maxAvail !== Infinity ? Math.min(pend, Math.max(0, maxAvail)) : pend;
  };

  const toggleRow = (l: any, checked?: boolean) => {
    if (!src.multi) {
      setOne(one === l.src_header_id ? null : l.src_header_id);
      return;
    }
    const k = key(l);
    const shouldSelect = checked !== undefined ? checked : sel[k] === undefined;
    setSel((cur) => {
      const n = { ...cur };
      if (shouldSelect) {
        n[k] = n[k] ?? getDefaultTake(l);
      } else {
        delete n[k];
      }
      return n;
    });
  };

  const isAllFilteredSelected = filteredLines.length > 0 && filteredLines.every((l) => sel[key(l)] !== undefined);
  const isSomeFilteredSelected = filteredLines.some((l) => sel[key(l)] !== undefined);

  const toggleSelectAllFiltered = (on: boolean) => {
    setSel((cur) => {
      const n = { ...cur };
      filteredLines.forEach((l) => {
        const k = key(l);
        if (on) {
          n[k] = n[k] ?? getDefaultTake(l);
        } else {
          delete n[k];
        }
      });
      return n;
    });
  };

  // Chosen lines for export
  const chosen = useMemo(() => {
    if (!lines) return [];
    if (src.multi) {
      return lines.filter((l) => sel[key(l)] !== undefined).map((l) => ({ ...l, take: Number(sel[key(l)]) || 0 }));
    }
    return lines.filter((l) => l.src_header_id === one).map((l) => ({ ...l, take: Number(l.pending_qty) || 0 }));
  }, [lines, sel, one, src.multi]);

  const totalChosenQty = useMemo(() => {
    return chosen.reduce((acc, c) => acc + (Number(c.take) || 0), 0);
  }, [chosen]);

  const colCount = 5 + (hasPartyCol ? 1 : 0) + (hasDescCol ? 1 : 0) + (hasStockCol ? 1 : 0) + (src.multi ? 1 : 0) + (hasIndentCol ? 1 : 0);

  return (
    <div className="veil center">
      <div className="modal modal-xl">
        <div className="modal-head">
          <Icon name="clipboard" size={24} />
          <h2>Pick from {src.label.toLowerCase()}{partyLabel ? ` · ${partyLabel}` : ""}</h2>
          <button className="icon-btn" onClick={onClose} title="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">
          {lines === null ? (
            <Skeleton rows={6} />
          ) : !lines.length ? (
            <div className="banner">
              <Icon name="alert" size={18} />
              {existingKeys && existingKeys.size > 0
                ? "All pending lines from the selected documents are already added to this voucher."
                : `Nothing pending${partyLabel ? ` for "${partyLabel}"` : " for this party"}. Only approved documents with balance quantity show up here.`}
            </div>
          ) : (
            <>
              {/* Controls & Filter Bar */}
              <div className="picker-filter-bar">
                <div style={{ flex: 1, minWidth: 260, maxWidth: 400 }}>
                  <input
                    className="picker-filter-input"
                    placeholder={`Search all ${src.label.toLowerCase()} lines…`}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    style={{ width: "100%" }}
                  />
                </div>
                {hasStockCol && (
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer", userSelect: "none" }}>
                    <input
                      type="checkbox"
                      checked={inStockOnly}
                      onChange={(e) => setInStockOnly(e.target.checked)}
                    />
                    <span>In-stock only</span>
                  </label>
                )}
                {hasActiveFilters && (
                  <button
                    type="button"
                    className="btn ghost sm"
                    style={{ padding: "4px 10px", fontSize: 12 }}
                    onClick={clearFilters}
                  >
                    <Icon name="x" size={14} /> Clear filters
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <span className="muted" style={{ fontSize: 12.5 }}>
                  Showing <b>{filteredLines.length}</b> of <b>{lines.length}</b> pending line{lines.length === 1 ? "" : "s"}
                  {chosen.length > 0 && (
                    <span style={{ color: "var(--denim-800)", fontWeight: 700, marginLeft: 6 }}>
                      · {chosen.length} selected ({fq(totalChosenQty)} qty)
                    </span>
                  )}
                </span>
              </div>

              {/* Standard Flat Table */}
              <div className="tbl-wrap" style={{ maxHeight: "calc(88vh - 220px)", overflow: "auto" }}>
                <table className="tbl grid-tbl" style={{ minWidth: 960 }}>
                  <thead style={{ position: "sticky", top: 0, zIndex: 5 }}>
                    <tr>
                      <th style={{ width: 44, textAlign: "center" }}>
                        {src.multi ? (
                          <input
                            type="checkbox"
                            checked={isAllFilteredSelected}
                            ref={(el) => {
                              if (el) el.indeterminate = isSomeFilteredSelected && !isAllFilteredSelected;
                            }}
                            onChange={(e) => toggleSelectAllFiltered(e.target.checked)}
                            title="Select / deselect all filtered rows"
                          />
                        ) : (
                          <span>Select</span>
                        )}
                      </th>
                      <th style={{ width: 140 }}>{src.no_label || "Order No"}</th>
                      <th style={{ width: 105 }}>Date</th>
                      {hasPartyCol && <th style={{ width: 160 }}>Party</th>}
                      <th style={{ minWidth: 200 }}>Item Name</th>
                      {hasDescCol && <th style={{ width: 150 }}>Description</th>}
                      <th className="num" style={{ width: 105 }}>Pending Qty</th>
                      {hasStockCol && <th className="num" style={{ width: 110 }}>Godown Stock</th>}
                      {src.multi && <th className="num" style={{ width: 115 }}>Take Qty</th>}
                      <th className="num" style={{ width: 95 }}>Rate</th>
                      <th className="num" style={{ width: 85 }}>Disc</th>
                      {hasIndentCol && <th style={{ width: 130 }}>Indent / Ref</th>}
                    </tr>
                    <tr className="tbl-filter-row">
                      <th style={{ textAlign: "center" }}>
                        {hasActiveFilters && (
                          <button
                            type="button"
                            className="icon-btn"
                            style={{ width: 22, height: 22, padding: 0 }}
                            title="Clear column filters"
                            onClick={clearFilters}
                          >
                            <Icon name="x" size={12} />
                          </button>
                        )}
                      </th>
                      <th>
                        <input
                          placeholder="Filter order…"
                          value={filterOrder}
                          onChange={(e) => setFilterOrder(e.target.value)}
                        />
                      </th>
                      <th />
                      {hasPartyCol && (
                        <th>
                          <input
                            placeholder="Filter party…"
                            value={filterParty}
                            onChange={(e) => setFilterParty(e.target.value)}
                          />
                        </th>
                      )}
                      <th>
                        <input
                          placeholder="Filter item/barcode…"
                          value={filterItem}
                          onChange={(e) => setFilterItem(e.target.value)}
                        />
                      </th>
                      {hasDescCol && (
                        <th>
                          <input
                            placeholder="Filter desc…"
                            value={filterDesc}
                            onChange={(e) => setFilterDesc(e.target.value)}
                          />
                        </th>
                      )}
                      <th />
                      {hasStockCol && <th />}
                      {src.multi && <th />}
                      <th />
                      <th />
                      {hasIndentCol && <th />}
                    </tr>
                  </thead>
                  <tbody>
                    {!filteredLines.length ? (
                      <tr>
                        <td colSpan={colCount} className="empty" style={{ padding: 30, textAlign: "center" }}>
                          No pending lines match the filter criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredLines.map((l: any) => {
                        const k = key(l);
                        const isSelected = src.multi ? sel[k] !== undefined : one === l.src_header_id;
                        const isOver = isOutward && l.stock_qty !== undefined && Number(sel[k]) > Number(l.stock_qty);

                        return (
                          <tr
                            key={k}
                            className={`click ${isSelected ? "row-selected" : ""}`}
                            onClick={() => toggleRow(l)}
                          >
                            <td style={{ textAlign: "center", width: 44 }}>
                              {src.multi ? (
                                <input
                                  type="checkbox"
                                  checked={sel[k] !== undefined}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    toggleRow(l, e.target.checked);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <input
                                  type="radio"
                                  name="onePicker"
                                  checked={one === l.src_header_id}
                                  onChange={() => {}}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOne(one === l.src_header_id ? null : l.src_header_id);
                                  }}
                                />
                              )}
                            </td>
                            <td>
                              <b style={{ font: "700 13.5px var(--f-head)", color: "var(--denim-900)" }}>
                                {l.src_no}
                              </b>
                            </td>
                            <td>
                              <span className="muted">{fdate(l.src_date)}</span>
                            </td>
                            {hasPartyCol && (
                              <td>
                                {l.party_name ? (
                                  <span
                                    style={{
                                      fontSize: 11.5,
                                      fontWeight: 600,
                                      background: "var(--denim-100, #e0e7ff)",
                                      color: "var(--denim-800, #3730a3)",
                                      padding: "2px 6px",
                                      borderRadius: 4,
                                      display: "inline-block",
                                    }}
                                  >
                                    {l.party_name}
                                  </span>
                                ) : (
                                  <span className="muted">—</span>
                                )}
                              </td>
                            )}
                            <td>
                              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                                <b>{l.item_name}</b>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  {l.barcode && (
                                    <span className="muted" style={{ fontSize: 11, fontFamily: "ui-monospace,monospace" }}>
                                      {l.barcode}
                                    </span>
                                  )}
                                  {l.customer_item_name && (
                                    <span style={{ fontSize: 11, color: "var(--muted)" }}>
                                      ({l.customer_item_name})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            {hasDescCol && (
                              <td>
                                <span className="muted" style={{ fontSize: 12 }}>
                                  {l.description || "—"}
                                </span>
                              </td>
                            )}
                            <td className="num">
                              <span style={{ fontWeight: 600 }}>{fq(l.pending_qty)}</span>{" "}
                              <span className="muted" style={{ fontSize: 11 }}>{l.uom}</span>
                            </td>
                            {hasStockCol && (
                              <td className="num">
                                {Number(l.stock_qty) <= 0 ? (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      background: "rgba(220, 38, 38, 0.12)",
                                      color: "var(--red, #dc2626)",
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      fontWeight: 700,
                                    }}
                                  >
                                    0 (Out of stock)
                                  </span>
                                ) : (
                                  <span style={{ fontWeight: 600, color: "var(--moss, #16a34a)" }}>
                                    {fq(l.stock_qty)}
                                  </span>
                                )}
                              </td>
                            )}
                            {src.multi && (
                              <td style={{ width: 115 }} onClick={(e) => e.stopPropagation()}>
                                <input
                                  className={`n ${isOver ? "err" : ""}`}
                                  style={{
                                    textAlign: "right",
                                    width: "100%",
                                    borderColor: isOver ? "var(--red, #dc2626)" : undefined,
                                    backgroundColor: isOver ? "rgba(239, 68, 68, 0.08)" : undefined,
                                    color: isOver ? "var(--red, #dc2626)" : undefined,
                                    fontWeight: isOver ? 700 : undefined,
                                  }}
                                  disabled={sel[k] === undefined}
                                  value={sel[k] ?? ""}
                                  placeholder="0"
                                  onChange={(e) => {
                                    if (!/^\d*\.?\d*$/.test(e.target.value)) return;
                                    const val = e.target.value;
                                    if (isOutward && l.stock_qty !== undefined && Number(val) > Number(l.stock_qty)) {
                                      toast(
                                        `Only ${l.stock_qty} in stock for ${l.item_name}! Stock cannot be negative.`,
                                        "err"
                                      );
                                    }
                                    setSel({ ...sel, [k]: val });
                                  }}
                                />
                              </td>
                            )}
                            <td className="num">{l.rate != null && l.rate !== "" ? money(l.rate) : "—"}</td>
                            <td className="num">
                              {Number(l.disc_pct) > 0
                                ? `${l.disc_pct}%`
                                : Number(l.disc_amt) > 0
                                ? money(l.disc_amt)
                                : "—"}
                            </td>
                            {hasIndentCol && (
                              <td>
                                <span style={{ fontSize: 12, fontFamily: "ui-monospace,monospace" }}>
                                  {l.indent_no || l.ref_no || (l.delivery_date ? fdate(l.delivery_date) : "—")}
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
        <div className="modal-foot">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Btn className="ghost" onClick={onClose}>
              Cancel
            </Btn>
            {chosen.length > 0 && (
              <span className="muted" style={{ fontSize: 13 }}>
                <b>{chosen.length}</b> line{chosen.length === 1 ? "" : "s"} selected · <b>{fq(totalChosenQty)}</b> total qty
              </span>
            )}
          </div>
          <Btn
            className="tape"
            icon="check"
            disabled={!chosen.length}
            onClick={() => {
              const over = isOutward && chosen.find((c) => c.stock_qty !== undefined && Number(c.take) > Number(c.stock_qty));
              if (over) {
                toast(
                  `Line "${over.item_name}" quantity (${over.take}) exceeds available stock (${over.stock_qty})! Stock cannot be negative. Action blocked.`,
                  "err"
                );
                return;
              }
              onPick(chosen.filter((c) => Number(c.take) > 0));
            }}
          >
            Add {chosen.length || ""} line{chosen.length === 1 ? "" : "s"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export default function VoucherForm() {
  const { doc, id } = useParams<{ doc: string; id: string }>();
  const nav = useNavigate();
  const { user, meta, can, toast } = useApp();
  const cfg = meta?.vouchers?.[doc || ""];
  const cols = meta?.item_cols || {};

  const canOverrideRate = useMemo(() => {
    if (!user) return false;
    if (user.role === "Admin" || (user.permissions && "*" in user.permissions)) return true;
    if (can("override_rate") || can("rate_override")) return true;
    if (doc && (can(doc, "override_rate") || can(doc, "rate_override"))) return true;
    return false;
  }, [user, doc, can]);

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
  const [scanStatus, setScanStatus] = useState<{
    type: "idle" | "success" | "err" | "warn";
    message: string;
    details?: string;
  }>({ type: "idle", message: "" });

  const pool = useRef<any[] | null>(null);
  const scanRef = useRef<HTMLInputElement | null>(null);

  // Barcode Popup Modal State
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [scannedList, setScannedList] = useState<
    Array<{ id: string; barcode: string; item_name: string; product_id: number; lot?: any }>
  >([]);
  const [modalScanStatus, setModalScanStatus] = useState<{
    type: "idle" | "success" | "err" | "warn";
    message: string;
    details?: string;
  }>({ type: "idle", message: "" });
  const modalScanRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (barcodeModalOpen) {
      const timer = setTimeout(() => {
        if (modalScanRef.current) modalScanRef.current.focus();
      }, 120);
      return () => clearTimeout(timer);
    }
  }, [barcodeModalOpen]);

  const locked = !!rec?.locked;
  const isNew = !id;
  const src = cfg?.source;

  const blankItem = () => ({ qty: "", rate: "", disc_pct: "", disc_amt: "" });

  const base = useCallback(async () => {
    if (!doc || !cfg) return;
    setH({ txn_type_id: null, txn_type_id__label: "", voucher_no: "", voucher_date: today(), party_id: null });
    setItems(src?.required ? [] : [blankItem()]);
    setLedgers([]);
    setTerms([]);
    setPays([]);
    setRec(null);
    setPicked([]);
    setScannedList([]);
  }, [doc, cfg]); // eslint-disable-line

  const hydrate = (v: any) => {
    setRec(v);
    setH({ ...v });
    setItems(v.items.map((i: any) => ({ ...i, uom: i.uom })));
    setLedgers(v.ledgers);
    setTerms(v.terms);
    setPays(v.payments);
    setPicked([...new Set(v.items.map((i: any) => i.src_header_id).filter(Boolean))]);
    setScannedList([]);
    if (v.items) {
      v.items.forEach((it: any, idx: number) => {
        if (it.product_id) {
          api<any>(
            `/pricing/resolve?party_id=${v.party_id || ""}&product_id=${it.product_id}&date=${v.voucher_date || ""}`,
            { quiet: true }
          )
            .then((p) => {
              setItem(idx, {
                has_pricelist: !!p.has_pricelist,
                available_pricelists: p.available_pricelists || [],
              });
            })
            .catch(() => {});
        }
      });
    }
    if (cfg?.stock < 0) {
      v.items.forEach((it: any, idx: number) => {
        if (it.product_id) {
          api<{ balance: number }>(
            `/stock/balance?product_id=${it.product_id}&barcode=${it.barcode || ""}&godown_id=${it.godown_id || ""}&bin_no=${it.bin_no || ""}`,
            { quiet: true }
          )
            .then((res) => {
              const curBal = Number(res.balance ?? 0);
              const ownQty = v.approval_status === "Approved" ? Number(it.qty ?? 0) : 0;
              setItem(idx, { stock_qty: curBal + ownQty });
            })
            .catch(() => {});
        }
      });
    }
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
    if (items.length === 0 && scannedList.length > 0) {
      setScannedList([]);
      setModalScanStatus({ type: "idle", message: "" });
    }
  }, [items.length]);

  useEffect(() => {
    if (scannedList.length === 0 && modalScanStatus.type === "success") {
      setModalScanStatus({ type: "idle", message: "" });
    }
  }, [scannedList.length, modalScanStatus.type]);

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

  const setHead = (patch: any) => {
    setH((p: any) => ({ ...p, ...patch }));
    setErr((e) => {
      const next = { ...e };
      let changed = false;
      for (const k in patch) {
        if (next[k]) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : e;
    });
  };

  const setItem = (i: number, patch: any) => {
    setItems((rows) =>
      rows.map((r, j) => {
        if (j !== i) return r;
        const n = { ...r, ...patch };
        if ("disc_pct" in patch) {
          if (Number(patch.disc_pct) > 0) {
            n.disc_amt = calcItem(n).disc_amt;
          } else {
            n.disc_amt = "";
          }
        } else if ("disc_amt" in patch) {
          n.disc_pct = "";
          if (patch.disc_amt === "" || Number(patch.disc_amt) <= 0) {
            n.disc_amt = "";
          }
        } else if (Number(n.disc_pct) > 0) {
          n.disc_amt = calcItem(n).disc_amt;
        }
        const calc = calcItem(n);
        n.net_amount = calc.net_amount;
        if (Number(n.disc_pct) > 0) {
          n.disc_amt = calc.disc_amt;
        } else if (n.disc_amt === "" || Number(n.disc_amt) === 0) {
          n.disc_amt = "";
        }
        return n;
      })
    );
    setErr((e) => {
      const next = { ...e };
      let changed = false;
      for (const k in patch) {
        const fieldKey = `items.${i}.${k}`;
        if (next[fieldKey]) {
          delete next[fieldKey];
          changed = true;
        }
      }
      return changed ? next : e;
    });
  };

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
    if (src && pid !== h.party_id) {
      setItems([]);
      setPicked([]);
      setScannedList([]);
    }
    setHead(patch);
    pool.current = null;
  };

  const chooseProduct = async (i: number, pid: any, row: any) => {
    if (!pid) {
      setItem(i, {
        product_id: null,
        product_id__label: "",
        stock_qty: undefined,
        has_pricelist: false,
        available_pricelists: [],
        pricelist_id: null,
        pricelist_id__label: "",
        rate: "",
        disc_pct: "",
        disc_amt: "",
      });
      return;
    }
    setItem(i, { product_id: pid, product_id__label: row.label, uom: row.uom_id__label });
    if (cfg?.stock < 0) {
      api<{ balance: number }>(`/stock/balance?product_id=${pid}`, { quiet: true })
        .then((res) => setItem(i, { stock_qty: Number(res.balance ?? 0) }))
        .catch(() => {});
    }
    try {
      const p = await api<any>(
        `/pricing/resolve?party_id=${h?.party_id || ""}&product_id=${pid}&date=${h?.voucher_date || ""}`,
        { quiet: true }
      );
      setItems((rows) =>
        rows.map((r, j) => {
          if (j !== i) return r;
          const n = { ...r };
          n.has_pricelist = !!p.has_pricelist;
          n.available_pricelists = p.available_pricelists || [];
          if (doc !== "sales_order" && p.pricelist_id) {
            n.pricelist_id = p.pricelist_id;
            n.pricelist_id__label = p.pricelist_label;
            n.rate = p.rate !== undefined ? p.rate : "";
            n.disc_pct = p.disc_pct !== undefined ? p.disc_pct : "";
            n.disc_amt = p.disc_amt !== undefined ? p.disc_amt : "";
          } else if (doc === "sales_order" || !p.has_pricelist) {
            n.pricelist_id = null;
            n.pricelist_id__label = "";
            if (doc === "sales_order") {
              n.rate = "";
              n.disc_pct = "";
              n.disc_amt = "";
            }
          }
          if (!n.customer_item_name && p.customer_item_name) n.customer_item_name = p.customer_item_name;
          return { ...n, ...calcItem(n) };
        })
      );
    } catch {
      // offline / fallback
    }
  };

  const choosePricelist = async (i: number, plid: any, row: any) => {
    const pid = items[i]?.product_id;
    if (plid && pid) {
      setItem(i, { pricelist_id: plid, pricelist_id__label: row?.label });
      try {
        const r = await api<{ rate: any; disc_pct: any; disc_amt: any }>(
          `/pricing/pricelist-rate?pricelist_id=${plid}&product_id=${pid}&party_id=${h?.party_id || ""}&date=${h?.voucher_date || ""}`,
          { quiet: true }
        );
        setItems((rows) =>
          rows.map((cur, j) => {
            if (j !== i) return cur;
            const updated = {
              ...cur,
              pricelist_id: plid,
              pricelist_id__label: row?.label,
              rate: r.rate !== undefined ? r.rate : "",
              disc_pct: r.disc_pct !== undefined ? r.disc_pct : "",
              disc_amt: r.disc_amt !== undefined ? r.disc_amt : "",
            };
            return { ...updated, ...calcItem(updated) };
          })
        );
      } catch {
        // fallback
      }
    } else {
      setItem(i, {
        pricelist_id: plid,
        pricelist_id__label: row?.label,
        rate: "",
        disc_pct: "",
        disc_amt: ""
      });
    }
  };

  const fromLine = (l: any) => {
    const isChallan = doc === "challan";
    const ordQty = Number(l.take || l.pending_qty || 0);
    const n: any = {
      product_id: l.product_id,
      product_id__label: l.item_name,
      stock_qty: l.stock_qty !== undefined ? Number(l.stock_qty) : undefined,
      uom: l.uom,
      description: l.description,
      customer_item_name: l.customer_item_name,
      qty: isChallan ? 0 : l.take,
      order_qty: ordQty,
      pending_qty: Number(l.pending_qty || ordQty),
      scanned_count: 0,
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
    } else {
      setItems((cur) => {
        const existing = new Set(
          cur.map((i) => String(i.src_item_id || i.req_item_id || "")).filter(Boolean)
        );
        const deduplicated = mapped.filter((m) => {
          const k = String(m.src_item_id || m.req_item_id || "");
          return !k || !existing.has(k);
        });
        return [...cur.filter((r) => r.product_id), ...deduplicated];
      });
    }

    setPicked((p) => [...new Set([...p, ...lines.map((l) => l.src_header_id).filter(Boolean)])]);
    pool.current = null;
    setPicker(false);
  };

  /* ---- barcode scan ---- */
  const getPool = async () => {
    if (!pool.current && doc) {
      const all = await api<any[]>(
        `/vouchers/${doc}/pending-source${qs({ party_id: h.party_id, exclude: id || 0 })}`,
        { quiet: true }
      );
      pool.current = all.filter(
        (l) => picked.includes(l.src_header_id) && (!h.party_id || String(l.party_id) === String(h.party_id))
      );
    }
    return pool.current || [];
  };

  const bad = (m: string) => {
    beep(false);
    toast(m, "err");
    if (scanRef.current) {
      scanRef.current.value = "";
      scanRef.current.focus();
    }
  };


  const resetScansToZero = () => {
    setItems((rows) =>
      rows.map((r) => {
        if (!r.product_id) return r;
        const n = { ...r, qty: 0, scanned_count: 0 };
        return { ...n, ...calcItem(n) };
      })
    );
    toast("Scanned counts reset to 0. Ready to scan.");
    setScanStatus({ type: "idle", message: "Counts reset to 0. Ready for continuous scanning." });
    if (scanRef.current) scanRef.current.focus();
  };

  const openBarcodeModal = () => {
    getAudioContext();
    if (!h.party_id) {
      toast("Please select customer (party) first.", "warn");
      return;
    }
    const hasPickedLines = items.some((it) => it.product_id);
    if (!hasPickedLines) {
      toast("Please pick Sales Orders first before scanning barcodes.", "warn");
      return;
    }
    setModalScanStatus({ type: "idle", message: "" });
    setBarcodeModalOpen(true);
  };

  const handleModalScanKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    getAudioContext();
    const target = e.currentTarget;
    const code = target.value.trim();
    if (!code) return;
    target.value = "";

    try {
      const r: any = await api(`/stock/scan/${encodeURIComponent(code)}`, { quiet: true });
      const pr = r?.product;
      const lots = r?.lots || [];

      if (!pr) {
        const msg = `Scanned barcode "${code}" does not match any recognized item.`;
        beep(false);
        setModalScanStatus({ type: "err", message: msg });
        return;
      }

      // Check against picked Sales Orders
      const matchingItems = items.filter(
        (it) =>
          it.product_id === pr.product_id ||
          (it.barcode && (it.barcode === code || lots.some((l: any) => l.barcode === it.barcode)))
      );

      if (!matchingItems.length) {
        const msg = "Scanned item does not exist in the picked Sales Orders. Please check.";
        beep(false);
        setModalScanStatus({
          type: "err",
          message: msg,
          details: `Item "${pr.item_name}" (Barcode: ${code}) is not part of this voucher's selected Sales Orders.`,
        });
        return;
      }

      // Over-scan validation against pending sales order quantity
      const totalOrderQty = matchingItems.reduce(
        (sum, it) => sum + (Number(it.order_qty || it.pending_qty) || 0),
        0
      );
      const alreadyScannedCount = scannedList.filter((s) => s.product_id === pr.product_id).length;

      if (totalOrderQty > 0 && alreadyScannedCount >= totalOrderQty) {
        const msg = `Order quantity (${totalOrderQty}) for "${pr.item_name}" reached. Over-scanning is not allowed.`;
        beep(false);
        setModalScanStatus({
          type: "warn",
          message: msg,
          details: `Already scanned: ${alreadyScannedCount} / ${totalOrderQty}`,
        });
        return;
      }

      const lot = lots[0] || null;
      const newEntry = {
        id: Math.random().toString(36).substring(2, 9),
        barcode: lot ? lot.barcode : code,
        item_name: pr.item_name,
        product_id: pr.product_id,
        lot,
      };

      setScannedList((prev) => [...prev, newEntry]);
      beep(true);
      setModalScanStatus({
        type: "success",
        message: `✓ Scanned: ${pr.item_name} (Barcode: ${newEntry.barcode})`,
        details: totalOrderQty > 0 ? `Verified: ${alreadyScannedCount + 1} of ${totalOrderQty}` : "Item verified",
      });
    } catch {
      const msg = `Scanned barcode "${code}" was not found in the system. Please check.`;
      beep(false);
      setModalScanStatus({ type: "err", message: msg });
    } finally {
      if (modalScanRef.current) {
        modalScanRef.current.value = "";
        modalScanRef.current.focus();
      }
    }
  };

  const removeScan = (id: string) => {
    setScannedList((prev) => {
      const remaining = prev.filter((s) => s.id !== id);
      if (remaining.length === 0) {
        setModalScanStatus({ type: "idle", message: "" });
      }
      return remaining;
    });
  };

  const acceptScannedBarcodes = () => {
    if (!scannedList.length) {
      toast("No barcodes scanned yet. Please scan barcodes before accepting.", "warn");
      return;
    }

    // Count scans by product_id
    const countByProduct = new Map<number, { count: number; lot?: any; barcode?: string }>();
    for (const entry of scannedList) {
      const cur = countByProduct.get(entry.product_id) || { count: 0, lot: entry.lot, barcode: entry.barcode };
      cur.count += 1;
      if (entry.lot && !cur.lot) cur.lot = entry.lot;
      if (entry.barcode && !cur.barcode) cur.barcode = entry.barcode;
      countByProduct.set(entry.product_id, cur);
    }

    setItems((rows) => {
      const remainingMap = new Map<number, number>();
      for (const [pid, data] of countByProduct.entries()) {
        remainingMap.set(pid, data.count);
      }

      return rows.map((r) => {
        if (!r.product_id || !countByProduct.has(r.product_id)) return r;
        const data = countByProduct.get(r.product_id)!;
        const rem = remainingMap.get(r.product_id) || 0;
        const ord = Number(r.order_qty || r.pending_qty || 0);

        let takeForThisRow = rem;
        if (ord > 0 && rem > ord) {
          takeForThisRow = ord;
          remainingMap.set(r.product_id, rem - ord);
        } else {
          remainingMap.set(r.product_id, 0);
        }

        const updated = {
          ...r,
          qty: takeForThisRow,
          scanned_count: takeForThisRow,
          barcode: data.barcode || r.barcode,
          godown_id: data.lot ? data.lot.godown_id : r.godown_id,
          godown_id__label: data.lot ? data.lot.godown_label : r.godown_id__label,
          bin_no: data.lot ? (data.lot.bin_no || "") : r.bin_no,
          stock_qty: data.lot ? Number(data.lot.balance) : r.stock_qty,
        };
        return { ...updated, ...calcItem(updated) };
      });
    });

    toast(`Accepted ${scannedList.length} scans. Item quantities updated!`, "ok");
    setBarcodeModalOpen(false);
  };

  const scan = async (code: string) => {
    if (!h.party_id) {
      const msg = "Choose the customer (party) before scanning.";
      bad(msg);
      setScanStatus({ type: "err", message: msg });
      return;
    }

    if (cfg.return_of && !h.ref_voucher_id) {
      const msg = "Choose the invoice being returned first.";
      bad(msg);
      setScanStatus({ type: "err", message: msg });
      return;
    }

    // CONTINUOUS SCANNING & CROSS-CHECKING LOGIC FOR PACKING LIST (doc === "challan")
    if (doc === "challan") {
      const activeItems = items.filter((i) => i.product_id);
      if (!activeItems.length) {
        const msg = "Please pick Sales Orders first before scanning items.";
        bad(msg);
        setScanStatus({ type: "err", message: msg });
        return;
      }

      let r: any;
      try {
        r = await api(`/stock/scan/${encodeURIComponent(code)}`, { quiet: true });
      } catch {
        const msg = `Scanned barcode "${code}" was not found in the system. Please check.`;
        bad(msg);
        setScanStatus({ type: "err", message: msg });
        return;
      }

      const pr = r.product;
      const lots = r.lots || [];
      if (!pr) {
        const msg = `Scanned barcode "${code}" does not match any recognized item.`;
        bad(msg);
        setScanStatus({ type: "err", message: msg });
        return;
      }

      // Requirement 3: Cross-check against items selected via "Pick Sales Orders"
      const matchingIndices = items
        .map((it, idx) => ({ it, idx }))
        .filter(
          ({ it }) =>
            it.product_id === pr.product_id ||
            (it.barcode && (it.barcode === code || lots.some((l: any) => l.barcode === it.barcode)))
        );

      if (!matchingIndices.length) {
        const msg = "Scanned item does not exist in the picked Sales Orders. Please check.";
        bad(msg);
        setScanStatus({
          type: "err",
          message: msg,
          details: `Item "${pr.item_name}" (Barcode: ${code}) is not part of this voucher's selected Sales Orders.`,
        });
        return;
      }

      // Requirement 3: Over-scan validation
      const totalOrder = matchingIndices.reduce(
        (sum, { it }) => sum + (Number(it.order_qty || it.pending_qty) || 0),
        0
      );
      const totalScanned = matchingIndices.reduce((sum, { it }) => sum + (Number(it.qty) || 0), 0);

      // Find first line that still has pending scans to fulfill
      const target = matchingIndices.find(
        ({ it }) => (Number(it.qty) || 0) < Number(it.order_qty || it.pending_qty || Infinity)
      );

      if (!target || totalScanned >= totalOrder) {
        const msg = `Cannot scan more! Order quantity (${totalOrder}) for "${pr.item_name}" is already fulfilled. Over-scanning is not permitted.`;
        bad(msg);
        setScanStatus({
          type: "warn",
          message: msg,
          details: `Order Quantity: ${totalOrder} · Total Scanned: ${totalScanned}`,
        });
        return;
      }

      const targetIdx = target.idx;
      const targetItem = target.it;
      const lot = lots[0];
      const balance = lot ? Number(lot.balance) : 0;

      if (lot && balance <= 0) {
        const msg = `No stock available in godown for "${pr.item_name}" (Barcode ${lot.barcode}). Available: 0.`;
        bad(msg);
        setScanStatus({ type: "err", message: msg });
        return;
      }

      if (lot && (Number(targetItem.qty) || 0) + 1 > balance) {
        const msg = `Insufficient godown stock for "${pr.item_name}"! Available in stock: ${balance}.`;
        bad(msg);
        setScanStatus({ type: "err", message: msg });
        return;
      }

      // Requirement 2 & 4: Real-time Auto Quantity Count & Auto-fill
      const newQty = (Number(targetItem.qty) || 0) + 1;
      const orderQty = Number(targetItem.order_qty || targetItem.pending_qty || newQty);

      setItems((curRows) =>
        curRows.map((row, j) => {
          if (j !== targetIdx) return row;
          const updated = {
            ...row,
            qty: newQty,
            scanned_count: newQty,
            barcode: lot ? lot.barcode : row.barcode || code,
            godown_id: lot ? lot.godown_id : row.godown_id,
            godown_id__label: lot ? lot.godown_label : row.godown_id__label,
            bin_no: lot ? (lot.bin_no || "") : row.bin_no,
            stock_qty: lot ? balance : row.stock_qty,
          };
          return { ...updated, ...calcItem(updated) };
        })
      );

      beep(true);
      setFlash(targetIdx);
      setTimeout(() => setFlash(-1), 1200);

      const succMsg = `✓ Scanned: ${pr.item_name} (Barcode: ${lot?.barcode || code}) — Qty: ${newQty} of ${orderQty} verified`;
      setScanStatus({
        type: "success",
        message: succMsg,
        details: newQty >= orderQty ? "Order item complete!" : `${orderQty - newQty} items remaining to scan`,
      });

      if (scanRef.current) {
        scanRef.current.value = "";
        scanRef.current.focus();
      }
      return;
    }

    // Default scanning logic for other vouchers (e.g. returns)
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
    if (cfg.stock < 0 && Number(lot.balance) <= 0)
      return bad(`No stock available for ${pr.item_name} (Barcode ${lot.barcode}). Current stock is 0.`);
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
      stock_qty: balance,
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

    if (scanRef.current) {
      scanRef.current.value = "";
      scanRef.current.focus();
    }
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
    if (doc === "purchase_order") {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (it.product_id && it.has_pricelist && !it.pricelist_id) {
          toast(
            `Line ${i + 1}: Price list is mandatory for "${it.product_id__label || "selected item"}" as a price list is configured for it.`,
            "err"
          );
          return;
        }
      }
    }
    if (doc === "challan") {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.product_id) continue;
        const q = Number(it.qty) || 0;
        if (q <= 0) {
          toast(
            `Line ${i + 1} ("${it.product_id__label || "item"}"): Quantity must be greater than 0. Please scan or enter verified quantity before saving.`,
            "err"
          );
          return;
        }
      }
    }
    if (cfg?.stock < 0) {
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!it.product_id) continue;
        const q = Number(it.qty) || 0;
        if (it.stock_qty !== undefined && q > Number(it.stock_qty)) {
          const name = it.product_id__label || `Line ${i + 1}`;
          toast(
            `Insufficient stock for "${name}"! Quantity (${q}) exceeds available stock (${it.stock_qty}). Stock cannot be negative. Action blocked.`,
            "err"
          );
          return;
        }
      }
    }
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
      return (
        <span style={{ padding: "0 8px", fontWeight: 700, color: "var(--denim-900, #0f172a)", whiteSpace: "nowrap" }}>
          {row[c] || "—"}
        </span>
      );
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
    if (c === "pricelist_id") {
      const isMandatory = doc === "purchase_order" && !!row.has_pricelist;
      return (
        <Lookup
          master="pricelist"
          value={row.pricelist_id}
          label={row.pricelist_id__label}
          disabled={off}
          invalid={isMandatory && !row.pricelist_id}
          placeholder={isMandatory ? "Select price list *" : "Search…"}
          onChange={(v, r) => choosePricelist(i, v, r)}
        />
      );
    }
    if (def.type === "ref")
      return (
        <Lookup
          master={def.ref}
          filter={def.filter || {}}
          value={row[c]}
          label={row[c + "__label"]}
          disabled={off}
          onChange={(v, r) => {
            setItem(i, { [c]: v, [c + "__label"]: r?.label });
            if (c === "godown_id" && cfg?.stock < 0 && row.product_id) {
              api<{ balance: number }>(
                `/stock/balance?product_id=${row.product_id}&godown_id=${v || ""}&barcode=${row.barcode || ""}&bin_no=${row.bin_no || ""}`,
                { quiet: true }
              )
                .then((res) => setItem(i, { stock_qty: Number(res.balance ?? 0) }))
                .catch(() => {});
            }
          }}
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
    if (c === "qty") {
      const isOutward = (cfg?.stock || 0) < 0;
      const isOver = isOutward && row.stock_qty !== undefined && Number(row.qty) > Number(row.stock_qty);
      const isChallan = doc === "challan";
      const ordQty = Number(row.order_qty || row.pending_qty || 0);
      const isExceeded = isChallan && ordQty > 0 && Number(row.qty) > ordQty;
      const isFullyVerified = isChallan && ordQty > 0 && Number(row.qty) === ordQty;
      const hasError = isOver || isExceeded;

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <input
            className={`n ${hasError ? "err" : ""}`}
            inputMode="decimal"
            style={{
              borderColor: hasError ? "var(--red, #dc2626)" : isFullyVerified ? "var(--moss, #16a34a)" : undefined,
              backgroundColor: hasError ? "rgba(239, 68, 68, 0.08)" : isFullyVerified ? "rgba(22, 163, 74, 0.06)" : undefined,
              color: hasError ? "var(--red, #dc2626)" : isFullyVerified ? "var(--moss, #16a34a)" : undefined,
              fontWeight: hasError || isFullyVerified ? 700 : undefined,
            }}
            value={row[c] === 0 ? "0" : (row[c] ?? "")}
            placeholder="0"
            disabled={off}
            onChange={(e) => {
              if (!/^\d*\.?\d*$/.test(e.target.value)) return;
              const val = e.target.value;
              const numVal = Number(val) || 0;
              if (isOutward && row.stock_qty !== undefined && numVal > Number(row.stock_qty)) {
                toast(`Insufficient stock! Available in stock: ${row.stock_qty}. Stock cannot be negative.`, "err");
              }
              if (ordQty > 0 && numVal > ordQty) {
                toast(`Quantity (${numVal}) exceeds sales order quantity (${ordQty})!`, "warn");
              }
              setItem(i, { [c]: val, scanned_count: numVal });
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, lineHeight: 1.1 }}>
            {isChallan && ordQty > 0 ? (
              <span
                style={{
                  fontWeight: 600,
                  color: isExceeded
                    ? "var(--red, #dc2626)"
                    : isFullyVerified
                    ? "var(--moss, #16a34a)"
                    : "var(--denim-600, #4f46e5)",
                }}
              >
                {isExceeded
                  ? `⚠️ Exceeded: ${row.qty}/${ordQty}`
                  : isFullyVerified
                  ? `✓ Verified: ${row.qty}/${ordQty}`
                  : `Order: ${ordQty} (Scan: ${row.qty || 0})`}
              </span>
            ) : null}
            {isOutward && row.stock_qty !== undefined && (
              <span
                style={{
                  fontWeight: 600,
                  color: isOver ? "var(--red, #dc2626)" : "var(--moss, #16a34a)",
                  textAlign: "right",
                  marginLeft: "auto",
                }}
              >
                {isOver ? `⚠️ Max ${row.stock_qty}` : `Stock: ${row.stock_qty}`}
              </span>
            )}
          </div>
        </div>
      );
    }
    if (NUMERIC.includes(c)) {
      const isRateLocked = (c === "rate" && Boolean(row.pricelist_id)) || (["disc_pct", "disc_amt"].includes(c) && Boolean(row.pricelist_id) && !canOverrideRate);
      const isDisabled = off || isRateLocked;
      return (
        <input
          className={`n ${isRateLocked ? "readonly-locked" : ""}`}
          inputMode="decimal"
          value={row[c] === 0 ? "" : (row[c] ?? "")}
          placeholder="0"
          disabled={isDisabled}
          readOnly={isRateLocked}
          title={isRateLocked ? "Rate is auto-populated from price list and cannot be edited" : ""}
          style={isRateLocked ? { backgroundColor: "var(--denim-100, #e1e7f5)", cursor: "not-allowed", opacity: 0.9 } : undefined}
          onChange={(e) => /^\d*\.?\d*$/.test(e.target.value) && setItem(i, { [c]: e.target.value })}
        />
      );
    }
    if (c === "barcode" && doc === "challan") {
      return (
        <div
          style={{ display: "flex", alignItems: "center", gap: 4, cursor: "pointer" }}
          onClick={openBarcodeModal}
          title="Click to open Barcode Verification Popup"
        >
          <input
            value={row[c] ?? ""}
            readOnly
            placeholder="Click to scan"
            style={{ cursor: "pointer", background: "var(--paper)", width: "100%" }}
          />
          <button
            type="button"
            className="icon-btn"
            title="Open Barcode Scan Modal"
            style={{ padding: 4, color: "var(--tape)" }}
            onClick={(e) => {
              e.stopPropagation();
              openBarcodeModal();
            }}
          >
            <Icon name="scan" size={16} />
          </button>
        </div>
      );
    }
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
          {doc === "challan" ? (
            <div
              className="scan-box-wrapper"
              style={{
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                flexWrap: "wrap",
                gap: 12,
              }}
              onClick={openBarcodeModal}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <Icon name="scan" size={32} style={{ color: "var(--tape)" }} />
                <div>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: 16,
                      color: "var(--denim-950)",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    Barcode Verification Scanner
                    <span
                      style={{
                        background: "var(--denim-100)",
                        color: "var(--denim-700)",
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 4,
                      }}
                    >
                      Popup Verification
                    </span>
                  </h4>
                  <span style={{ fontSize: 13, color: "var(--muted)", marginTop: 2, display: "block" }}>
                    Click here or on any item's Barcode field to open continuous scanning popup and count quantities.
                  </span>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {scannedList.length > 0 && items.length > 0 && (
                  <span
                    style={{
                      background: "rgba(22, 163, 74, 0.15)",
                      color: "#16a34a",
                      border: "1px solid #16a34a",
                      fontSize: 12,
                      fontWeight: 600,
                      padding: "4px 10px",
                      borderRadius: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    ✓ {scannedList.length} barcode(s) scanned
                  </span>
                )}
                <Btn
                  className="tape"
                  icon="scan"
                  style={{ padding: "8px 18px", fontSize: 13, fontWeight: 700 }}
                  onClick={(e: any) => {
                    e.stopPropagation();
                    openBarcodeModal();
                  }}
                >
                  Scan Barcodes
                </Btn>
              </div>
            </div>
          ) : (
            <div className="scanbar">
              <Icon name="scan" size={26} style={{ color: "var(--tape)" }} />
              <input
                ref={scanRef}
                autoFocus
                placeholder="Scan or type a barcode, then press Enter"
                onKeyDown={(e: any) => {
                  if (e.key === "Enter" && e.target.value.trim()) {
                    getAudioContext();
                    const val = e.target.value.trim();
                    e.target.value = "";
                    scan(val);
                  }
                }}
              />
              <span style={{ color: "var(--denim-300)", fontSize: 13 }}>
                {cfg.return_of ? "Barcodes must be on the chosen invoice" : "Fills godown, bin and order details"}
              </span>
            </div>
          )}
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
                        onClick={() => {
                          const deletedItem = items[i];
                          const remaining = items.filter((_, j) => j !== i);
                          setItems(remaining);
                          if (!remaining.length) {
                            setScannedList([]);
                          } else if (deletedItem?.product_id) {
                            const stillExists = remaining.some((it) => it.product_id === deletedItem.product_id);
                            if (!stillExists) {
                              setScannedList((prev) => prev.filter((s) => s.product_id !== deletedItem.product_id));
                            }
                          }
                        }}
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
                      filter={{ ledger_type: "General,Discount" }}
                      placeholder=""
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
                      value={l.rate === 0 ? "" : (l.rate ?? "")}
                      placeholder="0"
                      onChange={(e) =>
                        /^-?\d*\.?\d*$/.test(e.target.value) &&
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate: e.target.value } : x)))
                      }
                    />
                  </td>
                  <td>
                    <select
                      disabled={!editable}
                      value={l.rate_in || ""}
                      onChange={(e) =>
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate_in: e.target.value } : x)))
                      }
                    >
                      <option value="">Select…</option>
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
                      value={l.rate_on || ""}
                      onChange={(e) =>
                        setLedgers(ledgers.map((x, j) => (j === i ? { ...x, rate_on: e.target.value } : x)))
                      }
                    >
                      <option value="">Select…</option>
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
                setLedgers([...ledgers, { ledger_id: null, ledger_id__label: "", rate: "", rate_in: "", rate_on: "" }])
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
          isOutward={(cfg?.stock || 0) < 0}
          partyId={h?.party_id}
          partyLabel={h?.party_id__label}
          excludeId={id}
          existingKeys={
            new Set(
              items
                .map((it) => String(it.src_item_id || it.req_item_id || ""))
                .filter(Boolean)
            )
          }
          onClose={() => setPicker(false)}
          onPick={onPick}
        />
      )}

      {barcodeModalOpen && (
        <div className="veil center" style={{ zIndex: 1000 }}>
          <div
            className="modal"
            style={{
              width: "min(720px, 95vw)",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div className="modal-head" style={{ borderBottom: "2px solid var(--tape)" }}>
              <Icon name="scan" size={24} style={{ color: "var(--tape)" }} />
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: 18, margin: 0 }}>Barcode Scanning Verification</h2>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Scan product barcodes. Scanned counts will be mapped to the items list on clicking ACCEPT.
                </div>
              </div>
              <button
                className="icon-btn"
                onClick={() => setBarcodeModalOpen(false)}
                title="Close"
              >
                <Icon name="x" />
              </button>
            </div>

            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
              {/* Continuous Scanner Input Field */}
              <div className="scanbar" style={{ margin: "0 0 12px 0", border: "2px solid var(--tape)" }}>
                <Icon name="scan" size={26} style={{ color: "var(--tape)" }} />
                <input
                  ref={modalScanRef}
                  autoFocus
                  placeholder="Scan or type a barcode, then press Enter"
                  onKeyDown={handleModalScanKeyDown}
                />
              </div>

              {/* Status Banner */}
              {modalScanStatus.message && (
                <div
                  className={`scan-status-pill scan-status-${modalScanStatus.type || "idle"}`}
                  style={{ marginBottom: 12 }}
                >
                  <Icon
                    name={
                      modalScanStatus.type === "success"
                        ? "check"
                        : modalScanStatus.type === "err"
                        ? "alert"
                        : "info"
                    }
                    size={16}
                  />
                  <div style={{ flex: 1 }}>
                    <div>{modalScanStatus.message}</div>
                    {modalScanStatus.details && (
                      <div style={{ fontSize: 11.5, opacity: 0.85, marginTop: 2 }}>
                        {modalScanStatus.details}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "inherit",
                      padding: 2,
                      fontWeight: "bold",
                    }}
                    onClick={() => setModalScanStatus({ type: "idle", message: "" })}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Table matching user's Excel-like screenshot */}
              <div
                style={{
                  border: "2px solid #eab308",
                  borderRadius: 6,
                  overflow: "hidden",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                }}
              >
                <table className="tbl" style={{ width: "100%", margin: 0, borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#ffff00", color: "#000", fontWeight: 700 }}>
                      <th
                        style={{
                          width: 50,
                          padding: "10px 12px",
                          background: "#ffff00",
                          color: "#000",
                          borderRight: "1px solid #d4d4d8",
                          borderBottom: "2px solid #ca8a04",
                        }}
                      >
                        Sl
                      </th>
                      <th
                        style={{
                          width: 180,
                          padding: "10px 14px",
                          background: "#ffff00",
                          color: "#000",
                          borderRight: "1px solid #d4d4d8",
                          borderBottom: "2px solid #ca8a04",
                          fontFamily: "monospace",
                          fontSize: 14,
                        }}
                      >
                        Barcode
                      </th>
                      <th
                        style={{
                          padding: "10px 14px",
                          background: "#ffff00",
                          color: "#000",
                          borderBottom: "2px solid #ca8a04",
                        }}
                      >
                        Item Name
                      </th>
                      <th
                        style={{
                          width: 60,
                          textAlign: "center",
                          padding: "10px 12px",
                          background: "#ffff00",
                          color: "#000",
                          borderBottom: "2px solid #ca8a04",
                        }}
                      >
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scannedList.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            textAlign: "center",
                            padding: "32px 16px",
                            color: "var(--muted)",
                            background: "#fffbeb",
                          }}
                        >
                          <Icon
                            name="scan"
                            size={34}
                            style={{ opacity: 0.35, display: "block", margin: "0 auto 8px" }}
                          />
                          No barcodes scanned yet. Scan or type a barcode above and press Enter.
                        </td>
                      </tr>
                    ) : (
                      scannedList.map((s, idx) => (
                        <tr
                          key={s.id}
                          style={{
                            borderBottom: "1px solid #e4e4e7",
                            background: idx % 2 === 0 ? "#ffffff" : "#fefce8",
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 12px",
                              color: "var(--muted)",
                              borderRight: "1px solid #e4e4e7",
                              fontWeight: 500,
                            }}
                          >
                            {idx + 1}
                          </td>
                          <td
                            style={{
                              padding: "8px 14px",
                              fontFamily: "monospace",
                              fontWeight: 700,
                              fontSize: 14,
                              color: "var(--denim-950)",
                              borderRight: "1px solid #e4e4e7",
                            }}
                          >
                            {s.barcode}
                          </td>
                          <td style={{ padding: "8px 14px", fontWeight: 600, color: "var(--denim-900)" }}>
                            {s.item_name}
                          </td>
                          <td style={{ padding: "8px 12px", textAlign: "center" }}>
                            <button
                              type="button"
                              className="icon-btn"
                              style={{ color: "var(--red, #dc2626)", padding: "2px 6px" }}
                              title="Remove scan"
                              onClick={() => removeScan(s.id)}
                            >
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Real-time Summary & Counter */}
              {scannedList.length > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    padding: "10px 14px",
                    background: "var(--denim-100, #f1f5f9)",
                    borderRadius: 6,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontWeight: 600,
                      color: "var(--denim-950)",
                      marginBottom: 6,
                    }}
                  >
                    <span>Total Scanned: {scannedList.length} item(s)</span>
                    <button
                      type="button"
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--red, #dc2626)",
                        cursor: "pointer",
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                      onClick={() => {
                        setScannedList([]);
                        setModalScanStatus({ type: "idle", message: "" });
                      }}
                    >
                      Clear all scans
                    </button>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "6px 12px",
                      fontSize: 12,
                      color: "var(--denim-800)",
                    }}
                  >
                    {Array.from(
                      scannedList
                        .reduce((m, item) => {
                          m.set(item.item_name, (m.get(item.item_name) || 0) + 1);
                          return m;
                        }, new Map<string, number>())
                        .entries()
                    ).map(([name, count]) => (
                      <span
                        key={name}
                        style={{
                          background: "var(--paper)",
                          padding: "3px 8px",
                          borderRadius: 4,
                          border: "1px solid var(--line)",
                        }}
                      >
                        <b>{name}</b>: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer with ACCEPT Button matching image */}
            <div
              className="modal-foot"
              style={{
                padding: "14px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--paper)",
              }}
            >
              <Btn className="ghost" onClick={() => setBarcodeModalOpen(false)}>
                Cancel
              </Btn>
              <button
                type="button"
                style={{
                  background: "#ea580c",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  padding: "10px 32px",
                  fontSize: "15px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  cursor: "pointer",
                  boxShadow: "0 2px 10px rgba(234, 88, 12, 0.4)",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
                onClick={acceptScannedBarcodes}
              >
                <Icon name="check" size={18} />
                ACCEPT
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
