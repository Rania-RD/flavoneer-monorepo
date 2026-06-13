# Food R&D Lab — Design, Pattern & Interface Guide

> The single source of truth for every visual, interaction, and architectural decision in the Food R&D Lab Manager.

---

## 2. Color System

### 2.1 Core Palette

```
Light Background:  #FDFCF6  (warm off-white, page base)
Warm Card BG:      #FAF5F0  (profile header, focus cards)
White Card:        #FFFFFF
Dark Background:   #0f172a  (Slate 900)
Dark Card:         #1e293b  (Slate 800)
```

### 2.2 Brand Accents

| Context                  | Light                     | Dark                      |
| ------------------------ | ------------------------- | ------------------------- |
| Primary CTA / Active Nav | `bg-gray-900` / `#1a1a1a` | `bg-indigo-600`           |
| Primary Hover            | `bg-gray-800`             | `bg-indigo-500`           |
| Primary Shadow           | `shadow-gray-900/20`      | `shadow-indigo-600/20–30` |
| Focus Ring               | `ring-gray-900/10`        | `ring-indigo-500/50`      |

### 2.3 Pastel Theme System (Cards)

Cards use a **deterministic** pastel theme derived from the item's ID. Each theme defines: `bg`, `text`, `bar`, `sub`, `border`.
| Theme | Light BG | Dark BG | Bar Color |
|-------|----------|---------|-----------|
| Rose | `bg-rose-100` | `bg-rose-900/20` | `bg-rose-500` |
| Violet | `bg-violet-100` | `bg-violet-900/20` | `bg-violet-500` |
| Blue | `bg-blue-100` | `bg-blue-900/20` | `bg-blue-600` / `blue-500` |
| Orange | `bg-orange-100` | `bg-orange-900/20` | `bg-orange-500` |
| Emerald | `bg-emerald-100` | `bg-emerald-900/20` | `bg-emerald-600` / `green-500` |
**Assignment logic** (from `ProjectCard.tsx`) — uses the char-code sum of the project ID modulo 5.
Inventory cards add two more: **Sky** (`#F0F9FF`), **Pink** (`#FDF2F8`), **Amber** (`#FFFBEB`).

### 2.4 Status Colors

```tsx
STATUS_COLORS = {
  Testing:   'bg-yellow-100 text-yellow-800 border-yellow-200',
  Prototype: 'bg-blue-100   text-blue-800   border-blue-200',
  Approved:  'bg-green-100  text-green-800  border-green-200',
  Review:    'bg-purple-100 text-purple-800 border-purple-200',
  On Hold:   'bg-gray-100   text-gray-800   border-gray-200',
}
```

### 2.5 Validation Colors

| State       | Text                               | Background                          |
| ----------- | ---------------------------------- | ----------------------------------- |
| Accepted ✅ | `text-emerald-700` / `emerald-300` | `bg-emerald-100` / `emerald-900/30` |
| Rejected ❌ | `text-rose-700` / `rose-300`       | `bg-rose-100` / `rose-900/30`       |
| Pending ⏳  | `text-gray-500` / `slate-400`      | `bg-gray-100` / `slate-800`         |
| Running 🔶  | `text-orange-700` / `orange-300`   | `bg-orange-100` / `orange-900/30`   |

---

## 3. Typography

### 3.1 Font Stack

```css
/* LTR */
font-family: 'Inter', sans-serif;
/* RTL */
font-family: 'Tajawal', sans-serif;
```

The font family is set dynamically on `document.body` via `SettingsContext` based on the active language.

### 3.2 Scale & Weight

| Role           | Tailwind Class         | Weight                               | Example                          |
| -------------- | ---------------------- | ------------------------------------ | -------------------------------- |
| Page Title     | `text-3xl md:text-4xl` | `font-bold`                          | "Invest in your innovation"      |
| Section Header | `text-2xl–3xl`         | `font-bold`                          | Card name, "78%" stat            |
| Card Title     | `text-2xl`             | `font-bold, leading-tight`           | Project name                     |
| Body/Label     | `text-sm`              | `font-medium`                        | Metadata, version, category      |
| Overline       | `text-xs`              | `font-bold uppercase tracking-wider` | Section labels ("LAB CAPACITY")  |
| Micro Label    | `text-[10px]`          | `font-bold / font-medium`            | Category pills, timestamp        |
| Mono Data      | `font-mono`            | `font-bold`                          | Batch codes, weight values, time |

### 3.3 Text Colors

```
Primary:     text-gray-900     dark:text-slate-100 / text-white
Secondary:   text-gray-500     dark:text-slate-400
Tertiary:    text-gray-400     dark:text-slate-500
Muted:       text-gray-300     dark:text-slate-600–700
```

---

## 4. Spacing & Layout

### 4.1 Page Structure

```
┌──────────────────────────────────────────────────┐
│  Sidebar (fixed, start-6, w-20)                  │
│  ┌────────────────────────────────────────────┐  │
│  │  <main> ms-32 p-6, max-w-[1600px]          │  │
│  │  ┌─────────────┐  ┌──────────────────┐     │  │
│  │  │ Left Panel  │  │  Main Content    │     │  │
│  │  │ w-80/xl:96  │  │  flex-1          │     │  │
│  │  └─────────────┘  └──────────────────┘     │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

- **Desktop sidebar** — `fixed start-6 top-6 bottom-6 w-20`, pill-shaped (`rounded-[2.5rem]`)
- **Mobile bottom nav** — `fixed bottom-0 h-20`, with `safe-area-bottom`, shadow `0_-4px_20px_rgba(0,0,0,0.05)`
- **Main content** — `md:ms-32 pb-28 md:pb-6` (uses logical properties for RTL)
- **Max width** — `max-w-[1600px] mx-auto`

### 4.2 Grid Systems

| Page                 | Grid                                                             |
| -------------------- | ---------------------------------------------------------------- |
| Dashboard / Projects | `grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6`                |
| Inventory            | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6` |
| Runs Quick Select    | `grid-cols-1 md:grid-cols-2 gap-6`                               |
| Form Fields          | `grid-cols-1 md:grid-cols-2 gap-4`                               |
| Schedule Timeline    | `grid-cols-5` (weekdays)                                         |

### 4.3 Common Spacing Tokens

```
Card Padding:    p-7 / p-8 / p-6 (sm:p-8)
Section Gap:     space-y-6 / space-y-8
Grid Gap:        gap-6 / gap-8
Inner Gap:       gap-2 / gap-3 / gap-4
Margin Bottom:   mb-4 / mb-6 / mb-8 / mb-10
```

---

## 5. Border Radius System

The project uses a distinctive **super-rounded** aesthetic:
| Element | Value | Tailwind |
|---------|-------|----------|
| Page Panels / Cards | 40px | `rounded-[2.5rem]` |
| Run Execution Card | 48px | `rounded-[3rem]` |
| Modals | 40px | `rounded-[2.5rem]` |
| Sidebar | 40px | `rounded-[2.5rem]` |
| Nav Items / Buttons | 19px | `rounded-[1.2rem]` |
| Inner Card Sections | 24px | `rounded-[1.5rem]` |
| Search Inputs | full | `rounded-full` |
| Pill Buttons / Badges | full | `rounded-full` |
| Form Inputs | 8–16px | `rounded-lg` / `rounded-2xl` |
| Schedule Events | 24px | `rounded-[1.5rem]` |
| Toggle Switches | full | `rounded-full` |
| Chart Bars (Recharts) | `[10,10,10,10]` | All corners rounded |
| Progress Bars | full | `rounded-full` |

---

## 6. Shadows & Elevation

```
Card Shadow:        shadow-sm
Card Hover:         shadow-lg  (dark: shadow-none)
Modal Backdrop:     bg-gray-900/20 dark:bg-black/60 + backdrop-blur-sm
Modal Card:         shadow-2xl
Run Card:           shadow-2xl shadow-blue-900/5
Dropdown Menu:      shadow-xl
CTA Button:         shadow-lg shadow-gray-900/20
Profile Avatar:     shadow-md
Logo:               shadow-lg shadow-gray-900/20
Tooltip:            shadow-xl
Mobile Bottom Nav:  shadow-[0_-4px_20px_rgba(0,0,0,0.05)]
```

---

## 7. Component Patterns

### 7.1 Cards

All content cards share:

- `rounded-[2.5rem]` border radius
- Fixed height: `h-[280px]` (projects), `h-[320px]` (inventory)
- Pastel background with decorative blur blob (`w-40 h-40 bg-white/20 rounded-full blur-2xl`)
- Hover: `hover:-translate-y-1 hover:shadow-lg`
- Progress bar at bottom: `h-2.5 rounded-full` with theme-colored fill
- Footer CTA button: `rounded-2xl py-3.5 font-bold active:scale-95`

### 7.2 Placeholder "Add" Cards

```tsx
<button
  className="rounded-[2rem] border-2 border-dashed border-gray-200
  dark:border-slate-700 flex flex-col items-center justify-center gap-4
  text-gray-400 hover:border-gray-300 hover:text-gray-500
  hover:bg-gray-50/50 transition-all h-[280px] group"
>
  <div
    className="w-16 h-16 rounded-full bg-white flex items-center
    justify-center shadow-sm group-hover:scale-110 transition-transform"
  >
    <Plus size={32} />
  </div>
  <span className="font-bold text-sm">New Project</span>
</button>
```

### 7.3 Modals

- **Rendering**: Use `createPortal(content, document.body)` for Settings/Profile modals — ensures they escape any parent overflow or stacking contexts.
- **Z-index**: `z-[999]` (overlay) / `z-[1000]` (dialog) for portal modals. Standard modals use `z-50`.
- **Backdrop**: `bg-gray-900/20 dark:bg-black/60 backdrop-blur-sm`
- **Card**: `rounded-[2.5rem] shadow-2xl max-w-md overflow-hidden`
- **Close Button**: `bg-gray-50 dark:bg-slate-700 rounded-full p-2` top-right
- **Entry Animation**: `animate-in fade-in zoom-in-95 duration-300`

### 7.4 Sidebar Navigation

- **Desktop**: Fixed left (or right in RTL via `start-6`), `w-20`, `rounded-[2.5rem]`
- **Nav Items**: `w-12 h-12 rounded-[1.2rem]`
  - **Active**: `bg-black dark:bg-indigo-600 text-white shadow-lg scale-105`
  - **Inactive**: `text-gray-400 hover:bg-gray-50 hover:text-gray-600`
- **Tooltip**: Appears on hover via `group-hover:opacity-100`, positioned `start-full ms-4`
- **Logo**: `w-10 h-10 bg-gray-900 dark:bg-indigo-500 rounded-2xl` with FlaskConical icon

### 7.5 Search Inputs

```tsx
<div className="relative group">
  <Search
    className="absolute start-4 top-1/2 -translate-y-1/2
    text-gray-400 group-focus-within:text-gray-900 transition-colors"
  />
  <input
    className="w-full md:w-64 ps-11 pe-6 py-3 bg-white
    dark:bg-[#1e293b] rounded-full text-sm font-medium
    focus:outline-none focus:ring-2 focus:ring-gray-900/10
    shadow-sm border border-transparent dark:border-slate-700"
  />
</div>
```

### 7.6 Filter Pill Buttons

```tsx
<button className={`px-5 py-2.5 rounded-full text-sm font-bold
  transition-all whitespace-nowrap ${
    active
      ? 'bg-gray-900 dark:bg-indigo-600 text-white'
      : 'bg-white dark:bg-[#1e293b] text-gray-500 hover:bg-gray-50'
  }`}>
```

### 7.7 FAB / Action Buttons

```tsx
<button
  className="w-12 h-12 bg-gray-900 dark:bg-indigo-600
  rounded-full flex items-center justify-center text-white
  hover:bg-gray-800 shadow-lg shadow-gray-900/20 flex-shrink-0"
>
  <Plus size={24} />
</button>
```

### 7.8 Toggle Switches

```tsx
<div
  className={`w-14 h-8 rounded-full transition-colors
  relative duration-300 ${on ? 'bg-black dark:bg-indigo-600' : 'bg-gray-200'}`}
>
  <div
    className={`absolute top-1 w-6 h-6 rounded-full bg-white
    shadow-sm transition-transform duration-300 ${
      on ? 'translate-x-7' : 'translate-x-1'
    }`}
  />
</div>
```

### 7.9 Section Overlines

```tsx
<h3
  className="text-xs font-bold text-gray-400 dark:text-gray-500
  uppercase tracking-wider mb-4"
>
  Appearance
</h3>
```

### 7.10 Context Menus (Dropdowns)

Animated with Framer Motion `AnimatePresence`:

```tsx
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 10 }}
      transition={{ duration: 0.2 }}
      className="absolute top-10 end-0 origin-top-end w-56
        bg-white/90 dark:bg-[#0f172a]/95 backdrop-blur-md
        rounded-2xl shadow-xl border p-2 z-30"
    >
      {/* Menu items */}
    </motion.div>
  )}
</AnimatePresence>
```

### 7.11 Notification Dropdown

- Positioned with `start-0 mt-2 w-80 sm:w-96`
- Unread indicator: `w-3 h-3 bg-red-500 rounded-full animate-pulse`
- Unread items highlighted: `bg-blue-50/30 dark:bg-blue-900/10`
- Notification icons differ by type: success → green, error → red, warning → orange, info → blue

### 7.12 Profile Header

```
┌──────────────────────────────┐
│ 🔔                        ⚙️ │  ← Notifications & Settings
│        ┌──────────┐         │
│        │  Avatar  │         │  ← w-24 h-24 rounded-full
│        └──────────┘         │
│      Dr. Sarah Chen         │  ← text-xl font-bold
│       Head of R&D           │  ← text-sm text-gray-500
└──────────────────────────────┘
Background: #FAF5F0 dark:#1e293b, rounded-[2.5rem]
```

## Avatar has edit overlay on hover: `bg-black/20 opacity-0 group-hover:opacity-100`

## 8. Animations & Transitions

### 8.1 Framer Motion Patterns

| Animation           | Config                                                                  | Used In            |
| ------------------- | ----------------------------------------------------------------------- | ------------------ |
| Dropdown Open       | `{ opacity: 0, scale: 0.95, y: 10 }` → `{ opacity: 1, scale: 1, y: 0 }` | Context menus      |
| Run Step Transition | `{ opacity: 0, x: 20 }` → `{ opacity: 1, x: 0 }` (RTL: reversed)        | Run execution card |
| Duration            | `0.2s` (menus), `0.3s` (page transitions)                               | —                  |
| Mode                | `mode="wait"` on AnimatePresence                                        | Run execution      |

### 8.2 CSS Transitions

| Property       | Duration                               | Easing       |
| -------------- | -------------------------------------- | ------------ |
| Color changes  | `transition-colors`                    | default ease |
| All properties | `transition-all duration-300`          | default ease |
| Transform      | `transition-transform`                 | default ease |
| Opacity        | `transition-opacity`                   | default ease |
| Progress bar   | `transition-all duration-500 ease-out` | ease-out     |

### 8.3 Hover Microinteractions

| Element          | Hover Effect                              |
| ---------------- | ----------------------------------------- |
| Project Cards    | `hover:-translate-y-1 hover:shadow-lg`    |
| CTA Buttons      | `hover:scale-105` or `hover:scale-[1.02]` |
| Active CTA Press | `active:scale-95`                         |
| FAB Icons        | `group-hover:scale-110`                   |
| Settings Gear    | `hover:rotate-90`                         |
| Schedule Events  | `hover:shadow-md hover:scale-[1.01]`      |
| Sidebar Active   | `scale-105`                               |
| Process Confirm  | `scale-[1.02]` + shadow when confirmed    |

### 8.4 CSS Keyframe Animations

```css
animate-pulse        /* Notification unread dot */
animate-in           /* Modal entry */
fade-in              /* Modal + notification dropdown */
zoom-in-95           /* Modal scale-up */
slide-in-from-top-2  /* Notification dropdown */
slide-in-from-right-4 /* Form tab transitions */
```

---

## 9. Dark Mode

### 9.1 Toggle Mechanism

Dark mode is controlled via `SettingsContext` → `toggleDarkMode()`, which adds/removes the `dark` class on `document.documentElement`. TailwindCSS is configured with `darkMode: 'class'`.

### 9.2 Color Mapping

| Element         | Light         | Dark                      |
| --------------- | ------------- | ------------------------- |
| Page BG         | `#FDFCF6`     | `#0f172a` (Slate 900)     |
| Card BG         | `#FFFFFF`     | `#1e293b` (Slate 800)     |
| Warm Card BG    | `#FAF5F0`     | `#1e293b`                 |
| Text Primary    | `gray-900`    | `slate-100` / `white`     |
| Text Secondary  | `gray-500`    | `slate-400`               |
| Text Muted      | `gray-400`    | `slate-500`               |
| Borders         | `gray-100/50` | `slate-700`               |
| CTA Primary     | `gray-900`    | `indigo-600`              |
| CTA Hover       | `gray-800`    | `indigo-500`              |
| Pastel Cards    | `[color]-100` | `[color]-900/20 + border` |
| Scrollbar Thumb | `#e2e8f0`     | `#475569`                 |
| Dropdown BG     | `white/90`    | `#0f172a/95`              |

### 9.3 Dark Mode Rules

- Pastel cards in dark mode add `dark:border dark:border-white/5–10`
- Charts force `dir="ltr"` to prevent rendering issues in RTL
- Chart highlighted bar: `fill="#1a1a1a"` light / `dark:fill-indigo-500`
- Decorative blobs reduce opacity: `bg-white/20` → `bg-white/5`

---

## 10. RTL & Internationalization

### 10.1 Language Support

The app supports **English (LTR)** and **Arabic (RTL)** via `SettingsContext`:

```tsx
const { language, setLanguage, isRTL, t } = useSettings()
```

`isRTL` is derived only from the active `language`. Do not infer text direction from translated copy, browser locale, user profile data, or persisted direction state.

### 10.2 Logical Properties

The codebase uses **CSS Logical Properties** for automatic RTL flipping:
| Physical | Logical (used) | Purpose |
|----------|----------------|---------|
| `left` | `start` | Sidebar position, icon placement |
| `right` | `end` | Dropdowns, tooltips |
| `margin-left` | `ms` (margin-start) | Sidebar clearance (`ms-32`) |
| `padding-left` | `ps` (padding-start) | Search input padding |
| `padding-right` | `pe` (padding-end) | Search input padding |
| `text-align: left` | `text-start` | Text alignment |

### 10.3 RTL-Specific Overrides

```tsx
// Icons that need directional flipping
<ArrowRight className={isRTL ? 'transform -scale-x-100' : ''} />
// Font switch
className={isRTL ? 'font-tajawal' : 'font-inter'}
// Framer Motion directional animation
initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
exit={{ opacity: 0, x: isRTL ? 20 : -20 }}
```

### 10.4 Translation Keys

All user-visible strings go through `t(key)`:

```tsx
t('dashboard') // "Dashboard" / "لوحة التحكم"
t('investInnovation') // "Invest in your innovation" / "استثمر في ابتكارك"
t('viewDetails') // "View Details" / "عرض التفاصيل"
```

## The full translation map is maintained in `context/SettingsContext.tsx` under `TRANSLATIONS`.

## 11. Responsive Breakpoints

Per TailwindCSS defaults:
| Breakpoint | Width | Usage |
|------------|-------|-------|
| Base | `< 768px` | Mobile: stacked layout, bottom nav |
| `md` | `≥ 768px` | Desktop sidebar appears, 2-col grids |
| `lg` | `≥ 1024px` | Dashboard side panel, wider grids |
| `xl` | `≥ 1280px` | 3-col project grid, schedule sidebar |

### Key Responsive Behaviors

- **Sidebar**: Hidden on mobile → fixed pill-shaped on desktop
- **Bottom Nav**: Visible on mobile → hidden on desktop
- **Dashboard**: Stacked vertically on mobile → `flex-row` with fixed left panel on `lg`
- **Cards**: Single column → 2-col (`sm`) → 3-col (`xl`)
- **Run Execution Card**: Reduced padding on mobile (`p-6` → `md:p-12`)
- **Weight Input**: Scaled down font size (`text-4xl` → `md:text-6xl`)

---

## 12. Iconography

### 12.1 Library

**Lucide React** — consistent 2px stroke width outline icons.

### 12.2 Size Conventions

| Context              | Size    | Stroke                         |
| -------------------- | ------- | ------------------------------ |
| Nav Icons (sidebar)  | `22`    | `2` (inactive), `2.5` (active) |
| Mobile Nav Icons     | `24`    | `2` / `2.5`                    |
| Action Buttons (FAB) | `24`    | default                        |
| Inline / Label       | `16–20` | default                        |
| Large Stamp (Run)    | `48`    | default                        |
| Micro (in meta)      | `12`    | default                        |

### 12.3 Icon Categories per Page

| Page       | Key Icons                                                                                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Navigation | `LayoutDashboard`, `PlayCircle`, `Package`, `FileText`, `Calendar`, `Settings`, `FlaskConical`                                                                                 |
| Dashboard  | `Search`, `Plus`, `Bell`, `Settings`, `CheckCircle`, `AlertTriangle`, `Info`, `XCircle`                                                                                        |
| Projects   | `ArrowRight`, `MoreHorizontal`, `Edit3`, `Copy`, `Play`, `Download`, `Archive`, `Trash2`                                                                                       |
| Runs       | `Play`, `ChevronLeft`, `Scale`, `Clock`, `CheckCircle2`, `AlertCircle`, `FlaskConical`, `RotateCcw`, `Pause`, `ArrowRight`, `Check`, `X`, `ChevronDown`, `History`, `FileText` |
| Inventory  | `Leaf`, `Droplets`, `Grid`, `Sun`, `Package`, `AlertTriangle`                                                                                                                  |
| Schedule   | `ChevronLeft`, `ChevronRight`, `Calendar`, `FlaskConical`, `Clock`, `MapPin`, `MoreVertical`, `Plus`                                                                           |

---

## 13. Charts & Data Visualization

### 13.1 Recharts Setup

```tsx
<ResponsiveContainer width="100%" height="100%">
  <BarChart data={data}>
    <Bar dataKey="value" radius={[10, 10, 10, 10]}>
      {data.map((entry, index) => (
        <Cell
          key={`cell-${index}`}
          fill={highlighted ? '#1a1a1a' : '#E5E7EB'}
          className={
            highlighted ? 'dark:fill-indigo-500' : 'dark:fill-slate-700'
          }
        />
      ))}
    </Bar>
    <Tooltip
      cursor={{ fill: 'transparent' }}
      contentStyle={{
        borderRadius: '12px',
        border: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}
    />
  </BarChart>
</ResponsiveContainer>
```

### 13.2 Chart Rules

- Always wrap in `dir="ltr"` container to prevent RTL rendering issues
- Tooltip: no border, 12px radius, subtle shadow
- Active bar: black (light) / indigo-500 (dark)
- Inactive bars: `#E5E7EB` (light) / `slate-700` (dark)
- All bar corners fully rounded

---

## 14. Form Patterns

### 14.1 Text Inputs

```tsx
const inputClasses = `w-full px-4 py-2.5 bg-white border border-gray-300
  rounded-lg text-sm text-gray-900 placeholder-gray-400
  focus:outline-none focus:ring-2 focus:ring-blue-500
  focus:border-transparent transition-all`
```

### 14.2 Multi-Step Forms

The `NewProjectModal` uses a **tabbed wizard** pattern:

1. Tabs with active indicator: `border-b-2 border-blue-600 text-blue-600`
2. Tab transitions: `animate-in fade-in slide-in-from-right-4 duration-300`
3. Footer: "Back" (text-only) ← → "Next Step" (filled) or "Create Project" (blue CTA)
4. Back button disabled on first tab: `disabled:opacity-30 disabled:cursor-not-allowed`

### 14.3 Datalist (Combobox)

```tsx
<input list="processing-methods" className={inputClasses} />
<datalist id="processing-methods">
  {options.map(m => <option key={m} value={m} />)}
</datalist>
```

### 14.4 Custom Checkboxes

```tsx
<div
  className={`w-5 h-5 rounded border flex items-center justify-center
  transition-colors ${
    checked ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-300'
  }`}
>
  {checked && <CheckCircle2 size={14} className="text-white" />}
</div>
```

### 14.5 Segmented Controls

```tsx
<div className="flex bg-gray-50 dark:bg-slate-700 p-1.5 rounded-[1.5rem]">
  <button
    className={`flex-1 py-3 px-4 rounded-[1.2rem] text-sm font-semibold
    transition-all duration-200 ${
      active ? 'bg-white shadow-md text-gray-900' : 'text-gray-400'
    }`}
  >
    Metric (g, °C)
  </button>
</div>
```

---

## 15. State Management Patterns

### 15.1 Context Providers

```
App
└── SettingsProvider        ← units, dark mode, profile, language, RTL
    └── NotificationProvider  ← notification state, add/read/clear
        └── Router → Layout → Pages
```

### 15.2 Custom Hooks

```tsx
useSettings() // Returns: units, darkMode, profile, language, isRTL, t(), formatMass(), formatTemp()
useNotifications() // Returns: notifications, unreadCount, addNotification(), markAllAsRead(), markAsRead(), clearNotifications()
```

### 15.3 Unit Formatting

```tsx
formatMass(kgValue) // → "500g" or "1.10lbs"
formatTemp(celsiusValue) // → "135°C" or "275.0°F"
```

---

## 16. Z-Index Hierarchy

```
z-0   — Card backgrounds, decorative elements
z-10  — Card content (above decoration)
z-20  — Profile header actions
z-30  — Card dropdown menus, sidebar
z-50  — Mobile bottom nav, standard modals
z-[999]  — Portal modal overlays
z-[1000] — Portal modal content
```

---

## 17. Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
.dark ::-webkit-scrollbar-thumb {
  background: #475569;
}
.dark ::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}
```

---

## 18. Interaction Guidelines

### 18.1 Click Outside to Close

All dropdowns and notification panels use `mousedown` event listeners on `document` to detect outside clicks and auto-close:

```tsx
useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (ref.current && !ref.current.contains(event.target as Node)) {
      setIsOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClickOutside)
  return () => document.removeEventListener('mousedown', handleClickOutside)
}, [])
```

### 18.2 Keyboard Interactions

- **Enter key** on weight input confirms and advances to next step:
  ```tsx
  onKeyDown={(e) => {
    if (e.key === 'Enter' && validation.isValid) handleNext();
  }}
  ```
- Weight inputs have `autoFocus` on mount

### 18.3 Form Validation (Run Execution)

- **Weighing steps**: 5% tolerance range, real-time visual feedback
- **Timer steps**: Timer must complete OR manual acknowledgement checkbox
- **Process steps**: "Mark as Done" confirmation button
- **Next button**: Disabled (`bg-gray-200 cursor-not-allowed`) until validation passes

### 18.4 Navigation Transitions

- **Modal close**: Uses `setTimeout(() => setSelectedProjectId(null), 200)` to allow exit animation
- **Run step transition**: Framer Motion with `mode="wait"` for sequential enter/exit

---

## 19. Accessibility Notes

- All interactive elements use `cursor-pointer`
- Disabled states use `opacity-30` + `cursor-not-allowed`
- Focus states use `focus:ring-2` / `focus:outline-none`
- Tooltips on sidebar icons for screen reader + hover context
- All buttons have either visible text or `title` attributes
- Contrast: primary text is gray-900 on white / slate-100 on dark
- `safe-area-bottom` class on mobile nav for notched devices
- `type="button"` on non-submit buttons to prevent accidental form submission

---

## 20. File Architecture Reference

```
Food-R-D-Lab-/
├── index.html                 ← TailwindCSS CDN, fonts, scrollbar CSS
├── index.tsx                  ← React root, Convex provider
├── App.tsx                    ← Router, Settings/Notification providers
├── types.ts                   ← All TypeScript interfaces/enums
├── constants.tsx              ← Mock data, status color map
├── vite.config.ts             ← Vite config
│
├── components/
│   ├── Layout.tsx             ← Shell: sidebar + main content area
│   ├── Sidebar.tsx            ← Desktop sidebar + mobile bottom nav
│   ├── ProfileHeader.tsx      ← Avatar, notifications, profile settings
│   ├── ProfileSettingsModal.tsx
│   ├── SettingsModal.tsx      ← Dark mode, units, notifications toggles
│   ├── ProjectCard.tsx        ← Pastel project cards with context menu
│   ├── ProjectDetailsModal.tsx
│   ├── EditProjectModal.tsx
│   ├── NewProjectModal.tsx    ← Multi-step project creation wizard
│   ├── ActiveProjectsCard.tsx
│   ├── LabCapacityCard.tsx
│   ├── NextMilestoneCard.tsx
│   ├── PendingApprovalsCard.tsx
│   ├── RecentReports.tsx
│   ├── ReportsDropdown.tsx
│   └── AuditLog.tsx
│
├── pages/
│   ├── Dashboard.tsx          ← Main view: profile, stats, project grid
│   ├── Formulation.tsx        ← Project detail / formulation editor
│   ├── Runs.tsx               ← Run execution engine (selection → run → complete)
│   ├── Inventory.tsx          ← Raw materials grid
│   ├── Reports.tsx            ← Lab reports with pass/fail indicators
│   └── Schedule.tsx           ← Calendar timeline + agenda
│
├── context/
│   ├── SettingsContext.tsx     ← Theme, units, profile, i18n
│   └── NotificationContext.tsx ← In-app notification management
│
└── convex/                    ← Backend (Convex functions + schema)
```

---

## 21. Do's & Don'ts

### ✅ Do

- Use `rounded-[2.5rem]` for all major cards and panels
- Use logical properties (`start`, `end`, `ms`, `ps`) instead of `left`/`right`/`ml`/`pl`
- Always provide dark mode variants for every color
- Use `font-bold` for all labels and headings
- Wrap strings with `t('key')` for internationalization
- Use `AnimatePresence` + `motion.div` for enter/exit transitions on dynamic content
- Apply `backdrop-blur-sm` + `bg-white/90` for glassmorphism effects
- Test every component in both LTR and RTL modes
- Use `createPortal` for modals that need to escape parent `overflow: hidden`
- Keep consistent pastel card themes via deterministic color assignment

### ❌ Don't

- Don't use sharp corners (< `rounded-xl` for any visible panel)
- Don't hardcode `left`/`right`/`margin-left` — use logical properties
- Don't add inline `color:` or `background:` styles — use Tailwind classes
- Don't skip dark mode variants on new components
- Don't use raw strings — always use the `t()` translation function
- Don't nest modals inside components with `overflow: hidden`
- Don't use `z-index` values above 1000 without portal rendering
- Don't set fixed widths on containers — use `flex-1` or `w-full` with max-width
- Don't forget `transition-all` or `transition-colors` on interactive elements
- Don't use `position: absolute` with physical (`left`/`right`) — use `start`/`end`
