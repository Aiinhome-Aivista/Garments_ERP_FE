import React from "react";

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
  return (
    <div className="row" style={{ marginTop: 12 }}>
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <span className="muted" style={{ margin: "0 10px" }}>
        Page {page} of {maxPage} · {total} {itemName}
      </span>
      <button className="btn ghost sm" disabled={page >= maxPage} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </div>
  );
}
