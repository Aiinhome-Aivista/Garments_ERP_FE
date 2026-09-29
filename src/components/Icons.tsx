import React, { SVGProps } from "react";

// Custom garment-trade icon set. 24x24, stroke based, inherits currentColor.
const P: Record<string, React.ReactNode> = {
  needle: (
    <>
      <path d="M4 20L17.5 6.5" />
      <ellipse cx="18.8" cy="5.2" rx="1" ry="2.6" transform="rotate(45 18.8 5.2)" />
      <path d="M20 4c2 1.5 1.5 4-1 5" strokeDasharray="1.5 2" />
    </>
  ),
  spool: (
    <>
      <rect x="6" y="3" width="12" height="3" rx="1" />
      <rect x="6" y="18" width="12" height="3" rx="1" />
      <path d="M8 6v12M16 6v12M8 9l8 2M8 12l8 2M8 15l8 2" />
    </>
  ),
  scissors: (
    <>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.5 7.5L21 18M8.5 16.5L21 6" />
    </>
  ),
  hanger: (
    <>
      <path d="M12 7a2 2 0 1 1 2 2c-1.2.5-2 1-2 2.2V12" />
      <path d="M12 12L3 17.6a1 1 0 0 0 .6 1.8h16.8a1 1 0 0 0 .6-1.8z" />
    </>
  ),
  shirt: <path d="M8 3L3 6l2 4 3-1v12h8V9l3 1 2-4-5-3a4 4 0 0 1-8 0z" />,
  tape: (
    <>
      <rect x="2" y="7" width="20" height="10" rx="1.5" />
      <path d="M6 7v3.5M10 7v5M14 7v3.5M18 7v5" />
    </>
  ),
  button: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="9.3" cy="9.8" r=".7" />
      <circle cx="14.7" cy="9.8" r=".7" />
      <circle cx="9.3" cy="14.2" r=".7" />
      <circle cx="14.7" cy="14.2" r=".7" />
    </>
  ),
  machine: (
    <>
      <path d="M3 20h18" />
      <path d="M5 20V9h10a4 4 0 0 1 4 4v7" />
      <path d="M14 9V4h-4v5" />
      <path d="M8 13h4" />
      <path d="M17 14v3" />
    </>
  ),
  factory: <path d="M3 21V10l6 4v-4l6 4V5h3v16z" />,
  rack: (
    <>
      <path d="M3 21V9l9-5 9 5v12" />
      <path d="M8 21v-6h8v6M8 15h8" />
    </>
  ),
  cart: (
    <>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l2.5 12h11l2-8H6" />
    </>
  ),
  truck: (
    <>
      <path d="M2 6h11v10H2zM13 9h4l4 3v4h-8" />
      <circle cx="6" cy="18" r="2" />
      <circle cx="17" cy="18" r="2" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2z" />
      <path d="M8 8h8M8 12h8" />
    </>
  ),
  return: (
    <>
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </>
  ),
  box: (
    <>
      <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
      <path d="M3 7l9 4 9-4M12 11v10" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12V4h8l10 10-8 8z" />
      <circle cx="7.5" cy="8.5" r="1.3" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 6h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4z" />
      <path d="M14 6v12" strokeDasharray="2 2" />
    </>
  ),
  book: (
    <>
      <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z" />
      <path d="M5 17a3 3 0 0 1 3-3h11" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-4 3-6 6.5-6s6.5 2 6.5 6" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14c3 0 4.5 1.8 4.5 5" />
    </>
  ),
  loom: (
    <>
      <path d="M3 4h18M3 20h18" />
      <path d="M6 4v16M10 4v16M14 4v16M18 4v16" />
      <path d="M3 9h18M3 14h18" strokeDasharray="3 3" />
    </>
  ),
  barcode: <path d="M4 5v14M7 5v14M11 5v14M14 5v14M17.5 5v14M20 5v14" strokeWidth="1.6" />,
  scan: (
    <>
      <path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" />
      <path d="M4 12h16" />
    </>
  ),
  check: <path d="M5 12.5l5 5 9-11" />,
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  edit: <path d="M4 20l1-4L16 5l3 3L8 19z" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  search: (
    <>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </>
  ),
  print: (
    <>
      <path d="M7 9V3h10v6" />
      <rect x="4" y="9" width="16" height="8" rx="1" />
      <path d="M7 14h10v7H7z" />
    </>
  ),
  chevron: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 18l-6-6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  down: <path d="M6 9l6 6 6-6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  logout: (
    <>
      <path d="M9 4H5v16h4" />
      <path d="M16 8l4 4-4 4M20 12H9" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3h6v1M9 10h6M9 14h6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M16 7l3 3" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  moon: <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </>
  ),
  link: (
    <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
  ),
  alert: (
    <>
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v5M12 18v.5" />
    </>
  ),
  approve: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l3 3 5-6" />
    </>
  ),
};

export interface IconProps extends SVGProps<SVGSVGElement> {
  name: string;
  size?: number | string;
  className?: string;
}

export default function Icon({ name, size = 20, className = "", ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {P[name] || P.button}
    </svg>
  );
}
