// Mirrors backend vouchers.compute() so totals update live; the server recalculates on save.
const r2 = (x: number): number => Math.round((x + Number.EPSILON) * 100) / 100;
const n = (x: any): number => (x === "" || x == null || isNaN(Number(x)) ? 0 : Number(x));

export interface ItemCalcInput {
  qty?: number | string;
  rate?: number | string;
  disc_pct?: number | string;
  disc_amt?: number | string;
}

export interface ItemCalcOutput {
  disc_amt: number;
  net_amount: number;
}

export function calcItem(it: ItemCalcInput): ItemCalcOutput {
  const gross = n(it.qty) * n(it.rate);
  const pct = n(it.disc_pct);
  const da = pct > 0 ? r2((gross * pct) / 100) : r2(n(it.disc_amt));
  return { disc_amt: da, net_amount: r2(gross - da) };
}

export interface LedgerInput {
  rate?: number | string;
  rate_on?: string;
  rate_in?: string;
  ledger_type?: string;
  amount?: number;
  [key: string]: any;
}

export function calcTotals(items: ItemCalcInput[], ledgers: LedgerInput[]) {
  let tq = 0,
    pv = 0;
  items.forEach((i) => {
    tq += n(i.qty);
    pv += calcItem(i).net_amount;
  });
  const out = ledgers.map((l) => ({ ...l }));
  const amt = (l: LedgerInput, base: number): number => {
    const rate = n(l.rate);
    let a =
      l.rate_on === "auto"
        ? rate
        : l.rate_in === "value"
        ? l.rate_on === "total_qty"
          ? rate * tq
          : rate
        : (base * rate) / 100;
    a = r2(a);
    return l.ledger_type === "Discount" ? -Math.abs(a) : a;
  };
  let run = pv;
  out.forEach((l) => {
    if (l.rate_on === "net_value") return;
    const baseMap: Record<string, number> = {
      total_qty: tq,
      total_product_value: pv,
      current_subtotal: run,
    };
    const base = baseMap[l.rate_on || ""] || 0;
    l.amount = amt(l, base);
    run += l.amount;
  });
  const netv = run;
  out.forEach((l) => {
    if (l.rate_on === "net_value") {
      l.amount = amt(l, netv);
      run += l.amount;
    }
  });
  return { total_qty: tq, product_value: r2(pv), total: r2(run), ledgers: out };
}
