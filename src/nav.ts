export interface NavItem {
  label: string;
  to: string;
  icon?: string;
  res: string;
}

export interface NavGroup {
  title: string;
  icon: string;
  items: NavItem[];
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

  const desiredOrder = [
    "Generic masters",
    "Product categories",
    "Product groups",
    "Godowns / storage",
    "Ledger groups",
    "Branches",
    "Ledger A/c",
    "Processes",
    "Machines",
    "Ledgers (parties)",
    "Transaction types",
    "Units of measure",
    "Products",
    "Price lists"
  ];

  const allMasters = Object.values(meta.masters || {})
    .filter((m: any) => !m.hidden)
    .sort((a: any, b: any) => {
      const idxA = desiredOrder.indexOf(a.label);
      const idxB = desiredOrder.indexOf(b.label);
      if (idxA === -1 && idxB === -1) return a.label.localeCompare(b.label);
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
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

  add("Floor", "loom", [
    { label: "Production planning", to: "/planning", icon: "clipboard", res: "planning" },
    { label: "Requisition for PO", to: "/requisitions", icon: "tag", res: "requisition" },
    { label: "Stock", to: "/stock", icon: "layers", res: "stock_report" },
  ]);
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
  Object.entries(byModule).forEach(([m, items]) =>
    add(m, m === "Sales" ? "receipt" : "cart", items)
  );
  add("Admin", "key", [{ label: "Users & Access", to: "/admin", icon: "users", res: "users" }]);
  return groups;
}
