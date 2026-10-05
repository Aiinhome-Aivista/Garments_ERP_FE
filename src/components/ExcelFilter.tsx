import React, { useState, useMemo, useEffect } from 'react';

export function ExcelFilter({
  rows,
  column,
  filters,
  setFilters,
}: {
  rows: any[];
  column: string;
  filters: Record<string, any>;
  setFilters: (f: any) => void;
}) {
  const [search, setSearch] = useState("");
  const [accumulated, setAccumulated] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!rows) return;
    setAccumulated((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(String(r[column] || "")));
      return next;
    });
  }, [rows, column]);

  const allValues = useMemo(() => {
    return Array.from(accumulated).sort();
  }, [accumulated]);

  const filteredValues = useMemo(() => {
    return allValues.filter((v) =>
      v.toLowerCase().includes(search.toLowerCase())
    );
  }, [allValues, search]);

  const currentSelection: string[] | null = filters[column] || null;
  const isAllSelected = currentSelection === null;

  const toggleAll = () => {
    if (isAllSelected) {
      setFilters({ ...filters, [column]: [] }); // select none
    } else {
      const newFilters = { ...filters };
      delete newFilters[column]; // select all
      setFilters(newFilters);
    }
  };

  const toggleVal = (val: string) => {
    let sel = currentSelection === null ? [...allValues] : [...currentSelection];
    if (sel.includes(val)) {
      sel = sel.filter((v) => v !== val);
    } else {
      sel.push(val);
    }

    if (sel.length === allValues.length) {
      const newFilters = { ...filters };
      delete newFilters[column];
      setFilters(newFilters);
    } else {
      setFilters({ ...filters, [column]: sel });
    }
  };

  return (
    <div style={{ minWidth: 220, padding: "8px", display: "flex", flexDirection: "column", gap: 8 }}>
      <input
        autoFocus
        placeholder="Search here"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ width: "100%", padding: "6px", paddingLeft: "34px", fontSize: 14 }}
      />
      <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontWeight: 600 }}>
          <input
            type="checkbox"
            checked={isAllSelected}
            onChange={toggleAll}
            style={{ width: "auto", margin: 0 }}
          />
          (Select All)
        </label>
        {filteredValues.map((v) => {
          const checked = currentSelection === null || currentSelection.includes(v);
          return (
            <label key={v} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleVal(v)}
                style={{ width: "auto", margin: 0 }}
              />
              {v || "(Blank)"}
            </label>
          );
        })}
        {filteredValues.length === 0 && (
          <div style={{ color: "var(--muted)", fontSize: 13, padding: "4px 0" }}>No matches</div>
        )}
      </div>
    </div>
  );
}
