import { showIf, Input, FieldDef } from "./Field";
import Icon from "./Icons";

export interface ChildGridDef {
  key?: string;
  label: string;
  fields: FieldDef[];
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

  const isAltUom = def.key === "alternate_uoms" || def.key === "units" || def.label?.toLowerCase().includes("alternate unit");
  const isGstSlab = def.key === "gst_slabs" || def.label?.toLowerCase().includes("gst slab");
  const mainUomLabel = form?.uom_id__label || "Main UOM";

  if (isGstSlab) {
    if (form?.gst_type !== "Slab") {
      return null;
    }
    return (
      <div className="section">
        <div className="sec-head">
          <h3>{def.label}</h3>
          <span className="muted">
            {rows.length} price range slab{rows.length === 1 ? "" : "s"} configured
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl grid-tbl">
            <thead>
              <tr>
                <th className="sl">Sl No.</th>
                <th>Minimum Amount (₹)</th>
                <th>Maximum Amount (₹)</th>
                <th>GST Percentage (%)</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="sl">{i + 1}</td>
                  <td>
                    <input
                      inputMode="decimal"
                      className={"n " + (errors[`${i}.min_price`] ? "err" : "")}
                      disabled={disabled}
                      value={r.min_price ?? ""}
                      placeholder="e.g. 0"
                      onChange={(e) => set(i, { min_price: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      className={"n " + (errors[`${i}.max_price`] ? "err" : "")}
                      disabled={disabled}
                      value={r.max_price ?? ""}
                      placeholder="Leave blank for No Limit"
                      onChange={(e) => set(i, { max_price: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      inputMode="decimal"
                      className={"n " + (errors[`${i}.gst_rate`] ? "err" : "")}
                      disabled={disabled}
                      value={r.gst_rate ?? ""}
                      placeholder="e.g. 5, 12, 18"
                      onChange={(e) => set(i, { gst_rate: e.target.value })}
                    />
                  </td>
                  <td>
                    {!disabled && (
                      <button
                        type="button"
                        className="icon-btn del"
                        title="Remove slab"
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
                  <td colSpan={5} className="muted" style={{ padding: 14 }}>
                    No GST slabs configured yet. Click below to add price range slabs (e.g. 0 to 1000 @ 5%).
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
            onClick={() => {
              const last = rows[rows.length - 1];
              let nextMin = 0;
              if (last && last.max_price && !isNaN(Number(last.max_price))) {
                nextMin = Number(last.max_price) + 1;
              }
              onChange([...rows, { min_price: nextMin, max_price: "", gst_rate: 0 }]);
            }}
          >
            <Icon name="plus" size={16} />
            Add Slab Row
          </button>
        )}
      </div>
    );
  }

  if (isAltUom) {
    return (
      <div className="section">
        <div className="sec-head">
          <h3>{def.label}</h3>
          <span className="muted">
            {rows.length} alternate unit{rows.length === 1 ? "" : "s"} (Main UOM: <b>{mainUomLabel}</b>)
          </span>
        </div>
        <div className="tbl-wrap">
          <table className="tbl grid-tbl">
            <thead>
              <tr>
                <th className="sl">Sl No.</th>
                <th>Conversion Rule ( 1 [Alternate UOM] = [Quantity] [Main UOM] )</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="sl">{i + 1}</td>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "4px 0" }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--denim-900)" }}>1</span>
                      <div style={{ minWidth: 200 }}>
                        <Input
                          f={cols[0]}
                          compact
                          value={r.uom_id}
                          label={r.uom_id__label}
                          disabled={disabled}
                          invalid={!!errors[`${i}.uom_id`]}
                          onChange={(v: any, rowObj: any) => {
                            if (v && form?.uom_id && String(v) === String(form.uom_id)) {
                              alert(`Alternate UOM cannot be the same as Main UOM (${mainUomLabel})`);
                              return;
                            }
                            if (v && rows.some((x, idx) => idx !== i && String(x.uom_id) === String(v))) {
                              alert("This Alternate UOM is already added for this item.");
                              return;
                            }
                            set(i, { uom_id: v, uom_id__label: rowObj ? rowObj.label : undefined });
                          }}
                          form={r}
                        />
                      </div>
                      <span style={{ fontWeight: 800, fontSize: 16, color: "var(--muted)" }}>=</span>
                      <div style={{ width: 130 }}>
                        <Input
                          f={cols[1]}
                          compact
                          value={r.conversion_factor}
                          disabled={disabled}
                          invalid={!!errors[`${i}.conversion_factor`]}
                          onChange={(v: any) => {
                            set(i, { conversion_factor: v });
                          }}
                          form={r}
                        />
                      </div>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: 13,
                          color: "var(--denim-700)",
                          background: "var(--bg-subtle, #f1f5f9)",
                          padding: "6px 12px",
                          borderRadius: 4,
                          border: "1px solid var(--border, #cbd5e1)",
                        }}
                      >
                        {mainUomLabel}
                      </span>
                    </div>
                  </td>
                  <td>
                    {!disabled && (
                      <button
                        type="button"
                        className="icon-btn del"
                        title="Remove Alternate UOM"
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
                  <td colSpan={3} className="muted" style={{ padding: 14 }}>
                    No alternate UOM configured. Click below to add one.
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
            onClick={() => {
              if (!form?.uom_id) {
                alert("Please select the Main UOM first.");
                return;
              }
              onChange([...rows, { uom_id: null, conversion_factor: 1 }]);
            }}
          >
            <Icon name="plus" size={16} />
            Add Alternate UOM
          </button>
        )}
      </div>
    );
  }

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
                          if (f.name === "material_id" && row && row.uom_id) {
                            patch.uom_id = row.uom_id;
                            patch.uom_id__label = row.uom_id__label || row.uom__label;
                          }
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
          onClick={() => onChange([...rows, blank()])}
        >
          <Icon name="plus" size={16} />
          Add row
        </button>
      )}
    </div>
  );
}
