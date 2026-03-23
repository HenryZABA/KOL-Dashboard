# KOL Campaign Management Dashboard — Implementation Plan

## Context
Build an internal KOL campaign management dashboard for a marketing team. Frontend-only with mock data (Supabase integration deferred). Visual style: Linear/Notion-inspired ops-tool aesthetic — dark sidebar, white main content, Inter font, high information density, subtle gray borders.

## Architecture Overview

### Data Layer
- `src/lib/mock-data.ts` — All mock KOL, agency, and changelog data + TypeScript types
- `src/lib/kol-store.ts` — Zustand-like React context store for CRUD operations on mock data (add KOL, update status, toggle focus, etc.)

### Design System Updates
- `src/index.css` — Dark sidebar tokens, stage color tokens, overdue/warning colors, Inter font import
- `tailwind.config.ts` — Add Inter font family, custom stage colors
- `src/components/ui/badge.tsx` — Add `stage`, `platform`, `agency`, `overdue` badge variants
- `src/components/ui/button.tsx` — Add `action` variant (blue primary action buttons for agency portal)

### Routing (src/router.tsx)
```
/login                → LoginPage
/dashboard            → DashboardLayout wrapper
  /dashboard          → TodaysFocusPage (default)
  /dashboard/kols     → AllKolsKanbanPage
  /dashboard/agencies → AgenciesPage
  /dashboard/settings → SettingsPage
/agency/:token        → AgencyPortalPage (no auth, token-based)
```

### Component Tree

```
src/
├── lib/
│   ├── mock-data.ts          # Types + seed data
│   └── kol-store.tsx         # React context for KOL state management
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx    # Sidebar + main content wrapper
│   │   ├── AppSidebar.tsx         # Dark sidebar with nav items
│   │   └── SummaryBar.tsx         # Top bar: total KOLs, stage pills, overdue count
│   ├── kol/
│   │   ├── KolFocusCard.tsx       # Horizontal scrollable card (Today's Focus)
│   │   ├── KolKanbanCard.tsx      # Kanban column card (All KOLs)
│   │   ├── KolKanbanColumn.tsx    # Single kanban column with header count
│   │   ├── PlatformIcon.tsx       # YouTube/TikTok/Instagram/X icons
│   │   └── StageLabel.tsx         # Stage badge with parallel stage support
│   └── agency/
│       ├── AgencyKolTable.tsx     # KOL table for agency portal
│       ├── AddKolForm.tsx         # Add new KOL form
│       ├── KolDetailPanel.tsx     # Side panel for KOL detail + status update
│       └── ChangeLog.tsx          # Timeline of status changes
├── pages/
│   ├── LoginPage.tsx
│   ├── TodaysFocusPage.tsx
│   ├── AllKolsKanbanPage.tsx
│   ├── AgenciesPage.tsx
│   ├── SettingsPage.tsx
│   └── AgencyPortalPage.tsx
```

---

## Detailed Implementation

### Phase 1: Foundation (Prompt 1)

#### 1a. Design System (`index.css` + `tailwind.config.ts`)
- Import Inter font via Google Fonts in `index.html`
- Update `:root` tokens for the ops-tool look:
  - Dark sidebar: `--sidebar-background: 220 14% 10%` (near-black), `--sidebar-foreground: 210 20% 90%`
  - Subtle gray borders: `--border: 220 13% 91%`
  - Stage colors as CSS variables: `--stage-idea`, `--stage-script`, `--stage-video`, `--stage-confirm`, `--stage-published`
  - Overdue indicator: `--overdue: 0 84% 60%` (red), `--overdue-bg: 0 84% 97%`
  - `--shadow-card: 0 1px 3px 0 rgb(0 0 0 / 0.04)`

#### 1b. Mock Auth (`LoginPage.tsx`)
- Minimal login form: email + password fields, "Sign in" button
- On submit, store a flag in localStorage (`kol-auth=true`) and redirect to `/dashboard`
- Clean, centered card layout

#### 1c. Dashboard Layout (`DashboardLayout.tsx` + `AppSidebar.tsx`)
- Uses existing shadcn `SidebarProvider`, `Sidebar`, `SidebarInset` components
- Dark sidebar with brand logo at top
- Nav items: Today's Focus (Crosshair icon), All KOLs (Users icon), Agencies (Building2 icon), Settings (Settings icon)
- Active state highlight, `react-router-dom` `NavLink` integration
- Sidebar collapses to sheet on mobile (already built into shadcn Sidebar)
- Auth guard: redirect to `/login` if no auth flag

#### 1d. Summary Bar (`SummaryBar.tsx`)
- Horizontal bar at top of main content
- Shows: Total KOL count | Stage pill badges with counts | Overdue today count (red)
- Computed from mock data store

### Phase 2: Today's Focus (Prompt 2)

#### `TodaysFocusPage.tsx` + `KolFocusCard.tsx`
- Filter KOLs where: `daysInStage > 2` OR `isTodaysFocus === true`
- Horizontal scrollable container (`overflow-x-auto`, flex row, gap)
- Each card (`KolFocusCard`):
  - Left border: red if overdue, transparent otherwise
  - KOL name + `PlatformIcon` (lucide-react icons for YouTube/etc.)
  - Stage label — for parallel stages, show stacked sub-labels
  - Days waiting badge — red highlight if > 2
  - Agency name badge (secondary variant)
  - "View Details" button (ghost variant)
- Card style: compact, `shadow-card`, `border`, `rounded-lg`

### Phase 3: All KOLs Kanban (Prompt 3)

#### `AllKolsKanbanPage.tsx` + `KolKanbanColumn.tsx` + `KolKanbanCard.tsx`
- 5 columns: Writing Idea | Writing Script + Creating Project | Video Production | Pre-publish Confirmation | Published
- Filter bar at top: Agency dropdown, Platform dropdown, "Overdue only" toggle
- Each column header: stage name + count badge
- Each card shows:
  - KOL name + platform icons
  - Stage detail (for script/project column: two sub-rows; for video: version number)
  - Time in current stage
  - Agency badge
  - Overdue indicator (red dot via lucide `AlertCircle`) if > 2 days
  - Focus pin (lucide `Pin` icon) if flagged
- Columns scroll vertically independently
- No drag-and-drop in V1

### Phase 4: Agency Portal (Prompt 4)

#### `AgencyPortalPage.tsx` — Token-based access
- Route: `/agency/:token`
- Look up agency by token from mock data; show 404 if invalid
- No auth required

#### `AgencyKolTable.tsx` — Table view
- Columns: KOL name, Platform, Current Stage, Last Updated, Actions
- Uses existing shadcn `Table` components
- "Add KOL" button opens `AddKolForm`

#### `AddKolForm.tsx` — Dialog/sheet form
- Fields: Name (required), Platform (multi-select checkboxes), Profile URL, Content Direction, Notes
- Default status: Writing Idea
- Adds to mock data store

#### `KolDetailPanel.tsx` — Side panel (Sheet)
- Opens from right side
- Status update dropdown
- Conditional fields per stage:
  - Writing Script: version number input + "mark complete" checkbox
  - Creating Project: "mark complete" checkbox
  - Advance to Video Production only when both complete
  - Video Production: version number input
  - Pre-publish Confirmation: Feishu URL input
- "Flag for today's focus" toggle (Switch component)
- `ChangeLog.tsx` — Simple timeline list of past status changes with timestamps

---

## Mock Data Structure (`src/lib/mock-data.ts`)

```typescript
type Platform = 'youtube' | 'tiktok' | 'instagram' | 'x';
type Stage = 'writing_idea' | 'writing_script' | 'creating_project' | 'video_production' | 'pre_publish' | 'published';

interface KOL {
  id: string;
  name: string;
  platforms: Platform[];
  profileUrl?: string;
  contentDirection?: string;
  notes?: string;
  currentStage: Stage;
  scriptVersion?: number;
  scriptComplete?: boolean;
  projectComplete?: boolean;
  videoVersion?: number;
  feishuUrl?: string;
  isTodaysFocus: boolean;
  agencyId: string;
  stageUpdatedAt: string; // ISO date
  createdAt: string;
  changeLog: ChangeLogEntry[];
}

interface Agency {
  id: string;
  name: string;
  token: string; // URL access token
}

interface ChangeLogEntry {
  id: string;
  fromStage: Stage;
  toStage: Stage;
  timestamp: string;
  note?: string;
}
```

Seed with 3 agencies, ~12 KOLs across various stages, some overdue, some flagged.

## Key Files Modified
- `index.html` — Add Inter font
- `src/index.css` — Design tokens
- `tailwind.config.ts` — Font family + custom colors
- `src/router.tsx` — All new routes
- `src/App.tsx` — Unchanged
- `src/components/ui/badge.tsx` — New variants
- `src/components/ui/button.tsx` — New variant

## Key Files Created
- `src/lib/mock-data.ts`
- `src/lib/kol-store.tsx`
- `src/components/layout/DashboardLayout.tsx`
- `src/components/layout/AppSidebar.tsx`
- `src/components/layout/SummaryBar.tsx`
- `src/components/kol/KolFocusCard.tsx`
- `src/components/kol/KolKanbanCard.tsx`
- `src/components/kol/KolKanbanColumn.tsx`
- `src/components/kol/PlatformIcon.tsx`
- `src/components/kol/StageLabel.tsx`
- `src/components/agency/AgencyKolTable.tsx`
- `src/components/agency/AddKolForm.tsx`
- `src/components/agency/KolDetailPanel.tsx`
- `src/components/agency/ChangeLog.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/TodaysFocusPage.tsx`
- `src/pages/AllKolsKanbanPage.tsx`
- `src/pages/AgenciesPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/pages/AgencyPortalPage.tsx`

## Verification
1. Navigate to `/login` — see minimal login form, submit redirects to `/dashboard`
2. Dashboard shows dark sidebar with 4 nav items, summary bar with KOL counts
3. Today's Focus shows horizontally scrollable cards with overdue highlighting
4. All KOLs shows 5-column kanban with filters
5. `/agency/[token]` shows agency-specific KOL table with CRUD operations
6. Side panel allows status updates with stage-specific fields
7. Responsive: sidebar collapses on mobile
8. Run `pnpm lint` — no errors
