# ROADMAP — SmartAC Universal Controller

## Milestone 1: MVP — Universal AC Controller App

### Phase 1A: Backend — Generic Multi-Device API (SmartThings) ⬜
**Requirements:** R1, R7, R6.1
**Depends on:** Nothing
**Effort:** ~2.5 hours

Refactor the Express server to support any SmartThings AC brand. Add dynamic capability detection, known-brand database with 15+ brands, usage tracking with SQLite, and energy savings calculation API. Remove all Samsung AR18CYLANWKN hardcoding.

### Phase 1B: Direct WiFi / BLE / IR Blaster Control ⬜
**Requirements:** R1B
**Depends on:** Phase 1A (shared brand DB + device model)
**Effort:** ~3 hours

Add local network AC discovery (mDNS/SSDP), direct WiFi HTTP/MQTT control for major brands (Samsung, LG, Daikin, Midea, Haier, Gree), BLE initial pairing, and IR blaster integration (Broadlink RM4, Switchbot Hub). Implement connection-method selector and auto-detect logic.

### Phase 2: React Native App — Core UI & Navigation ⬜
**Requirements:** R2, R6.1
**Depends on:** Phase 1A
**Effort:** ~3.5 hours

Scaffold bare React Native 0.79+ app (New Architecture) with TypeScript 5.x. React Navigation v7, NativeWind v4, Zustand v5. Build setup/auth screen with connection method selector (SmartThings / WiFi / IR), device list with live status + connection type badges, universal device control screen, dark mode theme.

### Phase 3: QR/Barcode Scanner for AC Setup ⬜
**Requirements:** R3
**Depends on:** Phase 2
**Effort:** ~1.5 hours

Add camera-based QR/barcode scanning (react-native-vision-camera v4) to identify AC models. Map to known brand database for auto-configuration. Fallback to manual entry with search.

### Phase 4: Smart Presets & Night Mode (Generic) ⬜
**Requirements:** R4
**Depends on:** Phase 1A, Phase 2
**Effort:** ~2 hours

Generalize presets for any AC. Dynamic preset engine, custom preset builder, schedule system with Notifee notifications, smart suggestions.

### Phase 5: Energy Savings & Analytics Dashboard ⬜
**Requirements:** R5, R6
**Depends on:** Phase 1A, Phase 2
**Effort:** ~3 hours

Full analytics: electricity rate config, runtime tracking, savings calculator (kWh + currency + CO₂), Victory Native Skia charts, monthly reports. Supabase cloud sync.

### Phase 6: Polish & Extra Features ⬜
**Requirements:** V2 (selected items)
**Depends on:** Phase 2
**Effort:** ~3 hours

Multi-room support, comfort score, weather integration, home screen widgets, onboarding flow, shareable savings cards.

---

## Dependency Graph

```
Phase 1A (SmartThings API) ──┬──→ Phase 1B (WiFi/BLE/IR) ──┐
                             │                               │
                             └──→ Phase 2 (RN App 0.79+) ───┤──→ Phase 3 (Scanner)
                                                             ├──→ Phase 4 (Presets)
                                                             ├──→ Phase 5 (Analytics)
                                                             └──→ Phase 6 (Polish)
```

### Phase 7B: Galaxy Watch 7 Biometric AC Intelligence ⬜
**Requirements:** BIO-R1 through BIO-R8
**Depends on:** Phase 1A (backend AC control), Phase 2 (RN App), Phase 4 (Presets)
**Effort:** ~8-10 hours

Galaxy Watch 7 companion app (Kotlin/Wear OS) reads biometric sensors (HR, skin temp delta, SpO2, HRV) during sleep. Android native module bridges watch data to React Native. TypeScript decision engine interprets signals and conservatively adjusts AC. Personal baseline builds over 3 nights. Morning report with comfort grade.

**Execution Waves:**
```
Wave 1 (parallel):  Plan 1 (Wear OS app)  |  Plan 2 (Android WatchBridge + Health Connect)
Wave 2 (parallel):  Plan 3 (Biometric Engine)  |  Plan 5 (UI Components)
Wave 3 (parallel):  Plan 4 (Sleep Mode + Orchestrator)  |  Plan 6 (Settings + Navigation)
```

---

## Dependency Graph (Updated)

```
Phase 1A (SmartThings API) ──┬──→ Phase 1B (WiFi/BLE/IR) ──┐
                             │                               │
                             └──→ Phase 2 (RN App 0.79+) ───┤──→ Phase 3 (Scanner)
                                                             ├──→ Phase 4 (Presets)
                                                             ├──→ Phase 5 (Analytics)
                                                             ├──→ Phase 6 (Polish)
                                                             └──→ Phase 7B (Watch Biometrics)
                                                                  ├── 7B-1: Wear OS App (Wave 1)
                                                                  ├── 7B-2: WatchBridge (Wave 1)
                                                                  ├── 7B-3: Bio Engine (Wave 2)
                                                                  ├── 7B-4: Sleep Screens (Wave 3)
                                                                  ├── 7B-5: UI Components (Wave 2)
                                                                  └── 7B-6: Settings + Nav (Wave 3)
```

## Status
- **Current Phase:** Phase 7B — Planning complete
- **Milestone Progress:** Phases 1-6 built, Phase 7B planned (6 plans across 3 waves)
