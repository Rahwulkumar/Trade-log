/**
 * TradeLog Custom Icon System
 * Hand-crafted SVG icons — NOT generic Lucide defaults.
 * All icons designed for a 20×20 viewBox, 1.5px stroke-width.
 * Each icon has a distinctive form relating to trading/data domains.
 */

import { cn } from "@/lib/utils";

interface IconProps {
  className?: string;
  size?: number;
  strokeWidth?: number;
}

// ─── Core icon wrapper ─────────────────────────────────────────────────────
function Icon({
  children,
  className,
  size = 18,
  strokeWidth = 1.5,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

// ─── Dashboard — a grid of three asymmetric blocks ─────────────────────────
// Feels like a terminal dashboard layout, not a grid of identical squares
export function IconDashboard(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="2" width="7" height="11" rx="1.5" />
      <rect x="11" y="2" width="7" height="5" rx="1.5" />
      <rect x="11" y="9" width="7" height="9" rx="1.5" />
      <rect x="2" y="15" width="7" height="3" rx="1.5" />
    </Icon>
  );
}

// ─── Trades — two crossed arrows with a price tag ─────────────────────────
// Represents the act of entering and exiting a position
export function IconTrades(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Up arrow (long) */}
      <path d="M5 14 L5 6 M5 6 L2.5 8.5 M5 6 L7.5 8.5" />
      {/* Down arrow (short) */}
      <path d="M15 6 L15 14 M15 14 L12.5 11.5 M15 14 L17.5 11.5" />
      {/* Crossbar */}
      <path d="M5 10 L15 10" strokeDasharray="2 2" />
    </Icon>
  );
}

// ─── Analytics — stepped area chart with a data point marker ──────────────
export function IconAnalytics(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Area chart silhouette */}
      <path
        d="M2 15 L6 9 L10 11 L14 5 L18 8"
        strokeWidth={props.strokeWidth ?? 1.5}
      />
      {/* Dot at peak */}
      <circle cx="14" cy="5" r="1.5" fill="currentColor" stroke="none" />
      {/* Baseline */}
      <line x1="2" y1="17" x2="18" y2="17" strokeWidth={0.75} opacity={0.4} />
    </Icon>
  );
}

// ─── Calendar — month view with a highlighted day cell ────────────────────
export function IconCalendar(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Outer frame */}
      <rect x="2" y="4" width="16" height="14" rx="2" />
      {/* Top bar (header) */}
      <line x1="2" y1="8" x2="18" y2="8" />
      {/* Hinge pins */}
      <line x1="6.5" y1="2" x2="6.5" y2="5.5" strokeWidth={1.75} />
      <line x1="13.5" y1="2" x2="13.5" y2="5.5" strokeWidth={1.75} />
      {/* Highlighted day — filled small square */}
      <rect
        x="12"
        y="11"
        width="3.5"
        height="3.5"
        rx="0.75"
        fill="currentColor"
        stroke="none"
      />
    </Icon>
  );
}

// ─── Playbooks — open book with a bookmark ribbon ─────────────────────────
export function IconPlaybooks(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Left page */}
      <path d="M10 16.5 C10 16.5 5.5 15 3 16 L3 4 C5.5 3 10 4.5 10 4.5" />
      {/* Right page */}
      <path d="M10 16.5 C10 16.5 14.5 15 17 16 L17 4 C14.5 3 10 4.5 10 4.5" />
      {/* Spine */}
      <line x1="10" y1="4.5" x2="10" y2="16.5" />
      {/* Bookmark ribbon right */}
      <path
        d="M15 2.5 L15 7.5 L16.6 6.4 L18.2 7.5 L18.2 2.5 Z"
        strokeWidth={1}
      />
    </Icon>
  );
}

// ─── Strategies — a decision tree / branching path ────────────────────────
export function IconStrategies(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Root node */}
      <circle cx="10" cy="4" r="1.75" fill="currentColor" stroke="none" />
      {/* Stem */}
      <line x1="10" y1="5.75" x2="10" y2="8.5" />
      {/* Branch left */}
      <path d="M10 8.5 L5.5 11.5" />
      {/* Branch right */}
      <path d="M10 8.5 L14.5 11.5" />
      {/* Left leaf */}
      <rect x="3" y="11.5" width="5" height="5" rx="1.5" />
      {/* Right leaf */}
      <rect x="12" y="11.5" width="5" height="5" rx="1.5" />
    </Icon>
  );
}

// ─── Journal — a notebook with a pen line ─────────────────────────────────
export function IconJournal(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Notebook body */}
      <rect x="4" y="2" width="12" height="16" rx="1.5" />
      {/* Spiral holes */}
      <circle cx="4" cy="6" r="1" fill="none" />
      <circle cx="4" cy="10" r="1" fill="none" />
      <circle cx="4" cy="14" r="1" fill="none" />
      {/* Text lines */}
      <line x1="7.5" y1="7" x2="14" y2="7" />
      <line x1="7.5" y1="10" x2="14" y2="10" />
      <line x1="7.5" y1="13" x2="11" y2="13" />
    </Icon>
  );
}

// ─── Reports — a doc with a bar chart inside ──────────────────────────────
export function IconReports(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Document outline */}
      <path d="M5 2.5 L5 17.5 Q5 18 5.5 18 L14.5 18 Q15 18 15 17.5 L15 6 L11 2.5 Z" />
      {/* Folded corner */}
      <path d="M11 2.5 L11 6 L15 6" strokeWidth={1} />
      {/* Mini bar chart inside */}
      <line x1="7.5" y1="14.5" x2="7.5" y2="11.5" strokeWidth={1.75} />
      <line x1="10" y1="14.5" x2="10" y2="9.5" strokeWidth={1.75} />
      <line x1="12.5" y1="14.5" x2="12.5" y2="12.5" strokeWidth={1.75} />
    </Icon>
  );
}

// ─── Weekly — a calendar with a week bracket above ────────────────────────
export function IconWeekly(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Column group representing a week */}
      <rect x="2" y="8" width="2.5" height="9" rx="1" />
      <rect x="5.75" y="5" width="2.5" height="12" rx="1" />
      <rect x="9.5" y="7" width="2.5" height="10" rx="1" />
      <rect x="13.25" y="3" width="2.5" height="14" rx="1" />
      <rect x="17" y="9" width="1" height="8" rx="0.5" />
      {/* Bracket at top */}
      <path d="M2 6 L2 3.5 L18 3.5 L18 6" strokeWidth={1} opacity={0.5} />
    </Icon>
  );
}

// ─── Prop Firm / Accounts — building with a vertical pulse meter ──────────
export function IconPropFirm(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Building silhouette */}
      <rect x="3" y="6" width="9" height="12" rx="1" />
      {/* Windows */}
      <rect
        x="4.5"
        y="8"
        width="2"
        height="2"
        rx="0.4"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="7.5"
        y="8"
        width="2"
        height="2"
        rx="0.4"
        fill="currentColor"
        stroke="none"
      />
      <rect
        x="4.5"
        y="12"
        width="2"
        height="2"
        rx="0.4"
        fill="currentColor"
        stroke="none"
      />
      {/* Pulse meter on right (risk indicator) */}
      <path d="M15 18 L15 14 L16.5 11 L18 14 L18 18" strokeWidth={1.5} />
      <line
        x1="13.5"
        y1="18"
        x2="18"
        y2="18"
        strokeWidth={0.75}
        opacity={0.4}
      />
    </Icon>
  );
}

// ─── Settings — a custom gear with offset teeth ───────────────────────────
export function IconSettings(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="10" r="2.75" />
      <path
        d="M10 2 L10 4 M10 16 L10 18 M2 10 L4 10 M16 10 L18 10
               M4.22 4.22 L5.64 5.64 M14.36 14.36 L15.78 15.78
               M15.78 4.22 L14.36 5.64 M5.64 14.36 L4.22 15.78"
      />
    </Icon>
  );
}

// ─── Chevron right (sidebar collapse / expand) ────────────────────────────
export function IconChevronRight(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M7.5 4L13.5 10L7.5 16" />
    </Icon>
  );
}

// ─── Logo mark — a stylised candlestick + upward arrow ────────────────────
// Used in the sidebar header replacing generic icon
export function IconLogoMark({
  size = 24,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {/* Candlestick body */}
      <rect
        x="4"
        y="8"
        width="5"
        height="9"
        rx="1"
        fill="currentColor"
        opacity={0.9}
      />
      {/* Wick top */}
      <line
        x1="6.5"
        y1="3.5"
        x2="6.5"
        y2="8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Wick bottom */}
      <line
        x1="6.5"
        y1="17"
        x2="6.5"
        y2="20.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Rising arrow — stylised trendline */}
      <path
        d="M13 18 L19.5 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Arrowhead */}
      <path
        d="M15.5 5.5 L19.5 6 L19 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

// ─── Plus / Add ───────────────────────────────────────────────────────────
export function IconPlus(props: IconProps) {
  return (
    <Icon {...props}>
      <line x1="10" y1="3" x2="10" y2="17" />
      <line x1="3" y1="10" x2="17" y2="10" />
    </Icon>
  );
}

// ─── Search — an angled magnifier with offset handle ─────────────────────
export function IconSearch(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="8.5" cy="8.5" r="5.5" />
      <line x1="13" y1="13" x2="17.5" y2="17.5" strokeWidth={2} />
    </Icon>
  );
}

// ─── Filter — a funnel with distinct tiers ─────────────────────────────────
export function IconFilter(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Funnel shape */}
      <path d="M2.5 4 L17.5 4 L12 9.5 L12 16.5 L8 14.5 L8 9.5 Z" />
    </Icon>
  );
}

// ─── Edit / Pencil — angled with distinct eraser end ─────────────────────
export function IconEdit(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 17L4.5 12L13.5 3L17 6.5L8 15.5Z" />
      <line x1="11.5" y1="4.5" x2="15.5" y2="8.5" />
      {/* Eraser block */}
      <path
        d="M3 17 L7.5 17 L4.5 14 Z"
        fill="currentColor"
        stroke="none"
        opacity={0.5}
      />
    </Icon>
  );
}

// ─── Delete / Trash — container with slash lid ────────────────────────────
export function IconDelete(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Can */}
      <path d="M4.5 7 L5.5 17 Q5.5 18 6.5 18 L13.5 18 Q14.5 18 14.5 17 L15.5 7" />
      {/* Lid */}
      <line x1="2.5" y1="7" x2="17.5" y2="7" />
      {/* Handle */}
      <path d="M8 7 L8 5 Q8 4 9 4 L11 4 Q12 4 12 5 L12 7" />
      {/* Vertical slots */}
      <line x1="8.5" y1="10" x2="8.5" y2="15" strokeWidth={1} />
      <line x1="11.5" y1="10" x2="11.5" y2="15" strokeWidth={1} />
    </Icon>
  );
}

// ─── Close / X ────────────────────────────────────────────────────────────
export function IconClose(props: IconProps) {
  return (
    <Icon {...props}>
      <line x1="4" y1="4" x2="16" y2="16" />
      <line x1="16" y1="4" x2="4" y2="16" />
    </Icon>
  );
}

// ─── Arrow up (profit/gain indicator) ────────────────────────────────────
export function IconArrowUp(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 16 L10 4 M4 10 L10 4 L16 10" />
    </Icon>
  );
}

// ─── Arrow down (loss indicator) ─────────────────────────────────────────
export function IconArrowDown(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 4 L10 16 M4 10 L10 16 L16 10" />
    </Icon>
  );
}

// ─── Dots / More options (hover actions) ─────────────────────────────────
export function IconMore(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="4.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="10" cy="10" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="15.5" cy="10" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ─── Download / Export ───────────────────────────────────────────────────
export function IconDownload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 3 L10 13 M6 9 L10 13 L14 9" />
      <path d="M3 16 L3 18 Q3 18.5 3.5 18.5 L16.5 18.5 Q17 18.5 17 18 L17 16" />
    </Icon>
  );
}

// ─── Upload / Import ─────────────────────────────────────────────────────
export function IconUpload(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 13 L10 3 M6 7 L10 3 L14 7" />
      <path d="M3 16 L3 18 Q3 18.5 3.5 18.5 L16.5 18.5 Q17 18.5 17 18 L17 16" />
    </Icon>
  );
}

// ─── Loader — animated arc spinner ──────────────────────────────────────
export function IconLoader({
  size = 18,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("animate-spin shrink-0", className)}
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="2"
        opacity={0.2}
      />
      <path
        d="M12 3 A9 9 0 0 1 21 12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ─── Tag (Playbook/Strategy tag indicator) ───────────────────────────────
export function IconTag(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 3 L3 10.5 L11.5 19 Q12 19.5 12.5 19 L18 13.5 Q18.5 13 18 12.5 L9.5 4 L3 3 Z" />
      <circle cx="7" cy="7" r="1.5" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ─── Alert / Warning triangle ────────────────────────────────────────────
export function IconWarning(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 2.5 L18.5 17.5 L1.5 17.5 Z" />
      <line x1="10" y1="9" x2="10" y2="13.5" strokeWidth={1.75} />
      <circle cx="10" cy="15.5" r="0.75" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ─── Check / Success ────────────────────────────────────────────────────
export function IconCheck(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M3 10.5 L8 15.5 L17 5" strokeWidth={2} />
    </Icon>
  );
}

// ─── Photo / Screenshot attachment ───────────────────────────────────────
export function IconPhoto(props: IconProps) {
  return (
    <Icon {...props}>
      <rect x="2" y="4" width="16" height="13" rx="1.5" />
      <circle cx="7" cy="9" r="2" />
      <path d="M2 14 L6 10.5 L9.5 13.5 L13 10 L18 14" />
    </Icon>
  );
}

// ─── Candlestick chart (for trade direction charts) ───────────────────────
export function IconCandlestick(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Three candles at different heights */}
      {/* Bearish */}
      <rect x="3" y="9" width="3.5" height="5" rx="0.75" />
      <line x1="4.75" y1="5" x2="4.75" y2="9" strokeWidth={1.25} />
      <line x1="4.75" y1="14" x2="4.75" y2="17" strokeWidth={1.25} />
      {/* Bullish */}
      <rect
        x="8.25"
        y="6"
        width="3.5"
        height="7"
        rx="0.75"
        fill="currentColor"
      />
      <line x1="10" y1="3" x2="10" y2="6" strokeWidth={1.25} />
      <line x1="10" y1="13" x2="10" y2="16" strokeWidth={1.25} />
      {/* Bullish small */}
      <rect
        x="13.5"
        y="8"
        width="3.5"
        height="5"
        rx="0.75"
        fill="currentColor"
      />
      <line x1="15.25" y1="5.5" x2="15.25" y2="8" strokeWidth={1.25} />
      <line x1="15.25" y1="13" x2="15.25" y2="15.5" strokeWidth={1.25} />
    </Icon>
  );
}

// ─── Risk / Shield indicator ─────────────────────────────────────────────
export function IconRisk(props: IconProps) {
  return (
    <Icon {...props}>
      <path d="M10 2 L18 5.5 L18 10.5 Q18 16.5 10 19 Q2 16.5 2 10.5 L2 5.5 Z" />
      <line x1="10" y1="7.5" x2="10" y2="12" strokeWidth={1.75} />
      <circle cx="10" cy="14" r="0.85" fill="currentColor" stroke="none" />
    </Icon>
  );
}

// ─── Notification bell (subtle, not generic) ─────────────────────────────
export function IconBell(props: IconProps) {
  return (
    <Icon {...props}>
      {/* Bell body */}
      <path d="M10 2 C6.7 2 4 4.7 4 8 L4 13 L2.5 15 L17.5 15 L16 13 L16 8 C16 4.7 13.3 2 10 2 Z" />
      {/* Clapper */}
      <path d="M8.5 15.5 Q8.5 17.5 10 17.5 Q11.5 17.5 11.5 15.5" />
      {/* Notification dot */}
      <circle
        cx="16"
        cy="4"
        r="2.5"
        fill="currentColor"
        stroke="none"
        opacity={0.85}
      />
    </Icon>
  );
}

// ─── User / Avatar ───────────────────────────────────────────────────────
export function IconUser(props: IconProps) {
  return (
    <Icon {...props}>
      <circle cx="10" cy="7" r="3.5" />
      <path d="M2.5 18 Q2.5 13 10 13 Q17.5 13 17.5 18" />
    </Icon>
  );
}
