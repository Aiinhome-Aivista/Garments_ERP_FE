import React, { useEffect, useState } from "react";
import { api } from "../api";
import Icon from "./Icons";
import Lookup from "./Lookup";

export interface MaterialRow {
  id?: number;
  material_id: number | null;
  material_id__label?: string;
  godown_id?: number | null;
  godown_id__label?: string;
  item_type?: string;
  qty_per_unit: number | string;
  uom_id: number | null;
  uom_id__label?: string;
  rate?: number | string;
  rate_pct?: number | string;
  available_uoms?: Array<{
    uom_id: number;
    name: string;
    conversion_factor?: number;
    is_main?: boolean;
  }>;
}

export interface GodownOption {
  id: number;
  name: string;
}

export interface UomOption {
  id: number;
  name: string;
}

export interface ProcessRow {
  id?: number;
  process_id: number | null;
  process_id__label?: string;
  components_of_id?: number | null;
  components_of_id__label?: string;
  uom_id?: number | null;
  uom_id__label?: string;
  unit_qty?: number | string;
  qty?: number | string;
  seq?: number;
  out_status?: string;
  process_rate?: number;
  overhead_pct?: number;
  materials?: MaterialRow[];
}

export interface ProcessBomGridProps {
  rows: ProcessRow[];
  onChange: (rows: ProcessRow[]) => void;
  disabled?: boolean;
  form?: any;
}

export interface EligibleMaterial {
  id: number;
  name: string;
  item_name: string;
  category_id?: number;
  category_name: string;
  item_type: string;
  uom_id: number;
  uom_name: string;
  available_uoms: Array<{
    uom_id: number;
    name: string;
    conversion_factor: number;
    is_main: boolean;
  }>;
}

export default function ProcessBomGrid({ rows = [], onChange, disabled, form }: ProcessBomGridProps) {
  const [materialOptions, setMaterialOptions] = useState<EligibleMaterial[]>([]);
  const [godownOptions, setGodownOptions] = useState<GodownOption[]>([]);
  const [uomList, setUomList] = useState<UomOption[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);

  // Fetch eligible raw materials, godowns, and UOMs on mount
  useEffect(() => {
    let active = true;
    setLoadingMaterials(true);
    api<EligibleMaterial[]>("/bom/materials", { quiet: true })
      .then((res) => {
        if (active && Array.isArray(res)) {
          setMaterialOptions(res);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingMaterials(false);
      });

    api<any>("/bom/godowns", { quiet: true })
      .then((res) => {
        if (active) {
          const list = Array.isArray(res) ? res : res?.items || [];
          setGodownOptions(list);
        }
      })
      .catch(() => {
        // Fallback to /masters/godown
        api<any>("/masters/godown?limit=100", { quiet: true }).then((res) => {
          if (active) {
            const list = Array.isArray(res) ? res : res?.items || [];
            setGodownOptions(list);
          }
        }).catch(() => {});
      });

    api<any>("/bom/uoms", { quiet: true })
      .then((res) => {
        if (active) {
          const list = Array.isArray(res) ? res : res?.items || [];
          setUomList(list);
        }
      })
      .catch(() => {
        api<any>("/masters/uom?limit=100", { quiet: true }).then((res) => {
          if (active) {
            const list = Array.isArray(res) ? res : res?.items || [];
            setUomList(list);
          }
        }).catch(() => {});
      });

    return () => {
      active = false;
    };
  }, []);

  // Update process fields
  const updateProcess = (pIdx: number, patch: Partial<ProcessRow>) => {
    const next = rows.map((p, i) => (i === pIdx ? { ...p, ...patch } : p));
    onChange(next);
  };

  // Add a new process
  const addProcess = () => {
    const newProcess: ProcessRow = {
      process_id: null,
      process_id__label: "",
      components_of_id: form?.id || null,
      components_of_id__label: "",
      uom_id: null,
      uom_id__label: "",
      unit_qty: "1",
      qty: 1,
      seq: rows.length + 1,
      out_status: "WIP",
      materials: [],
    };
    onChange([...rows, newProcess]);
  };

  // Remove a process
  const removeProcess = (pIdx: number) => {
    const proc = rows[pIdx];
    const procName = proc.process_id__label || `Process ${pIdx + 1}`;
    if (proc.materials && proc.materials.length > 0) {
      if (!confirm(`Are you sure you want to remove "${procName}" and its ${proc.materials.length} material(s)?`)) {
        return;
      }
    }
    const next = rows.filter((_, i) => i !== pIdx).map((p, i) => ({ ...p, seq: i + 1 }));
    onChange(next);
  };

  // Add material to a specific process
  const addMaterial = (pIdx: number) => {
    const proc = rows[pIdx];
    const currentMaterials = proc.materials || [];
    const newMaterial: MaterialRow = {
      material_id: null,
      material_id__label: "",
      godown_id: null,
      godown_id__label: "",
      item_type: "",
      qty_per_unit: "",
      uom_id: null,
      uom_id__label: "",
      rate: "",
      rate_pct: "",
      available_uoms: [],
    };
    updateProcess(pIdx, { materials: [...currentMaterials, newMaterial] });
  };

  // Update material in a specific process
  const updateMaterial = (pIdx: number, mIdx: number, patch: Partial<MaterialRow>) => {
    const proc = rows[pIdx];
    const currentMaterials = proc.materials || [];
    const nextMaterials = currentMaterials.map((m, i) => (i === mIdx ? { ...m, ...patch } : m));
    updateProcess(pIdx, { materials: nextMaterials });
  };

  // Remove material from a specific process
  const removeMaterial = (pIdx: number, mIdx: number) => {
    const proc = rows[pIdx];
    const currentMaterials = proc.materials || [];
    const nextMaterials = currentMaterials.filter((_, i) => i !== mIdx);
    updateProcess(pIdx, { materials: nextMaterials });
  };

  // When material is selected from dropdown
  const onSelectMaterial = (pIdx: number, mIdx: number, selectedId: any) => {
    const proc = rows[pIdx];
    const currentMaterials = proc.materials || [];

    if (!selectedId) {
      updateMaterial(pIdx, mIdx, {
        material_id: null,
        material_id__label: "",
        item_type: "Component",
        uom_id: null,
        uom_id__label: "",
        available_uoms: [],
      });
      return;
    }

    const numId = Number(selectedId);

    // Prevent duplicate material in the SAME process
    const isDuplicate = currentMaterials.some(
      (m, idx) => idx !== mIdx && Number(m.material_id) === numId
    );
    if (isDuplicate) {
      const existingItem = materialOptions.find((o) => o.id === numId);
      alert(`The material "${existingItem?.item_name || "Item"}" is already added in this process.\n\nYou cannot add duplicate materials within the same process.`);
      return;
    }

    const itemObj = materialOptions.find((o) => o.id === numId);
    if (itemObj) {
      const uomList = itemObj.available_uoms || [
        { uom_id: itemObj.uom_id, name: itemObj.uom_name, conversion_factor: 1, is_main: true },
      ];
      const existingGodown = currentMaterials[mIdx]?.godown_id || null;
      const existingGodownLabel = currentMaterials[mIdx]?.godown_id__label || "";

      updateMaterial(pIdx, mIdx, {
        material_id: itemObj.id,
        material_id__label: itemObj.item_name,
        godown_id: existingGodown,
        godown_id__label: existingGodownLabel,
        item_type: currentMaterials[mIdx]?.item_type || "",
        uom_id: itemObj.uom_id,
        uom_id__label: itemObj.uom_name,
        available_uoms: uomList,
      });
    } else {
      updateMaterial(pIdx, mIdx, {
        material_id: numId,
        uom_id: null,
      });
    }
  };

  return (
    <div className="section" style={{ marginTop: 24 }}>
      <div className="sec-head" style={{ marginBottom: 12 }}>
        <div>
          <h3 style={{ fontSize: 18, color: "var(--denim-950)", display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="layers" size={20} style={{ color: "var(--tape)" }} />
            Process Definition with BOM
          </h3>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--muted)" }}>
            Define manufacturing processes in sequence and assign specific raw materials or consumables required for each process.
          </p>
        </div>
        <span className="muted" style={{ fontWeight: 600, fontSize: 13 }}>
          {rows.length} process{rows.length === 1 ? "" : "es"} configured
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((proc, pIdx) => {
          const materials = proc.materials || [];
          return (
            <div
              key={pIdx}
              style={{
                background: "var(--paper)",
                border: "1px solid var(--line)",
                borderRadius: 8,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                overflow: "hidden",
                transition: "border-color 0.2s",
              }}
            >
              {/* Process Card Header */}
              <div
                style={{
                  background: "var(--denim-100, #e1e7f5)",
                  padding: "10px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--line)",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 280 }}>
                  <span
                    style={{
                      background: "var(--denim-900)",
                      color: "#fff",
                      fontSize: 12,
                      fontWeight: 700,
                      padding: "4px 10px",
                      borderRadius: 14,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    Process {pIdx + 1}
                  </span>

                  <div style={{ minWidth: 240, flex: 1, maxWidth: 380 }}>
                    <Lookup
                      master="process"
                      value={proc.process_id}
                      label={proc.process_id__label}
                      disabled={disabled}
                      placeholder="Select Process (e.g. Cutting, Stitching)…"
                      onChange={(v: any, r: any) =>
                        updateProcess(pIdx, { process_id: v, process_id__label: r?.label || r?.name })
                      }
                    />
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 600 }}>Status:</span>
                    <select
                      className="fld-input"
                      style={{ padding: "4px 8px", fontSize: 12, height: 30, width: 80 }}
                      value={proc.out_status || "WIP"}
                      disabled={disabled}
                      onChange={(e) => updateProcess(pIdx, { out_status: e.target.value })}
                    >
                      <option value="WIP">WIP</option>
                      <option value="FP">FP</option>
                    </select>
                  </div>
                </div>

                {!disabled && (
                  <button
                    type="button"
                    className="icon-btn del"
                    style={{
                      padding: "6px 10px",
                      borderRadius: 6,
                      background: "var(--red-soft, #fbe4e4)",
                      color: "var(--red)",
                      border: "1px solid rgba(201, 60, 60, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    title="Remove Process"
                    onClick={() => removeProcess(pIdx)}
                  >
                    <Icon name="trash" size={15} />
                    <span>Remove Process</span>
                  </button>
                )}
              </div>

              {/* Components of & Unit of Manufacture Bar */}
              {(() => {
                const currentProdName = form?.item_name || form?.name || "";
                const isSelfProduct =
                  !proc.components_of_id ||
                  (form?.id && Number(proc.components_of_id) === Number(form?.id));
                const compLabel = isSelfProduct
                  ? currentProdName
                  : (proc.components_of_id__label || "");

                return (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "8px 16px",
                      background: "#ffffff",
                      borderBottom: "1px solid var(--line-soft, #e2e8f0)",
                      flexWrap: "wrap",
                      gap: 12,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 280, maxWidth: 640 }}>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--denim-900)",
                          whiteSpace: "nowrap",
                          minWidth: 125,
                        }}
                      >
                        Components of :
                      </span>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <Lookup
                          key={`comp_${pIdx}_${isSelfProduct ? currentProdName : proc.components_of_id}`}
                          master="product"
                          value={isSelfProduct ? form?.id : proc.components_of_id}
                          label={compLabel}
                          disabled={disabled}
                          placeholder="Select item (Components of)…"
                          onChange={(v: any, r: any) => {
                            const chosenId = v ? Number(v) : null;
                            const isNowSelf =
                              !chosenId ||
                              (form?.id && Number(chosenId) === Number(form?.id));
                            updateProcess(pIdx, {
                              components_of_id: chosenId,
                              components_of_id__label: isNowSelf
                                ? currentProdName
                                : (r?.label || r?.name || r?.item_name || ""),
                            });
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--muted)" }}>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>UOM :</span>
                      <input
                        type="number"
                        step="any"
                        min="0.0001"
                        className="n fld-input"
                        style={{
                          width: 95,
                          height: 32,
                          fontSize: 13,
                          textAlign: "center",
                          padding: "2px 8px",
                          fontWeight: 600,
                          boxSizing: "border-box",
                        }}
                        placeholder="1"
                        value={proc.unit_qty !== undefined && proc.unit_qty !== null ? proc.unit_qty : (proc.qty ?? "1")}
                        disabled={disabled}
                        onChange={(e) => {
                          const v = e.target.value;
                          updateProcess(pIdx, { unit_qty: v, qty: v });
                        }}
                      />
                      <select
                        className="fld-input"
                        style={{
                          width: 95,
                          height: 32,
                          fontSize: 13,
                          padding: "2px 8px",
                          boxSizing: "border-box",
                        }}
                        value={proc.uom_id || ""}
                        disabled={disabled}
                        onChange={(e) => {
                          const uid = e.target.value ? Number(e.target.value) : null;
                          const found = uomList.find((u) => u.id === uid);
                          updateProcess(pIdx, {
                            uom_id: uid,
                            uom_id__label: found?.name || "",
                          });
                        }}
                      >
                        <option value="">Select UOM…</option>
                        {uomList.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })()}

              {/* Process Body: Material Grid Table */}
              <div style={{ padding: "12px 16px" }}>
                <div style={{ marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--denim-800)" }}>
                    Materials &amp; Components for {proc.process_id__label || `Process ${pIdx + 1}`}:
                  </span>
                  <span style={{ fontSize: 12, color: "var(--muted)" }}>
                    {materials.length} item{materials.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="tbl-wrap" style={{ border: "1px solid var(--line-soft)", borderRadius: 6, overflowX: "auto" }}>
                  <table className="tbl grid-tbl" style={{ margin: 0, minWidth: 780 }}>
                    <thead>
                      <tr style={{ background: "var(--bg-subtle, #f8fafc)" }}>
                        <th className="sl" style={{ width: 36, textAlign: "center" }}>#</th>
                        <th style={{ minWidth: 200 }}>Item</th>
                        <th style={{ width: 160 }}>Godown</th>
                        <th style={{ width: 140 }}>Type of Item</th>
                        <th className="num" style={{ width: 160 }}>Quantity</th>
                        <th className="num" style={{ width: 100 }}>Rate</th>
                        <th className="num" style={{ width: 95 }}>Rate (%)</th>
                        {!disabled && <th style={{ width: 50, textAlign: "center" }}>Action</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {materials.map((mat, mIdx) => {
                        let rowUomOptions = [...uomList];
                        if (mat.available_uoms && mat.available_uoms.length > 0) {
                          const existingIds = new Set(rowUomOptions.map((u) => u.id));
                          for (const au of mat.available_uoms) {
                            if (!existingIds.has(au.uom_id)) {
                              rowUomOptions.push({ id: au.uom_id, name: au.name });
                              existingIds.add(au.uom_id);
                            }
                          }
                        }
                        if (mat.uom_id && !rowUomOptions.some((u) => u.id === mat.uom_id)) {
                          rowUomOptions.unshift({ id: mat.uom_id, name: mat.uom_id__label || "UOM" });
                        }

                        return (
                          <tr key={mIdx}>
                            <td className="sl" style={{ textAlign: "center", color: "var(--muted)", fontWeight: 600 }}>
                              {mIdx + 1}
                            </td>

                            {/* 1. Item */}
                            <td>
                              <div style={{ minWidth: 190 }}>
                                <select
                                  className="fld-input"
                                  style={{ width: "100%", height: 32, fontSize: 13, padding: "4px 8px" }}
                                  value={mat.material_id || ""}
                                  disabled={disabled}
                                  onChange={(e) => onSelectMaterial(pIdx, mIdx, e.target.value)}
                                >
                                  <option value="">Select Item…</option>
                                  {materialOptions.map((opt) => (
                                    <option key={opt.id} value={opt.id}>
                                      {opt.item_name} [{opt.category_name}]
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* 2. Godown */}
                            <td>
                              <select
                                className="fld-input"
                                style={{ width: "100%", height: 32, fontSize: 13, padding: "4px 8px" }}
                                value={mat.godown_id || ""}
                                disabled={disabled}
                                onChange={(e) => {
                                  const gid = e.target.value ? Number(e.target.value) : null;
                                  const gOpt = godownOptions.find((g) => g.id === gid);
                                  updateMaterial(pIdx, mIdx, {
                                    godown_id: gid,
                                    godown_id__label: gOpt?.name || "",
                                  });
                                }}
                              >
                                <option value="">Select Godown…</option>
                                {godownOptions.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* 3. Type of Item */}
                            <td>
                              <input
                                type="text"
                                className="fld-input"
                                style={{ width: "100%", height: 32, fontSize: 13, padding: "4px 8px" }}
                                value={mat.item_type || ""}
                                disabled={disabled}
                                placeholder=""
                                onChange={(e) => updateMaterial(pIdx, mIdx, { item_type: e.target.value })}
                              />
                            </td>

                            {/* 4. Quantity & UOM */}
                            <td className="num">
                              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                <input
                                  type="number"
                                  step="any"
                                  min="0.0001"
                                  className="n fld-input"
                                  style={{ flex: 1, minWidth: 60, textAlign: "right", height: 32, padding: "4px 6px", fontSize: 13 }}
                                  placeholder="0"
                                  value={mat.qty_per_unit === 0 ? "0" : (mat.qty_per_unit ?? "")}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === "" || /^\d*\.?\d*$/.test(val)) {
                                      updateMaterial(pIdx, mIdx, { qty_per_unit: val });
                                    }
                                  }}
                                />
                                <select
                                  className="fld-input"
                                  style={{ width: 85, height: 32, fontSize: 12, padding: "2px 4px" }}
                                  value={mat.uom_id || ""}
                                  disabled={disabled}
                                  onChange={(e) => {
                                    const uVal = e.target.value ? Number(e.target.value) : null;
                                    const found = rowUomOptions.find((u) => u.id === uVal);
                                    updateMaterial(pIdx, mIdx, {
                                      uom_id: uVal,
                                      uom_id__label: found?.name || "",
                                    });
                                  }}
                                  title="Select Unit of Measurement"
                                >
                                  <option value="">UOM…</option>
                                  {rowUomOptions.map((u) => (
                                    <option key={u.id} value={u.id}>
                                      {u.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </td>

                            {/* 5. Rate */}
                            <td className="num">
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                className="n fld-input"
                                style={{ width: "100%", textAlign: "right", height: 32, padding: "4px 6px", fontSize: 13 }}
                                placeholder="0.00"
                                value={mat.rate !== undefined && mat.rate !== null ? mat.rate : ""}
                                disabled={disabled}
                                onChange={(e) => updateMaterial(pIdx, mIdx, { rate: e.target.value })}
                              />
                            </td>

                            {/* 6. Rate (%) */}
                            <td className="num">
                              <input
                                type="number"
                                step="0.01"
                                className="n fld-input"
                                style={{ width: "100%", textAlign: "right", height: 32, padding: "4px 6px", fontSize: 13 }}
                                placeholder="0.00"
                                value={mat.rate_pct !== undefined && mat.rate_pct !== null ? mat.rate_pct : ""}
                                disabled={disabled}
                                onChange={(e) => updateMaterial(pIdx, mIdx, { rate_pct: e.target.value })}
                              />
                            </td>

                            {/* 7. Action */}
                            {!disabled && (
                              <td style={{ textAlign: "center" }}>
                                <button
                                  type="button"
                                  className="icon-btn del"
                                  title="Remove Material Row"
                                  onClick={() => removeMaterial(pIdx, mIdx)}
                                >
                                  <Icon name="trash" size={15} />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {!materials.length && (
                        <tr>
                          <td colSpan={disabled ? 7 : 8} style={{ padding: "14px", textAlign: "center", color: "var(--muted)", fontStyle: "italic", fontSize: 13 }}>
                            No raw materials or consumables mapped to this process. (Optional for labour-only operations). Click below to add.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {!disabled && (
                  <div style={{ marginTop: 10 }}>
                    <button
                      type="button"
                      className="btn ghost sm"
                      style={{ fontSize: 12, padding: "5px 12px", border: "1px dashed var(--denim-300)" }}
                      onClick={() => addMaterial(pIdx)}
                    >
                      <Icon name="plus" size={14} />
                      Add Material to {proc.process_id__label || `Process ${pIdx + 1}`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {!rows.length && (
          <div
            style={{
              padding: 24,
              border: "2px dashed var(--line)",
              borderRadius: 8,
              textAlign: "center",
              background: "var(--paper)",
              color: "var(--muted)",
            }}
          >
            <Icon name="layers" size={32} style={{ color: "var(--muted)", marginBottom: 8, opacity: 0.6 }} />
            <p style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 600 }}>
              No manufacturing processes defined yet.
            </p>
            <p style={{ margin: "0 0 14px", fontSize: 13 }}>
              Add processes (e.g. Cutting, Stitching, Finishing, Packing) and map their raw materials to define the BOM.
            </p>
            {!disabled && (
              <button type="button" className="btn tape sm" onClick={addProcess}>
                <Icon name="plus" size={16} />
                Add First Process
              </button>
            )}
          </div>
        )}

        {!disabled && rows.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              type="button"
              className="btn ghost"
              style={{
                width: "100%",
                padding: "10px 16px",
                border: "2px dashed var(--tape-deep, #b98209)",
                color: "var(--denim-900)",
                background: "var(--tape-soft, #fdf1cf)",
                fontWeight: 700,
                fontSize: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: 8,
                cursor: "pointer",
              }}
              onClick={addProcess}
            >
              <Icon name="plus" size={18} />
              Add Next Manufacturing Process Step
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
