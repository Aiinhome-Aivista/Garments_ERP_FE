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
  toast: (msg: string, kind?: "ok" | "err") => void;
  theme: string;
  setTheme: () => void;
}

interface ToastItem {
  id: number;
  msg: string;
  kind: "ok" | "err";
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

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "err" ? 6000 : 3200);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setMeta(null);
  }, []);

  useEffect(() => setAuthLostHandler(logout), [logout]);

  const load = useCallback(async () => {
    const [u, m] = await Promise.all([api<User>("/auth/me"), api("/meta")]);
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
      return "*" in p || (p[res] || []).some((a) => a === "*" || a === act);
    },
    [user]
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
          <div key={t.id} className={"toast " + (t.kind === "err" ? "err" : "")}>
            <Icon name={t.kind === "err" ? "alert" : "check"} size={18} />
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
