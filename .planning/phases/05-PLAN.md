# PHASE 5 — Energy Savings & Analytics Dashboard

## Goal
Build a comprehensive analytics dashboard showing energy usage, monetary savings, CO₂ reduction, and trend charts. Add Supabase cloud sync for cross-device data backup.

## Requirements Covered
R5 (Energy Savings), R6 (Data Storage)

## Dependencies
Phase 1 (Backend API for savings data), Phase 2 (RN App)

---

## Prompts

### Prompt 5-1: Analytics Screen — Savings Overview

```
You are building the Analytics dashboard for SmartAC.

FILE: SmartACApp/src/screens/AnalyticsScreen.tsx + supporting components

TASK: Build a rich analytics screen with savings data

SCREEN DESIGN (scrollable):

1. PERIOD SELECTOR (top)
   - Segmented control: Today | Week | Month | Year
   - Default: Month

2. SAVINGS HERO CARD
   - Large gradient card (purple → blue)
   - Center: "₹1,247" (money saved, large 36px font)
   - Below: "saved this month" label
   - Bottom row:
     * kWh saved: "165.9 kWh"
     * CO₂ reduced: "136 kg"
     * Percentage: "↓ 43.7%"
   - Subtle animated confetti or sparkle effect when number > ₹1000

3. COMPARISON BAR
   - Visual bar comparison:
     [████████████████████░░░░░░░░] 
     Baseline: ₹3,034 (full bar, red)
     Actual:   ₹1,787 (shorter bar, green)
   - Label: "You used 57% of worst-case energy"

4. DAILY BREAKDOWN (scrollable horizontal)
   - 7 cards for last 7 days (or 30 for month view)
   - Each card: Date, hours ON, kWh, cost
   - Highlight today

5. USAGE CHART (line chart)
   - X axis: days of the period
   - Y axis: kWh
   - Two lines: Baseline (dashed red) vs Actual (solid green)
   - Shaded area between = savings
   - Touch to see exact values per day

6. TEMPERATURE HISTORY (heatmap or line)
   - X axis: time
   - Y axis: temperature (room temp + target temp)
   - Shows how AC maintained temperature over time

7. STATS GRID (2x3 grid of stat boxes)
   - Total hours ON
   - Avg temperature set
   - Most used mode
   - Most used preset
   - Sessions count
   - Avg session duration

8. MONTHLY REPORT CARD (if period = Month)
   - Shareable card design:
   ┌──────────────────────────────────────┐
   │  SmartAC Monthly Report · Feb 2026   │
   │                                       │
   │         ₹1,247 SAVED                 │
   │                                       │
   │  🔌 166 kWh saved                    │
   │  🌱 136 kg CO₂ reduced              │
   │  ⏱️ 22 night mode sessions           │
   │  🌡️ Avg temp: 24°C                   │
   │                                       │
   │  You're in the top 15% of savers!    │
   └──────────────────────────────────────┘
   - "Share" button → generates image + share sheet

DATA SOURCE:
- Call GET /api/savings/:deviceId?period=month
- Call GET /api/usage/stats/:deviceId?period=month
- Cache locally in SQLite for offline access

VERIFY:
1. Analytics screen loads with real data
2. Period switcher updates all charts
3. Numbers match backend savings calculation
4. Charts render correctly with proper axes
```

### Prompt 5-2: Charts & Visualization Components

```
You are building the chart components for SmartAC analytics.

INSTALL:
npm install victory-native@^41 @shopify/react-native-skia@^1  # Victory Native Skia — GPU-accelerated charts
npm install react-native-svg  # SVG support for fallback/icons

FILES:
- SmartACApp/src/components/charts/UsageLineChart.tsx
- SmartACApp/src/components/charts/SavingsBarChart.tsx
- SmartACApp/src/components/charts/TempHeatmap.tsx
- SmartACApp/src/components/charts/ComparisonBar.tsx

TASK: Build reusable chart components using Victory Native (Skia renderer)

Note: Victory Native v41+ uses @shopify/react-native-skia for GPU-accelerated
rendering. This replaces the older react-native-chart-kit which is unmaintained.
Use CartesianChart, Line, Bar from victory-native.

1. USAGE LINE CHART (UsageLineChart.tsx)
   - Victory Native CartesianChart with Line components
   - Props: data (daily kWh array), baseline (daily baseline array), period
   - Two Line datasets: actual (green #22c55e) + baseline (red #ef4444 dashed)
   - Filled area between lines using Area component (green with 0.1 opacity)
   - Use useAnimatedPath for smooth transitions between periods
   - Y axis: "kWh"
   - X axis: dates (abbreviated)
   - Tooltip on touch: shows exact value + date
   - Responsive width (Dimensions.get('window').width - 32)
   - Theme-aware colors (dark mode compatible)

2. SAVINGS BAR CHART (SavingsBarChart.tsx)
   - Victory Native CartesianChart + Bar components
   - Grouped bar chart: baseline vs actual per day/week
   - Green bars (actual) vs gray bars (baseline)
   - Savings amount label above each group
   - Horizontal if period = week, vertical if month

3. TEMPERATURE HEATMAP/LINE (TempHeatmap.tsx)
   - Line chart with two lines:
     * Room temperature (blue, solid)
     * Target temperature (orange, dashed)
   - Time-based X axis
   - 16-30°C Y axis
   - Comfort zone shading (22-26°C light green band)

4. COMPARISON BAR (ComparisonBar.tsx)
   - Simple horizontal stacked bar
   - Full width = baseline cost
   - Green portion = actual cost
   - Remaining gap = savings
   - Labels: "Baseline ₹3,034" | "Actual ₹1,787" | "Saved ₹1,247"
   - Animated fill from left to right

STYLING:
- All charts use theme colors (light/dark aware)
- Rounded corners on bars
- No overly dense data points (aggregate if > 31 points)
- Loading skeleton while data fetches

VERIFY: All 4 charts render with mock data, respond to theme changes, and handle empty data gracefully.
```

### Prompt 5-3: Settings — Electricity Rate & Currency

```
You are building the electricity rate configuration for SmartAC.

FILE: SmartACApp/src/screens/SettingsScreen.tsx (expand)

TASK: Add electricity rate and currency configuration

SETTINGS SCREEN SECTIONS:

1. ELECTRICITY RATE
   - Number input: "₹8.00 per kWh" (default)
   - Helper: "Check your electricity bill for your per-unit rate"
   - Quick presets for India:
     * "₹5/kWh (subsidized)" 
     * "₹8/kWh (average)"
     * "₹10/kWh (commercial)"
     * "₹12/kWh (peak)"
   - Custom input with decimal support

2. CURRENCY
   - Picker / dropdown with search:
     * 🇮🇳 INR ₹ (default)
     * 🇺🇸 USD $
     * 🇪🇺 EUR €
     * 🇬🇧 GBP £
     * 🇦🇪 AED د.إ
     * 🇸🇦 SAR ﷼
     * 🇯🇵 JPY ¥
     * 🇨🇳 CNY ¥
     * 🇦🇺 AUD A$
     * 🇨🇦 CAD C$
     * 🇸🇬 SGD S$
     * 🇹🇭 THB ฿
     * 🇲🇾 MYR RM
   - Selection saves to settings store + backend

3. TEMPERATURE UNIT
   - Toggle: °C / °F

4. BASELINE CONFIGURATION (expandable advanced)
   - Hours per day: 8 (avg worst-case runtime)
   - Baseline temp: 18°C (coldest setting)
   - CO₂ factor: 0.82 kg/kWh (India grid avg)
   - Reset to defaults button

5. DATA MANAGEMENT
   - "Export Usage Data (CSV)" button → share sheet
   - "Clear All Data" (with confirmation)
   - "Sync to Cloud" toggle (Supabase — Phase 5-4)

6. ABOUT
   - App version
   - Backend URL
   - Connected device count
   - "Rate this app" link
   - "Report a bug" → email

All settings persist to:
- Zustand store (runtime)
- AsyncStorage (local persistence)
- Backend PUT /api/settings (for calculations)

VERIFY:
1. Change rate to ₹10/kWh → analytics savings recalculate
2. Change currency to USD → all ₹ symbols become $
3. Export CSV → share sheet opens with valid CSV file
```

### Prompt 5-4: Supabase Cloud Sync

```
You are adding Supabase cloud backup to SmartAC.

INSTALL:
npm install @supabase/supabase-js@^2  # Supabase v2+ (latest)

FILES:
- SmartACApp/src/services/supabase.ts (new)
- SmartACApp/src/services/sync.ts (new)

TASK: Set up Supabase free tier for cloud data backup

SUPABASE SETUP (document steps):
1. Create project on supabase.com (free tier)
2. Create tables:
   - profiles (id, smartthings_token_hash, created_at)
   - usage_events (id, profile_id, device_id, event_type, details, created_at)
   - device_settings (id, profile_id, device_id, brand, model, wattage, custom_presets, room)
   - app_settings (id, profile_id, key, value)

3. Row Level Security (RLS):
   - Each user can only read/write their own data
   - Profile identified by hashed token (no plaintext token stored)

SYNC SERVICE (sync.ts):
```ts
export class SyncService {
  // Upload local data to Supabase
  async syncUp(): Promise<void> {
    // Get unsynced events from SQLite (synced_at IS NULL)
    // Batch insert to Supabase
    // Mark as synced locally
  }
  
  // Download cloud data to local
  async syncDown(): Promise<void> {
    // Get latest from Supabase
    // Merge with local SQLite (newer wins)
  }
  
  // Full sync
  async sync(): Promise<{ uploaded: number, downloaded: number }> {
    await this.syncUp();
    await this.syncDown();
  }
  
  // Auto sync every 15 minutes when app is active
  startAutoSync(): void { ... }
  stopAutoSync(): void { ... }
}
```

OFFLINE-FIRST STRATEGY:
1. All reads → local SQLite first
2. All writes → local SQLite immediately
3. Background sync to Supabase every 15 min
4. On app launch → sync
5. No internet → works fully offline, syncs later
6. Conflict resolution: latest timestamp wins

PRIVACY:
- SmartThings token is NEVER sent to Supabase
- Only hashed token used as profile identifier
- All data associated with hash, not personal info
- User can delete all cloud data from Settings

CONFIG:
- Supabase URL and anon key stored in .env (not committed to git)
- .env.example with placeholder values

VERIFY:
1. Create usage event → appears in Supabase dashboard
2. Clear local data → sync down → data restored
3. Disable internet → app works fully → re-enable → auto syncs
```

---

## Verification Criteria
- [ ] Analytics screen shows savings in configured currency
- [ ] Period selector (day/week/month/year) updates all data
- [ ] Line chart shows baseline vs actual kWh
- [ ] Savings hero card shows correct ₹ amount
- [ ] Settings: electricity rate change recalculates all savings
- [ ] Currency change applies globally
- [ ] CSV export works
- [ ] Supabase sync uploads and downloads data
- [ ] Offline mode works (no crashes without internet)

## Files Created
```
SmartACApp/src/
├── screens/
│   └── AnalyticsScreen.tsx (expanded)
├── components/
│   └── charts/
│       ├── UsageLineChart.tsx
│       ├── SavingsBarChart.tsx
│       ├── TempHeatmap.tsx
│       └── ComparisonBar.tsx
├── services/
│   ├── supabase.ts
│   └── sync.ts

ac-controller/
├── .env.example
```
