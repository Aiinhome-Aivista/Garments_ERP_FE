import React, { useCallback, useEffect, useState } from "react";
import { api, fdate } from "../api";
import Icon from "../components/Icons";
import { Btn, Skeleton } from "../components/Loaders";
import Pagination from "../components/Pagination";
import { useApp } from "../store";

function Users() {
  const { toast } = useApp();
  const [users, setUsers] = useState<any[] | null>(null);
  const [roles, setRoles] = useState<any[]>([]);
  const [ed, setEd] = useState<any | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    api<any[]>("/users").then(setUsers);
    api<any[]>("/roles").then(setRoles);
  }, []);
  useEffect(load, [load]);

  const save = async () => {
    try {
      await api(`/users${ed.id ? "/" + ed.id : ""}`, { method: ed.id ? "PUT" : "POST", body: ed });
      toast("User saved");
      setEd(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this user?")) return;
    try {
      await api(`/users/${ed.id}`, { method: "DELETE" });
      toast("User deleted");
      setEd(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <Btn className="tape" icon="plus" onClick={() => setEd({ active: true, role_id: roles[0]?.id })}>
          New user
        </Btn>
      </div>
      <div className="tbl-wrap">
        {!users ? (
          <Skeleton />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Username</th>
                <th>Name</th>
                <th>Role</th>
                <th>Last sign-in</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {users.slice((page - 1) * 10, page * 10).map((u) => (
                <tr key={u.id} className="click" onClick={() => setEd({ ...u })}>
                  <td>
                    <b>{u.username}</b>
                  </td>
                  <td>{u.full_name}</td>
                  <td>{u.role}</td>
                  <td>{u.last_login ? fdate(u.last_login) : "—"}</td>
                  <td>
                    <span className={"htag " + (u.active ? "Approved" : "Closed")}>{u.active ? "Active" : "Disabled"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {users && (
        <Pagination page={page} total={users.length} size={10} onChange={setPage} itemName="users" />
      )}
      {ed && (
        <div className="veil center">
          <div className="modal" style={{ width: 520 }}>
            <div className="modal-head">
              <h2>{ed.id ? "Edit user" : "New user"}</h2>
              <button className="icon-btn" onClick={() => setEd(null)}>
                <Icon name="x" />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
                <label className="fld">
                  <span>Username</span>
                  <input value={ed.username || ""} onChange={(e) => setEd({ ...ed, username: e.target.value })} />
                </label>
                <label className="fld">
                  <span>Full name</span>
                  <input value={ed.full_name || ""} onChange={(e) => setEd({ ...ed, full_name: e.target.value })} />
                </label>
                <label className="fld">
                  <span>Role</span>
                  <select value={ed.role_id || ""} onChange={(e) => setEd({ ...ed, role_id: Number(e.target.value) })}>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="fld">
                  <span>{ed.id ? "New password (leave blank to keep)" : "Password (min 8 characters)"}</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={ed.password || ""}
                    onChange={(e) => setEd({ ...ed, password: e.target.value })}
                  />
                </label>
                <label className="row">
                  <input type="checkbox" checked={!!ed.active} onChange={(e) => setEd({ ...ed, active: e.target.checked })} />
                  Active
                </label>
              </div>
            </div>
            <div className="modal-foot">
              {ed.id && (
                <Btn className="danger ghost" icon="trash" onClick={remove}>
                  Delete
                </Btn>
              )}
              <div style={{ flex: 1 }} />
              <Btn className="ghost" onClick={() => setEd(null)}>
                Cancel
              </Btn>
              <Btn className="tape" icon="check" onClick={save}>
                Save user
              </Btn>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Roles() {
  const { toast, meta } = useApp();
  const [roles, setRoles] = useState<any[] | null>(null);
  const [ed, setEd] = useState<any | null>(null);

  const load = useCallback(() => api<any[]>("/roles").then(setRoles), []);
  useEffect(() => {
    load();
  }, [load]);

  const groups: [string, [string, string][]][] = [
    ["Sales & procurement documents", Object.values(meta.vouchers).map((v: any) => [v.key, v.label])],
    [
      "Floor",
      [
        ["planning", "Production planning"],
        ["requisition", "Requisition for PO"],
        ["logistics", "Logistics updation"],
        ["stock_report", "Stock report"],
      ],
    ],
    ["Masters", Object.values(meta.masters).filter((m: any) => !m.hidden).map((m: any) => [m.key, m.label])],
    ["Admin", [["users", "Users, roles & API keys"]]],
  ];

  const has = (k: string, a: string) => ed?.permissions?.["*"] || (ed?.permissions?.[k] || []).includes(a);

  const flip = (k: string, a: string) => {
    const p = { ...(ed.permissions || {}) };
    if (p["*"]) return;
    const s = new Set<string>(p[k] || []);
    if (s.has(a)) s.delete(a);
    else s.add(a);
    p[k] = [...s];
    setEd({ ...ed, permissions: p });
  };

  const save = async () => {
    try {
      await api(`/roles${ed.id ? "/" + ed.id : ""}`, { method: ed.id ? "PUT" : "POST", body: ed });
      toast("Role saved");
      setEd(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  const remove = async () => {
    if (!confirm("Delete this role?")) return;
    try {
      await api(`/roles/${ed.id}`, { method: "DELETE" });
      toast("Role deleted");
      setEd(null);
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <>
      <div className="row" style={{ marginBottom: 10 }}>
        <Btn className="tape" icon="plus" onClick={() => setEd({ name: "", permissions: {} })}>
          New role
        </Btn>
      </div>
      <div className="chips">
        {(roles || []).map((r) => (
          <button key={r.id} className="chip" onClick={() => setEd(JSON.parse(JSON.stringify(r)))}>
            {r.name}
          </button>
        ))}
      </div>
      {ed && (
        <div className="card section">
          <label className="fld" style={{ maxWidth: 320 }}>
            <span>Role name</span>
            <input value={ed.name} onChange={(e) => setEd({ ...ed, name: e.target.value })} />
          </label>
          {ed.permissions["*"] ? (
            <p className="banner" style={{ marginTop: 12 }}>
              This role has full access to everything.
            </p>
          ) : (
            <div className="perm-grid" style={{ marginTop: 12 }}>
              <div />
              <>{meta.actions.map((a: string) => <div key={a} className="h">{a}</div>)}</>
              {groups.map(([g, items]) => (
                <React.Fragment key={g}>
                  <div className="grp">{g}</div>
                  {items.map(([k, l]) => (
                    <React.Fragment key={k}>
                      <div>{l}</div>
                      {meta.actions.map((a: string) => (
                        <div key={k + a} style={{ textAlign: "center" }}>
                          <input type="checkbox" checked={!!has(k, a)} onChange={() => flip(k, a)} />
                        </div>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="row" style={{ marginTop: 14 }}>
            {ed.id && (
              <Btn className="danger ghost" icon="trash" onClick={remove}>
                Delete
              </Btn>
            )}
            <div style={{ flex: 1 }} />
            <Btn className="tape" icon="check" onClick={save}>
              Save role
            </Btn>
            <Btn className="ghost" onClick={() => setEd(null)}>
              Close
            </Btn>
          </div>
        </div>
      )}
    </>
  );
}

function Keys() {
  const { toast } = useApp();
  const [rows, setRows] = useState<any[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const load = useCallback(() => api<any[]>("/api-clients").then(setRows), []);
  useEffect(() => {
    load();
  }, [load]);

  const create = async () => {
    try {
      const r = await api<{ key: string }>("/api-clients", { method: "POST", body: { name } });
      setFresh(r.key);
      setName("");
      load();
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <>
      <p className="muted" style={{ maxWidth: "70ch" }}>
        External systems send sales orders and packing lists with the header <code>X-API-Key</code> to{" "}
        <code>/api/integrations/sales-orders</code> and <code>/api/integrations/packing-lists</code>. They land as pending
        approval.
      </p>
      <div className="row" style={{ margin: "12px 0" }}>
        <input
          style={{ maxWidth: 280 }}
          placeholder="Integration name (e.g. Shopify bridge)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Btn className="tape" icon="key" disabled={!name.trim()} onClick={create}>
          Create key
        </Btn>
      </div>
      {fresh && (
        <div className="banner">
          <Icon name="key" size={18} />
          <span>
            Copy this key now — it will not be shown again:{" "}
            <b style={{ fontFamily: "ui-monospace,monospace", userSelect: "all" }}>{fresh}</b>
          </span>
        </div>
      )}
      <div className="tbl-wrap">
        {!rows ? (
          <Skeleton />
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Name</th>
                <th>Key starts with</th>
                <th>Created</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice((page - 1) * 10, page * 10).map((r) => (
                <tr key={r.id}>
                  <td>
                    <b>{r.name}</b>
                  </td>
                  <td style={{ fontFamily: "ui-monospace,monospace" }}>{r.key_prefix}…</td>
                  <td>{fdate(r.created_at)}</td>
                  <td>
                    <button
                      className="btn ghost sm"
                      onClick={async () => {
                        await api(`/api-clients/${r.id}/toggle`, { method: "PUT" });
                        load();
                      }}
                    >
                      {r.active ? "Disable" : "Enable"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {rows && (
        <Pagination page={page} total={rows.length} size={10} onChange={setPage} itemName="keys" />
      )}
    </>
  );
}

function Password() {
  const { toast } = useApp();
  const [f, setF] = useState({ old_password: "", new_password: "" });

  const go = async () => {
    try {
      await api("/auth/change-password", { method: "POST", body: f });
      toast("Password changed");
      setF({ old_password: "", new_password: "" });
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <div className="card" style={{ maxWidth: 380 }}>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        <label className="fld">
          <span>Current password</span>
          <input type="password" value={f.old_password} onChange={(e) => setF({ ...f, old_password: e.target.value })} />
        </label>
        <label className="fld">
          <span>New password (min 8 characters)</span>
          <input type="password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} />
        </label>
      </div>
      <Btn className="tape" icon="check" onClick={go} style={{ marginTop: 14 }}>
        Change password
      </Btn>
    </div>
  );
}

export default function Admin() {
  const { can } = useApp();
  const [tab, setTab] = useState(can("users", "view") ? "users" : "pw");
  const tabs = (
    [
      ["users", "Users"],
      ["roles", "Roles & access"],
      ["keys", "API keys"],
    ] as [string, string][]
  )
    .filter(() => can("users", "view"))
    .concat([["pw", "My password"]]);

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>Users & access</h1>
        </div>
      </div>
      <div className="tabs">
        {tabs.map(([k, l]) => (
          <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {tab === "users" && <Users />}
      {tab === "roles" && <Roles />}
      {tab === "keys" && <Keys />}
      {tab === "pw" && <Password />}
    </>
  );
}
