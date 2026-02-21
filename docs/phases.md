# TradingJournal UI/UX Redesign — Phases Plan

> **Primary Design Benchmark:** [CONIYEST SaaS Finance Dashboard by Sujon Hossain (Dribbble #26855212)](https://dribbble.com/shots/26855212-SaaS-Landing-Page)  
> **Guiding Principle:** Deep forest-dark background, electric green accents, data-dense cards, clean sidebar. Zero blue. Not a template — a professional tool with a distinct identity.

---

## 🎨 CONIYEST Design DNA (Benchmark Reference)

This Dribbble shot — the **CONIYEST** by Sujon Hossain — establishes a premium dark finance SaaS aesthetic characterized by:

- **Near-black forest-green canvas** (not pure black — has a warm greenish undertone)
- **Electric lime/green accents** for CTAs, active states, highlights
- **Extremely clean card layouts** with subtle borders and generous internal spacing
- **Data-first hierarchy** — numbers are prominent, labels recede
- **Zero blue** — the entire palette is anchored in green and neutral warm-grays

### Exact Color Palette (sourced from the Dribbble shot)

| Token                    | Hex                   | Role                                            |
| ------------------------ | --------------------- | ----------------------------------------------- |
| **Page Background**      | `#020907`             | Deep forest-black — the canvas                  |
| **Surface / Cards**      | `#0D1610`             | Card & panel backgrounds — slightly lifted      |
| **Surface Elevated**     | `#131F16`             | Modal, hover states, popover backgrounds        |
| **Border Subtle**        | `#1C2A1F`             | Card borders, dividers                          |
| **Border Active**        | `#2A3D2D`             | Focus states, active separators                 |
| **Accent Primary (CTA)** | `#4ECB06`             | Electric lime green — CTAs, active nav, links   |
| **Accent Muted**         | `#5C9B44`             | Secondary green — icons, less prominent accents |
| **Accent Soft BG**       | `rgba(78,203,6,0.10)` | Accent-tinted card backgrounds                  |
| **Profit**               | `#4ECB06`             | Positive P&L (shares accent green)              |
| **Loss**                 | `#FF4455`             | Losses — saturated red-rose (sharp contrast)    |
| **Warning**              | `#F0A500`             | Drawdown alerts, amber warnings                 |
| **Text Primary**         | `#F1F1F3`             | Headlines, data values — near white             |
| **Text Secondary**       | `#A1AFA5`             | Labels, hints, descriptions — muted green-gray  |
| **Text Tertiary**        | `#36463E`             | Disabled, placeholders — deep muted green       |
| **Sage Accent**          | `#918C65`             | Warm neutral for decorative/secondary elements  |

> **The key differentiation:** The background is NOT `#000000` — it is a very dark, forest-green near-black (`#020907`). Cards are only marginally lighter (`#0D1610`), creating depth through extreme subtlety. This makes the electric green accent (`#4ECB06`) pop with extraordinary contrast against the canvas.

### Typography System

| Role                       | Font             | Weight  | Specifics                               |
| -------------------------- | ---------------- | ------- | --------------------------------------- |
| **Display / Hero numbers** | `Syne`           | 700–800 | Geometric, editorial — for P&L headline |
| **UI / Body / Labels**     | `DM Sans`        | 400–600 | Replaces Geist — clean geometric        |
| **All numeric data**       | `JetBrains Mono` | 500     | Tabular figures — prices, %, R-values   |

> Load via `next/font/google`: `Syne` (600,700,800) + `DM Sans` (400,500,600) + `JetBrains Mono` (400,500)

### Shape Language

- Card radius: `10px` — not too round, not sharp
- Button radius: `8px`
- Badge radius: `6px` (data badges), `999px` (status pills)
- **No drop shadows** — depth through border contrast only
- Border weight: always `1px` — never thicker

### Sidebar Reference (CONIYEST-style)

The CONIYEST design uses a left sidebar with:

- Very dark background (`#0D1610`) — practically invisible against page canvas, unified
- Minimal thin `1px` right-border separator
- Logo at top with breathing room (~`64px` tall logo zone)
- Nav items: icon (20px) + label side by side, `14px DM Sans 500`
- Active state: electric green `#4ECB06` text + icon tint + very subtle `accent-soft` bg rectangle
- Section labels: all-caps `10px DM Sans 600`, muted `#36463E` color
- No hover decorations — instant color shift on hover, no scale/shadow

---

## 📋 Phase Breakdown

---

## Phase 1 — Design System Foundation

> **Goal:** Completely rebuild the design token layer. Every component in every subsequent phase derives from this. **Do not start any other phase until Phase 1 is locked.**

### 1.1 Global CSS Variables (`globals.css`)

Replace the entire `:root {}` block:

```css
/* CONIYEST-inspired Design Tokens */
--app-bg: #020907;
--surface: #0d1610;
--surface-elevated: #131f16;
--surface-hover: #192b1c;

--border-subtle: #1c2a1f;
--border-default: #243228;
--border-active: #2a3d2d;

--accent-primary: #4ecb06;
--accent-muted: #5c9b44;
--accent-soft: rgba(78, 203, 6, 0.1);
--accent-soft-hover: rgba(78, 203, 6, 0.16);

--profit-primary: #4ecb06;
--profit-bg: rgba(78, 203, 6, 0.1);
--loss-primary: #ff4455;
--loss-bg: rgba(255, 68, 85, 0.1);
--warning-primary: #f0a500;
--warning-bg: rgba(240, 165, 0, 0.12);

--text-primary: #f1f1f3;
--text-secondary: #a1afa5;
--text-tertiary: #36463e;
--text-accent: #4ecb06;

--radius-sm: 6px;
--radius-default: 8px;
--radius-md: 10px;
--radius-lg: 12px;

/* Remove all --void-* tokens. Remove all blue-based accent tokens. */
```

**Light mode:** Suspend light mode for now — design this as a dark-first product aligned to CONIYEST's aesthetic.

### 1.2 Typography Migration (`app/layout.tsx`)

- Remove: `next/font/local` Geist imports
- Add: `next/font/google` — `Syne`, `DM_Sans`, `JetBrains_Mono`
- Apply to root: `font-family: DM Sans`
- `.mono` class: `JetBrains Mono` — used on all numerical data
- New class `.display`: `Syne 700` — used only for hero P&L number
- `.headline-xl`, `.headline-lg`, `.headline-md`: Switch to `DM Sans 600`
- `.text-label`: `DM Sans 600, 0.09em letter-spacing, uppercase, var(--text-tertiary)`

### 1.3 Surface Hierarchy

Three distinct surface levels replacing the current flat `card-void`:

```css
.surface {
  background: var(--surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
}
.surface-raised {
  background: var(--surface-elevated);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
}
.surface-accent {
  background: var(--accent-soft);
  border: 1px solid color-mix(in srgb, var(--accent-primary) 30%, transparent);
  border-radius: var(--radius-md);
}
```

Remove: `card-void`, `card-glow` — replace all usages with above.

### 1.4 Button System

```css
/* Only 4 button variants — no more btn-void, btn-glow, btn-accent */
.btn-primary {
  background: var(--accent-primary);
  color: #020907;
  font-weight: 600;
}
.btn-secondary {
  background: transparent;
  border: 1px solid var(--accent-primary);
  color: var(--accent-primary);
}
.btn-ghost {
  background: transparent;
  color: var(--text-secondary);
}
.btn-destructive {
  background: var(--loss-bg);
  border: 1px solid color-mix(in srgb, var(--loss-primary) 40%, transparent);
  color: var(--loss-primary);
}
```

All buttons: `DM Sans 500`, `8px` radius, `0.5rem 1rem` padding, `150ms ease` transition.

### 1.5 Badge System

```css
.badge            { border-radius: 6px; padding: 0.18rem 0.55rem; font-size: 0.69rem; DM Sans 500; }
.badge-profit     { background: var(--profit-bg); color: var(--profit-primary); border: 1px solid rgba(78,203,6,0.25); }
.badge-loss       { background: var(--loss-bg); color: var(--loss-primary); border: 1px solid rgba(255,68,85,0.25); }
.badge-warning    { background: var(--warning-bg); color: var(--warning-primary); }
.badge-accent     { background: var(--accent-soft); color: var(--accent-primary); }
.badge-neutral    { background: var(--surface-elevated); color: var(--text-secondary); border: 1px solid var(--border-subtle); }
```

### 1.6 Base Animation Tokens

```css
--ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
--transition-fast: 120ms var(--ease-spring);
--transition-default: 180ms var(--ease-spring);

.fade-in {
  animation: fade-in 220ms var(--ease-spring);
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Skeleton shimmer */
@keyframes shimmer {
  from {
    background-position: -200% 0;
  }
  to {
    background-position: 200% 0;
  }
}
.skeleton {
  background: linear-gradient(
    90deg,
    var(--surface) 25%,
    var(--surface-elevated) 50%,
    var(--surface) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s ease infinite;
}
```

---

## Phase 2 — Sidebar & App Layout

> **Goal:** Replace horizontal TopNav with a Tradezella/CONIYEST-style fixed left sidebar. This is a structural change that affects every page.

### 2.1 New Sidebar Component (`components/layout/sidebar-nav.tsx`)

Build from scratch — do not use or extend the shadcn `ui/sidebar.tsx`:

**Structural specs:**

- Position: `fixed left-0 top-0`, full height, `z-index: 40`
- Width: `220px` desktop, icon-only `60px` on mobile (or hidden with hamburger)
- Background: `var(--surface)` with `border-right: 1px solid var(--border-subtle)`
- No box-shadow

**Logo zone (`h-16`):**

- Custom SVG logo mark (small geometric trading icon) + "TradeLog" wordmark in `Syne 700`
- Color: `var(--accent-primary)` for the mark, `var(--text-primary)` for wordmark

**Navigation sections:**

```
MAIN
  ⊡  Dashboard          /dashboard
  ↕  Trades             /trades
  📈  Analytics          /analytics
  📅  Calendar           /calendar

STRATEGY
  📖  Playbooks          /playbooks
  ⚡  Strategies         /strategies
  📓  Journal            /journal

PERFORMANCE
  📊  Reports            /reports
  📋  Weekly             /weekly

ACCOUNTS
  🏢  Prop Firm          /prop-firm
```

**Nav item specs:**

- Height: `40px`, padding-inline: `12px`, border-radius: `8px`
- Icon: `18px`, stroke-width `1.5`, lucide icons (keep current icons)
- Label: `DM Sans 500`, `13px`, `var(--text-secondary)`
- **Hover:** `background: var(--surface-elevated)`, label → `var(--text-primary)`, transition `120ms`
- **Active:** `background: var(--accent-soft)`, `border-left: 2px solid var(--accent-primary)`, label + icon → `var(--accent-primary)`

**Section label:**

- `text-label` style: `10px DM Sans 600 uppercase`, color `var(--text-tertiary)`, `margin: 20px 12px 6px`

**Bottom zone:**

- Prop account selector (moved from TopNav) — compact `Select` with `Building2` icon
- `border-top: 1px solid var(--border-subtle)`, padding `12px`
- Settings icon link + theme toggle (icon only, no label)

### 2.2 App Layout Shell (`app/layout.tsx`)

- Remove `<TopNav />` entirely
- Replace with flex layout: `<SidebarNav />` (220px) + `<main>` (flex-1)
- Main content: `background: var(--app-bg)`, `min-height: 100vh`, `padding: 2.5rem`
- Page max-width: `1140px` centered within content area

### 2.3 Page Shell (`page-primitives.tsx`)

- `AppPageHeader`: `eyebrow` in `.text-label`, `title` in `.headline-lg DM Sans 600`
- `AppPanel` → renamed to `.surface` class usage
- `AppMetricCard`: update to use new surface + JetBrains Mono for numbers

---

## Phase 3 — Dashboard Redesign

> **Goal:** Hero trading terminal feel. Every number has intent. Every card earns its space.

### 3.1 Hero Performance Section

Architecture:

```
┌─────── CONIYEST-style hero zone ──────────────────────────────────────┐
│ text-label: "February 2026 Performance"                               │
│                                                                       │
│ +$12,840.00        ← Syne 700, clamp(3rem,5vw,4.5rem), profit-color  │
│                                                                       │
│ [Win Rate 67.4%] [36 Trades] [Profit Factor 2.1] ← badge-neutral     │
│ ▲ +18.4% vs Jan   ← small badge-profit chip                          │
└───────────────────────────────────────────────────────────────────────┘
```

- Hero zone: `surface` card with very subtle `radial-gradient(circle at 20% 50%, rgba(78,203,6,0.04), transparent)` glow
- P&L in `.display` class (Syne 700)
- Three inline stat pills: `badge-neutral` style with separator dots between them

### 3.2 Quick Stats 4-up Grid

- Cards: `surface` class, `padding: 1.25rem`
- Each card: `.text-label` (label) + `.stat-large JetBrains Mono` (value) + optional delta badge
- Profit/loss color only on the value, card bg stays `var(--surface)`

### 3.3 Equity Curve (2/3 width)

- Wire up period selector (1W/1M/3M/YTD) to actual state — currently non-functional
- Period toggle: custom pill segmented control (not shadcn buttons) with `accent-soft` active state
- Chart: area with gradient fill — profit area gets `rgba(78,203,6,0.15)→0` gradient

### 3.4 Daily Performance (1/3 width)

- Keep weekday bar chart, improve bar styling (rounded tops, accent green for positive)
- Add "Best Day" chip below chart

### 3.5 Top Strategies

- Redesign as ranked list: `#1 Breakout  67% WR  +$2,340`
- Thin accent-green left border on top-ranked item

### 3.6 Prop Firm Card

- Circular arc progress for profit target (SVG arc, not a bar)
- Drawdown meters: segmented risk indicator (green→amber→red zones)

### 3.7 Recent Trades

- Apply new trade row design (see Phase 4)

### 3.8 Page Load Animation

- Each section fades in with `translateY(6px)→0`, staggered `60ms` delay per block
- Pure CSS with `animation-delay` and `animation-fill-mode: both`

---

## Phase 4 — Trades Page Redesign

> **Goal:** Dense, fast, readable. Like a trading terminal blotter.

### 4.1 Trade Row Design

Every row is a mini data panel:

```
│▎ LONG │ EURUSD │ Feb 14, 10:32 │ @1.0845 │ +$340.00 │ +1.8R │ [Breakout] │
  ↑green border
```

- `3px` left border: `var(--accent-primary)` for LONG, `var(--loss-primary)` for SHORT
- Symbol: `DM Sans 600 14px var(--text-primary)`
- P&L: `JetBrains Mono 600 14px` with profit/loss coloring
- R-Multiple: `badge-profit` or `badge-loss`
- Playbook: `badge-neutral` pill
- Actions: hidden until row hover — `MoreHorizontal` icon appears at right edge

### 4.2 Summary Row (above table, not cards)

- Single horizontal bar: `Total: 47 · Winners: 31 · Losers: 16 · Net P&L: +$8,420`
- `surface-raised` container, inline layout, smaller than full stat cards
- P&L value in `JetBrains Mono` with profit coloring

### 4.3 Filter Bar Redesign

- Replace dropdown Selects with **segmented toggle groups**:
  - Status: `All · Open · Closed`
  - Direction: `All · Long · Short`
- Each toggle: text-only, pill shape, accent-active state
- Search: compact, max-width `200px`, left icon

### 4.4 "Log Trade" Dialog Redesign

- Header: `surface-elevated` bg, `Syne 600` title
- 2-column grid form fields
- Required fields: electric green `•` dot prefix on label
- All number inputs: `JetBrains Mono` font
- Add: **Mistake Tags** multi-select (FOMO, Oversize, Early Exit, Chased Entry, Revenge Trade)
- Footer: `btn-primary` (green) + `btn-ghost` cancel — no border cancel button

---

## Phase 5 — Analytics Page Redesign

> **Goal:** From bar charts with empty space to a genuinely insight-rich analytics hub.

### 5.1 Metric Cards → 6-up

Add 2 new cards to the existing 4:

- **Max Drawdown** (warning tone)
- **Avg Hold Time** (neutral tone, in minutes/hours)

Layout: 6-column on desktop (3+3 on tablet, 2+2+2 on mobile)

### 5.2 Tab Navigation Upgrade

Replace shadcn `TabsList` with custom segmented control:

- Tabs: `Overview · By Asset · R-Distribution · Time Heatmap`
- Active: `surface-accent` bg, `var(--accent-primary)` text
- Inactive: `var(--text-secondary)` text
- Container: `surface width=fit-content` pill shape

### 5.3 NEW Tab: Time Performance Heatmap

A grid of `Hour of Day (6am–8pm cols)` × `Day of Week (Mon–Fri rows)`:

- Cell color intensity: green gradient for profit, rose for loss, neutral for no data
- Based on avg P&L per that hour/day slot across all trades
- Tooltip: shows `avg P&L: +$XXX | X trades`
- This fills the "performance by time of day" gap AND is a headline visual feature

### 5.4 Monthly P&L Chart Upgrade

- Increase chart height to `320px`
- Keep bar chart (cleaner for monthly discrete data)
- Green bars for profitable months, rose for losing months
- Remove all Recharts default grid lines — add only horizontal faint dashed lines at 0 and major amounts

### 5.5 By Asset — Data Table Format

Upgrade from list items to an inline table:

- Columns: Symbol · Trades · Win Rate (inline bar fill) · Avg R · Total P&L
- Win Rate bar: thin `4px` height accent-green fill within a neutral track
- All numbers in `JetBrains Mono`

---

## Phase 6 — Minor Pages Polish

> **Goal:** Apply the design system uniformly across all remaining pages.

### 6.1 Journal / Notebook

- Surface hierarchy: timeline = `surface`, main panel = `surface-raised`
- Psychology tags: convert to `badge-*` pills with color coding
- Notes textarea: `DM Sans`, `var(--surface-elevated)` bg, green focus ring

### 6.2 Playbooks

- Cards: `surface` with `surface-raised` on hover
- Win Rate: thin inline progress bar (accent-green fill)
- Stats: all in `JetBrains Mono`
- Active toggle: accent-green pill toggle (Active / Inactive)

### 6.3 Prop Firm

- Circular SVG arc progress for profit target
- Drawdown gauge: `green → amber → red` segmented bar with threshold markers
- Card layout: tighter spacing, bigger numbers

### 6.4 Reports

- Upgrade from raw shadcn `Card + Button` to design system components
- Icon container: `surface-accent` (green-tinted bg) for report type icon
- "Generate Report" button: `btn-secondary` (green border + text, clear bg)
- Even as placeholders — they must look real and polished

### 6.5 Calendar

- Day cells: subtle green tint for profit days, rose tint for loss days
- Today: `2px accent-green` border ring
- Apply `surface` container styling to calendar frame

### 6.6 Settings

- Section headers: `.text-label` style
- Input fields: `var(--surface-elevated)` bg, `var(--border-default)` border, green focus ring
- All using `DM Sans`

---

## Phase 7 — Micro-interactions & Final Polish

> **Goal:** The "alive" feel. Small details that separate a product from a layout.

### 7.1 Chart Animations

- Enable `isAnimationActive={true}` on all Recharts (already in library)
- Bars grow up, area curves draw right-to-left on mount

### 7.2 Number Count-Up (Dashboard hero)

- On data load: P&L number ticks from 0 to final value over `600ms`
- Simple `requestAnimationFrame` increment loop — no library needed

### 7.3 Skeleton Loading Screens

- Replace all `Loader2` spinners with skeleton screens matching actual content layout
- Dashboard: skeleton for hero section, skeleton cards (3 shimmer blocks each)
- Trades: skeleton rows (5–6 ghost rows of correct height)
- Analytics: skeleton chart placeholder (rectangular shimmer block)

### 7.4 Empty States (per page)

Each page gets its own purposeful empty state (inline SVG illustration):

- Dashboard: "Log your first trade to start building your performance story"
- Trades: "Your trade log is empty — ready to make history?"
- Analytics: "Analysis begins with data — start logging trades"
- All: `btn-primary` CTA to relevant action

### 7.5 Toast System

- Success: `profit-bg` tinted — "Trade logged ✓" — bottom right, 3s auto-dismiss
- Error: `loss-bg` tinted — dismissible
- Action: `accent-soft` tinted — "View details →" link option

### 7.6 Focus States

- All interactive elements: `outline: 2px solid var(--accent-primary)` on `:focus-visible`
- No blue browser default focus rings anywhere

---

## 🚀 Execution Order

```
Phase 1 (Foundation)   →  FIRST. Non-negotiable. Everything derives from tokens.
Phase 2 (Sidebar)      →  SECOND. Structural change that affects all pages.
Phase 3 (Dashboard)    →  First page users see — highest visual impact.
Phase 4 (Trades)       →  Most-used feature — high priority.
Phase 5 (Analytics)    →  Complex — includes new heatmap feature.
Phase 6 (Minor Pages)  →  Systematic cleanup pass.
Phase 7 (Polish)       →  Final layer — applied last for maximum effect.
```

---

## ⛔ Anti-Patterns (Never Do These)

- ❌ Any blue (`#3b82f6`, `#4d8dff`, `#60a5fa`) anywhere in the UI
- ❌ Geist/Inter/Roboto as body font — use DM Sans
- ❌ Pure black backgrounds (`#000000`) — use `#020907`
- ❌ Drop shadows on cards — use border contrast only
- ❌ Rounded bubbly corners (`20px+`) — max `12px`
- ❌ Gradient fills on buttons — flat solid accent color only
- ❌ Generic Lucide icon as empty state treatment
- ❌ Un-animated data tables
- ❌ Raw shadcn class names leaking into pages (`bg-card`, `text-muted-foreground`, `Card`, `Button`)
- ❌ More than 3 surface levels visible on one screen
- ❌ Purple/violet accents — this design is **green-anchored**, not purple

---

## ✅ Per-Phase Completion Checklist

Before marking any phase done:

- [ ] All numbers rendered in `JetBrains Mono`
- [ ] Color tokens only — no hardcoded hex in component files
- [ ] Hover states on every interactive element
- [ ] Loading = skeleton (not spinner)
- [ ] Empty state is contextual, not generic
- [ ] Active nav item is immediately obvious
- [ ] Zero raw shadcn classes visible in the rendered page
- [ ] Works at 1280px+ desktop width (primary target)

---

_Last updated: February 2026 | Design Benchmark: CONIYEST by Sujon Hossain (Dribbble #26855212)_
