import React, { useEffect, useState } from "react";
import { api } from "../api";
import Lookup from "./Lookup";
import { useApp } from "../store";

export interface FieldDef {
  name: string;
  label: string;
  type: string;
  ref?: string;
  options?: string[];
  required?: boolean;
  help?: string;
  default?: any;
  show_if?: Record<string, any[]>;
  filter?: Record<string, any>;
  depends?: string;
  unique?: boolean;
}

export const showIf = (f: FieldDef, form: Record<string, any>): boolean =>
  !f.show_if || Object.entries(f.show_if).every(([k, vals]) => vals.includes(form[k]));

export interface InputProps {
  f: FieldDef;
  value: any;
  label?: string;
  onChange: (val: any, row?: any) => void;
  form?: Record<string, any>;
  compact?: boolean;
  invalid?: boolean;
  disabled?: boolean;
}

/** Bare input for a field definition (used in forms and grid cells). */
export function Input({ f, value, label, onChange, compact, invalid, disabled }: InputProps) {
  const { meta } = useApp();
  const v = value ?? "";
  const set = (x: any, row?: any) => onChange(x, row);

  switch (f.type) {
    case "ref":
      return (
        <Lookup
          master={f.ref!}
          value={value}
          label={label}
          filter={f.filter || {}}
          quickAdd={!!meta?.masters?.[f.ref!]?.quick_add}
          disabled={disabled}
          invalid={invalid}
          onChange={(id: any, row: any) => set(id, row)}
          placeholder={compact ? "" : "Search…"}
        />
      );
    case "select":
      return (
        <select value={v} disabled={disabled} className={invalid ? "err" : ""} onChange={(e) => set(e.target.value || null)}>
          {(f.options || []).map((o) => (
            <option key={o} value={o}>
              {o || "—"}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return <textarea value={v} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "bool":
      return <input type="checkbox" checked={!!value} disabled={disabled} onChange={(e) => set(e.target.checked)} />;
    case "int":
    case "decimal":
      return (
        <input
          inputMode="decimal"
          className={"n " + (invalid ? "err" : "")}
          value={v === 0 ? "" : v}
          placeholder="0"
          disabled={disabled}
          onChange={(e) => /^-?\d*\.?\d*$/.test(e.target.value) && set(e.target.value)}
        />
      );
    case "date":
      return (
        <input
          type="date"
          value={v ? String(v).slice(0, 10) : ""}
          disabled={disabled}
          className={invalid ? "err" : ""}
          onChange={(e) => set(e.target.value || null)}
        />
      );
    case "readonly":
      return <input value={v} readOnly placeholder="Auto" />;
    default:
      return <input value={v} disabled={disabled} className={invalid ? "err" : ""} onChange={(e) => set(e.target.value)} />;
  }
}

export interface FieldProps {
  f: FieldDef;
  form: Record<string, any>;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  error?: string;
  disabled?: boolean;
  clearError?: () => void;
}

export function Field({ f, form, setForm, error, disabled, clearError }: FieldProps) {
  if (!showIf(f, form)) return null;
  if (f.type === "attrs") return <AttrPanel f={f} form={form} setForm={setForm} disabled={disabled} />;

  const set = (val: any, row?: any) => {
    setForm((p: any) => ({
      ...p,
      [f.name]: val,
      [f.name + "__label"]: row ? row.label || row.name : undefined,
    }));
    if (clearError) clearError();
  };

  return (
    <label className={"fld" + (f.type === "textarea" ? " full" : "")}>
      <span>
        {f.label}
        {f.required && <span className="req"> *</span>}
      </span>
      <Input f={f} value={form[f.name]} label={form[f.name + "__label"]} onChange={set} form={form} invalid={!!error} disabled={disabled} />
      {error ? <span className="hint" style={{ color: "var(--red)" }}>{error}</span> : f.help && <span className="hint">{f.help}</span>}
    </label>
  );
}

/** Product attribute panel: fields come from the chosen category's attribute definition. */
function AttrPanel({ f, form, setForm, disabled }: { f: FieldDef; form: Record<string, any>; setForm: React.Dispatch<React.SetStateAction<any>>; disabled?: boolean }) {
  const [attrs, setAttrs] = useState<any[]>([]);
  const cat = form[f.depends || ""];

  useEffect(() => {
    if (!cat) {
      setAttrs([]);
      return;
    }
    api(`/masters/product_category/${cat}`, { quiet: true })
      .then((c) => setAttrs(c.attributes || []))
      .catch(() => setAttrs([]));
  }, [cat]);

  const vals = form[f.name] || {};
  const setVal = (no: number | string, v: any) =>
    setForm((p: any) => ({ ...p, [f.name]: { ...(p[f.name] || {}), [no]: v } }));

  const preview = [form.name, ...attrs.map((a) => vals[a.attr_no])].filter(Boolean).join("-");

  useEffect(() => {
    if (form.item_name !== preview) {
      setForm((p: any) => ({ ...p, item_name: preview }));
    }
  }, [preview, form.item_name, setForm]);

  if (!cat) return <div className="full muted">Pick a category to fill in its attributes.</div>;

  return (
    <div className="full">
      <div className="grid">
        {attrs.map((a) => (
          <label className="fld" key={a.attr_no}>
            <span>
              {a.label} <span className="req">*</span>
            </span>
            {a.mode === "List" ? (
              <Lookup
                master="generic"
                filter={{ type_id: a.generic_type_id }}
                quickAdd
                value={vals[a.attr_no] ? 1 : null}
                label={vals[a.attr_no] || ""}
                disabled={disabled}
                onChange={(_id: any, row: any) => setVal(a.attr_no, row ? row.name : "")}
              />
            ) : (
              <input value={vals[a.attr_no] || ""} disabled={disabled} onChange={(e) => setVal(a.attr_no, e.target.value)} />
            )}
          </label>
        ))}
      </div>
      {!attrs.length && <div className="muted">This category has no attributes.</div>}
      <div className="muted" style={{ marginTop: 8 }}>
        Item name will be: <b style={{ color: "var(--ink)" }}>{preview || "—"}</b>
      </div>
    </div>
  );
}
