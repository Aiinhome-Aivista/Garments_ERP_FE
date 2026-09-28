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
  (meta.master_groups || []).forEach((g: string) =>
    add(
      g === "Basics" ? "Masters · Basics" : `Masters · ${g}`,
      "hanger",
      Object.values(meta.masters || {})
        .filter((m: any) => m.group === g && !m.hidden)
        .map((m: any) => ({
          label: m.label,
          to: `/masters/${m.key}`,
          icon: m.icon || "button",
          res: m.key,
        }))
    )
  );
  add("Admin", "key", [{ label: "Users & access", to: "/admin", icon: "users", res: "users" }]);
  return groups;
}
