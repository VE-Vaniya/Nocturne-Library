import React from 'react';

export const IconGallery = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconLibrary = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14" /><path d="M4 19a2 2 0 002 2h13M4 19a2 2 0 002-2" /><path d="M9 7h6m-6 4h6" />
  </svg>
);

export const IconProfile = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);

export const IconSearch = (props) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <circle cx="11" cy="11" r="7" /><path d="M16.5 16.5L21 21" />
  </svg>
);

export const IconBell = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M18 16v-5a6 6 0 00-12 0v5H4l2 2h12l2-2h-2z" /><path d="M10 19a2 2 0 004 0" />
  </svg>
);

export const IconMenu = (props) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M3 12h18M3 6h18M3 18h18" />
  </svg>
);

export const IconClose = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export const IconFlame = (props) => (
  <svg width="22" height="22" fill="none" stroke="#d56038" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M12 2c0 0-5 6.55-5 12 0 2.76 2.24 5 5 5s5-2.24 5-5c0-5.45-5-12-5-12z" />
    <path d="M12 10c-1 2-1 4.5 0 6" />
  </svg>
);

export const IconBookOutline = (props) => (
  <svg width="22" height="22" fill="none" stroke="#c4a572" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14M4 19a2 2 0 002 2h13M4 19a2 2 0 002-2h13" />
    <path d="M9 7h6M9 11h6" />
  </svg>
);

export const IconLayout = (props) => (
  <svg width="22" height="22" fill="none" stroke="#756452" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 3v18M3 9h6M15 3v18" />
  </svg>
);

export const IconTrophy = (props) => (
  <svg width="22" height="22" fill="none" stroke="#5a7e63" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M8 21h8M12 17v4M7 4h10M6 4v5c0 3.31 2.69 6 6 6s6-2.69 6-6V4" />
    <path d="M6 5H4a2 2 0 00-2 2v1a4 4 0 004 4h0M18 5h2a2 2 0 012 2v1a4 4 0 01-4 4h0" />
  </svg>
);

export const IconQuote = ({ width = 32, height = 32, fill = "#bc9f6b", opacity = 0.4, ...props }) => (
  <svg width={width} height={height} fill={fill} viewBox="0 0 24 24" opacity={opacity} {...props}>
    <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z"/>
  </svg>
);

export const IconStarFilled = (props) => (
  <svg width="14" height="14" fill="#c4a572" viewBox="0 0 24 24" {...props}>
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
  </svg>
);

export const IconStarEmpty = (props) => (
  <svg width="14" height="14" fill="#e6dfcc" viewBox="0 0 24 24" {...props}>
    <path d="M12 .587l3.668 7.568 8.332 1.151-6.064 5.828 1.48 8.279-7.416-3.967-7.417 3.967 1.481-8.279-6.064-5.828 8.332-1.151z"/>
  </svg>
);

export const IconBookSmall = (props) => (
  <svg width="16" height="16" fill="none" stroke="#a4937e" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M4 19V5a2 2 0 012-2h13a1 1 0 011 1v14M4 19a2 2 0 002 2h13" />
  </svg>
);

export const IconChevronRight = (props) => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M9 18l6-6-6-6" />
  </svg>
);

export const IconEditPen = (props) => (
  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

export const IconPlus = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconDashboard = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

export const IconExplore = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="10" /><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
  </svg>
);

export const IconNotes = (props) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" {...props}>
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" />
  </svg>
);

export const IconBookmark = (props) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" {...props}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
);

export const IconTimer = (props) => (
  <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /><path d="M9 2h6" />
  </svg>
);

export const IconLogout = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);

export const IconNetwork = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <circle cx="12" cy="12" r="3" />
    <circle cx="19" cy="6" r="2" />
    <circle cx="5" cy="6" r="2" />
    <circle cx="12" cy="19" r="2" />
    <path d="M13 10.5l4.5-3M11 10.5L6.5 7.5M12 15v2" />
  </svg>
);

export const IconRead = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

export const IconTag = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

export const IconEye = (props) => (
  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const IconTrash = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
  </svg>
);

export const IconCheck = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const IconGhost = (props) => (
  <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" {...props}>
    <path d="M12 2a9 9 0 00-9 9v11a1 1 0 001 1h4l2-2 2 2 2-2 2 2 2-2 2 2 1-1V11a9 9 0 00-9-9zM9 10a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
  </svg>
);

export const IconMail = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

export const IconStar = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
  </svg>
);

export const IconUserPlus = (props) => (
  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" {...props}>
    <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6M23 11h-6" />
  </svg>
);
