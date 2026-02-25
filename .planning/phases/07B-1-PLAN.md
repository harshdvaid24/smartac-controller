# PHASE 7B — Plan 1: Wear OS Companion App (Kotlin)

## Goal
Build the Galaxy Watch 7 native Kotlin app that reads biometric sensors (HR, skin temp delta, SpO2, HRV, ambient temp) and sends data to the phone every 5 minutes via Wearable Data Layer API.

## Wave
1 (no dependencies — standalone Android Studio project)

## Requirements
BIO-R1 (real-time biometric reading), BIO-R2 (skin temp delta tracking), BIO-R7 (watch tile)

## Files
```
SmartACWatch/ (new Android Studio project)
├── app/build.gradle.kts
├── app/src/main/AndroidManifest.xml
├── app/src/main/kotlin/com/smartac/watch/
│   ├── MainActivity.kt
│   ├── SensorTrackingService.kt
│   ├── SmartACTile.kt
│   └── MainScreen.kt
```

---

<task type="create">
  <name>Create Wear OS project scaffold</name>
  <files>SmartACWatch/app/build.gradle.kts, SmartACWatch/settings.gradle.kts, SmartACWatch/build.gradle.kts</files>
  <action>
    Create new Android Studio Wear OS project at /Users/harshvaid/Work/AC/SmartACWatch/
    Package: com.smartac.watch
    Min SDK: Wear OS API 30 (Android 11)
    Language: Kotlin
    
    Dependencies in app/build.gradle.kts:
    - Samsung Health Sensor SDK (AAR in app/libs/)
    - com.google.android.gms:play-services-wearable:18.2.0
    - androidx.wear.compose:compose-material:1.3.1
    - androidx.wear.compose:compose-foundation:1.3.1
    - org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1
    - androidx.work:work-runtime-ktx:2.9.1
    
    AndroidManifest.xml permissions:
    - BODY_SENSORS, BODY_SENSORS_BACKGROUND
    - HEALTH_DATA_SKIN_TEMPERATURE_READ
    - FOREGROUND_SERVICE, FOREGROUND_SERVICE_HEALTH
    - WAKE_LOCK
  </action>
  <verify>Project structure exists, Gradle sync succeeds</verify>
  <done>SmartACWatch/ has valid Gradle project with all dependencies</done>
</task>

<task type="create">
  <name>Build SensorTrackingService — foreground service for biometric reading</name>
  <files>SmartACWatch/app/src/main/kotlin/com/smartac/watch/SensorTrackingService.kt</files>
  <action>
    Foreground service that runs during sleep.
    
    Connect to Samsung HealthTrackingService via ConnectionListener.
    
    Start trackers:
    1. HEART_RATE_CONTINUOUS — listen for HR + IBI (inter-beat interval) data
       - Extract heart_rate from DataPoint
       - Extract IBI list, calculate RMSSD for HRV
       - Store latest values in @Volatile vars
    
    2. SKIN_TEMPERATURE_ON_DEMAND — read every 5 minutes (battery-conservation)
       - Extract ambient_temperature and skin_temperature fields
       - Skin temp = delta from personal baseline (Samsung SDK provides this)
    
    3. SpO2 — on-demand every 5 minutes
    
    calculateRMSSD(ibiList):
      diffs = zipWithNext differences
      rmssd = sqrt(mean(diffs²))
    
    startPeriodicDataSend():
      Every 5 minutes (300_000ms), call sendBiometricPacket()
    
    sendBiometricPacket():
      Build JSON: { timestamp, heartRate, hrv, skinTempRaw, ambientTemp, spO2, source:"galaxy_watch_7" }
      Get connected phone nodes via Wearable.getNodeClient()
      Send via Wearable.getMessageClient().sendMessage(nodeId, "/smartac/biometrics", bytes)
    
    Foreground notification: "SmartAC Sleep Monitor" with low importance channel
    
    Service lifecycle:
    - START_STICKY (restart if killed)
    - onDestroy: unset all listeners, disconnect health service, cancel coroutine scope
  </action>
  <verify>
    adb -s watch_serial install app-debug.apk
    Grant BODY_SENSORS permission on watch
    Start service → logcat shows "Sent biometric packet to phone node"
  </verify>
  <done>SensorTrackingService reads HR + skin temp + SpO2 every 5min, sends JSON to phone via Data Layer</done>
</task>

<task type="create">
  <name>Build SmartACTile — Wear OS tile for quick AC control</name>
  <files>SmartACWatch/app/src/main/kotlin/com/smartac/watch/SmartACTile.kt</files>
  <action>
    Wear OS TileService showing AC status + quick toggle.
    
    Layout (ProtoLayout):
    - Column centered on round screen
    - Top: AC status text ("24°C · Cool") in white
    - Middle: Power state indicator (green dot = on, gray = off)
    - Bottom row: 2 chip buttons "Cool" and "Off"
    
    Reads AC status from SharedPreferences (set by main app via DataLayerAPI onDataChanged).
    Chip tap actions send messages back to phone via Data Layer API.
    
    Colors:
    - Active: #00FFB2 (electric mint)
    - Inactive: gray
    - Background: pure black #000000
  </action>
  <verify>Tile appears in Wear OS tile menu, shows AC status</verify>
  <done>SmartACTile shows current AC state with quick toggle buttons</done>
</task>

<task type="create">
  <name>Build watch main screen — Compose Wear OS UI</name>
  <files>SmartACWatch/app/src/main/kotlin/com/smartac/watch/MainActivity.kt, SmartACWatch/app/src/main/kotlin/com/smartac/watch/MainScreen.kt</files>
  <action>
    Minimal real-time biometric display using Compose for Wear OS.
    
    MainScreen layout (round, AMOLED-optimized):
    - Center: Large HR number in JetBrains Mono style (biggest element)
    - Heart icon with pulse animation (Compose animation, subtle 0.95→1.05 scale at HR rhythm)
    - Below HR: skin temp indicator "ΔT +0.3°C" + ambient temp "Room 24°C"
    - Bottom: AC status chip (green = on, gray = off) + "Night Mode" start button
    
    Colors:
    - Background: #000000 (AMOLED battery saving)
    - Active accent: #00FFB2 (electric mint)
    - Warm signal: #FF5757 (coral)
    - Text: white/80 opacity
    
    MainActivity:
    - Check permissions on launch (BODY_SENSORS)
    - Request if not granted
    - Start/stop SensorTrackingService via buttons
    - Receive commands from phone ("/smartac/commands" path) to start/stop monitoring
  </action>
  <verify>
    Watch app launches, shows HR + skin temp
    "Night Mode" button starts SensorTrackingService
    Logcat confirms sensor readings
  </verify>
  <done>Watch app displays live biometrics with start/stop controls and AC status</done>
</task>
