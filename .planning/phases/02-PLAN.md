# PHASE 2 — React Native App: Core UI & Navigation

## Goal
Build the React Native mobile app (bare workflow, New Architecture) with TypeScript 5.x. Setup screen with **connection method selector** (SmartThings / WiFi Direct / IR Blaster), device list with live status and connection type badges, universal device control screen with dynamically-rendered controls, and dark/night mode theme.

## Requirements Covered
R2 (React Native App — latest stack), R6.1 (SQLite local)

## Dependencies
Phase 1A (Backend API must be running), Phase 1B (WiFi/BLE/IR modules)

---

## Prompts

### Prompt 2-1: Project Scaffold + Navigation

```
You are building a React Native mobile app for universal Smart AC control.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/

TASK: Create a new bare React Native project called "SmartACApp"

1. Initialize bare React Native project with New Architecture:
   npx @react-native-community/cli init SmartACApp --version 0.79
   cd SmartACApp
   # New Architecture (Fabric + TurboModules) is enabled by default in 0.79+

2. Install dependencies (all latest versions as of Feb 2026):
   # Navigation (v7)
   npm install @react-navigation/native@7 @react-navigation/bottom-tabs@7 @react-navigation/native-stack@7
   npm install react-native-screens react-native-safe-area-context
   
   # State management (v5)
   npm install zustand@5
   
   # Styling (NativeWind v4 + Tailwind v4)
   npm install nativewind@4 tailwindcss@4
   
   # HTTP client
   npm install axios
   
   # Storage
   npm install @react-native-async-storage/async-storage
   npm install @op-engineering/op-sqlite   # Fastest RN SQLite (JSI-based)
   
   # Icons
   npm install react-native-vector-icons@10
   npm install @types/react-native-vector-icons --save-dev
   
   # Animations (v3.16+)
   npm install react-native-reanimated@3 react-native-gesture-handler@2
   
   # Haptics
   npm install react-native-haptic-feedback
   
   # BLE (for direct AC control)
   npm install react-native-ble-plx@3
   
   # Network discovery (mDNS from RN side)
   npm install react-native-zeroconf
   
   # Notifications
   npm install @notifee/react-native@9

3. Configure NativeWind v4 (tailwind.config.js + babel plugin + metro config)
   Follow https://www.nativewind.dev/v4/getting-started for v4-specific setup

4. Create the app structure:
   src/
   ├── App.tsx                    # Root component with NavigationContainer
   ├── navigation/
   │   ├── RootNavigator.tsx      # Stack: Onboarding → Setup → MainTabs
   │   └── MainTabs.tsx           # Bottom tabs: Home, Devices, Analytics, Settings
   ├── screens/
   │   ├── SetupScreen.tsx        # Connection method selector + device discovery
   │   ├── HomeScreen.tsx         # Dashboard overview (placeholder)
   │   ├── DeviceListScreen.tsx   # All AC devices (placeholder)
   │   ├── DeviceControlScreen.tsx# Single device control (placeholder)
   │   ├── AnalyticsScreen.tsx    # Savings & charts (placeholder)
   │   └── SettingsScreen.tsx     # App settings (placeholder)
   ├── store/
   │   └── useStore.ts            # Zustand v5 store
   ├── services/
   │   ├── api.ts                 # Axios instance pointing to backend
   │   ├── smartthings.ts         # SmartThings API wrapper
   │   ├── localWifi.ts           # Local WiFi discovery + direct control
   │   ├── ble.ts                 # BLE scanning + pairing
   │   └── irBlaster.ts           # IR blaster discovery + control
   ├── components/
   │   └── (created in later prompts)
   ├── theme/
   │   └── colors.ts              # Light/Dark theme colors
   ├── types/
   │   └── index.ts               # TypeScript interfaces
   └── utils/
       └── helpers.ts             # Utility functions

5. Create types/index.ts with core interfaces:
   - Device { deviceId, name, brand, model, online, capabilities, connectionType: 'smartthings'|'wifi_local'|'ir'|'ble' }
   - ConnectionConfig { type, ip?, port?, token?, blasterIp?, bleDeviceId? }
   - Capabilities { power, temperature, humidity, modes, fanSpeeds, etc }
   - UsageEvent { id, deviceId, eventType, details, createdAt }
   - Savings { period, baseline, actual, saved, currency }
   - Settings { electricityRate, currency, temperatureUnit, etc }
   - Preset { id, name, icon, temp, mode, fan, specialMode, swing }

6. Create store/useStore.ts with Zustand v5:
   State: { 
     token, devices, selectedDevice, status, settings, 
     isSetup, isDarkMode, isLoading, error,
     connectionMethod: 'smartthings'|'wifi_local'|'ir'|'auto',
     setToken, fetchDevices, selectDevice, fetchStatus, 
     toggleDarkMode, updateSettings, setConnectionMethod,
     discoverLocalDevices, discoverIRBlasters
   }

7. Create services/api.ts:
   - Axios instance with baseURL pointing to backend (configurable)
   - Interceptor to add Bearer token from store
   - Methods: getDevices(), getCapabilities(id), getStatus(id), sendCommand(id, commands), getUsageStats(id, period), getSavings(id, period), getSettings(), updateSettings(key, value)
   - NEW: discoverLocal(), getLocalStatus(ip, port, brand), sendLocalCommand(...)
   - NEW: discoverIRBlasters(), sendIRCommand(blasterIp, brand, command, value)

8. Bottom tab icons:
   - Home: 🏠 (home-outline)
   - Devices: ❄️ (snowflake / air-conditioner)  
   - Analytics: 📊 (chart-line)
   - Settings: ⚙️ (cog-outline)

9. Navigation flow:
   - If no token → SetupScreen (stack)
   - If token exists → MainTabs
   - DeviceList → DeviceControl (stack push)

VERIFY: App builds and runs on iOS simulator with bottom tabs visible. Tapping each tab shows the placeholder screen.
```

### Prompt 2-2: Setup Screen (Token + Device Discovery)

```
You are building the Setup screen for the SmartAC React Native app.

FILE: src/screens/SetupScreen.tsx

TASK: Build the full Setup/Onboarding screen

DESIGN:
- Clean, modern design matching the existing web UI aesthetic
- Gradient background (light: #f0f4f8 → #e2e8f0, dark: #0a0e27 → #1a1040)
- Card-based layout with glassmorphism effect

SECTIONS:

1. HEADER
   - ❄️ icon (large, 64px)
   - "SmartAC" title with gradient text (blue → purple)
   - "Universal Smart AC Controller" subtitle
   - Tagline: "Works with Samsung, LG, Daikin, Voltas, and 15+ brands"

2. CONNECTION METHOD SELECTOR (the KEY new section)
   Three large cards to choose how to connect:
   
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ ☁️ Cloud     │ │ 📶 WiFi     │ │ 🔴 IR       │
   │             │ │ Direct      │ │ Blaster      │
   │ SmartThings │ │ Local       │ │ Any AC       │
   │ remote ctrl │ │ fastest     │ │ even dumb    │
   └─────────────┘ └─────────────┘ └─────────────┘
   
   Also: "🔍 Auto-Detect" button — scans all methods simultaneously
   
   a) CLOUD (SmartThings):
      - Token input + "Connect" flow (same as before)
      - Works remotely from anywhere
   
   b) WiFi DIRECT:
      - "Scan Local Network" button
      - Runs mDNS + SSDP + port scan via backend
      - Shows discovered ACs with brand, IP, signal
      - No token needed, no internet needed
      - Badge: "📶 Local — <50ms latency"
   
   c) IR BLASTER:
      - "Find IR Blaster" button (scans for Broadlink/Switchbot)
      - Select your AC brand from dropdown (50+ brands)
      - Select remote model (or "I don't know — try all")
      - Test button: "Press to turn ON your AC"
      - If test fails → "Learn Mode" (point remote at blaster)
      - Badge: "🔴 IR — any AC, status assumed"

3. DEVICE DISCOVERY (shown after connection method works)
   - "Found X AC device(s)" header
   - List of device cards, each showing:
     * Brand emoji + device name
     * Model number
     * Connection type badge: ☁️ / 📶 / 🔴 / 🔵
     * Online/offline status badge
     * Capability tags (cool, heat, auto, etc.)
     * Radio button selection
   - If multiple devices: user selects one
   - If single device: auto-selected

4. SERVER CONFIG (expandable section)
   - Backend URL input (default: http://localhost:3000)
   - For when deployed to cloud

5. "Launch Dashboard →" button (disabled until device selected)

BEHAVIOR:
- AUTO-DETECT mode:
  1. Scan local WiFi network (fastest)
  2. If SmartThings token saved → also query SmartThings
  3. If IR blaster found → offer it for non-smart ACs
  4. Show all results merged, recommend best connection (WiFi > SmartThings > IR)
- On "Connect" (SmartThings): call api.getDevices() with entered token
- On "Scan" (WiFi): call api POST /api/discover/local
- On "Find IR" : call api GET /api/ir/blasters
- If 401: show "Invalid token" error
- If success: show device list
- On "Launch": save device config to Zustand store + AsyncStorage, navigate to MainTabs
- Persist all connection configs in AsyncStorage

ANIMATIONS:
- Fade in cards on mount
- Device cards slide in with stagger
- Button press scale animation with haptic
- Scanning animation (radar sweep) during discovery

VERIFY: 
1. SmartThings flow: Enter token → devices appear → select → dashboard
2. WiFi Direct flow: Tap scan → local ACs found → select → dashboard
3. IR flow: Find blaster → select brand → test → dashboard
4. Auto-detect: discovers from all sources simultaneously
```

### Prompt 2-3: Device List Screen + Status Cards

```
You are building the Device List screen for SmartAC.

FILE: src/screens/DeviceListScreen.tsx + src/components/DeviceCard.tsx

TASK: Build the device list with live status cards

DEVICE CARD COMPONENT (DeviceCard.tsx):
- Full-width card with rounded corners (20px), subtle shadow
- Layout:
  ┌─────────────────────────────────────────┐
  │ 🌀 Living Room AC              ● ON    │
  │ Samsung AR18CYLANWKN     📶 WiFi        │
  │                                          │
  │  ┌──────┐  ┌──────┐  ┌──────┐          │
  │  │ 24°  │  │ 23°  │  │ 65%  │          │
  │  │ Room │  │Target│  │Humid │          │
  │  └──────┘  └──────┘  └──────┘          │
  │                                          │
  │  cool · auto · quiet · swing off        │
  │  ⚡ 12ms latency                         │
  └─────────────────────────────────────────┘

- Status badge: green dot + "ON" or red dot + "OFF"
- CONNECTION TYPE BADGE (top right): 
  * ☁️ Cloud (SmartThings) — shown in blue
  * 📶 WiFi (Local) — shown in green, with latency
  * 🔴 IR (Blaster) — shown in red, "status assumed" note
  * 🔵 BLE — shown in indigo
- 3 stat boxes in a row: Room temp, Target temp (accented), Humidity
  * For IR connections: show "—" for Room temp & Humidity (not available)
- Tags row: current mode, fan, special mode, swing
- Latency indicator for WiFi connections (ms)
- Tap → navigate to DeviceControlScreen with deviceId
- Pull-to-refresh on the list

DEVICE LIST SCREEN:
- Header: "My Devices" with count badge
- FlatList of DeviceCard components
- "Add Device" button (FAB) at bottom right
- Empty state: illustration + "No devices found" + "Set up your first AC" button
- Auto-refresh every 12 seconds (like existing web app)
- Brand emoji based on brand detection:
  Samsung → 🌀, LG → 🔵, Daikin → 🟢, Carrier → 🔴, Voltas → 🟡, etc.

LOADING STATE:
- Skeleton cards while loading (3 placeholder cards with shimmer animation)

VERIFY: Screen shows all connected ACs with live temp/humidity data, auto-refreshes.
```

### Prompt 2-4: Universal Device Control Screen

```
You are building the universal Device Control screen for SmartAC.

FILE: src/screens/DeviceControlScreen.tsx + supporting components

TASK: Build a dynamic control screen that adapts to any AC's capabilities

This is the KEY SCREEN of the app. It must NOT hardcode any brand-specific capabilities.
Instead, it reads the device's capability profile from the backend and renders controls accordingly.

SCREEN LAYOUT:

1. HEADER BAR
   - Back arrow + Device name + Brand badge
   - Online status indicator
   - Settings gear icon (→ device settings)

2. POWER BUTTON (large, center)
   - Giant circular button with ON/OFF state
   - Green glow when ON, muted when OFF
   - Haptic feedback on tap
   - Animated (scale + color transition)

3. TEMPERATURE CONTROL
   - Large temperature display in center: "24°C"
   - Circular slider OR - / + buttons on sides
   - Min/Max from device capabilities (typically 16-30°C)
   - Smooth animation on change
   - Debounced API call (300ms after last change)

4. QUICK STATS (horizontal row)
   - Room Temp | Humidity | Mode | Fan
   - From live device status

5. MODE SELECTOR (only modes the device supports)
   - Horizontal scrollable pill buttons
   - Icons: cool ❄️, heat 🔥, auto 🔄, dry 💧, wind 🌬️, energy ⚡, AI 🤖
   - Dynamically populated from capabilities.modes array
   - Active state: filled purple
   - If device only supports cool → show only cool

6. FAN SPEED (only if device has fanSpeeds)
   - Horizontal pills: auto, low, medium, high, turbo
   - Only show speeds the device reports in capabilities.fanSpeeds
   - Some ACs have: low/medium/high, others have: 1/2/3/4/5, others have: quiet/low/medium/high/turbo
   - Render whatever the device reports

7. SPECIAL MODES (only if device has specialModes)
   - Grid of toggleable chips
   - Only show what the device supports
   - Common: sleep, quiet, eco, turbo, comfort
   - Samsung-specific: windFree, windFreeSleep (only if detected)
   - LG-specific: AI, ThinQ modes (only if detected)
   - Generic fallback labels if mode name is unclear

8. SWING / OSCILLATION (only if device has swingModes)
   - Horizontal pills
   - Only show supported modes

9. PRESETS SECTION (expandable)
   - Quick apply preset buttons
   - Ultra Saver / Balanced / Comfort / Turbo Cool
   - Generated dynamically by the backend based on capabilities
   - Custom preset: "+" button to create new

THE KEY PRINCIPLE:
```jsx
// GOOD — dynamic:
{capabilities.modes && capabilities.modes.map(mode => (
  <ModeButton key={mode} mode={mode} active={status.mode === mode} />
))}

// BAD — hardcoded:
{['cool', 'heat', 'auto', 'dry', 'wind'].map(...)}  // ← NEVER DO THIS
```

Each section should be wrapped in a conditional:
```jsx
{capabilities.fanSpeeds && capabilities.fanSpeeds.length > 0 && (
  <FanSpeedSelector speeds={capabilities.fanSpeeds} ... />
)}
```

COMMAND SENDING (CONNECTION-AWARE):
- Route commands through the ConnectionManager (from Phase 1B)
- ConnectionManager picks the right transport:
  * Cloud (SmartThings): POST /api/devices/:id/commands → SmartThings API
  * WiFi Direct: POST /api/local/:ip/command → direct HTTP/MQTT to AC
  * IR Blaster: POST /api/ir/send → IR code via Broadlink/Switchbot
  * BLE: send via react-native-ble-plx characteristic write
- Show brief loading indicator on the control that was tapped
- Haptic feedback on all controls
- After sending command:
  * Cloud/WiFi: re-fetch status after 1.5s
  * IR: optimistically update UI (no feedback from AC)
  * BLE: wait for notification/read confirmation
- Show connection type indicator in header: "☁️ Cloud" / "📶 Local" / "🔴 IR"
- If connection lost: show reconnection banner, try fallback method

LIMITATIONS BY CONNECTION:
- IR: no room temp, no humidity, no real status — UI shows "assumed" badge
- WiFi: full control + real status, fastest response
- Cloud: full control + real status, requires internet
- BLE: limited range, for provisioning mostly

VERIFY: 
1. Connect a Samsung AC via WiFi → should show WindFree options, <50ms response
2. Connect a Samsung AC via SmartThings → same controls, works remotely
3. Connect via IR → controls work, status shows "assumed"
4. Connect a non-Samsung AC → WindFree should NOT appear
5. All controls functional: power, temp, mode, fan, swing, special modes
6. Switch between WiFi and Cloud mid-session → seamless transition
```

### Prompt 2-5: Theme System (Dark/Night Mode)

```
You are adding the theme system to SmartAC React Native app.

FILES: 
- src/theme/colors.ts
- src/theme/ThemeProvider.tsx
- Update all screens to use theme

TASK: Implement dark mode matching the existing web app's night aesthetic

LIGHT THEME:
- Background: linear gradient #f0f4f8 → #e2e8f0
- Cards: rgba(255,255,255,0.85) with blur
- Text: #1e293b (primary), #64748b (secondary)
- Accent: #8b5cf6 (purple)
- Stat box bg: rgba(0,0,0,0.03)

DARK THEME (Night Mode):
- Background: linear gradient #0a0e27 → #1a1040
- Cards: rgba(255,255,255,0.06) with blur effect
- Text: #e2e8f0 (primary), #94a3b8 (secondary)
- Accent: #a78bfa (lighter purple)
- Stat box bg: rgba(255,255,255,0.05)
- Ambient glow: radial gradient purple at top

IMPLEMENTATION:
1. ThemeProvider using React Context
2. useTheme() hook returns current theme colors + isDark
3. Auto dark mode based on system preference (Appearance API)
4. Manual toggle in Settings
5. When Night Mode preset is activated → auto switch to dark theme
6. Smooth transition animation between themes
7. StatusBar adapts (light-content / dark-content)

TYPOGRAPHY:
- Font family: System default (San Francisco on iOS, Roboto on Android)
- Heading: 28px, weight 800
- Subheading: 17px, weight 700
- Body: 14px, weight 400
- Caption: 12px, weight 600, uppercase, letter-spacing 1px
- Mono (for IDs, logs): Platform.select — Menlo (iOS) / monospace (Android)

VERIFY: Toggle dark mode in settings → all screens update smoothly.
```

---

## Verification Criteria
- [ ] RN app builds on iOS and Android
- [ ] Bottom tab navigation works (Home, Devices, Analytics, Settings)
- [ ] Setup screen: connect via SmartThings / WiFi / IR → discover → select → dashboard
- [ ] Device list shows live status cards with auto-refresh
- [ ] Device control dynamically renders based on capabilities
- [ ] Controls send commands and update state
- [ ] Dark mode toggles smoothly
- [ ] Haptic feedback on all interactions

## Files Created
```
SmartACApp/
├── src/
│   ├── App.tsx
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   └── MainTabs.tsx
│   ├── screens/
│   │   ├── SetupScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── DeviceListScreen.tsx
│   │   ├── DeviceControlScreen.tsx
│   │   ├── AnalyticsScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── components/
│   │   ├── DeviceCard.tsx
│   │   ├── PowerButton.tsx
│   │   ├── TemperatureControl.tsx
│   │   ├── ModeSelector.tsx
│   │   ├── FanSpeedSelector.tsx
│   │   ├── SpecialModeChips.tsx
│   │   ├── SwingSelector.tsx
│   │   └── PresetCard.tsx
│   ├── store/
│   │   └── useStore.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── smartthings.ts
│   │   ├── localWifi.ts
│   │   ├── ble.ts
│   │   ├── irBlaster.ts
│   │   └── connectionManager.ts
│   ├── theme/
│   │   ├── colors.ts
│   │   └── ThemeProvider.tsx
│   ├── types/
│   │   └── index.ts
│   └── utils/
│       └── helpers.ts
├── tailwind.config.js
└── package.json
```
