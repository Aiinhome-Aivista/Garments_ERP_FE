import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  readOnly?: boolean;
  onClose: () => void;
  onSaved: (saved: any) => void;
}

function MasterForm({ def, id, readOnly = false, onClose, onSaved }: MasterFormProps) {
  const { toast, can } = useApp();
  const [form, setForm] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const editable = !readOnly && can(def.key, id ? "edit" : "create");

  useEffect(() => {
    if (id)
      api(`/masters/${def.key}/${id}`)
        .then((data: any) => {
          const altList = data.alternate_uoms || data.units || [];
          setForm({
            ...Object.fromEntries(def.fields.filter((f) => "default" in f).map((f) => [f.name, f.default])),
            ...data,
            alternate_uoms: altList,
            units: altList,
          });
        })
        .catch((e: any) => {
          toast(e.message, "err");
          onClose();
        });
    else {
      setForm({
        active: 1,
        ...Object.fromEntries(def.fields.filter((f) => "default" in f).map((f) => [f.name, f.default])),
        ...Object.fromEntries(
          (def.children || []).map((c) => [
            c.key,
            def.key === "bom" && c.key === "items"
              ? [Object.fromEntries(c.fields.filter((f: any) => "default" in f).map((f: any) => [f.name, f.default]))]
              : [],
          ])
        ),
      });
      if (def.key === "bom") {
        api<{ next_no: string }>("/masters/bom/next-no", { quiet: true })
          .then((res) => {
            if (res?.next_no) {
              setForm((prev: any) => ({ ...prev, bom_no: res.next_no }));
            }
          })
          .catch(() => {});
      }
    }
  }, [id, def.key]); // eslint-disable-line

  useEffect(() => {
    if (!form) return;
    const uniqueFields = def.fields.filter(f => (f.unique && f.type !== "readonly") || (def.key === "product" && f.name === "item_name"));
    if (uniqueFields.length === 0) return;

    const getDuplicateMsg = (f: any, val: any) => {
      if (def.key === "product" && f.name === "item_name") {
        return `The variant "${val}" already exists for the product "${form.name}".`;
      }
      return `This ${f.label.toLowerCase()} already exists.`;
    };

    const timeout = setTimeout(() => {
      uniqueFields.forEach(async (f) => {
        const val = form[f.name];
        if (!val) return;
        try {
          const r = await api<any>(`/masters/${def.key}?f_${f.name}=${encodeURIComponent(val)}&active=all`, { quiet: true });
          const exists = r.rows?.find((row: any) => row.id !== id);
          if (exists) {
            setErr((e) => ({ ...e, [f.name]: getDuplicateMsg(f, val) }));
          } else {
            setErr((e) => {
              if (e[f.name]?.includes("already exists")) {
                const n = { ...e };
                delete n[f.name];
                return n;
              }
              return e;
            });
          }
        } catch (e) {
          // ignore
        }
      });
    }, 500);
    return () => clearTimeout(timeout);
  }, [form, def.fields, def.key, id]); // eslint-disable-line

  const save = async () => {
    // Check for duplicates instantly before submitting to prevent race conditions with debounce
    const uniqueFields = def.fields.filter(f => (f.unique && f.type !== "readonly") || (def.key === "product" && f.name === "item_name"));
    let hasDuplicate = false;
    const newErr: Record<string, string> = { ...err };

    const getDuplicateMsg = (f: any, val: any) => {
      if (def.key === "product" && f.name === "item_name") {
        return `The variant "${val}" already exists for the product "${form.name}".`;
      }
      return `This ${f.label.toLowerCase()} already exists.`;
    };

    for (const f of uniqueFields) {
      const val = form[f.name];
      if (val) {
        try {
          const r = await api<any>(`/masters/${def.key}?f_${f.name}=${encodeURIComponent(val)}&active=all`, { quiet: true });
          if (r.rows?.find((row: any) => row.id !== id)) {
            newErr[f.name] = getDuplicateMsg(f, val);
            hasDuplicate = true;
          }
        } catch (e) { }
      }
    }

    if (hasDuplicate) {
      setErr(newErr);
      toast("Please fix the duplicate errors before saving.", "err");
      return;
    }

    // Validate required fields
    const reqErrors: Record<string, string> = {};
    for (const f of def.fields) {
      if (f.required && (form[f.name] === undefined || form[f.name] === null || String(form[f.name]).trim() === "")) {
        reqErrors[f.name] = `${f.label} is required`;
      }
    }
    if (Object.keys(reqErrors).length > 0) {
      setErr(reqErrors);
      toast("Please fill all required fields.", "err");
      return;
    }

    // Validation for Product GST Configuration
    if (def.key === "product") {
      const gstType = form.gst_type || "Flat";
      if (gstType === "Flat") {
        if (form.gst_rate === undefined || form.gst_rate === null || form.gst_rate === "" || isNaN(Number(form.gst_rate)) || Number(form.gst_rate) < 0) {
          setErr({ gst_rate: "Valid GST Percentage is required for Flat Rate" });
          toast("Please enter a valid GST Percentage for Flat Rate.", "err");
          return;
        }
      } else if (gstType === "Slab") {
        const slabs = form.gst_slabs || [];
        if (!slabs.length) {
          toast("Please add at least one GST slab when GST Type is Slab Rate.", "err");
          return;
        }
        for (let i = 0; i < slabs.length; i++) {
          const s = slabs[i];
          const minP = Number(s.min_price);
          if (s.min_price === "" || s.min_price === null || isNaN(minP) || minP < 0) {
            toast(`Slab row ${i + 1}: Minimum amount must be a valid number >= 0.`, "err");
            return;
          }
          if (s.max_price !== "" && s.max_price !== null && s.max_price !== undefined) {
            const maxP = Number(s.max_price);
            if (isNaN(maxP) || maxP < minP) {
              toast(`Slab row ${i + 1}: Maximum amount must be greater than or equal to minimum amount (${minP}).`, "err");
              return;
            }
          }
          const gr = Number(s.gst_rate);
          if (s.gst_rate === "" || s.gst_rate === null || isNaN(gr) || gr < 0) {
            toast(`Slab row ${i + 1}: GST percentage must be a valid number >= 0.`, "err");
            return;
          }
        }
        // Check for overlaps
        const sorted = [...slabs].sort((a, b) => Number(a.min_price) - Number(b.min_price));
        for (let i = 0; i < sorted.length - 1; i++) {
          const curMax = sorted[i].max_price;
          const nextMin = Number(sorted[i + 1].min_price);
          if (curMax === "" || curMax === null || curMax === undefined) {
            toast(`Slab starting at ₹${sorted[i].min_price} is open-ended. Remove subsequent slabs.`, "err");
            return;
          }
          if (Number(curMax) >= nextMin) {
            toast(`Overlapping price ranges: slab up to ₹${curMax} overlaps with next slab starting at ₹${nextMin}.`, "err");
            return;
          }
        }
      }
    }

    setBusy(true);
    setErr({});
    try {
      const payload = { ...form };
      if (def.key === "product") {
        const alt = form.alternate_uoms || form.units || [];
        payload.alternate_uoms = alt;
        payload.units = alt;
      }
      const saved = await api(`/masters/${def.key}${id ? "/" + id : ""}`, { method: id ? "PUT" : "POST", body: payload });
      toast(`${def.label.replace(/s$/, "")} saved`);
      onSaved(saved);
    } catch (e: any) {
      setErr(e.field ? { [e.field]: e.message } : {});
      toast(e.message, "err");
    } finally {
      setBusy(false);
    }
  };



  return (
    <div className="veil">
      <div className="drawer">
        <div className="drawer-head">
          <Icon name={def.icon || "button"} size={26} style={{ color: "var(--tape)" }} />
          <h2>
            {readOnly ? "View" : id ? "Edit" : "New"} · {def.label}
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
                  {def.fields.map((f) => (
                    <Field key={f.name} f={f} form={form} setForm={setForm} error={err[f.name]} disabled={!editable} clearError={() => {
                      if (err[f.name]) {
                        setErr((e) => {
                          const n = { ...e };
                          delete n[f.name];
                          return n;
                        });
                      }
                    }} />
                  ))}
                  {def.hierarchical && (
                    <label className="fld">
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
          <Btn className="ghost" onClick={onClose}>
            {editable ? "Cancel" : "Close"}
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
  const { meta, can, toast } = useApp();
  const rawDef: MasterDef | undefined = meta?.masters?.[key || ""];
  const def = useMemo(() => {
    if (!rawDef) return undefined;
    if (rawDef.key === "product") {
      let fields = [...rawDef.fields];
      if (!fields.some((f) => f.name === "gst_type")) {
        const gstRateIdx = fields.findIndex((f) => f.name === "gst_rate");
        const gstTypeField: FieldDef & { list?: boolean } = {
          name: "gst_type",
          label: "GST Type",
          type: "select",
          options: ["Flat", "Slab"],
          default: "Flat",
          no_empty: true,
        };
        fields =
          gstRateIdx !== -1
            ? [...fields.slice(0, gstRateIdx), gstTypeField, ...fields.slice(gstRateIdx)]
            : [...fields, gstTypeField];
      }
      fields = fields.map((f) => {
        if (f.name === "gst_rate") {
          return { ...f, show_if: { gst_type: ["Flat"] } };
        }
        return f;
      });
      return { ...rawDef, fields };
    }
    if (rawDef.key === "ledger") {
      let fields = [...rawDef.fields];
      if (!fields.some((f) => f.name === "country")) {
        const cityIdx = fields.findIndex((f) => f.name === "city");
        const countryField: FieldDef & { list?: boolean } = {
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
        fields = cityIdx !== -1
          ? [...fields.slice(0, cityIdx), countryField, ...fields.slice(cityIdx)]
          : [...fields, countryField];
      }
      if (!fields.some((f) => f.name === "gst_registration_type")) {
        const gstinIdx = fields.findIndex((f) => f.name === "gstin");
        const gstRegField: FieldDef & { list?: boolean } = {
          name: "gst_registration_type",
          label: "GST Registration Type",
          type: "select",
          options: ["Registered Dealer", "Unregistered Dealer", "Composite Dealer"],
        };
        fields = gstinIdx !== -1
          ? [...fields.slice(0, gstinIdx + 1), gstRegField, ...fields.slice(gstinIdx + 1)]
          : [...fields, gstRegField];
      }
      return { ...rawDef, fields };
    }
    if (rawDef.key === "bom") {
      const fields = rawDef.fields
        .filter((f) => f.name !== "version")
        .map((f) => {
          if (f.name === "bom_no") return { ...f, label: "BOM No.", type: "readonly", default: "" };
          if (f.name === "bom_name") return { ...f, label: "BOM Name", required: true };
          if (f.name === "product_id") return { ...f, label: "Components of" };
          if (f.name === "batch_qty") return { ...f, label: "Quantity" };
          if (f.name === "uom_id") return { ...f, label: "UOM" };
          return f;
        });
      const children = (rawDef.children || []).map((c: any) => {
        if (c.key === "items") {
          return {
            ...c,
            fields: c.fields
              .filter((cf: any) => cf.name !== "remarks" && cf.name !== "uom_id")
              .map((cf: any) => {
                if (cf.name === "material_id") return { ...cf, label: "Item" };
                if (cf.name === "godown_id") return { ...cf, label: "Godown" };
                if (cf.name === "item_type") return { ...cf, label: "Type of Item" };
                if (cf.name === "qty_per_unit") return { ...cf, label: "Quantity" };
                if (cf.name === "rate") return { ...cf, label: "Rate" };
                if (cf.name === "wastage_pct") return { ...cf, label: "Rate (%)" };
                return cf;
              }),
          };
        }
        return c;
      });
      return { ...rawDef, fields, children };
    }
    return rawDef;
  }, [rawDef]);
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
  const [isReadOnly, setIsReadOnly] = useState(false);
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

  const remove = async (e: React.MouseEvent, rId: number) => {
    e.stopPropagation();
    try {
      await api(`/masters/${key}/${rId}`, { method: "DELETE" });
      toast("Deleted");
      load();
    } catch (err: any) {
      toast(err.message, "err");
    }
  };

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
            <button className="btn tape" onClick={() => { setIsReadOnly(false); setEditing(null); }}>
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
                {def.hierarchical && (
                  <th>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      Parent
                      <i
                        className="pi pi-caret-down"
                        style={{ fontSize: "0.75rem", cursor: "pointer", color: filters.parent__label ? "var(--denim-600)" : "var(--muted)" }}
                        onClick={(e) => { setActiveFilterCol("parent__label"); filterPanel.current?.toggle(e); }}
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
                <th style={{ width: 80, textAlign: "center" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.id}
                  className="click"
                  onClick={() => {
                    setIsReadOnly(!can(def.key, "edit"));
                    setEditing(r.id);
                  }}
                >
                  {def.hierarchical && (
                    <td>
                      <span className="tree-name" style={{ paddingLeft: r.depth * 22 }}>
                        <Icon name={r.depth ? "shirt" : "hanger"} size={16} style={{ color: "var(--denim-300)" }} />
                        <b>{r.name}</b>
                      </span>
                    </td>
                  )}
                  {def.hierarchical && (
                    <td>
                      <span className="muted">{r.parent__label || "—"}</span>
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
                    <td onClick={(e) => e.stopPropagation()} style={{ width: 80, textAlign: "center", whiteSpace: "nowrap" }}>
                      <div style={{ display: "inline-flex", gap: 4, alignItems: "center", justifyContent: "center" }}>
                        {can(def.key, "edit") && (
                          <button
                            type="button"
                            className="icon-btn"
                            title="Edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsReadOnly(false);
                              setEditing(r.id);
                            }}
                          >
                            <Icon name="edit" size={17} />
                          </button>
                        )}
                        {can(def.key, "delete") && (
                          <button
                            type="button"
                            className="icon-btn del"
                            title="Delete"
                            onClick={(e) => remove(e, r.id)}
                          >
                            <Icon name="trash" size={17} />
                          </button>
                        )}
                      </div>
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
          readOnly={isReadOnly}
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
