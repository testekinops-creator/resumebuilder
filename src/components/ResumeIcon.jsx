const ICONS = {
  template: <><rect x="4" y="4" width="12" height="15" rx="2" /><path d="M8 4v-1h10a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-2" /><path d="M7 8h6M7 12h6M7 16h4" /></>,
  design: <><path d="M4 7.5A3.5 3.5 0 0 1 7.5 4h9A3.5 3.5 0 0 1 20 7.5v9a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5z" /><path d="M8 9h8M8 15h8M10 7v4M14 13v4" /><circle cx="10" cy="9" r="1.5" /><circle cx="14" cy="15" r="1.5" /></>,
  sections: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h4M8 14h3M16 8v6M13 11h6" /></>,
  document: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" /></>,
  docx: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5" /><path d="m8 12 2 5 2-5 2 5 2-5" /></>,
  download: <><path d="M12 3v11" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></>,
  pdf: <><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 15h6" /><path d="m12 10 0 5M10 13h4" /></>,
  print: <><path d="M7 8V3h10v5" /><rect x="4" y="8" width="16" height="9" rx="2" /><path d="M7 14h10v7H7zM17 11h.01" /></>,
  email: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>,
  finish: <><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.3 2.3 4.8-5" /></>,
  edit: <><path d="m5 19 3.6-.8L18 8.8 15.2 6 5.8 15.4z" /><path d="m13.8 7.4 2.8 2.8M5 19h4" /></>,
  delete: <><path d="M5 7h14M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5" /></>,
  rename: <><path d="M4 6h10M9 6v12M6 18h6" /><path d="m14 16 4.7-4.7 2 2L16 18l-3 .7z" /></>,
  reorder: <><path d="M8 5h11M8 12h11M8 19h11" /><path d="m4 3 2 2-2 2M4 10l2 2-2 2M4 17l2 2-2 2" /></>,
  drag: <><circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" /></>,
  add: <><path d="M12 5v14M5 12h14" /></>,
  undo: <><path d="M9 7 5 11l4 4" /><path d="M5 11h8a6 6 0 1 1 0 12h-1" /></>,
  redo: <><path d="m15 7 4 4-4 4" /><path d="M19 11h-8a6 6 0 1 0 0 12h1" /></>,
  save: <><path d="M5 4h12l2 2v14H5z" /><path d="M8 4v6h8V4M8 19v-5h8v5" /></>,
  preview: <><path d="M3.5 12s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5z" /><circle cx="12" cy="12" r="2.5" /></>,
  zoomIn: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4M11 8v6M8 11h6" /></>,
  zoomOut: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4M8 11h6" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  more: <><circle cx="5" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.25" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1.25" fill="currentColor" stroke="none" /></>,
  search: <><circle cx="10.5" cy="10.5" r="5.5" /><path d="m15 15 4 4" /></>,
  link: <><path d="M10 13.5a4 4 0 0 0 5.7.1l2-2a4 4 0 0 0-5.7-5.7l-1.1 1.1" /><path d="M14 10.5a4 4 0 0 0-5.7-.1l-2 2a4 4 0 0 0 5.7 5.7l1.1-1.1" /></>,
  image: <><rect x="4" y="5" width="16" height="14" rx="2" /><circle cx="9" cy="10" r="1.5" /><path d="m5 17 4-4 3 3 2-2 5 3" /></>,
  clearFormat: <><path d="M5 5h12M11 5 7 19M14 16l5 3M17 16l-3 3" /></>,
  sparkle: <><path d="m12 3 1.3 5.2L18.5 10l-5.2 1.3L12 16.5l-1.3-5.2L5.5 10l5.2-1.8z" /><path d="m18 15 .6 2.4L21 18l-2.4.6L18 21l-.6-2.4L15 18l2.4-.6z" /></>,
  arrowLeft: <><path d="m11 5-7 7 7 7M4 12h16" /></>,
  arrowRight: <><path d="m13 5 7 7-7 7M20 12H4" /></>,
  arrowUp: <><path d="m12 19V5M6 11l6-6 6 6" /></>,
  chevronDown: <path d="m7 10 5 5 5-5" />,
  upload: <><path d="M12 16V4M8 8l4-4 4 4" /><path d="M5 14v5h14v-5" /></>,
  phone: <><path d="M8 4 5.5 6.5c-.7.7-.8 1.8-.3 2.7 2 3.9 5.2 7.1 9.1 9.1.9.5 2 .4 2.7-.3l2.5-2.5-3.4-2.3-1.8 1.4a13 13 0 0 1-5-5L10.8 8z" /></>,
  shield: <><path d="M12 3 19 6v5c0 4.5-2.7 7.7-7 10-4.3-2.3-7-5.5-7-10V6z" /><path d="m8.8 12 2.1 2.1 4.3-4.5" /></>,
  compare: <><path d="M4 7h10M14 5l2 2-2 2M20 17H10M10 15l-2 2 2 2" /></>,
  info: <><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8h.01" /></>,
  person: <><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  summary: <><path d="M6 4h12v16H6z" /><path d="M9 8h6M9 12h6M9 16h4" /></>,
  skills: <><circle cx="7" cy="7" r="2" /><circle cx="17" cy="7" r="2" /><circle cx="7" cy="17" r="2" /><path d="M9 7h6M7 9v6M9 17h8" /></>,
  experience: <><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M9 7V5h6v2M4 12h16" /></>,
  education: <><path d="m3 10 9-5 9 5-9 5z" /><path d="M7 13v4c2.5 2 7.5 2 10 0v-4M21 10v5" /></>,
  project: <><rect x="4" y="5" width="16" height="14" rx="2" /><path d="M8 5V3h8v2M8 12h8M12 9v6" /></>,
  certificate: <><rect x="5" y="4" width="14" height="12" rx="2" /><path d="m9 20 3-4 3 4v-4M9 8h6" /></>,
  language: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" /></>,
  award: <><circle cx="12" cy="9" r="4" /><path d="m9 13-1 7 4-2 4 2-1-7" /></>,
  interests: <><path d="M12 20s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 8a3.8 3.8 0 0 1 7 2.8C19 15.7 12 20 12 20z" /></>,
  custom: <><rect x="5" y="5" width="14" height="14" rx="3" /><path d="M12 8v8M8 12h8" /></>,
  website: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4a12 12 0 0 1 0 16M12 4a12 12 0 0 0 0 16" /></>,
  moon: <path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5z" />,
  sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" /></>,
};

/** A small, consistent SVG icon system used throughout the resume builder. */
export default function ResumeIcon({ name, size = 18, strokeWidth = 1.8, className = '', title, ...props }) {
  const graphic = ICONS[name] || ICONS.document;
  return (
    <svg
      className={`resume-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      {...props}
    >
      {title && <title>{title}</title>}
      {graphic}
    </svg>
  );
}
