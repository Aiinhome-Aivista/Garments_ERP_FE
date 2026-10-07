import { showIf, Input, FieldDef } from "./Field";
import Icon from "./Icons";

export interface ChildGridDef {
  label: string;
  fields: FieldDef[];
  max_rows?: number;
}

export interface ChildGridProps {
  def: ChildGridDef;
  rows: any[];
  onChange: (rows: any[]) => void;
  form?: any;
  disabled?: boolean;
  errors?: Record<string, string>;
}

/** Editable grid for a master's child table (BOM, discount structure, terms…). */
export default function ChildGrid({ def, rows, onChange, form, disabled, errors = {} }: ChildGridProps) {
  const cols = def.fields;
  const set = (i: number, patch: any) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const blank = () => Object.fromEntries(def.fields.filter((f) => "default" in f).map((f) => [f.name, f.default]));
  const full = !!def.max_rows && rows.length >= def.max_rows;

  return (
    <div className="section">
      <div className="sec-head">
        <h3>{def.label}</h3>
        <span className="muted">
          {rows.length} row{rows.length === 1 ? "" : "s"}
        </span>
      </div>
      <div className="tbl-wrap">
        <table className="tbl grid-tbl">
          <thead>
            <tr>
              <th className="sl">Sl No.</th>
              {cols.map((f) => (
                <th key={f.name} className={["int", "decimal"].includes(f.type) ? "num" : ""}>
                  {f.label}
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td className="sl">{i + 1}</td>
                {cols.map((f) => (
                  <td key={f.name} style={{ minWidth: f.type === "ref" || f.type === "textarea" ? 190 : 100 }}>
                    {showIf(f, r) ? (
                      <Input
                        f={f}
                        compact
                        value={r[f.name]}
                        label={r[f.name + "__label"]}
                        disabled={disabled}
                        invalid={!!errors[`${i}.${f.name}`]}
                        onChange={(v: any, row: any) => {
                          const patch: any = { [f.name]: v, [f.name + "__label"]: row ? row.label : undefined };
                          const newRow = { ...r, ...patch };
                          for (const other of cols) {
                            if (other.name !== f.name && !showIf(other, newRow)) {
                              patch[other.name] = null;
                              patch[other.name + "__label"] = null;
                            }
                          }
                          set(i, patch);
                        }}
                        form={r}
                      />
                    ) : (
                      <span className="muted" style={{ paddingLeft: 8 }}>—</span>
                    )}
                  </td>
                ))}
                <td>
                  {!disabled && (
                    <button
                      type="button"
                      className="icon-btn del"
                      title="Remove row"
                      onClick={() => onChange(rows.filter((_, j) => j !== i))}
                    >
                      <Icon name="trash" size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={cols.length + 2} className="muted" style={{ padding: 14 }}>
                  Nothing added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {!disabled && (
        <button
          type="button"
          className="btn ghost sm"
          style={{ marginTop: 8 }}
          disabled={full}
          onClick={() => onChange([...rows, blank()])}
        >
          <Icon name="plus" size={16} />
          Add row
        </button>
      )}
      {full && <span className="muted" style={{ marginLeft: 10 }}>Maximum {def.max_rows} rows</span>}
    </div>
  );
}
