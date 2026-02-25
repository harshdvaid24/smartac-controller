# PHASE 7B — Plan 6: Settings, Calibration & Navigation Wiring

## Goal
Add Galaxy Watch setup flow, biometric settings screen, baseline calibration card, and wire all new screens into the navigation stack.

## Wave
3 (parallel with Plan 4 — both depend on Plan 3 types, independent of each other)

## Requirements
BIO-R8 (biometric learning/calibration), BIO-R5 (SpO2 floor config)

## Files
```
SmartACApp/src/screens/
├── WatchSetupScreen.tsx
└── BiometricSettingsScreen.tsx

SmartACApp/src/components/
└── BaselineCalibrationCard.tsx

SmartACApp/src/navigation/
├── RootNavigator.tsx (update)
└── MainTabs.tsx (update)
```

---

<task type="create">
  <name>Build WatchSetupScreen — 3-step Galaxy Watch onboarding</name>
  <files>SmartACApp/src/screens/WatchSetupScreen.tsx</files>
  <action>
    3-step wizard for Galaxy Watch integration.
    
    STEP 1 — REQUIREMENTS CHECK:
    Checklist with real-time auto-detection status:
      ✅ / ⏳ / ❌ Galaxy Watch detected (via WatchBridge.getWatchStatus())
      ✅ / ⏳ / ❌ SmartAC watch app installed
      ✅ / ⏳ / ❌ Body sensor permission granted on watch
      ✅ / ⏳ / ❌ Health Connect enabled
      ✅ / ⏳ / ❌ Sleep data sync active
    
    Each item auto-checks on mount. Failed items show "Fix →" button.
    Icons: Ionicons checkmark-circle (green), timer (yellow), close-circle (red)
    "Next" button enabled when minimum requirements met (watch connected + permissions)
    
    STEP 2 — BASELINE EXPLANATION:
    Explanation card:
      "We need 3 nights of sleep data to learn your personal biometric baseline."
      "Tonight, just wear your watch while sleeping normally — no changes needed."
      "After 3 nights, biometric AC control activates automatically."
    
    Progress indicator: "0/3 nights complete" with moon icons (🌑🌑🌑 → 🌕🌕🌕)
    If baseline already exists: "✅ Baseline established (N nights of data)"
    
    STEP 3 — SENSITIVITY:
    AC Adjustment Sensitivity slider:
      [Minimal] ←────●────→ [Aggressive]
      4 stops: Minimal, Balanced (default), Responsive, Aggressive
      Description below slider changes per selection:
        Minimal: "Only adjusts for extreme signals (SpO2 safety only)"
        Balanced: "Adjusts after 2 consistent readings"
        Responsive: "Adjusts after 1 reading"
        Aggressive: "Proactive, adjusts before discomfort peaks"
    
    Save → store sensitivity in AsyncStorage → navigate to HomeScreen
    
    Dark themed, consistent with existing SetupScreen design language.
  </action>
  <verify>
    3 steps navigate forward/back
    Requirements check auto-detects watch status
    Sensitivity slider saves to AsyncStorage
  </verify>
  <done>Watch setup wizard guides user through requirements, baseline, and sensitivity configuration</done>
</task>

<task type="create">
  <name>Build BiometricSettingsScreen — biometric preferences</name>
  <files>SmartACApp/src/screens/BiometricSettingsScreen.tsx</files>
  <action>
    Settings screen for biometric AC control configuration.
    Can be accessed from main SettingsScreen as a section or sub-screen.
    
    SETTINGS:
    
    1. "Smart Sleep Mode" — Toggle (on/off)
       Description: "Automatically adjust AC based on watch biometrics during sleep"
    
    2. "AC Adjustment Sensitivity" — Slider
       Same 4-stop slider as WatchSetupScreen step 3
    
    3. "Minimum SpO₂ Floor" — Slider 88-96% (default 93%)
       Description: "Below this level, AC temperature is always raised regardless of other signals"
       Formatted: "93%"
    
    4. "Override Duration" — Segment picker: 20 / 30 / 60 / 90 min
       Description: "When you manually override, biometric control pauses for this duration"
    
    5. "Deep Sleep Conserve" — Toggle
       Description: "Prevent AC adjustments during deep sleep stages"
    
    6. "Personal Baseline" — Info card (read-only display):
       Avg skin temp: 36.1°C
       Avg resting HR: 58 bpm
       Avg HRV: 45ms
       Avg SpO2: 97%
       Samples: 12 nights
       "Reset Baseline" button (confirmation alert → clears AsyncStorage baseline)
    
    7. "Biometric Data Privacy" — Info card
       "All biometric data is processed and stored on your device only."
       "No biometric data is ever uploaded to any cloud service."
    
    All settings persisted to AsyncStorage under 'biometric_settings' key.
    Settings object shape: { enabled, sensitivity, spo2Floor, overrideDuration, deepSleepConserve }
  </action>
  <verify>
    All 7 settings render correctly
    Toggle/slider values persist across app restart
    Reset baseline clears data with confirmation
  </verify>
  <done>Full biometric settings screen with privacy-first defaults and personal baseline display</done>
</task>

<task type="create">
  <name>Build BaselineCalibrationCard — 3-night progress widget</name>
  <files>SmartACApp/src/components/BaselineCalibrationCard.tsx</files>
  <action>
    Card shown on HomeScreen / AnalyticsScreen during first 3 nights of calibration.
    
    CALIBRATING STATE (samplesCount < 3):
      Background: violet (#7B61FF) gradient (subtle, LinearGradient)
      Title: "🏗️ Building Your Baseline" in bold (16px)
      Progress: "Night 2 of 3 complete"
      3 moon icons in a row:
        Complete night: 🌕 (or filled circle icon)
        Pending night: 🌑 (or outline circle)
      Body text: "Wear your watch tonight to complete calibration."
        "We're learning your personal resting heart rate, skin temperature, and SpO₂."
      ETA: "Biometric AC control activates tomorrow night" (if 2/3 done)
    
    ESTABLISHED STATE (samplesCount >= 3):
      Background: subtle green (#4ADE80/10) tint
      Title: "✅ Baseline Active — N nights of learning"
      4 baseline values in a row:
        Skin temp | Resting HR | HRV | SpO2
      "Recalibrate" link → navigates to BiometricSettingsScreen
    
    Props:
      baseline: PersonalBaseline | null
      onRecalibrate?: () => void
    
    Reads baseline from AsyncStorage on mount.
    Compact card design, borderRadius 16, padding 16.
  </action>
  <verify>
    Calibrating state shows correct moon progress (0/3, 1/3, 2/3)
    Established state shows baseline values
    Recalibrate link works
  </verify>
  <done>Calibration progress card guides users through 3-night baseline building</done>
</task>

<task type="modify">
  <name>Wire new screens into navigation</name>
  <files>SmartACApp/src/navigation/RootNavigator.tsx, SmartACApp/src/navigation/MainTabs.tsx</files>
  <action>
    Add to RootNavigator stack:
    - SleepModeScreen (route: 'SleepMode', params: { deviceId })
    - MorningReportScreen (route: 'MorningReport', params: { report: NightReport })
    - WatchSetupScreen (route: 'WatchSetup')
    - BiometricSettingsScreen (route: 'BiometricSettings')
    
    Add "Smart Sleep" entry point:
    - Option 1: Button on HomeScreen ("Start Smart Sleep" card)
    - Option 2: New tab or FAB
    
    Add "Watch Setup" link in SettingsScreen under a "Galaxy Watch" section.
    Add "Biometric Settings" link in SettingsScreen.
    
    Update navigation types for TypeScript (RootStackParamList).
  </action>
  <verify>
    Navigate to each new screen without crash
    Route params pass correctly
    TypeScript types compile clean
  </verify>
  <done>All biometric screens accessible via navigation with proper typing</done>
</task>
