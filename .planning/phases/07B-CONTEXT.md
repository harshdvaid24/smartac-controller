# PHASE 7B CONTEXT — Galaxy Watch 7 Biometric AC Intelligence

## What We're Building
A real-time biometric sleep monitoring system using Galaxy Watch 7 that automatically adjusts the AC during sleep based on body signals (skin temperature delta, heart rate, SpO2, HRV, sleep stage).

## Design Decisions (Locked)

### Architecture
- **Wear OS companion app**: Native Kotlin (Android Studio, separate project at `/SmartACWatch/`)
- **Watch → Phone communication**: Wearable Data Layer API (MessageClient, real-time over BT/WiFi)
- **Phone-side receiver**: Android native module (`WatchBridge`) registered as `WearableListenerService`
- **RN integration**: `NativeEventEmitter` emits `WatchBiometricUpdate` events to TypeScript
- **Historical data**: Health Connect API via `react-native-health-connect` for post-sleep analysis
- **Decision engine**: Pure TypeScript — runs on phone, not watch

### Biometric Signals Used
| Signal | Source | Frequency | AC Decision Weight |
|--------|--------|-----------|-------------------|
| Skin temp delta | Samsung Health Sensor SDK | Every 5 min | Primary — most reliable thermal signal |
| Heart rate | Continuous HR tracker | Real-time (~2s), reported every 5min | Secondary — elevated HR = thermal discomfort |
| HRV (RMSSD) | Calculated from IBI intervals | Every 5 min | Tertiary — poor HRV = extreme temp |
| SpO2 | On-demand measurement | Every 5 min | Safety floor — <93% overrides all |
| Ambient temp | Watch thermopile | Every 5 min | Context — room temp at wrist level |
| Sleep stage | Health Connect (post-sleep) | Session-based | Behavior modifier — conservative during deep sleep |

### Decision Engine Philosophy
- **Conservative**: Only act after 2+ consistent readings (not sensor noise)
- **Graduated**: Small adjustments (+/-1°C, 1 fan step) — never drastic swings
- **Safety floor**: SpO2 < 93% → immediately raise AC temp (override all other signals)
- **Rate-limited**: Minimum 15 minutes between adjustments
- **Reversible**: User override pauses biometric control for configurable duration
- **REM-aware**: During REM sleep, body temp naturally drops — don't fight it unless SpO2 is falling
- **Deep sleep**: No adjustments during deep sleep (minimal interference)
- **Learning**: Personal baseline builds over 3 nights via exponential moving average

### Visual Design
- **Dark theme** (AMOLED-friendly for watch, consistent with app)
- **Bio-specific colors**: Warm=#FF6B35, Cool=#38BDF8, Safe=#4ADE80, Alert=#FACC15, Deep=#818CF8, REM=#C084FC
- **Typography**: JetBrains Mono for raw numbers (clinical precision), DM Sans italic for insights
- **Watch app**: Roboto (Wear OS standard), pure black background, electric mint #00FFB2 accent
- **Animations**: Heartbeat pulse on HR display, spring physics on comfort slider, animated gauge needle

### User Flow
1. **Setup**: WatchSetupScreen (3-step: requirements check → baseline explanation → sensitivity)
2. **Calibration**: 3 nights of passive data collection → personal baseline established
3. **Active use**: User taps "Start Smart Sleep" → SleepModeScreen with live biometrics
4. **Morning**: Automatic report → MorningReportScreen with comfort grade + insights

### Platform Constraints
- **Android only** (Health Connect, Wear OS, Samsung Health Sensor SDK — no iOS)
- **Galaxy Watch 5+** required (skin temp sensor)
- **Samsung phone recommended** (Samsung Health Sensor SDK partnership)
- **All data stays on-device** (privacy — no cloud upload of biometric data)

## What Already Exists
- SmartACApp: React Native app with presets, AC control via connection manager
- ac-controller: Express backend with SmartThings proxy, connection manager routing
- Connection manager: Routes commands through WiFi → SmartThings → IR with failover
- Presets service: `applyPreset()`, `sendOneCommand()` via connection manager
- Sleep learner: `sleepLearner.ts` — existing sleep pattern analysis (non-biometric)
- RL optimizer: `rlOptimizer.ts` — reinforcement learning for AC optimization
