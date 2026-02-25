# PHASE 7B — Plan 4: Sleep Mode Integration + Orchestrator

## Goal
Wire the BiometricACEngine into the SmartAC app's sleep flow. Build SleepOrchestrator (start/stop sessions), SleepModeScreen (live biometric dashboard during sleep), and MorningReportScreen (post-sleep biometric report with comfort grade).

## Wave
3 (depends on Plan 3 — BiometricACEngine must exist)

## Requirements
BIO-R1, BIO-R4 (sleep-stage AC), BIO-R6 (morning report)

## Files
```
SmartACApp/src/services/
└── sleepOrchestrator.ts

SmartACApp/src/screens/
├── SleepModeScreen.tsx
└── MorningReportScreen.tsx
```

---

<task type="create">
  <name>Build SleepOrchestrator — end-to-end sleep session management</name>
  <files>SmartACApp/src/services/sleepOrchestrator.ts</files>
  <action>
    SleepOrchestrator class:
    
    Members:
      biometricEngine: BiometricACEngine
      healthConnect: HealthConnectService
      isSleepActive = false
    
    startSleepSession(deviceId, deviceSettings):
      Set isSleepActive = true
      1. Apply initial sleep preset (ultra-saver or user's configured sleep preset)
         Use existing applyPreset() from presets.ts
      2. Start watch biometric monitoring via biometricEngine.startSleepMonitoring()
      3. Schedule morning auto-stop at configured wakeTime (default 07:00)
      4. Log session start event
    
    endSleepSession(deviceId) → NightReport:
      Set isSleepActive = false
      1. Stop biometric monitoring → get nightReport
      2. Read Health Connect for full sleep session data
         (sleep stages are only available post-session)
      3. Merge Health Connect stages into nightReport
      4. Feed nightReport to existing RLOptimizer + SleepLearner if available
      5. Return enriched report
    
    scheduleWakeup(wakeTime, deviceId):
      Parse "HH:MM" string
      Calculate ms until wake time
      setTimeout → call endSleepSession at wake time
    
    Export as singleton or class with factory.
  </action>
  <verify>
    startSleepSession → preset applied + biometricEngine started
    endSleepSession → returns NightReport with Health Connect data merged
  </verify>
  <done>Sleep session lifecycle managed: start → monitor → wake → report</done>
</task>

<task type="create">
  <name>Build SleepModeScreen — live biometric display during sleep</name>
  <files>SmartACApp/src/screens/SleepModeScreen.tsx</files>
  <action>
    Full-screen dark mode screen (lunar/biometric aesthetic).
    
    TOP — WATCH CONNECTION STATUS:
      If connected + monitoring:
        Animated Bluetooth ring (Animated.loop, opacity 1→0.3 every 2s)
        Galaxy Watch icon (Ionicons 'watch-outline')
        "● Live biometrics active" in #4ADE80 green, subtle pulse
      If disconnected:
        Gray ring, "Watch not connected" + "Set up watch" link
    
    CENTER — LIVE BIOMETRIC CARD:
      Uses LiveBiometricCard component (built in Plan 5)
      Subscribes to WatchBiometricUpdate events
      Shows: HR, skin temp delta, SpO2, HRV
      Comfort slider: horizontal gradient bar (blue→green→red)
        White dot at thermalComfort position (0-100)
        Animated with spring physics
      Updates every 5 minutes with number transition animation
    
    MIDDLE — AC CURRENT STATE:
      Card showing: temperature, mode, fan speed
      "Auto-adjust ON/OFF" toggle
      Last AI adjustment: time + explanation text
    
    BOTTOM — SLEEP TIMELINE:
      Vertical timeline from sleep start to now
      Dots for AC adjustments (mint), anomalies (coral), sleep stages (indigo/purple)
      Current time: animated pulsing mint dot with "NOW" label
      Uses SleepTimeline component (Plan 5)
    
    CONTROLS:
      "Override AI" button → pause biometric control for 30 min
        Show countdown timer while active
      "Adjust manually" → navigate to DeviceControlScreen
      "Good morning" button (appears via condition — e.g., after 5 AM)
        → calls sleepOrchestrator.endSleepSession()
        → navigates to MorningReportScreen with report data
    
    State management:
      Subscribe to WatchBiometricUpdate in useEffect
      Track: latestBiometrics, acState, adjustmentLog, isOverrideActive, overrideTimer
    
    Navigation: Add to stack navigator, pass deviceId as route param
  </action>
  <verify>
    Screen renders with dark theme
    Mock biometric data → card updates values
    "Override AI" → pauses engine for 30 min with countdown
    "Good morning" → navigates to MorningReportScreen
  </verify>
  <done>Live biometric dashboard during sleep with AC control and override capability</done>
</task>

<task type="create">
  <name>Build MorningReportScreen — post-sleep biometric report</name>
  <files>SmartACApp/src/screens/MorningReportScreen.tsx</files>
  <action>
    Modal screen appearing after sleep session ends.
    
    HEADER:
      Gradient background: deep blue (#1E1B4B) → purple (#581C87) → black
      Date: "Wednesday, Feb 24 · Sleep Report" in muted mono
    
    COMFORT GRADE (center, large):
      Huge letter grade (A+, A, B+, B, C, D) — 72pt font
      Circular ring around it (SVG or Animated)
        Ring color: A=#4ADE80, B=#38BDF8, C=#FACC15, D=#FF6B35
        Animated fill: 0% → thermalComfortScore% on mount (1.5s duration)
    
    METRIC ROW (horizontal ScrollView):
      5 rounded cards in a row:
      1. Sleep hours (e.g., "7h 22m")
      2. Avg SpO2 (e.g., "97%")
      3. Skin temp delta (e.g., "+0.2°C")
      4. AC adjustments count (e.g., "3x")
      5. HRV grade (e.g., "B+")
      Each card: dark surface bg, value in JetBrains Mono style, label below
    
    ADJUSTMENTS TIMELINE:
      Compact list from NightReport.adjustments[]
      Each row: time (mono) | colored action chip (mint=cool, coral=warm) | reason text
      Example: "11:23 PM ● Cooled to 24°C — skin temp rising (+0.8°C)"
    
    INSIGHT CARD:
      Rounded card with #4ADE80 left border
      NightReport.insight text in italic DM Sans
    
    SHARE BUTTON:
      "Share sleep report" → captureRef + RN Share API
    
    CLOSE BUTTON:
      "Dismiss" → navigate back to HomeScreen
    
    Route params: receives NightReport object
  </action>
  <verify>
    Screen renders with mock NightReport data
    Grade ring animates on mount
    Metric cards display correct values
    Adjustment list renders entries
  </verify>
  <done>Morning report shows comfort grade, biometric summary, adjustment log, and personalized insight</done>
</task>
