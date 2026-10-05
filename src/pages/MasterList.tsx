import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api, qs } from "../api";
import ChildGrid from "../components/ChildGrid";
import { Field, FieldDef, showIf } from "../components/Field";
import Icon from "../components/Icons";
import Lookup from "../components/Lookup";
import Pagination from "../components/Pagination";
import { Btn, Empty, Skeleton } from "../components/Loaders";
import { useApp } from "../store";
import { OverlayPanel } from "primereact/overlaypanel";
import { ExcelFilter } from "../components/ExcelFilter";

interface MasterDef {
  key: string;
  label: string;
  icon?: string;
  help?: string;
  hierarchical?: boolean;
  fields: (FieldDef & { list?: boolean })[];
  children?: any[];
}

interface MasterFormProps {
  def: MasterDef;
  id?: number | null;
  onClose: () => void;
  onSaved: (saved: any) => void;
}

function MasterForm({ def, id, onClose, onSaved }: MasterFormProps) {
  const { toast, can } = useApp();
  const [form, setForm] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const editable = can(def.key, id ? "edit" : "create");

  useEffect(() => {
    if (id)
      api(`/masters/${def.key}/${id}`)
        .then(setForm)
        .catch((e: any) => {
          toast(e.message, "err");
          onClose();
        });
    else
      setForm({
        active: 1,
        ...Object.fromEntries(def.fields.filter((f) => "default" in f).map((f) => [f.name, f.default])),
        ...Object.fromEntries((def.children || []).map((c) => [c.key, []])),
      });
  }, [id, def.key]); // eslint-disable-line

  const save = async () => {
    setBusy(true);
    setErr({});
    try {
      const saved = await api(`/masters/${def.key}${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: form });
      toast(`${def.label.replace(/s$/, "")} saved`);
      onSaved(saved);
    } catch (e: any) {
      setErr(e.field ? { [e.field]: e.message } : {});
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this record? This can't be undone.")) return;
    try {
      await api(`/masters/${def.key}/${id}`, { method: "DELETE" });
      toast("Deleted");
      onSaved(null);
    } catch (e: any) {
      toast(e.message, "err");
    }
  };

  return (
    <div className="veil">
      <div className="drawer">
        <div className="drawer-head">
          <Icon name={def.icon || "button"} size={26} style={{ color: "var(--tape)" }} />
          <h2>
            {id ? "Edit" : "New"} · {def.label}
          </h2>
          <button className="icon-btn" style={{ color: "#fff" }} onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>
        <div className="drawer-body">
          {!form ? (
            <Skeleton />
          ) : (
            <>
              <div className="card">
                <div className="grid">
                  {def.hierarchical && (
                    <label className="fld span2">
                      <span>Parent (optional)</span>
                      <Lookup
                        master={def.key}
                        value={form.parent_id}
                        label={form.parent__label}
                        disabled={!editable}
                        placeholder="Top level"
                        onChange={(v, r) => setForm({ ...form, parent_id: v, parent__label: r?.label })}
                      />
                    </label>
                  )}
                  {def.fields.map((f) => (
                    <Field key={f.name} f={f} form={form} setForm={setForm} error={err[f.name]} disabled={!editable} />
                  ))}
                  {id && (
                    <label className="fld">
                      <span>Active</span>
                      <input
                        type="checkbox"
                        checked={!!form.active}
                        disabled={!editable}
                        onChange={(e) => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
                      />
                    </label>
                  )}
                </div>
              </div>
              {(def.children || [])
                .filter((c) => showIf(c, form))
                .map((c) => (
                  <ChildGrid
                    key={c.key}
                    def={c}
                    rows={form[c.key] || []}
                    form={form}
                    disabled={!editable}
                    onChange={(r) => setForm({ ...form, [c.key]: r })}
                  />
                ))}
            </>
          )}
        </div>
        <div className="drawer-foot">
          {id && can(def.key, "delete") && (
            <Btn className="ghost danger-cursor" icon="trash" onClick={remove} style={{ marginRight: "auto" }}>
              Delete
            </Btn>
          )}
          <Btn className="ghost" onClick={onClose}>
            Cancel
          </Btn>
          {editable && (
            <Btn className="tape" icon="check" busy={busy} onClick={save}>
              Save
            </Btn>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MasterList() {
  const { key } = useParams<{ key: string }>();
  const { meta, can } = useApp();
  const def: MasterDef | undefined = meta?.masters?.[key || ""];
  const filterPanel = useRef<OverlayPanel>(null);

  const [rows, setRows] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [filters, setFilters] = useState<Record<string, string[]>>({});
  const [activeFilterCol, setActiveFilterCol] = useState<string | null>(null);
  const [active, setActive] = useState("1");
  const [editing, setEditing] = useState<number | null | undefined>(undefined);
  const size = 10;

  const load = useCallback(
    () => {
      setLoading(true);
      const searchQs = Object.fromEntries(Object.entries(filters).filter(([k, v]) => v && v.length > 0).map(([k, v]) => ["s_" + k, Array.isArray(v) ? v.join(",") : v]));
      return api<any>(`/masters/${key}${qs({ q, active, page, page_size: size, ...searchQs })}`, { quiet: true }).then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      }).finally(() => setLoading(false));
    },
    [key, q, active, page, filters]
  );

  useEffect(() => {
    setRows(null);
    setFilters({});
    setPage(1);
    setActive("1");
    setQ("");
  }, [key]);

  useEffect(() => {
    const t = setTimeout(() => load().catch(() => setRows([])), 200);
    return () => clearTimeout(t);
  }, [load]);

  if (!def) return <Empty title="Unknown master" />;
  const cols = def.fields.filter((f) => f.list);
  const cell = (r: any, f: FieldDef) =>
    f.type === "ref" ? r[f.name + "__label"] : f.type === "bool" ? (r[f.name] ? "Yes" : "No") : r[f.name];

  return (
    <>
      <div className="page-head">
        <div className="grow">
          <h1>{def.label}</h1>
          {def.help && <p>{def.help}</p>}
        </div>
        <div className="row no-print">
          <input
            placeholder="Search here"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            style={{ width: 260 }}
          />
          <OverlayPanel ref={filterPanel}>
              {activeFilterCol && (
                <div style={{ minWidth: 200 }}>
                  {activeFilterCol === "active" ? (
                    <div style={{ padding: "8px" }}>
                      <div style={{ marginBottom: 8, fontWeight: 600, fontSize: 13, color: "var(--muted)" }}>
                        Filter Status
                      </div>
                      <select
                        style={{ width: "100%", padding: "6px", fontSize: 14 }}
                        value={active}
                        onChange={(e) => { setActive(e.target.value); setPage(1); filterPanel.current?.hide(); }}
                      >
                        <option value="1">Active</option>
                        <option value="0">Inactive</option>
                        <option value="all">All</option>
                      </select>
                    </div>
                  ) : (
                    <ExcelFilter
                      rows={rows || []}
                      column={activeFilterCol}
                      filters={filters}
                      setFilters={(f) => { setFilters(f); setPage(1); }}
                    />
                  )}
                </div>
              )}
            </OverlayPanel>
          {can(def.key, "create") && (
            <button className="btn tape" onClick={() => setEditing(null)}>
              <Icon name="plus" size={17} />
              New
            </button>
          )}
        </div>
      </div>
      <div className="tbl-wrap" style={{ position: "relative" }}>
        {loading && rows !== null && (
          <div style={{ position: "absolute", inset: 0, background: "var(--bg)", opacity: 0.6, display: "flex", justifyContent: "center", paddingTop: 60, zIndex: 10 }}>
            <i className="pi pi-spin pi-spinner" style={{ fontSize: "2rem", color: "var(--tape)" }}></i>
          </div>
        )}
        {rows === null ? (
          <Skeleton rows={8} />
        ) : !rows.length ? (
          <Empty icon={def.icon} title={q ? "Nothing matches your search" : `No ${def.label.toLowerCase()} yet`}>
            {can(def.key, "create") && !q && "Use New to add the first one."}
          </Empty>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                {def.hierarchical && (
                  <th>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Name
                      <i
                        className="pi pi-caret-down"
                        style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.name ? "var(--denim-600)" : "var(--muted)" }}
                        onClick={(e) => { setActiveFilterCol("name"); filterPanel.current?.toggle(e); }}
                      />
                    </div>
                  </th>
                )}
                {cols.map((f) =>
                  def.hierarchical && f.name === "name" ? null : (
                    <th key={f.name} className={["int", "decimal"].includes(f.type) ? "num" : ""}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: ["int", "decimal"].includes(f.type) ? "flex-end" : "flex-start" }}>
                        {f.label}
                        <i
                          className="pi pi-caret-down"
                          style={{ fontSize: "0.75rem", cursor: "pointer", color: filters[f.name] ? "var(--denim-600)" : "var(--muted)" }}
                          onClick={(e) => { setActiveFilterCol(f.name); filterPanel.current?.toggle(e); }}
                        />
                      </div>
                    </th>
                  )
                )}
                <th>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    Status
                    <i
                      className="pi pi-caret-down"
                      style={{ fontSize: "0.75rem", cursor: "pointer", color: active !== "all" ? "var(--denim-600)" : "var(--muted)" }}
                      onClick={(e) => { setActiveFilterCol("active"); filterPanel.current?.toggle(e); }}
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="click" onClick={() => setEditing(r.id)}>
                  {def.hierarchical && (
                    <td>
                      <span className="tree-name" style={{ paddingLeft: r.depth * 22 }}>
                        <Icon name={r.depth ? "shirt" : "hanger"} size={16} style={{ color: "var(--denim-300)" }} />
                        <b>{r.name}</b>
                      </span>
                    </td>
                  )}
                  {cols.map((f) =>
                    def.hierarchical && f.name === "name" ? null : (
                      <td key={f.name} className={["int", "decimal"].includes(f.type) ? "num" : ""}>
                        {cell(r, f)}
                      </td>
                    )
                  )}
                  <td>
                    <span className={"htag " + (r.active ? "Approved" : "Closed")}>{r.active ? "Active" : "Inactive"}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {!def.hierarchical && total > size && (
        <Pagination page={page} total={total} size={size} onChange={setPage} />
      )}
      {editing !== undefined && (
        <MasterForm
          def={def}
          id={editing}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}
    </>
  );
}
