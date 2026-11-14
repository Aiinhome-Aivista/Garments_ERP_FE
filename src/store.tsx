import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken, setAuthLostHandler, setToken } from "./api";
import Icon from "./components/Icons";

export interface User {
  id: number;
  username: string;
  full_name: string;
  role: string;
  permissions: Record<string, string[]>;
}

export interface AppContextType {
  user: User | null;
  meta: any;
  booting: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (u: string, e: string, f: string, p: string, r: string) => Promise<void>;
  logout: () => void;
  can: (res: string, act?: string) => boolean;
  toast: (msg: string, kind?: "ok" | "err" | "warn") => void;
  theme: string;
  setTheme: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  kind: "ok" | "err" | "warn";
}

const Ctx = createContext<AppContextType | null>(null);

export const useApp = (): AppContextType => {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return ctx;
};

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [booting, setBooting] = useState<boolean>(!!getToken());
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [theme, setTheme] = useState<string>(localStorage.getItem("loomline.theme") || "light");

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("loomline.theme", theme);
  }, [theme]);

  const toast = useCallback((msg: string, kind: "ok" | "err" | "warn" = "ok") => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" || kind === "warn" ? 5000 : 3200);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setMeta(null);
  }, []);

  useEffect(() => setAuthLostHandler(logout), [logout]);

  const load = useCallback(async () => {
    const [u, m] = await Promise.all([api<User>("/auth/me"), api("/meta")]);
    if (m?.masters?.product?.fields) {
      const pFields = m.masters.product.fields;
      if (!pFields.some((f: any) => f.name === "gst_type")) {
        const gstRateIdx = pFields.findIndex((f: any) => f.name === "gst_rate");
        const gstTypeField = {
          name: "gst_type",
          label: "GST Type",
          type: "select",
          options: ["Flat", "Slab"],
          default: "Flat",
          no_empty: true,
        };
        if (gstRateIdx !== -1) {
          m.masters.product.fields = [
            ...pFields.slice(0, gstRateIdx),
            gstTypeField,
            ...pFields.slice(gstRateIdx),
          ];
        } else {
          m.masters.product.fields = [...pFields, gstTypeField];
        }
      }
    }
    if (m?.masters?.ledger?.fields) {
      let lFields = [...m.masters.ledger.fields];
      if (!lFields.some((f: any) => f.name === "country")) {
        const cityIdx = lFields.findIndex((f: any) => f.name === "city");
        const countryField = {
          name: "country",
          label: "Country",
          type: "select",
          options: [
            "India", "Afghanistan", "Australia", "Bangladesh", "Belgium", "Bhutan", "Brazil",
            "Canada", "China", "Denmark", "Egypt", "France", "Germany", "Hong Kong",
            "Indonesia", "Ireland", "Italy", "Japan", "Kenya", "Malaysia", "Maldives",
            "Mexico", "Myanmar", "Nepal", "Netherlands", "New Zealand", "Nigeria", "Norway",
            "Oman", "Pakistan", "Philippines", "Poland", "Qatar", "Russia", "Saudi Arabia",
            "Singapore", "South Africa", "South Korea", "Spain", "Sri Lanka", "Sweden",
            "Switzerland", "Taiwan", "Thailand", "Turkey", "UAE", "United Kingdom",
            "United States", "Vietnam", "Other",
          ],
          default: "India",
          no_empty: true,
        };
        lFields = cityIdx !== -1
          ? [...lFields.slice(0, cityIdx), countryField, ...lFields.slice(cityIdx)]
          : [...lFields, countryField];
      }
      if (!lFields.some((f: any) => f.name === "gst_registration_type")) {
        const gstinIdx = lFields.findIndex((f: any) => f.name === "gstin");
        const gstRegField = {
          name: "gst_registration_type",
          label: "GST Registration Type",
          type: "select",
          options: ["Registered Dealer", "Unregistered Dealer", "Composite Dealer"],
        };
        lFields = gstinIdx !== -1
          ? [...lFields.slice(0, gstinIdx + 1), gstRegField, ...lFields.slice(gstinIdx + 1)]
          : [...lFields, gstRegField];
      }
      m.masters.ledger.fields = lFields;
    }
    if (m?.masters && !m.masters.bom) {
      m.masters.bom = {
        key: "bom",
        label: "BOM Master",
        group: "Production",
        icon: "layers",
        label_col: "bom_no",
        help: "Bill of Materials: Define components and raw materials required to manufacture a finished garment.",
        fields: [
          { name: "bom_no", label: "BOM No.", type: "readonly", default: "", list: true, unique: true },
          { name: "bom_name", label: "BOM Name", type: "text", required: true, list: true },
          { name: "product_id", label: "Components of", type: "ref", ref: "product", required: true, list: true },
          { name: "batch_qty", label: "Quantity", type: "decimal", default: 1, required: true, list: true },
          { name: "uom_id", label: "UOM", type: "ref", ref: "uom", required: true, list: true },
          { name: "remarks", label: "Remarks", type: "text" },
        ],
        children: [
          {
            key: "items",
            label: "BOM Components",
            order: "seq",
            seq_col: "seq",
            fields: [
              { name: "material_id", label: "Item", type: "ref", ref: "product", required: true },
              { name: "godown_id", label: "Godown", type: "ref", ref: "godown" },
              { name: "item_type", label: "Type of Item", type: "text" },
              { name: "qty_per_unit", label: "Quantity", type: "decimal", default: 0, required: true },
              { name: "rate", label: "Rate", type: "decimal", default: 0 },
              { name: "wastage_pct", label: "Rate (%)", type: "decimal", default: 0 },
              { name: "remarks", label: "Remarks", type: "text" },
            ],
          },
        ],
      };
    }
    setUser(u);
    setMeta(m);
  }, []);

  useEffect(() => {
    if (getToken()) {
      load()
        .catch((err) => {
          console.error("Session load error:", err);
          if (err.status !== 401) {
            toast(`Network or server error during login check: ${err.message}`, "err");
          }
        })
        .finally(() => setBooting(false));
    } else {
      setBooting(false);
    }
  }, [load, logout, toast]);

  const login = async (username: string, password: string) => {
    const r = await api<{ token: string }>("/auth/login", {
      method: "POST",
      body: { username, password },
    });
    setToken(r.token);
    await load();
  };

  const register = async (username: string, email: string, full_name: string, password: string, role: string) => {
    const r = await api<{ token: string }>("/auth/register", {
      method: "POST",
      body: { username, email, full_name, password, role },
    });
    setToken(r.token);
    await load();
  };

  const can = useCallback(
    (res: string, act = "view") => {
      const p = user?.permissions || {};
      if ("*" in p) return true;
      if ((p[res] || []).some((a) => a === "*" || a === act)) return true;
      
      // BOM Master permission fallback: allow if user has planning or product permissions, or allow view by default
      if (res === "bom") {
        if ((p["planning"] || []).some((a) => a === "*" || a === act)) return true;
        if ((p["product"] || []).some((a) => a === "*" || a === act)) return true;
        if (act === "view") return true;
      }
      
      if (meta?.txn_types && meta?.vouchers) {
        const voucherDef = meta.vouchers[res];
        if (voucherDef) {
          const matchingTxns = meta.txn_types.filter((t: any) => t.txn_kind === voucherDef.kind);
          if (matchingTxns.length > 0) {
            return matchingTxns.some((t: any) => {
              const tRes = `txn_type_${t.id}`;
              return (p[tRes] || []).some((a) => a === "*" || a === act);
            });
          }
        }
      }
      return false;
    },
    [user, meta]
  );

  const value = useMemo(
    () => ({
      user,
      meta,
      booting,
      login,
      register,
      logout,
      can,
      toast,
      theme,
      setTheme: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    }),
    [user, meta, booting, can, toast, theme, logout]
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={"toast " + (t.kind === "err" ? "err" : t.kind === "warn" ? "warn" : "")}>
            <Icon name={t.kind === "err" || t.kind === "warn" ? "alert" : "check"} size={18} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
