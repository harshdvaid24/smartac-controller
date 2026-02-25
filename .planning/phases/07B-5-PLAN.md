# PHASE 7B — Plan 5: Biometric Dashboard UI Components

## Goal
Build the reusable biometric visualization components: live biometric card, sleep timeline, thermal comfort gauge, night adjustment log, and watch connection badge.

## Wave
2 (parallel with Plan 3 — no code dependency, just data type awareness)

## Requirements
BIO-R1 (real-time display), BIO-R6 (morning report visuals), BIO-R7 (watch status)

## Files
```
SmartACApp/src/components/biometric/
├── LiveBiometricCard.tsx
├── SleepTimeline.tsx
├── ThermalComfortGauge.tsx
├── NightAdjustmentLog.tsx
└── WatchConnectionBadge.tsx
```

## Design Tokens
```ts
const BioColors = {
  warm: '#FF6B35',
  comfortable: '#00FFB2',
  cool: '#38BDF8',
  deep: '#818CF8',
  rem: '#C084FC',
  light: '#94A3B8',
  alert: '#FACC15',
  surface: '#13131A',
  elevated: '#1E1E2A',
};
```

---

<task type="create">
  <name>Build LiveBiometricCard — real-time sensor display with comfort slider</name>
  <files>SmartACApp/src/components/biometric/LiveBiometricCard.tsx</files>
  <action>
    2x2 grid of metric tiles + horizontal comfort slider below.
    
    METRIC TILE (4 tiles):
    - Rounded square, bg #1E1E2A, borderRadius 12
    - Top: small label (11px, muted) — "HEART RATE", "SKIN TEMP Δ", "SpO₂", "HRV"
    - Center: value in large bold font (28px, monospace feel)
      HR color: normal=white, elevated=#FF6B35, low=#38BDF8
      Skin temp: positive=#FF6B35, negative=#38BDF8, near-zero=#00FFB2
      SpO2: >95=#00FFB2, 90-94=#FACC15, <90=#FF6B35
      HRV: higher=#00FFB2, lower=#FF6B35
    - Bottom: status dot (6px circle) + label (e.g., "● Resting", "● Elevated")
    
    COMFORT SLIDER:
    - Full width, height 8px, borderRadius 4
    - LinearGradient track: #38BDF8 → #00FFB2 → #FF6B35
    - White dot (18px circle, elevation shadow) at thermalComfort position
    - Position mapped: 0% = cold, 50% = comfortable, 100% = hot
    - Animated with Animated.spring when value changes
    - Labels: "Cold" left, "Comfortable" center, "Hot" right (10px muted text)
    
    Props:
      biometrics: { heartRate, hrv, skinTempDelta, spO2, thermalComfort }
      Optional onPress for expanding details
    
    Animated number transitions: Use Animated.Value + spring for smooth number changes
  </action>
  <verify>
    Renders with mock data — all 4 tiles show correct colors
    Comfort slider at 75 → dot in warm/orange zone
    Number change animates smoothly
  </verify>
  <done>Real-time biometric card with 4 sensor tiles and animated comfort slider</done>
</task>

<task type="create">
  <name>Build SleepTimeline — vertical event timeline for the night</name>
  <files>SmartACApp/src/components/biometric/SleepTimeline.tsx</files>
  <action>
    Vertical timeline showing the whole night (ScrollView).
    
    Structure:
    - Left column (60px): time labels (10PM, 11PM, 12AM... 7AM) in mono font
    - Center: vertical line (1px, rgba white 0.15)
    - Right column: event markers + labels
    
    EVENT TYPES (discriminated by 'type' prop):
    
    'ac_cool': mint (#00FFB2) circle (8px) + "↓ 24°C" label
    'ac_warm': coral (#FF6B35) circle + "↑ 25°C" label
    'alert': yellow (#FACC15) triangle icon + description
    'sleep_stage': colored horizontal band extending right
      deep = #818CF8 at 30% opacity, height 20px
      REM = #C084FC at 30% opacity
      light = #94A3B8 at 20% opacity
    
    CURRENT TIME MARKER:
      Animated pulsing mint (#00FFB2) dot (Animated.loop, scale 0.8→1.2, opacity 1→0.5)
      "NOW" label next to it
    
    Props:
      events: Array<{ time: Date, type: string, label: string, value?: number }>
      sleepStart: Date
      currentTime?: Date (for "NOW" marker)
    
    Events positioned by calculating offset from sleepStart.
    Timeline height scales dynamically based on duration.
  </action>
  <verify>
    Renders with 5 mock events — correct timestamps and colors
    NOW marker pulses
    Sleep stage bands render as colored horizontal stripes
  </verify>
  <done>Vertical sleep timeline visualizes AC adjustments, alerts, and sleep stages chronologically</done>
</task>

<task type="create">
  <name>Build ThermalComfortGauge — semicircular SVG gauge</name>
  <files>SmartACApp/src/components/biometric/ThermalComfortGauge.tsx</files>
  <action>
    Semicircular gauge using react-native-svg (or Animated views).
    
    Range: 0 (cold) to 100 (hot), 50 = comfortable center
    
    Visual:
    - SVG arc spanning 180° (bottom-center semicircle)
    - Background arc: dark gray (#2A2A3A)
    - Filled arc: gradient
      0-30: #38BDF8 (cool/blue)
      30-70: #00FFB2 (comfort/mint)
      70-100: #FF6B35 (warm/orange-red)
    - Pointer/needle: white line rotating from center to arc edge
      Rotation = value mapped to -90° (cold) → +90° (hot)
    - 24 tick marks around outer edge (small lines), 5 major at 0/25/50/75/100
    - Center bottom label: current state "COMFORTABLE" in uppercase mono (11px)
    
    Animation:
    - On value change: Animated.spring drives rotation of needle
    - Interpolation: value 0-100 → rotation -90° to +90°
    
    Props:
      value: number (0-100, thermalComfort mapped to this scale)
      label: string (e.g., "Comfortable")
    
    Size: 200x120 default, responsive to container
    
    If react-native-svg not installed, use pure Animated views with rotation transforms.
  </action>
  <verify>
    Gauge renders with value=50 → needle at center
    Animate from 30 to 70 → needle sweeps smoothly
    Label updates to match state
  </verify>
  <done>Semicircular thermal comfort gauge with animated needle and gradient arc</done>
</task>

<task type="create">
  <name>Build NightAdjustmentLog — compact scrollable list of AC changes</name>
  <files>SmartACApp/src/components/biometric/NightAdjustmentLog.tsx</files>
  <action>
    Scrollable list of biometric AC adjustments.
    
    Each entry row (height ~50px):
    - Left: time in mono font (e.g., "11:23 PM"), width 70px, muted color
    - Center: colored action chip
      temp_down → mint bg pill "↓ 24°C"
      temp_up → coral bg pill "↑ 25°C"
      fan_up → blue bg pill "Fan ↑"
      fan_down → blue bg pill "Fan ↓"
    - Right: brief reason text (11px, muted)
      e.g., "skin temp rising", "SpO2 low", "body cooling"
    - Subtle divider (1px, rgba white 0.08) between entries
    
    EXPANDABLE:
      Tapping entry → expand to show full BiometricSignal snapshot:
      HR: 78bpm · HRV: 32ms · ΔT: +1.2°C · SpO2: 96% · Stage: Light
      Animated expand/collapse with LayoutAnimation
    
    EMPTY STATE:
      Center text: "No adjustments yet — monitoring your comfort 👁️"
      Muted color, italic
    
    Props:
      adjustments: Array<{ time: string, action: string, magnitude: number, reason: string, signal?: BiometricSignal }>
    
    Container: max height with ScrollView, or FlatList for performance
  </action>
  <verify>
    Renders with 3 mock adjustments — correct chips and colors
    Tap entry → expands to show signal details
    Empty state shows monitoring message
  </verify>
  <done>Compact, expandable adjustment log for sleep mode and morning report</done>
</task>

<task type="create">
  <name>Build WatchConnectionBadge — watch status indicator</name>
  <files>SmartACApp/src/components/biometric/WatchConnectionBadge.tsx</files>
  <action>
    Small status indicator component (used in SleepModeScreen header + Settings).
    
    3 STATES:
    
    CONNECTED:
      - Animated Bluetooth rings: outer ring opacity 1→0.3 pulse every 2s (Animated.loop)
      - Watch icon (Ionicons 'watch-outline', 24px)
      - Text: "Live · Galaxy Watch 7" in #00FFB2
      - Tap → navigate to watch settings
    
    DISCONNECTED:
      - Gray icon, no animation
      - Text: "Watch not connected" in muted gray
      - Tap → show setup guide bottom sheet:
        1. Install SmartAC on your Galaxy Watch
        2. Open watch app → Start monitoring
        3. Keep watch and phone connected via Bluetooth
    
    DATA_STALE (>10 min since last packet):
      - Yellow (#FACC15) indicator dot
      - Text: "Last update: 12 min ago" in yellow-tinted
      - Still shows watch icon (connected but stale)
    
    Props:
      status: 'connected' | 'disconnected' | 'stale'
      lastUpdateTime?: Date
      onPress?: () => void
    
    Compact design: fits in a single row, ~40px height
  </action>
  <verify>
    All 3 states render correctly
    Connected state has pulsing animation
    Disconnected state shows setup hint on tap
  </verify>
  <done>Watch connection badge shows live/disconnected/stale state with appropriate visuals</done>
</task>
