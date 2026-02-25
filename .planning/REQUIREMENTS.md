# REQUIREMENTS — SmartAC Universal Controller

## V1 — Must Have (This Milestone)

### R1: Generic Multi-Brand AC Support
- R1.1: Dynamically detect AC capabilities from SmartThings API (modes, fan speeds, swing options, special modes)
- R1.2: Support ALL SmartThings-connected AC brands (Samsung, LG, Daikin, Carrier, Voltas, Blue Star, Hitachi, Panasonic, Mitsubishi, Whirlpool, Godrej, Lloyd, Haier, Toshiba, etc.)
- R1.3: No hardcoded brand-specific capability names — read from device schema
- R1.4: Brand detection from device manufacturer field + capability fingerprinting
- R1.5: Known-brand database with model → wattage → optimal presets mapping

### R1B: Direct WiFi / Bluetooth / IR Control (No Cloud Dependency)
- R1B.1: Local WiFi AC discovery via mDNS/Bonjour and SSDP network scanning
- R1B.2: Direct HTTP/MQTT communication with AC units on local network (Samsung port 8888, Daikin port 80, Midea port 6444, Haier port 56800, Gree UDP 7000)
- R1B.3: BLE scanning for AC initial pairing/provisioning (Midea, Carrier BLE-capable models)
- R1B.4: IR blaster support — Broadlink RM4, Switchbot Hub Mini, Tuya IR Hub
- R1B.5: IR code database covering 5000+ AC models from all major brands
- R1B.6: IR learn mode — learn unknown remote codes by pointing remote at blaster
- R1B.7: Connection method selector in setup: "Cloud (SmartThings)" / "Local WiFi" / "IR Blaster" / "Auto-detect"
- R1B.8: Auto-detect — scan local network first, fallback to SmartThings, suggest IR for non-smart ACs
- R1B.9: Hybrid mode — use local WiFi when home (fastest), SmartThings when away (remote access)
- R1B.10: Works fully offline for local WiFi and IR modes (no internet required)

### R2: React Native Mobile App (Latest Stack)
- R2.1: Bare React Native 0.79+ with New Architecture (Fabric + TurboModules) + TypeScript 5.x
- R2.2: React Navigation v7 with bottom tabs (Home, Devices, Analytics, Settings)
- R2.3: Device list screen with live status cards (on/off, temp, humidity, connection type badge)
- R2.4: Universal device control screen — dynamically rendered controls per device capabilities
- R2.5: Dark mode / Night theme (automatic + manual toggle)
- R2.6: Smooth animations (react-native-reanimated v3.16+) and haptic feedback on controls
- R2.7: NativeWind v4 for styling
- R2.8: Zustand v5 for state management
- R2.9: Connection type indicator on each device: ☁️ Cloud / 📶 WiFi / 🔴 IR / 🔵 BLE

### R3: QR / Barcode Scanner
- R3.1: Scan AC model barcode or SmartThings device QR to auto-identify device
- R3.2: Map scanned model number to known AC database for wattage + preset suggestions
- R3.3: Manual model entry fallback with search autocomplete
- R3.4: Camera permission handling with graceful fallback

### R4: Smart Presets (Generic)
- R4.1: Dynamic preset generation based on device's actual capabilities
- R4.2: Default presets: Ultra Saver, Balanced, Comfort, Turbo Cool
- R4.3: Custom preset builder — user picks name, icon, temp, mode, fan, special
- R4.4: Per-device preset storage
- R4.5: Scheduled preset activation (bedtime / wake / custom times)
- R4.6: Smart suggestions based on room temp + humidity + time of day + weather

### R5: Energy Savings & Analytics
- R5.1: Electricity rate configuration — ₹8/kWh default, fully configurable
- R5.2: Currency selector (INR ₹, USD $, EUR €, GBP £, AED د.إ, etc.)
- R5.3: Runtime tracking — log every on/off event, temp change, mode change with timestamp
- R5.4: Savings calculation: actual kWh vs baseline (8hr @ 18°C daily)
- R5.5: Daily / Weekly / Monthly / Yearly savings breakdown
- R5.6: CO₂ reduction estimate (0.82 kg CO₂ per kWh — India grid average)
- R5.7: Charts: usage history line chart, savings bar chart, temp heatmap
- R5.8: Monthly summary card: "You saved ₹X this month"

### R6: Data Storage
- R6.1: SQLite for local device data, usage logs, presets, settings
- R6.2: Supabase (free tier) for cloud backup + cross-device sync
- R6.3: Offline-first — app works without internet, syncs when connected
- R6.4: Data export (CSV) for usage history

### R7: Backend API Refactor
- R7.1: Keep Express proxy for SmartThings API (CORS bypass)
- R7.2: Add `/api/devices/:id/capabilities` — parsed capability schema
- R7.3: Add `/api/brands` — known AC brand database endpoint
- R7.4: Add `/api/usage` — usage logging endpoint (POST + GET)
- R7.5: Add `/api/savings` — savings calculation endpoint
- R7.6: WebSocket support for real-time device status updates

## V2 — Nice to Have (Future)
- V2.1: Multi-room grouping with room names and icons
- V2.2: Comfort score — rate sleep quality based on temp/humidity patterns
- V2.3: Weather integration — fetch local weather, suggest pre-cooling
- V2.4: iOS/Android home screen widgets for quick on/off
- V2.5: Share savings card — "I saved ₹5,000 this summer" shareable image
- V2.6: Voice control (Siri Shortcuts / Google Assistant)
- V2.7: Geofencing — auto on/off based on location
- V2.8: Family sharing — multiple users, same devices
- V2.9: OAuth flow for SmartThings (no manual token)
- V2.10: Apple Watch / Wear OS companion app

## Milestone 2 — Biometric AC Intelligence (Phase 7B)

### BIO-R1: Real-Time Biometric Reading
- BIO-R1.1: Galaxy Watch 7 companion app reads HR, skin temp delta, SpO2, HRV, ambient temp
- BIO-R1.2: Foreground service runs during sleep, reads sensors every 5 minutes
- BIO-R1.3: Data sent to phone via Wearable Data Layer API (Bluetooth/WiFi, real-time)
- BIO-R1.4: Phone receives biometric packets via WearableListenerService
- BIO-R1.5: React Native receives data via NativeEventEmitter (WatchBiometricUpdate event)

### BIO-R2: Skin Temperature Delta Tracking
- BIO-R2.1: Track skin temp as delta from personal baseline (not absolute °C)
- BIO-R2.2: Trend analysis: rising / stable / falling (compare last 3 readings)
- BIO-R2.3: +1.5°C above baseline → AC should cool; -1.5°C below → AC should warm

### BIO-R3: Heart Rate Thermal Comfort Detection
- BIO-R3.1: Compare current HR to personal resting baseline
- BIO-R3.2: Elevated HR (>8 bpm above baseline) during sleep = thermal discomfort signal
- BIO-R3.3: HRV (RMSSD) tracking — low HRV = poor recovery = temperature too extreme

### BIO-R4: Sleep Stage-Aware AC Adjustment
- BIO-R4.1: Deep sleep → minimal AC interference (conservative mode)
- BIO-R4.2: REM sleep → body temp naturally drops, don't fight it unless SpO2 falling
- BIO-R4.3: Sleep stages from Health Connect post-session data

### BIO-R5: SpO2 Safety Floor
- BIO-R5.1: SpO2 < 93% (configurable) → immediately raise AC temp regardless of other signals
- BIO-R5.2: SpO2 < 90% → emergency raise +2°C at high urgency
- BIO-R5.3: Configurable floor (88-96%) in biometric settings

### BIO-R6: Morning Biometric Sleep Report
- BIO-R6.1: Night report with comfort grade (A+/A/B+/B/C/D)
- BIO-R6.2: Thermal comfort score = % of readings in comfort zone
- BIO-R6.3: Adjustment log with timestamps and reasons
- BIO-R6.4: Personalized insight text ("You ran warm, try starting 1°C lower")
- BIO-R6.5: Health Connect sleep session data merged (stages, duration)

### BIO-R7: Watch Face Tile
- BIO-R7.1: Wear OS tile showing current AC status (temp, mode, on/off)
- BIO-R7.2: Quick toggle buttons on tile (Cool / Off)
- BIO-R7.3: Watch main screen with live HR, skin temp delta, AC status

### BIO-R8: Biometric Learning (Personalisation)
- BIO-R8.1: Personal baseline builds over 3 nights minimum
- BIO-R8.2: Exponential moving average (alpha=0.15) for baseline updates
- BIO-R8.3: Calibration progress card visible during first 3 nights
- BIO-R8.4: Sensitivity slider (Minimal / Balanced / Responsive / Aggressive)

## Out of Scope
- AC installation or repair guidance
- Paid features or subscriptions in v1
- Custom hardware IR blaster manufacturing (use existing Broadlink/Switchbot/Tuya)
- iOS Galaxy Watch support (Health Connect + Wear OS are Android-only)
- Medical-grade biometric accuracy claims

## Phase Traceability
| Requirement | Phase |
|-------------|-------|
| R1 (Generic AC — SmartThings) | Phase 1A |
| R1B (WiFi / BLE / IR Direct) | Phase 1B |
| R7 (Backend API) | Phase 1A |
| R2 (RN App) | Phase 2 |
| R3 (QR Scanner) | Phase 3 |
| R4 (Presets) | Phase 4 |
| R5 (Savings) | Phase 5 |
| R6 (Storage) | Phase 1A + 2 |
| V2 (Extras) | Phase 6 |
| BIO-R1 to BIO-R8 (Biometrics) | Phase 7B |
