// Mirrors backend vouchers.compute() so totals update live; the server recalculates on save.
const r2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;
const n = (x: any): number => (x === "" || x == null || isNaN(Number(x)) ? 0 : Number(x));

export interface GstSlabDef {
  min_price: number | string;
  max_price?: number | string | null;
  gst_rate: number | string;
}

export function resolveGstRate(
  gstType?: string,
  fixedRate?: number | string,
  slabs?: GstSlabDef[],
  taxablePrice?: number | string
): number {
  if (!gstType || gstType === "Flat") {
    return n(fixedRate);
  }
  if (gstType === "Slab" && slabs && slabs.length > 0) {
    const price = n(taxablePrice);
    for (const s of slabs) {
      const minP = n(s.min_price);
      const maxP = s.max_price != null && s.max_price !== "" && s.max_price !== "No Limit" ? n(s.max_price) : null;
      if (maxP !== null) {
        if (price >= minP && price <= maxP) {
          return n(s.gst_rate);
        }
      } else {
        if (price >= minP) {
          return n(s.gst_rate);
        }
      }
    }
  }
  return n(fixedRate);
}

export interface ItemCalcInput {
  qty?: number | string;
  rate?: number | string;
  disc_pct?: number | string;
  disc_amt?: number | string;
  gst_rate?: number | string;
  gst_type?: string;
  gst_slabs?: GstSlabDef[];
  is_manual_gst?: boolean;
}

export interface ItemCalcOutput {
  disc_amt: number;
  net_amount: number;
  gst_amount: number;
  resolved_gst_rate: number;
}

export function calcItem(it: ItemCalcInput): ItemCalcOutput {
  const gross = n(it.qty) * n(it.rate);
  const pct = n(it.disc_pct);
  const da = pct > 0 ? r2((gross * pct) / 100) : r2(n(it.disc_amt));
  const net = r2(gross - da);
  const qty = n(it.qty);
  const eff_rate = qty > 0 ? net / qty : n(it.rate);

  let gst_pct: number;
  if (it.is_manual_gst && it.gst_rate !== undefined && it.gst_rate !== "") {
    gst_pct = n(it.gst_rate);
  } else if (it.gst_type === "Slab" && it.gst_slabs && it.gst_slabs.length > 0) {
    gst_pct = resolveGstRate(it.gst_type, it.gst_rate, it.gst_slabs, eff_rate);
  } else {
    gst_pct = n(it.gst_rate);
  }

  const gst_amt = r2((net * gst_pct) / 100);
  return { disc_amt: da, net_amount: net, gst_amount: gst_amt, resolved_gst_rate: gst_pct };
}

export interface LedgerInput {
  rate?: number | string;
  rate_on?: string;
  rate_in?: string;
  gst_position?: "before_gst" | "after_gst" | string;
  ledger_type?: string;
  tax_type?: string;
  amount?: number;
  [key: string]: any;
}

export function getGstType(l: LedgerInput): "CGST" | "SGST" | "IGST" | null {
  if (l.tax_type) {
    const t = String(l.tax_type).trim().toUpperCase();
    if (t === "CGST" || t === "SGST" || t === "IGST") return t as any;
  }
  const name = String(l.ledger_id__label || l.name || "").trim().toUpperCase();
  if (name === "CGST" || name.startsWith("CGST ") || name.startsWith("CGST-") || name.startsWith("CGST@")) return "CGST";
  if (name === "SGST" || name.startsWith("SGST ") || name.startsWith("SGST-") || name.startsWith("SGST@")) return "SGST";
  if (name === "IGST" || name.startsWith("IGST ") || name.startsWith("IGST-") || name.startsWith("IGST@")) return "IGST";
  return null;
}

export function calcTotals(items: ItemCalcInput[], ledgers: LedgerInput[]) {
  let tq = 0,
    pv = 0;
  items.forEach((i) => {
    tq += n(i.qty);
    const ci = calcItem(i);
    pv += ci.net_amount;
  });
  pv = r2(pv);

  const out = ledgers.map((l) => ({ ...l }));

  const calcGeneralAmt = (l: LedgerInput, base: number): number => {
    const rate = n(l.rate);
    const rateIn = l.rate_in || "value";
    const rateOn = l.rate_on || "auto";

    let a = 0;
    if (rateOn === "auto" || !l.rate_on) {
      a = rate;
    } else if (rateIn === "value") {
      a = rateOn === "total_qty" ? rate * tq : rate;
    } else {
      // rateIn === "percent"
      a = (base * rate) / 100;
    }
    a = r2(a);
    return l.ledger_type === "Discount" ? -Math.abs(a) : a;
  };

  // 1. Calculate non-GST ledgers marked as before_gst
  let before_gst_ledger_total = 0;
  let running_before = pv;
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (gstType) return;
    const pos = l.gst_position || "after_gst";
    if (pos === "before_gst") {
      const baseMap: Record<string, number> = {
        total_qty: tq,
        total_product_value: pv,
        current_subtotal: running_before,
      };
      const base = baseMap[l.rate_on || ""] || pv;
      l.amount = calcGeneralAmt(l, base);
      running_before += l.amount;
      before_gst_ledger_total += l.amount;
    }
  });

  // 2. Compute GST on items + proportionate before_gst additions
  let total_gst = 0;
  items.forEach((it) => {
    const ci = calcItem(it);
    const item_net = ci.net_amount;
    let prop_charge = 0;
    if (pv > 0) {
      prop_charge = (item_net / pv) * before_gst_ledger_total;
    } else if (items.length > 0) {
      prop_charge = before_gst_ledger_total / items.length;
    }
    const line_taxable = item_net + prop_charge;
    const gst_pct = ci.resolved_gst_rate;
    const item_gst = r2((line_taxable * gst_pct) / 100);
    total_gst += item_gst;
  });
  total_gst = r2(total_gst);

  // 3. Populate GST ledgers
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (gstType === "CGST" || gstType === "SGST") {
      const a = r2(total_gst / 2);
      l.rate = a;
      l.amount = a;
      l.rate_in = "value";
      l.rate_on = "auto";
    } else if (gstType === "IGST") {
      const a = r2(total_gst);
      l.rate = a;
      l.amount = a;
      l.rate_in = "value";
      l.rate_on = "auto";
    }
  });

  // 4. Running total calculation across all passes
  let run = pv;
  // Pass 1: before_gst ledgers
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (!gstType && (l.gst_position || "after_gst") === "before_gst") {
      run += l.amount || 0;
    }
  });

  // Pass 2: GST ledgers
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (gstType) {
      run += l.amount || 0;
    }
  });

  // Pass 3: after_gst ledgers (except net_value)
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (gstType) return;
    if ((l.gst_position || "after_gst") !== "before_gst") {
      if (l.rate_on === "net_value") return;
      const baseMap: Record<string, number> = {
        total_qty: tq,
        total_product_value: pv,
        current_subtotal: run,
      };
      const base = baseMap[l.rate_on || ""] || pv;
      l.amount = calcGeneralAmt(l, base);
      run += l.amount;
    }
  });

  // Pass 4: net_value ledgers
  const netv = run;
  out.forEach((l) => {
    const gstType = getGstType(l);
    if (gstType) return;
    if ((l.gst_position || "after_gst") !== "before_gst" && l.rate_on === "net_value") {
      l.amount = calcGeneralAmt(l, netv);
      run += l.amount;
    }
  });

  return { total_qty: tq, product_value: r2(pv), total_gst: total_gst, total: r2(run), ledgers: out };
}
