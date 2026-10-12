import React from "react";
import Icon from "./Icons";

export interface PaginationProps {
  page: number;
  total: number;
  size?: number;
  onChange: (page: number) => void;
  itemName?: string;
}

export default function Pagination({ page, total, size = 10, onChange, itemName = "records" }: PaginationProps) {
  if (total <= size) return null;
  const maxPage = Math.ceil(total / size);

  const pages = [];
  for (let i = 1; i <= maxPage; i++) {
    if (i === 1 || i === maxPage || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, paddingTop: 24 }}>
      <div className="chips" style={{ gap: 4, alignItems: "center", justifyContent: "center" }}>
        <button 
          className="icon-btn" 
          disabled={page <= 1} 
          onClick={() => onChange(page - 1)}
          style={{ padding: "4px 8px", marginRight: 4 }}
        >
          <Icon name="chevronLeft" size={18} />
        </button>
        
        {pages.map((p, i) => (
          p === "..." ? (
            <span key={i} className="muted" style={{ padding: "4px 8px" }}>...</span>
          ) : (
            <button
              key={i}
              className={`chip ${p === page ? "on" : ""}`}
              style={{ cursor: "pointer", minWidth: 32, textAlign: "center", padding: "4px 10px" }}
              onClick={() => p !== page && onChange(p as number)}
            >
              {p}
            </button>
          )
        ))}

        <button 
          className="icon-btn" 
          disabled={page >= maxPage} 
          onClick={() => onChange(page + 1)}
          style={{ padding: "4px 8px", marginLeft: 4 }}
        >
          <Icon name="chevronRight" size={18} />
        </button>
      </div>

      <span className="muted" style={{ fontSize: 14 }}>
        Showing <b>{(page - 1) * size + 1}</b> to <b>{Math.min(page * size, total)}</b> of <b>{total}</b> {itemName}
      </span>
    </div>
  );
}
