import React, { ButtonHTMLAttributes } from "react";
import Icon from "./Icons";

interface StitchLoaderProps {
  label?: string;
  full?: boolean;
}

/** Sewing needle stitching a dashed thread line. Used for page and section loading. */
export function StitchLoader({ label = "Threading the needle…", full = false }: StitchLoaderProps) {
  return (
    <div className={"stitch-loader" + (full ? " full" : "")} role="status" aria-live="polite">
      <svg width="240" height="80" viewBox="0 0 240 80">
        <defs>
          <clipPath id="sl-clip">
            <rect className="sl-reveal" x="20" y="0" width="0" height="80" />
          </clipPath>
        </defs>
        <path
          className="sl-trail"
          d="M20 46H220"
          stroke="var(--red)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
          clipPath="url(#sl-clip)"
        />
        <path d="M20 54H220" stroke="var(--line)" strokeWidth="6" strokeLinecap="round" opacity=".5" />
        <g className="sl-needle">
          <g className="sl-bob">
            <path d="M14 66L34 26" stroke="var(--denim-800)" strokeWidth="3.4" strokeLinecap="round" />
            <ellipse
              cx="34.6"
              cy="27.4"
              rx="1.3"
              ry="3.4"
              transform="rotate(27 34.6 27.4)"
              fill="var(--tape)"
              stroke="var(--denim-800)"
              strokeWidth="1"
            />
          </g>
        </g>
      </svg>
      <span>{label}</span>
    </div>
  );
}

/** Tiny thread spool for buttons. */
export function Spool({ size = 18 }: { size?: number }) {
  return (
    <svg
      className="spool-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-label="Working"
    >
      <rect x="6" y="3" width="12" height="3" rx="1" />
      <rect x="6" y="18" width="12" height="3" rx="1" />
      <path d="M8 6v12M16 6v12" />
      <path d="M8 9l8 2M8 12l8 2M8 15l8 2" strokeDasharray="2 2" />
    </svg>
  );
}

export const ThreadBar = () => <div className="thread-bar" role="progressbar" aria-label="Loading" />;

export function Skeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div style={{ display: "grid", gap: 10, padding: 16 }}>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ width: `${95 - (i % 3) * 14}%` }} />
      ))}
    </div>
  );
}

interface EmptyProps {
  icon?: string;
  title: string;
  children?: React.ReactNode;
}

export function Empty({ icon = "hanger", title, children }: EmptyProps) {
  return (
    <div className="empty">
      <Icon name={icon} size={44} />
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

export interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  busy?: boolean;
  icon?: string;
  children?: React.ReactNode;
  className?: string;
}

export function Btn({ busy, icon, children, className = "", ...p }: BtnProps) {
  return (
    <button className={"btn " + className} disabled={busy || p.disabled} {...p}>
      {busy ? <Spool size={16} /> : icon && <Icon name={icon} size={17} />}
      {children}
    </button>
  );
}
