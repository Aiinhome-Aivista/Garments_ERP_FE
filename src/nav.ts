export interface NavItem {
  label: string;
  to: string;
  icon?: string;
  res: string;
}

export interface NavGroup {
  title: string;
  icon: string;
  items?: NavItem[];
  subGroups?: NavGroup[];
}

// Builds the sidebar / command-palette tree from backend metadata + the user's permissions.
export function buildNav(
  meta: any,
  can: (res: string, action: string) => boolean
): NavGroup[] {
  if (!meta) return [];
  const groups: NavGroup[] = [];
  const add = (title: string, icon: string, items: NavItem[]) => {
    const it = items.filter((i) => can(i.res, "view"));
    if (it.length) groups.push({ title, icon, items: it });
  };

  const masterRankByKey: Record<string, number> = {
    generic: 1,
    product_category: 2,
    product_group: 3,
    godown: 4,
    ledger_group: 5,
    branch: 6,
    ledger_account: 7,
    process: 8,
    machine: 9,
    ledger: 10,
    txn_type: 11,
    uom: 12,
    product: 13,
    pricelist: 14,
  };

  const masterRankByLabel: Record<string, number> = {
    "generic masters": 1,
    "generic master": 1,
    "product categories": 2,
    "product category": 2,
    "product category master": 2,
    "product groups": 3,
    "product group": 3,
    "godowns / storage": 4,
    "godowns/storage": 4,
    "godown / storage": 4,
    "godown/storage": 4,
    "godown": 4,
    "godowns": 4,
    "ledger groups": 5,
    "ledger group": 5,
    "branches": 6,
    "branch": 6,
    "ledger a/c": 7,
    "ledger ac": 7,
    "ledger account": 7,
    "processes": 8,
    "process": 8,
    "machines": 9,
    "machine": 9,
    "ledgers (parties)": 10,
    "ledger (parties)": 10,
    "ledgers": 10,
    "ledger": 10,
    "transaction types": 11,
    "transaction type": 11,
    "units of measure": 12,
    "unit of measure": 12,
    "unit of measurement": 12,
    "units of measurement": 12,
    "uom": 12,
    "products": 13,
    "product": 13,
    "price lists": 14,
    "price list": 14,
  };

  const getMasterRank = (m: any): number => {
    if (m.key && masterRankByKey[m.key] !== undefined) {
      return masterRankByKey[m.key];
    }
    const labelKey = (m.label || "").toLowerCase().trim();
    if (masterRankByLabel[labelKey] !== undefined) {
      return masterRankByLabel[labelKey];
    }
    return 999;
  };

  const allMasters = Object.values(meta.masters || {})
    .filter((m: any) => !m.hidden)
    .sort((a: any, b: any) => {
      const rankA = getMasterRank(a);
      const rankB = getMasterRank(b);
      if (rankA !== rankB) return rankA - rankB;
      return (a.label || "").localeCompare(b.label || "");
    })
    .map((m: any) => ({
      label: m.label,
      to: `/masters/${m.key}`,
      icon: m.icon || "button",
      res: m.key,
    }));

  if (allMasters.length) {
    add("Masters", "hanger", allMasters);
  }

  // Transactions main heading containing the 4 sub-groups:
  // 1. Sales
  // 2. Purchase
  // 3. Production Cycle
  // 4. Accounts
  const filterItems = (items: NavItem[]) => items.filter((i) => can(i.res, "view"));
  const transactionSubGroups: NavGroup[] = [];

  // Vouchers & sub-modules by module
  const byModule: Record<string, NavItem[]> = {};
  Object.values(meta.vouchers || {}).forEach((v: any) => {
    (byModule[v.module] ||= []).push({
      label: v.plural.replace(/ \(.*\)/, ""),
      to: `/vouchers/${v.key}`,
      icon: v.icon,
      res: v.key,
    });
  });
  byModule.Sales?.push({ label: "Logistics updation", to: "/logistics", icon: "truck", res: "logistics" });

  // 1. Sales Cycle
  if (byModule.Sales) {
    const salesItems = filterItems(byModule.Sales);
    if (salesItems.length) {
      transactionSubGroups.push({ title: "Sales Cycle", icon: "receipt", items: salesItems });
    }
  }

  // 2. Procurement and purchase
  const purchaseItemsRaw = byModule.Purchase || byModule.Procurement;
  if (purchaseItemsRaw) {
    const purchaseItems = filterItems(purchaseItemsRaw);
    if (purchaseItems.length) {
      transactionSubGroups.push({ title: "Procurement and purchase", icon: "cart", items: purchaseItems });
    }
  }

  // 3. Production Cycle
  const floorItems = filterItems([
    { label: "Production planning", to: "/planning", icon: "clipboard", res: "planning" },
    { label: "Requisition for PO", to: "/requisitions", icon: "tag", res: "requisition" },
    { label: "Stock", to: "/stock", icon: "layers", res: "stock_report" },
  ]);
  if (floorItems.length) {
    transactionSubGroups.push({ title: "Production Cycle", icon: "loom", items: floorItems });
  }

  Object.entries(byModule).forEach(([m, items]) => {
    if (m !== "Sales" && m !== "Procurement" && m !== "Purchase") {
      const otherItems = filterItems(items);
      if (otherItems.length) {
        transactionSubGroups.push({ title: m, icon: "cart", items: otherItems });
      }
    }
  });

  // 4. Accounts
  const accountItems = filterItems([
    { label: "Users & Access", to: "/admin", icon: "users", res: "users" },
  ]);
  if (accountItems.length) {
    transactionSubGroups.push({ title: "Accounts", icon: "key", items: accountItems });
  }

  if (transactionSubGroups.length) {
    groups.push({
      title: "Transactions",
      icon: "transactions",
      subGroups: transactionSubGroups,
    });
  }

  return groups;
}
