# STATE — SmartAC Project

## Current Position
- **Milestone:** 1 — MVP Universal AC Controller App
- **Phase:** Phase 7B complete
- **Status:** Galaxy Watch 7 Biometric AC Intelligence fully implemented

## Decisions Made
| Decision | Choice | Rationale |
|----------|--------|-----------|
| Mobile framework | React Native 0.79+ (bare, New Architecture) | User preference, full native access |
| Local database | OP-SQLite v9+ (JSI-based) | Fastest SQLite for RN, synchronous |
| Cloud database | Supabase v2+ (free tier) | Free Postgres, auth, realtime |
| Electricity rate | ₹8/kWh default | Indian market default, configurable |
| AC brand coverage | 15+ brands | All major SmartThings-compatible brands |
| State management | Zustand v5 | Lightweight, TypeScript native |
| Styling | NativeWind v4 (Tailwind CSS v4) | Tailwind for RN, rapid UI development |
| Charts | Victory Native v41+ (Skia) | GPU-accelerated, replaces unmaintained chart-kit |
| Navigation | React Navigation v7 | Latest, static config support |
| Notifications | Notifee v9+ | Full local notification control |
| Animations | react-native-reanimated v3.16+ | Worklet-based 60fps animations |
| Connection methods | SmartThings + WiFi + IR + BLE | 4 connection paths for maximum compatibility |
| Camera | react-native-vision-camera v4+ | Latest VisionCamera with frame processors |
| BLE | react-native-ble-plx v3+ | Mature BLE library |

## Blockers
None currently.

## Session Notes
- 2026-02-23: Project initialized, existing Samsung AC controller works at localhost:3000
- 2026-02-23: GSD planning structure created with 6 phases, 19 prompts total
- 2026-02-23: Added Phase 1B for WiFi/BLE/IR direct control (4 new prompts, 23 total)
- 2026-02-23: Updated ALL phases to latest library versions (RN 0.79+, Nav v7, Zustand v5, Victory Native Skia, OP-SQLite, Notifee, etc.)
- 2026-02-23: Updated Phase 2 setup screen with connection method selector (Cloud/WiFi/IR)
- 2026-02-23: Updated device cards and control screen with connection-type awareness
- 2026-02-24: Phases 1-6 built and operational (SmartACApp + ac-controller running)
- 2026-02-24: Fixed connection type normalization (cloud→smartthings, wifi_local→wifi)
- 2026-02-24: Fixed preset command routing through connection manager
- 2026-02-24: **Phase 7B planned** — Galaxy Watch 7 Biometric AC Intelligence
  - Created 07B-CONTEXT.md (design decisions locked)
  - Created 6 GSD plan files (07B-1 through 07B-6) with XML task structure
  - 3 execution waves: Wave 1 (Wear OS + WatchBridge), Wave 2 (Engine + UI), Wave 3 (Screens + Nav)
  - Updated REQUIREMENTS.md with BIO-R1 through BIO-R8
  - Updated ROADMAP.md with Phase 7B entry and wave execution plan
- 2026-02-25: **Phase 7B executed** — all 3 waves complete:
  - Wave 1: Wear OS companion app (6 Kotlin files), WatchBridge native module (3 Kotlin files), Health Connect TS service
  - Wave 2: BiometricACEngine (~995 lines), 5 UI components (LiveBiometricCard, SleepTimeline, ThermalComfortGauge, NightAdjustmentLog, WatchConnectionBadge)
  - Wave 3: SleepOrchestrator, SleepModeScreen, MorningReportScreen, WatchSetupScreen, BiometricSettingsScreen, BaselineCalibrationCard, navigation wiring
  - TypeScript compiles clean (0 errors)
  - Total new files: ~25 (6 Kotlin watch, 3 Kotlin bridge, 8 TypeScript services/components, 4 screens, 1 component, plus modifications)
