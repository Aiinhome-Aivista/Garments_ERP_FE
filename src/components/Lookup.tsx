import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, qs } from "../api";

export interface LookupProps {
  master: string;
  value: any;
  label?: string;
  onChange: (id: any, row: any) => void;
  filter?: Record<string, any>;
  quickAdd?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
  autoFocus?: boolean;
}

export interface LookupRow {
  id: any;
  label: string;
  name?: string;
  [key: string]: any;
}

/**
 * Type-ahead select for any master.
 * value: id (or any truthy marker when storeName) · label: text to show · onChange(id, row)
 * filter: {ledger_type:'Customer'} → f_ledger_type · quickAdd: allow creating a new record from the typed text.
 */
export default function Lookup({
  master,
  value,
  label,
  onChange,
  filter = {},
  quickAdd = false,
  placeholder = "Search…",
  disabled,
  className = "",
  invalid,
  autoFocus,
}: LookupProps) {
  const [text, setText] = useState<string>(label || "");
  const [open, setOpen] = useState<boolean>(false);
  const [rows, setRows] = useState<LookupRow[]>([]);
  const [hi, setHi] = useState<number>(0);
  const [pos, setPos] = useState<{ left: number; top: number; width: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const seq = useRef<number>(0);
  const fkey = JSON.stringify(filter);

  useEffect(() => {
    if (!open) setText(label || "");
  }, [label, open, value]);

  // resolve a label for an id we only know by number
  useEffect(() => {
    if (value && !label && typeof value === "number") {
      api<LookupRow[]>(
        `/lookup/${master}${qs({
          id: value,
          limit: 1,
          ...Object.fromEntries(Object.entries(filter).map(([k, v]) => ["f_" + k, v])),
        })}`,
        { quiet: true }
      )
        .then((r) => {
          const m = r.find((x) => x.id === value);
          if (m) setText(m.label);
        })
        .catch(() => {});
    }
  }, [value]); // eslint-disable-line

  useEffect(() => {
    if (!open) return;
    const my = ++seq.current;
    const t = setTimeout(() => {
      api<LookupRow[]>(
        `/lookup/${master}${qs({
          q: text === label ? "" : text,
          ...Object.fromEntries(Object.entries(filter).map(([k, v]) => ["f_" + k, v])),
        })}`,
        { quiet: true }
      )
        .then((r) => {
          if (my === seq.current) {
            setRows(r);
            setHi(0);
          }
        })
        .catch(() => {});
    }, 160);
    return () => clearTimeout(t);
  }, [text, open, master, fkey]); // eslint-disable-line

  useLayoutEffect(() => {
    if (open && box.current) {
      const r = box.current.getBoundingClientRect();
      setPos({ left: r.left, top: r.bottom + 2, width: Math.max(r.width, 240) });
    }
  }, [open, rows.length]);

  const exact = rows.some((r) => r.label.toLowerCase() === text.trim().toLowerCase());
  const canAdd = quickAdd && text.trim() && !exact && text !== label;
  const pick = (r: LookupRow) => {
    onChange(r.id, r);
    setOpen(false);
    setText(r.label);
  };
  const add = async () => {
    const body = { name: text.trim(), ...filter };
    const created = await api(`/masters/${master}`, { method: "POST", body });
    pick({ ...created, label: created.name });
  };
  const key = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const n = rows.length + (canAdd ? 1 : 0);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHi((h) => Math.min(h + 1, n - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHi((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && open) {
      e.preventDefault();
      if (hi < rows.length) pick(rows[hi]);
      else if (canAdd) add();
    } else if (e.key === "Escape") setOpen(false);
    else if (e.key === "Backspace" && !text && value) onChange(null, null);
  };

  return (
    <div className={"lk " + className} ref={box}>
      <input
        value={text}
        placeholder={placeholder}
        disabled={disabled}
        className={invalid ? "err" : ""}
        autoFocus={autoFocus}
        onChange={(e) => {
          setText(e.target.value);
          setOpen(true);
          if (!e.target.value && value) onChange(null, null);
        }}
        onFocus={(e) => {
          setOpen(true);
          e.target.select();
        }}
        onBlur={() => setTimeout(() => setOpen(false), 140)}
        onKeyDown={key}
      />
      {open &&
        pos &&
        createPortal(
          <div className="lk-pop" style={pos} onMouseDown={(e) => e.preventDefault()}>
            {rows.map((r, i) => (
              <div key={r.id} className={i === hi ? "on" : ""} onMouseEnter={() => setHi(i)} onClick={() => pick(r)}>
                <span>{r.label}</span>
              </div>
            ))}
            {!rows.length && !canAdd && <div className="none">No match{text ? ` for “${text}”` : ""}</div>}
            {canAdd && (
              <div className={"add" + (hi === rows.length ? " on" : "")} onClick={add}>
                + Add “{text.trim()}”
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
