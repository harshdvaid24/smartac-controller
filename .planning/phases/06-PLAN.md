# PHASE 6 — Polish & Extra Features

## Goal
Add multi-room support, comfort score, weather integration, home screen widgets, onboarding flow, and shareable savings cards to make the app feel production-ready.

## Requirements Covered
V2 (selected items: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6)

## Dependencies
Phase 2 (RN App core)

---

## Prompts

### Prompt 6-1: Multi-Room Support

```
You are adding multi-room grouping to SmartAC.

FILES:
- SmartACApp/src/screens/RoomsScreen.tsx (new)
- SmartACApp/src/components/RoomCard.tsx (new)
- SmartACApp/src/screens/RoomEditor.tsx (new)

TASK: Group AC devices by rooms

ROOM MODEL:
```ts
interface Room {
  id: string;
  name: string;        // "Bedroom", "Living Room", "Office"
  icon: string;        // 🛏️ 🛋️ 💼 👶 🍳 🧘 🎮
  deviceIds: string[]; // AC devices in this room
  color: string;       // Accent color for the room
}
```

ROOMS SCREEN (replaces simple device list on Home tab):
- Grid of room cards (2 columns)
- Each room card shows:
  * Room icon + name
  * Number of ACs
  * Combined status: "2/3 running"
  * Average temp across room's ACs
  * Quick on/off toggle for entire room

ROOM CARD DESIGN:
┌──────────────────┐
│     🛏️           │
│   Bedroom        │
│   24°C · 1 AC    │
│   ● Running      │
│   ─────────────  │
│   [ON] [OFF]     │
└──────────────────┘

ROOM EDITOR:
- Name input
- Icon picker (grid of room-appropriate emojis)
- Color picker (8 preset colors)
- Device assignment (checkboxes of available devices)
- Delete room (with confirmation)

"ALL DEVICES" always visible at top (shows flat list)

STORAGE: Rooms saved in SQLite + synced to Supabase

DEFAULT ROOMS (auto-created on first device setup):
- 🛏️ Bedroom
- 🛋️ Living Room
- Create from detected device names if possible

VERIFY:
1. Create a room → assign devices → room appears in grid
2. Room card shows combined status of its ACs
3. Toggle room ON → all ACs in room turn on
4. Edit room → changes persist
```

### Prompt 6-2: Comfort Score

```
You are adding comfort scoring to SmartAC.

FILES:
- SmartACApp/src/services/comfort.ts (new)
- SmartACApp/src/components/ComfortScore.tsx (new)

TASK: Calculate and display a comfort score based on AC usage patterns

COMFORT SCORE ALGORITHM:
```ts
function calculateComfortScore(sessions: RuntimeSession[], weather?: Weather): ComfortResult {
  // Score 0-100 based on:
  
  // 1. TEMPERATURE STABILITY (40% weight)
  // How consistent was the room temp during sleep hours (10PM-6AM)?
  // Stable 23-25°C = 100, fluctuations or extremes = lower
  const tempStability = calculateTempStability(sessions);
  
  // 2. HUMIDITY COMFORT (20% weight)
  // 40-60% humidity = 100, <30% or >70% = lower
  const humidityScore = calculateHumidityComfort(sessions);
  
  // 3. RUNTIME CONTINUITY (20% weight)
  // AC ran continuously through the night = 100
  // AC cycled on/off frequently = lower (uncomfortable)
  const continuity = calculateContinuity(sessions);
  
  // 4. ENERGY EFFICIENCY (20% weight)
  // Using eco/sleep modes = higher score
  // Running at 18°C full blast all night = lower
  const efficiency = calculateEfficiency(sessions);
  
  const total = tempStability * 0.4 + humidityScore * 0.2 + continuity * 0.2 + efficiency * 0.2;
  
  return {
    score: Math.round(total),
    grade: scoreToGrade(total), // A+, A, B+, B, C, D
    breakdown: { tempStability, humidityScore, continuity, efficiency },
    tips: generateTips(breakdown),
    emoji: scoreToEmoji(total), // 😴💤 (90+), 😊 (70-89), 😐 (50-69), 😰 (<50)
  };
}
```

COMFORT SCORE WIDGET (ComfortScore.tsx):
- Circular progress ring (0-100)
- Color: green (80+), yellow (60-79), orange (40-59), red (<40)
- Grade letter in center: "A+"
- Tap → expand breakdown:
  * 🌡️ Temp Stability: 92/100
  * 💧 Humidity: 78/100
  * ⏱️ Continuity: 95/100
  * ⚡ Efficiency: 86/100
- Tips section: "Try raising temp to 25°C for better efficiency without losing comfort"

PLACEMENT:
- HomeScreen: mini comfort score badge
- AnalyticsScreen: full comfort card with breakdown
- After night mode session ends: popup with last night's score

VERIFY:
1. Run AC overnight → comfort score calculates next morning
2. Score breakdown shows all 4 factors
3. Tips are relevant to actual usage patterns
```

### Prompt 6-3: Weather Integration

```
You are adding weather integration to SmartAC.

FILES:
- SmartACApp/src/services/weather.ts (new)
- SmartACApp/src/components/WeatherBanner.tsx (new)

INSTALL:
npm install @react-native-community/geolocation@^4  # Latest geolocation

TASK: Fetch local weather and provide AC suggestions

WEATHER SERVICE:
- Use OpenWeatherMap free API (1000 calls/day free)
- OR WeatherAPI.com free tier
- API key configurable in settings
- Get user location (permission required)
- Cache weather for 30 min

WEATHER DATA:
```ts
interface Weather {
  temp: number;           // Outside temperature
  humidity: number;       // Outside humidity
  condition: string;      // 'clear', 'cloudy', 'rain', 'hot', 'cold'
  forecast: ForecastItem[]; // Next 24h hourly
}
```

WEATHER BANNER (top of HomeScreen):
- Current outside temp + condition icon
- Suggestion based on weather:
  * If outside > 35°C: "Hot day! Pre-cool your room 30 min before arriving"
  * If outside < 20°C: "Cool outside! Consider opening windows instead of AC"
  * If humidity > 80%: "High humidity. Dry mode recommended"
  * If rain: "Cooler after rain. You can raise your AC temp by 2°C"

PRE-COOLING SUGGESTION:
- If user has "Coming Home" schedule at 5 PM
- And forecast shows 38°C at 4:30 PM
- Suggest: "Start AC at 4:30 PM so it's cool when you arrive"

WEATHER CARD ON HOME (WeatherBanner.tsx):
┌─────────────────────────────────────┐
│  ☀️ 34°C outside · Sunny            │
│  💡 Pre-cool tip: Start AC by 4:30  │
└─────────────────────────────────────┘

Optional (v2): Show weather forecast strip

VERIFY:
1. Location permission → weather loads → banner shows
2. Hot weather → cooling suggestion appears
3. Cool weather → "skip AC" suggestion appears
```

### Prompt 6-4: Home Screen Widgets (iOS + Android)

```
You are adding home screen widgets to SmartAC.

INSTALL:
# iOS: WidgetKit via native module
# Android: App Widget via native module
npm install react-native-widget-extension   # if available, else native implementation

TASK: Build quick-access home screen widgets

WIDGET TYPES:

1. SMALL WIDGET (2x2)
   ┌────────────┐
   │  ❄️ 24°C   │
   │  Bedroom   │
   │  ● ON      │
   │  [Toggle]  │
   └────────────┘
   - Shows primary device status
   - Tap widget → open app
   - Toggle button → on/off (deep link action)

2. MEDIUM WIDGET (4x2)
   ┌──────────────────────────┐
   │ ❄️ SmartAC    ₹47 saved  │
   │ Bedroom: 24°C ● ON      │
   │ Living: 26°C  ● OFF     │
   │ [Night Mode]  [All OFF] │
   └──────────────────────────┘
   - Shows 2 devices
   - Today's savings
   - Quick action buttons

3. LARGE WIDGET (4x4) — Android only
   - All devices + today's full stats
   - Preset quick-apply buttons

IMPLEMENTATION APPROACH:
Since native widgets require platform-specific code:

iOS (WidgetKit):
- Create WidgetExtension target in Xcode
- SwiftUI widget views
- Shared data via App Group UserDefaults
- Timeline updates every 15 min

Android (AppWidget):
- AppWidgetProvider in Java/Kotlin
- RemoteViews for widget layout
- SharedPreferences for data
- AlarmManager for updates

SHARED DATA:
- Write device status to shared storage from RN side
- Widgets read from shared storage
- Update when app polls device status

Note: This is a complex native feature. Create the RN data-writing side now,
and document the native widget implementation for a dedicated native dev session.

VERIFY:
1. App writes device data to shared storage
2. (iOS) Widget extension reads and displays data
3. (Android) AppWidget shows device status
4. Tapping widget opens app to correct device
```

### Prompt 6-5: Onboarding Flow

```
You are building the first-time onboarding experience for SmartAC.

FILES:
- SmartACApp/src/screens/OnboardingScreen.tsx (new)
- SmartACApp/src/components/OnboardingSlide.tsx (new)

TASK: Build an animated onboarding walkthrough

SLIDES (4 screens with horizontal swipe):

1. SLIDE 1 — Welcome
   - Large ❄️ → 📱 animation
   - Title: "SmartAC"
   - Subtitle: "Control any AC from your phone"
   - Body: "Works with Samsung, LG, Daikin, Voltas, and 15+ brands"

2. SLIDE 2 — Save Money
   - Animation: coin stack growing + electricity bolt shrinking
   - Title: "Save Money Automatically"
   - Subtitle: "Smart presets reduce energy by 30-45%"
   - Body: "Track exactly how much you save in ₹, $, €, or any currency"

3. SLIDE 3 — Night Mode
   - Animation: moon rising, AC adjusting
   - Title: "Sleep Better, Spend Less"
   - Subtitle: "Night mode optimizes your AC for comfortable sleep"
   - Body: "Set it and forget it — automatic schedules handle everything"

4. SLIDE 4 — Get Started
   - Animation: phone scanning AC barcode
   - Title: "Set Up in 60 Seconds"
   - Subtitle: "Scan your AC or enter your SmartThings token"
   - "Get Started" button → SetupScreen

DESIGN:
- Full screen slides with gradient backgrounds
- Each slide has different gradient (blue, green, purple, orange)
- Dot indicators at bottom
- "Skip" text button at top right
- Last slide has "Get Started" CTA button
- Swipe gestures + button navigation

ANIMATIONS:
- Use react-native-reanimated v3.16+ for smooth 60fps animations
- Parallax effect on slide content vs background
- Icons scale and fade in as slides enter
- Dots animate width change (active = wide pill, inactive = small circle)

SHOW CONDITION:
- Only on first launch (check AsyncStorage flag)
- After onboarding → SetupScreen
- Settings has "Replay onboarding" option

VERIFY:
1. First launch → onboarding shows → swipe through all 4 slides
2. "Skip" → goes to setup
3. "Get Started" → goes to setup
4. Second launch → skips onboarding → goes to dashboard
```

### Prompt 6-6: Shareable Savings Card

```
You are adding shareable savings cards to SmartAC.

FILES:
- SmartACApp/src/components/ShareableCard.tsx (new)
- SmartACApp/src/utils/share.ts (new)

INSTALL:
npm install react-native-view-shot@^4  # Capture view as image
npm install react-native-share@^11     # Native share sheet (latest)

TASK: Generate beautiful shareable savings cards

CARD DESIGN:
```
┌──────────────────────────────────────────┐
│                                           │
│            SmartAC 🌿                    │
│                                           │
│        I saved ₹5,240                    │
│      on AC this summer!                  │
│                                           │
│   🔌 415 kWh saved                       │
│   🌱 340 kg CO₂ reduced                 │
│   🌙 67 smart sessions                  │
│                                           │
│   ──────────────────────                 │
│   That's like planting 15 trees! 🌳     │
│                                           │
│   Track your AC savings at              │
│   smartac.app                            │
│                                           │
└──────────────────────────────────────────┘
```

CARD VARIATIONS:
1. Monthly summary — "I saved ₹X this month"
2. Milestone — "I've saved ₹10,000 total!"
3. Streak — "30 days of smart AC usage 🔥"
4. Eco — "Reduced X kg CO₂ — like planting Y trees"
5. Comparison — "I use 43% less energy than average"

FUN EQUIVALENCIES:
- ₹1,000 saved = "That's 10 movie tickets 🎬"
- 100 kWh saved = "That's charging your phone for 3 years 📱"
- 50 kg CO₂ = "That's like planting 2 trees 🌳"
- 200 hours efficient = "That's 8 full days of smart cooling ❄️"

IMPLEMENTATION:
1. Render card as a React Native View (not an image)
2. Use react-native-view-shot to capture as PNG
3. Use react-native-share to open native share sheet
4. Share to: WhatsApp, Instagram Stories, Twitter, Save to gallery

TRIGGER POINTS:
- Analytics screen: "Share your savings" button
- Monthly report card: share icon
- Milestone popup: "Share this achievement!"
- Settings: "Share SmartAC" option

VERIFY:
1. Tap share → card renders → share sheet opens
2. Card looks good on both light and dark backgrounds
3. WhatsApp, Instagram share work correctly
4. Saved image has proper resolution (1080x1920 for stories)
```

---

## Verification Criteria
- [ ] Rooms: create, edit, delete rooms with device assignment
- [ ] Room card shows combined status
- [ ] Comfort score calculates after overnight session
- [ ] Weather banner shows current conditions + suggestions
- [ ] Native widgets display device status (iOS + Android)
- [ ] Onboarding shows on first launch only
- [ ] Shareable card generates and shares via native sheet
- [ ] All features work in both light and dark mode

## Files Created
```
SmartACApp/src/
├── screens/
│   ├── RoomsScreen.tsx
│   ├── RoomEditor.tsx
│   └── OnboardingScreen.tsx
├── components/
│   ├── RoomCard.tsx
│   ├── ComfortScore.tsx
│   ├── WeatherBanner.tsx
│   ├── OnboardingSlide.tsx
│   └── ShareableCard.tsx
├── services/
│   ├── comfort.ts
│   └── weather.ts
├── utils/
│   └── share.ts
```
