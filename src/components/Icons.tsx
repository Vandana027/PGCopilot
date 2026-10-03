'use client';
import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { size?: number };
function I({size=18, children, ...props}: IconProps & {children: React.ReactNode}) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{children}</svg> }
export const LayoutDashboard=(p:IconProps)=><I {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></I>;
export const Building2=(p:IconProps)=><I {...p}><path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h7v18"/><path d="M14 8h5a1 1 0 0 1 1 1v12"/><path d="M8 7h2M8 11h2M8 15h2M17 12h1M17 16h1"/></I>;
export const Users=(p:IconProps)=><I {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></I>;
export const BedDouble=(p:IconProps)=><I {...p}><path d="M3 20v-8"/><path d="M21 20v-8"/><path d="M3 17h18"/><path d="M5 12V7a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3v4"/><path d="M14 12V9a2 2 0 0 1 2-2h2a3 3 0 0 1 3 3v2"/><path d="M3 20v1M21 20v1"/></I>;
export const IndianRupee=(p:IconProps)=><I {...p}><path d="M6 3h9"/><path d="M6 8h9"/><path d="M6 3c8 0 8 10 0 10l9 8"/><path d="M5 16h7"/></I>;
export const FileText=(p:IconProps)=><I {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></I>;
export const MessageCircle=(p:IconProps)=><I {...p}><path d="M20 11.5a8.4 8.4 0 0 1-9 8.5 9.1 9.1 0 0 1-4-.9L3 21l1.8-3.8A8.1 8.1 0 0 1 3 12a8.5 8.5 0 0 1 17-0.5Z"/><path d="M8 11h.01M12 11h.01M16 11h.01"/></I>;
export const BarChart3=(p:IconProps)=><I {...p}><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></I>;
export const Settings=(p:IconProps)=><I {...p}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/><path d="m19.4 15 .1.1a1.9 1.9 0 0 1-2.7 2.7l-.1-.1a1.9 1.9 0 0 0-3.2 1.3v.3a1.9 1.9 0 0 1-3.8 0V19a1.9 1.9 0 0 0-3.2-1.3l-.1.1a1.9 1.9 0 0 1-2.7-2.7l.1-.1A1.9 1.9 0 0 0 2.5 12H2.2a1.9 1.9 0 0 1 0-3.8h.3A1.9 1.9 0 0 0 3.8 5l-.1-.1a1.9 1.9 0 0 1 2.7-2.7l.1.1A1.9 1.9 0 0 0 9.7 1H10a1.9 1.9 0 0 1 3.8 0h.3a1.9 1.9 0 0 0 1.3 1.3l.1-.1a1.9 1.9 0 1 1 2.7 2.7l-.1.1a1.9 1.9 0 0 0 1.3 3.2h.3a1.9 1.9 0 0 1 0 3.8h-.3a1.9 1.9 0 0 0-1.3 3.2Z"/></I>;
export const ChevronDown=(p:IconProps)=><I {...p}><path d="m6 9 6 6 6-6"/></I>;
export const Plus=(p:IconProps)=><I {...p}><path d="M12 5v14M5 12h14"/></I>;
export const Search=(p:IconProps)=><I {...p}><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></I>;
export const Bell=(p:IconProps)=><I {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></I>;
export const ArrowUpRight=(p:IconProps)=><I {...p}><path d="M7 17 17 7M7 7h10v10"/></I>;
export const MoreHorizontal=(p:IconProps)=><I {...p}><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></I>;
export const Pencil=(p:IconProps)=><I {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></I>;
export const Check=(p:IconProps)=><I {...p}><path d="m5 12 4 4L19 6"/></I>;
export const LogOut=(p:IconProps)=><I {...p}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/></I>;

export const X=(p:IconProps)=><I {...p}><path d="m6 6 12 12M18 6 6 18"/></I>;
export const Menu=(p:IconProps)=><I {...p}><path d="M4 6h16M4 12h16M4 18h16"/></I>;
export const ArrowLeft=(p:IconProps)=><I {...p}><path d="m15 18-6-6 6-6"/></I>;
export const Upload=(p:IconProps)=><I {...p}><path d="M12 16V4"/><path d="m8 8 4-4 4 4"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></I>;
export const Download=(p:IconProps)=><I {...p}><path d="M12 4v12"/><path d="m8 12 4 4 4-4"/><path d="M4 20h16"/></I>;
export const ExternalLink=(p:IconProps)=><I {...p}><path d="M14 3h7v7"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></I>;
export const Smartphone=(p:IconProps)=><I {...p}><rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/></I>;
export const Sparkles=(p:IconProps)=><I {...p}><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="M12 7a5 5 0 0 0 5 5 5 5 0 0 0-5 5 5 5 0 0 0-5-5 5 5 0 0 0 5-5Z"/></I>;
export const Trash2=(p:IconProps)=><I {...p}><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></I>;

export const Edit2 = Pencil;
