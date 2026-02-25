# PHASE 7B — Galaxy Watch 7 Biometric AC Intelligence

## Vision
Transform the Galaxy Watch 7 into a live biometric sensor for your AC.
While you sleep, the watch reads your skin temperature trend, heart rate,
SpO2, and sleep stage every 5 minutes — and SmartAC automatically adjusts
the air conditioner to keep your body in its optimal thermal comfort zone.
Wake up better rested. Cool when you're too warm. Ease off when you're
already cold. All automatic. All free.

---

## The Honest Technical Reality (Read This First)

### What the Galaxy Watch 7 ACTUALLY measures:
| Signal | What it is | AC Use? | Quality |
|--------|-----------|---------|---------|
| Skin temperature DELTA | Change from your personal baseline (e.g., +1.2°C) | ✅ YES — trend matters, not absolute | ⭐⭐⭐⭐ |
| Heart rate (continuous) | BPM every ~2s via BioActive Sensor | ✅ YES — elevated HR = thermal discomfort | ⭐⭐⭐⭐⭐ |
| SpO2 | Blood oxygen % | ✅ YES — low SpO2 = AC too cold / poor air | ⭐⭐⭐ |
| Sleep stage | Awake / Light / Deep / REM | ✅ YES — deep sleep needs less cooling | ⭐⭐⭐⭐ |
| HRV (Heart Rate Variability) | Stress recovery indicator | ✅ YES — low HRV = poor recovery = temp too extreme | ⭐⭐⭐ |
| Ambient temperature | Room temp at wrist level | ✅ YES — direct AC feedback | ⭐⭐⭐⭐ |

### What it does NOT give us:
- ❌ Core body temperature (internal temp like a thermometer)
- ❌ Absolute skin temperature in °C (Samsung now only shows delta from baseline)
- ❌ Real-time data to the phone without a Wear OS companion app

### Why the DELTA is actually MORE useful:
Your body's thermal response is personal. A skin temp DELTA of +1.5°C above
your personal baseline is meaningful regardless of whether you're a person who
runs 35.8°C or 37.1°C baseline. The AC should respond to YOUR relative
warmth, not a universal threshold. This is actually superior to a raw number.

### The Real-Time Challenge:
Samsung Health only syncs sleep data to the phone AFTER the session ends
(morning). For real-time control during sleep, we need a Wear OS companion app
running on the watch that pushes data live via the Wearable Data Layer API.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  GALAXY WATCH 7                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SmartAC Wear OS App (Kotlin)                   │   │
│  │  - Samsung Health Sensor SDK                    │   │
│  │  - Reads: skinTempDelta, HR, SpO2, HRV         │   │
│  │  - Ambient temp via thermopile                  │   │
│  │  - Runs as foreground service during sleep      │   │
│  │  - Watch face tile: quick AC status + control   │   │
│  └──────────────────┬──────────────────────────────┘   │
│                     │ Wearable Data Layer API           │
│                     │ (Bluetooth/WiFi, real-time)       │
└─────────────────────┼───────────────────────────────────┘
                      ▼
┌─────────────────────────────────────────────────────────┐
│                ANDROID PHONE                            │
│  ┌─────────────────────────────────────────────────┐   │
│  │  SmartAC React Native App                       │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  WatchBridge (Native Module — Kotlin)    │  │   │
│  │  │  - Wearable MessageClient listener       │  │   │
│  │  │  - Receives biometric packets from watch │  │   │
│  │  │  - Emits to RN via NativeEventEmitter   │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  Health Connect Reader (react-native)    │  │   │
│  │  │  - Sleep sessions (post-sleep history)   │  │   │
│  │  │  - Skin temperature records              │  │   │
│  │  │  - Heart rate history                    │  │   │
│  │  │  - SpO2 history                          │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │  BiometricACEngine (TypeScript)          │  │   │
│  │  │  - Processes biometric signals           │  │   │
│  │  │  - Generates AC adjustment commands      │  │   │
│  │  │  - Thermal comfort scoring               │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
            SmartThings API / Local WiFi
                         │
                         ▼
              🌬️ Your Samsung AC
```

---

## Requirements Covered
BIO-R1: Real-time biometric reading from Galaxy Watch 7 during sleep
BIO-R2: Skin temperature delta tracking and trend analysis
BIO-R3: Heart rate thermal comfort detection
BIO-R4: Sleep stage-aware AC adjustment
BIO-R5: SpO2 safety floor (never too cold)
BIO-R6: Morning biometric sleep report
BIO-R7: Watch face tile for quick AC control
BIO-R8: Biometric learning — personalise thresholds over time

## Dependencies
Phase 1A (Backend + AC control), Phase 2 (RN App), Phase 7 (AI layer)
Requires: Samsung Galaxy Watch 7, Android phone (not iOS — Health Connect is Android-only)

---

## Design Language (Biometric Theme)

Color Additions to Phase 7 palette:
- Bio-Warm:    #FF6B35  (skin temp rising — orange-red)
- Bio-Cool:    #38BDF8  (comfortable or cooling — sky blue)
- Bio-Safe:    #4ADE80  (all signals normal — green)
- Bio-Alert:   #FACC15  (borderline — yellow)
- Bio-Deep:    #818CF8  (deep sleep — indigo)
- Bio-REM:     #C084FC  (REM sleep — purple)

Biometric data uses a distinct visual language from standard AC controls:
- Rounded pill waveforms instead of flat lines
- Soft glow halos behind sensor readings (color = current bio state)
- Heartbeat micro-animation on HR display (subtle pulse on the number)
- Sleep stage timeline uses a layered waterfall style (not a bar chart)
- Watch connection status: animated Bluetooth ring around watch icon

Typography additions:
- All raw biometric numbers: JetBrains Mono (clinical precision feel)
- Insight labels: DM Sans italic (warm, interpretive)
- Watch app: Roboto (Wear OS standard — keep it native)

---

## Prompts

### Prompt 7B-1: Wear OS Companion App (Kotlin — Android Studio)

```
You are building the Galaxy Watch 7 companion app for SmartAC.
This is a NATIVE KOTLIN Wear OS app — not React Native.
It must be created as a separate module in Android Studio, then sideloaded
to the Galaxy Watch 7 via ADB or published via Play Store.

WORKING DIRECTORY: Create new project at /Users/harshvaid/Work/AC/SmartACWatch/

TASK: Build the Wear OS Kotlin app that reads biometrics and sends them to the phone

PART 1 — PROJECT SETUP

1. Create a new Android Studio project:
   File → New → New Project → Wear OS → Blank Activity
   - Name: SmartAC Watch
   - Package: com.smartac.watch
   - Min SDK: Wear OS API 30 (Android 11)
   - Language: Kotlin

2. Add dependencies to app/build.gradle.kts:
```kotlin
dependencies {
    // Samsung Health Sensor SDK
    // Download from developer.samsung.com/health/sensor
    // Place .aar in app/libs/
    implementation(files("libs/samsung-health-sensor-sdk-2.x.x.aar"))
    
    // Wearable Data Layer API (send data to phone)
    implementation("com.google.android.gms:play-services-wearable:18.2.0")
    
    // Wear OS UI
    implementation("androidx.wear.compose:compose-material:1.3.1")
    implementation("androidx.wear.compose:compose-foundation:1.3.1")
    
    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.1")
    
    // WorkManager for background tasks
    implementation("androidx.work:work-runtime-ktx:2.9.1")
}
```

3. AndroidManifest.xml permissions:
```xml
<uses-permission android:name="android.permission.BODY_SENSORS" />
<uses-permission android:name="android.permission.BODY_SENSORS_BACKGROUND" />
<uses-permission android:name="android.permission.HEALTH_DATA_SKIN_TEMPERATURE_READ" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_HEALTH" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

PART 2 — SENSOR READING SERVICE

Create SensorTrackingService.kt — foreground service that runs during sleep:

```kotlin
package com.smartac.watch

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.IBinder
import android.util.Log
import com.google.android.gms.wearable.Wearable
import com.samsung.android.service.health.tracking.*
import com.samsung.android.service.health.tracking.data.*
import kotlinx.coroutines.*
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import java.time.Instant

class SensorTrackingService : Service() {

    private var healthTrackingService: HealthTrackingService? = null
    private var heartRateTracker: HealthTracker? = null
    private var skinTempTracker: HealthTracker? = null
    private val serviceScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    // Current readings (updated as they come in)
    @Volatile private var latestHR: Int = 0
    @Volatile private var latestHRV: Int = 0
    @Volatile private var latestSkinTempDelta: Float = 0f
    @Volatile private var latestAmbientTemp: Float = 0f
    @Volatile private var latestSpO2: Int = 0

    // HealthTrackingService connection listener
    private val connectionListener = object : HealthTrackingService.ConnectionListener {
        override fun onConnectionSuccess() {
            Log.d(TAG, "HealthTrackingService connected")
            startTrackers()
        }
        override fun onConnectionEnded() {
            Log.d(TAG, "HealthTrackingService disconnected")
        }
        override fun onConnectionFailed(error: HealthTrackerException?) {
            Log.e(TAG, "HealthTrackingService connection failed: ${error?.message}")
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        startForeground(NOTIFICATION_ID, buildNotification())
        connectToHealthService()
        startPeriodicDataSend()
        return START_STICKY
    }

    private fun connectToHealthService() {
        healthTrackingService = HealthTrackingService(connectionListener, applicationContext)
        healthTrackingService?.connectService()
    }

    private fun startTrackers() {
        val capability = healthTrackingService?.getTrackingCapability()
        val available = capability?.supportHealthTrackerTypes ?: emptyList()
        
        // HEART RATE — continuous (low battery cost, runs all night)
        if (HealthTrackerType.HEART_RATE_CONTINUOUS in available) {
            heartRateTracker = healthTrackingService?.getHealthTracker(
                HealthTrackerType.HEART_RATE_CONTINUOUS
            )
            heartRateTracker?.setEventListener(heartRateListener)
        }
        
        // SKIN TEMPERATURE — on-demand (call every 5 minutes)
        // Note: SKIN_TEMPERATURE_ON_DEMAND consumes more battery, use sparingly
        serviceScope.launch {
            while (isActive) {
                delay(5 * 60 * 1000L) // Every 5 minutes
                takeSkinTemperatureReading()
            }
        }
    }

    private val heartRateListener = object : HealthTracker.TrackerEventListener {
        override fun onDataReceived(dataPoints: List<DataPoint>) {
            for (point in dataPoints) {
                val status = point.getValue(ValueKey.HeartRateSet.HEART_RATE_STATUS)
                if (status == HeartRateStatus.HR_STATUS_FIND_HR) {
                    latestHR = point.getValue(ValueKey.HeartRateSet.HEART_RATE)
                    // IBI (Inter-Beat Interval) list for HRV calculation
                    val ibiList = point.getValue(ValueKey.HeartRateSet.IBI_LIST)
                    if (ibiList.isNotEmpty()) {
                        latestHRV = calculateRMSSD(ibiList) // ms
                    }
                }
            }
        }
        override fun onFlushCompleted(dataPoints: List<DataPoint>) {}
        override fun onError(error: HealthTracker.TrackerError?) {
            Log.e(TAG, "HR tracker error: ${error?.name}")
        }
    }

    private fun takeSkinTemperatureReading() {
        val capability = healthTrackingService?.getTrackingCapability()
        val available = capability?.supportHealthTrackerTypes ?: emptyList()
        
        if (HealthTrackerType.SKIN_TEMPERATURE_ON_DEMAND !in available) return

        val tempTracker = healthTrackingService?.getHealthTracker(
            HealthTrackerType.SKIN_TEMPERATURE_ON_DEMAND
        )
        
        tempTracker?.setEventListener(object : HealthTracker.TrackerEventListener {
            override fun onDataReceived(dataPoints: List<DataPoint>) {
                for (point in dataPoints) {
                    val status = point.getValue(ValueKey.SkinTemperatureSet.STATUS)
                    if (status == SkinTemperatureStatus.SUCCESSFUL) {
                        // OBJECT_TEMPERATURE = wrist skin temperature in °C
                        val skinTemp = point.getValue(ValueKey.SkinTemperatureSet.OBJECT_TEMPERATURE)
                        // AMBIENT_TEMPERATURE = room temp at wrist level
                        val ambientTemp = point.getValue(ValueKey.SkinTemperatureSet.AMBIENT_TEMPERATURE)
                        latestSkinTempDelta = skinTemp  // Store raw; delta calculated in RN
                        latestAmbientTemp = ambientTemp
                    }
                }
                tempTracker?.unsetEventListener()
            }
            override fun onFlushCompleted(dataPoints: List<DataPoint>) {}
            override fun onError(error: HealthTracker.TrackerError?) {}
        })
    }

    // Calculate RMSSD from IBI list — standard HRV metric
    private fun calculateRMSSD(ibiList: List<Int>): Int {
        if (ibiList.size < 2) return 0
        val diffs = ibiList.zipWithNext { a, b -> (b - a).toDouble() }
        val rmssd = Math.sqrt(diffs.map { it * it }.average())
        return rmssd.toInt()
    }

    // Send biometric data packet to phone every 5 minutes
    private fun startPeriodicDataSend() {
        serviceScope.launch {
            while (isActive) {
                delay(5 * 60 * 1000L) // Every 5 minutes
                sendBiometricPacket()
            }
        }
    }

    private suspend fun sendBiometricPacket() {
        val packet = buildJsonObject {
            put("timestamp", Instant.now().toEpochMilli())
            put("heartRate", latestHR)
            put("hrv", latestHRV)
            put("skinTempRaw", latestSkinTempDelta)
            put("ambientTemp", latestAmbientTemp)
            put("spO2", latestSpO2)
            put("source", "galaxy_watch_7")
        }.toString()

        try {
            // Get connected phone nodes
            val nodes = Wearable.getNodeClient(applicationContext).connectedNodes.await()
            
            for (node in nodes) {
                Wearable.getMessageClient(applicationContext).sendMessage(
                    node.id,
                    BIOMETRIC_PATH,     // "/smartac/biometrics"
                    packet.toByteArray()
                ).await()
                Log.d(TAG, "Sent biometric packet to phone node: ${node.displayName}")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to send biometric packet: ${e.message}")
            // Data will be sent on next interval — no data loss risk
        }
    }

    private fun buildNotification(): Notification {
        val channel = NotificationChannel(
            CHANNEL_ID, "SmartAC Sleep Monitor",
            NotificationManager.IMPORTANCE_LOW
        )
        getSystemService(NotificationManager::class.java)?.createNotificationChannel(channel)
        
        return Notification.Builder(this, CHANNEL_ID)
            .setContentTitle("SmartAC Sleep Monitor")
            .setContentText("Monitoring your comfort for automatic AC adjustment")
            .setSmallIcon(R.drawable.ic_sleep)
            .build()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        super.onDestroy()
        heartRateTracker?.unsetEventListener()
        skinTempTracker?.unsetEventListener()
        healthTrackingService?.disconnectService()
        serviceScope.cancel()
    }

    companion object {
        private const val TAG = "SmartACSensorService"
        private const val NOTIFICATION_ID = 1001
        private const val CHANNEL_ID = "smartac_sleep_monitor"
        const val BIOMETRIC_PATH = "/smartac/biometrics"
    }
}
```

PART 3 — WEAR OS WATCH FACE TILE

Create SmartACTile.kt — a Wear OS Tile that shows AC status + quick toggle:

```kotlin
package com.smartac.watch

import androidx.wear.protolayout.*
import androidx.wear.protolayout.expression.*
import androidx.wear.tiles.*
import androidx.wear.tiles.material.*

class SmartACTile : TileService() {

    override fun onTileRequest(requestParams: TileRequest): ListenableFuture<Tile> {
        val acStatus = getACStatusFromSharedPrefs() // Set by main app via DataLayerAPI
        
        return Futures.immediateFuture(
            Tile.Builder()
                .setResourcesVersion("1")
                .setTileTimeline(
                    Timeline.fromSingleTimelineEntry(
                        TimelineEntry.Builder()
                            .setLayout(buildTileLayout(acStatus))
                            .build()
                    )
                )
                .build()
        )
    }

    private fun buildTileLayout(status: ACStatus): Layout {
        return Layout.Builder()
            .setRoot(
                Box.Builder()
                    .addContent(
                        Column.Builder()
                            // AC Status row
                            .addContent(
                                Text.Builder()
                                    .setText(
                                        if (status.isOn) "❄️ ${status.temp}°C" else "◉ OFF"
                                    )
                                    .setTypography(Typography.TYPOGRAPHY_DISPLAY3)
                                    .setColor(
                                        ColorBuilders.argb(
                                            if (status.isOn) 0xFF00FFB2.toInt() else 0xFF6B6B8A.toInt()
                                        )
                                    )
                                    .build()
                            )
                            // Mode label
                            .addContent(
                                Text.Builder()
                                    .setText(if (status.isOn) status.mode.uppercase() else "Tap to turn on")
                                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                                    .build()
                            )
                            // Quick action buttons row
                            .addContent(
                                Row.Builder()
                                    .addContent(buildChipButton("🌙 Night", "night_mode"))
                                    .addContent(buildChipButton("⬆️ +1°C", "temp_up"))
                                    .addContent(buildChipButton("⬇️ -1°C", "temp_down"))
                                    .build()
                            )
                            // Biometric mini-status
                            .addContent(
                                Text.Builder()
                                    .setText("💓 ${status.heartRate} bpm · 🌡️ ${status.skinTempIndicator}")
                                    .setTypography(Typography.TYPOGRAPHY_CAPTION2)
                                    .setColor(ColorBuilders.argb(0xFF6B6B8A.toInt()))
                                    .build()
                            )
                            .build()
                    )
                    .build()
            )
            .build()
    }

    private fun buildChipButton(label: String, action: String): Chip {
        return Chip.Builder(
            this,
            actionForCommand(action), // LaunchActivity with action deep link
            DeviceParametersBuilders.DeviceParameters.Builder().build()
        )
            .setPrimaryLabelContent(label)
            .setChipColors(ChipColors.primaryChipColors(Colors.PRIMARY))
            .build()
    }
}
```

PART 4 — WATCH MAIN SCREEN (Compose Wear OS UI)

The watch app shows a minimal real-time biometric status:
- Large heart: beats with animation (use Compose animation)
- HR: JetBrains Mono style number (largest, center)
- Below: skin temp indicator · ambient temp
- Bottom: AC status chip (green = on, gray = off) + "Night Mode" button

DESIGN:
- Background: pure black (#000000) — AMOLED saves battery
- Accent: electric mint #00FFB2 for active/on states
- Coral #FF5757 for "warm" body signal
- All text: white/80
- Round design — fits Galaxy Watch 7 circular screen

VERIFY:
1. Build + install on Galaxy Watch 7 via ADB:
   adb -s <watch_serial> install app/build/outputs/apk/debug/app-debug.apk
2. Grant BODY_SENSORS permission on watch: Settings → Permissions → Body Sensors
3. Start SensorTrackingService manually from main activity
4. Check logcat for "Sent biometric packet to phone node"
5. Tile appears in Wear OS tile menu
```

---

### Prompt 7B-2: Android Native Module — Watch Bridge

```
You are building the Android native module that receives biometric data from the
Galaxy Watch 7 and exposes it to React Native.

WORKING DIRECTORY: SmartACApp/android/app/src/main/java/com/smartacapp/

CONTEXT:
The Galaxy Watch 7 sends JSON biometric packets to the phone via Wearable Data Layer API
at the path "/smartac/biometrics" every 5 minutes.
The phone needs to receive these via WearableListenerService and relay to React Native.

TASK: Build the WatchBridge native module

PART 1 — WatchListenerService.kt (receives from watch)

```kotlin
package com.smartacapp

import com.facebook.react.modules.core.DeviceEventManagerModule
import com.google.android.gms.wearable.*

class WatchListenerService : WearableListenerService() {

    companion object {
        const val BIOMETRIC_PATH = "/smartac/biometrics"
        var reactContext: com.facebook.react.bridge.ReactApplicationContext? = null
    }

    // Called when watch sends a message to this path
    override fun onMessageReceived(messageEvent: MessageEvent) {
        if (messageEvent.path != BIOMETRIC_PATH) return

        val json = String(messageEvent.data)
        
        // Forward to React Native via event emitter
        reactContext
            ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            ?.emit("WatchBiometricUpdate", json)
        
        android.util.Log.d("WatchBridge", "Received biometric packet: $json")
    }
    
    // Also handle DataItem changes (alternative sync method)
    override fun onDataChanged(dataEvents: DataEventBuffer) {
        for (event in dataEvents) {
            if (event.type == DataEvent.TYPE_CHANGED &&
                event.dataItem.uri.path == BIOMETRIC_PATH) {
                val dataMap = DataMapItem.fromDataItem(event.dataItem).dataMap
                // Convert dataMap to JSON and emit
                val json = dataMapToJson(dataMap)
                reactContext
                    ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    ?.emit("WatchBiometricUpdate", json)
            }
        }
    }

    private fun dataMapToJson(dataMap: com.google.android.gms.wearable.DataMap): String {
        return org.json.JSONObject().apply {
            put("timestamp", dataMap.getLong("timestamp", 0))
            put("heartRate", dataMap.getInt("heartRate", 0))
            put("hrv", dataMap.getInt("hrv", 0))
            put("skinTempRaw", dataMap.getFloat("skinTempRaw", 0f))
            put("ambientTemp", dataMap.getFloat("ambientTemp", 0f))
            put("spO2", dataMap.getInt("spO2", 0))
        }.toString()
    }
}
```

Register in AndroidManifest.xml:
```xml
<service
    android:name=".WatchListenerService"
    android:exported="true">
    <intent-filter>
        <action android:name="com.google.android.gms.wearable.MESSAGE_RECEIVED" />
        <data
            android:host="*"
            android:pathPrefix="/smartac"
            android:scheme="wear" />
    </intent-filter>
</service>
```

PART 2 — WatchBridgeModule.kt (React Native module)

```kotlin
package com.smartacapp

import com.facebook.react.bridge.*
import com.google.android.gms.wearable.*

class WatchBridgeModule(reactContext: ReactApplicationContext)
    : ReactContextBaseJavaModule(reactContext) {

    init {
        WatchListenerService.reactContext = reactContext
    }

    override fun getName() = "WatchBridge"

    // Check if watch is connected and SmartAC watch app is installed
    @ReactMethod
    fun getWatchStatus(promise: Promise) {
        Wearable.getNodeClient(reactApplicationContext)
            .connectedNodes
            .addOnSuccessListener { nodes ->
                val result = WritableNativeMap().apply {
                    putBoolean("connected", nodes.isNotEmpty())
                    putInt("nodesCount", nodes.size)
                    putString("nodeName", nodes.firstOrNull()?.displayName ?: "")
                    putBoolean("watchAppInstalled", nodes.isNotEmpty()) // Simplified check
                }
                promise.resolve(result)
            }
            .addOnFailureListener { e ->
                promise.reject("WATCH_ERROR", e.message)
            }
    }

    // Send command to watch (e.g., "start_sleep_monitor")
    @ReactMethod
    fun sendCommandToWatch(command: String, promise: Promise) {
        Wearable.getNodeClient(reactApplicationContext)
            .connectedNodes
            .addOnSuccessListener { nodes ->
                if (nodes.isEmpty()) {
                    promise.reject("NO_WATCH", "No watch connected")
                    return@addOnSuccessListener
                }
                val node = nodes.first()
                Wearable.getMessageClient(reactApplicationContext)
                    .sendMessage(node.id, "/smartac/commands", command.toByteArray())
                    .addOnSuccessListener { promise.resolve(true) }
                    .addOnFailureListener { e -> promise.reject("SEND_ERROR", e.message) }
            }
            .addOnFailureListener { e -> promise.reject("NODE_ERROR", e.message) }
    }

    // Update AC status on watch (displayed in Tile and main screen)
    @ReactMethod
    fun updateWatchACStatus(isOn: Boolean, temp: Int, mode: String, heartRate: Int, promise: Promise) {
        val dataMap = DataMap().apply {
            putBoolean("isOn", isOn)
            putInt("temp", temp)
            putString("mode", mode)
            putInt("heartRate", heartRate)
            putLong("updatedAt", System.currentTimeMillis())
        }
        
        val request = PutDataMapRequest.create("/smartac/ac_status").apply {
            this.dataMap.putAll(dataMap)
        }.asPutDataRequest().setUrgent()

        Wearable.getDataClient(reactApplicationContext)
            .putDataItem(request)
            .addOnSuccessListener { promise.resolve(true) }
            .addOnFailureListener { e -> promise.reject("STATUS_ERROR", e.message) }
    }

    // Add NativeEventEmitter support
    @ReactMethod fun addListener(eventName: String) {}
    @ReactMethod fun removeListeners(count: Int) {}
}
```

PART 3 — WatchBridgePackage.kt

```kotlin
package com.smartacapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.*
import com.facebook.react.uimanager.ViewManager

class WatchBridgePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(WatchBridgeModule(reactContext))
    }
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return emptyList()
    }
}
```

Register in MainApplication.kt:
```kotlin
packages.add(WatchBridgePackage())
```

PART 4 — Health Connect Integration (for historical data)

Install: npm install react-native-health-connect@^2

SmartACApp/src/services/healthConnect.ts:

```ts
import {
  initialize,
  requestPermission,
  readRecords,
  getSdkStatus,
  SdkAvailabilityStatus,
} from 'react-native-health-connect';

const PERMISSIONS = [
  { accessType: 'read', recordType: 'HeartRate' },
  { accessType: 'read', recordType: 'SleepSession' },
  { accessType: 'read', recordType: 'OxygenSaturation' },
  { accessType: 'read', recordType: 'SkinTemperature' },     // HC data type
  { accessType: 'read', recordType: 'HeartRateVariability' },
] as const;

export class HealthConnectService {

  async initialize(): Promise<boolean> {
    const status = await getSdkStatus();
    if (status === SdkAvailabilityStatus.SDK_UNAVAILABLE) {
      return false; // Android < 9 or Health Connect not available
    }
    return await initialize();
  }

  async requestPermissions(): Promise<boolean> {
    const granted = await requestPermission(PERMISSIONS);
    return granted.length === PERMISSIONS.length;
  }

  // Fetch last night's sleep session data
  async getLastNightSleep(): Promise<SleepAnalysis | null> {
    const now = new Date();
    const yesterday8pm = new Date(now);
    yesterday8pm.setDate(yesterday8pm.getDate() - 1);
    yesterday8pm.setHours(20, 0, 0, 0);
    const today8am = new Date(now);
    today8am.setHours(8, 0, 0, 0);

    const sleepRecords = await readRecords('SleepSession', {
      timeRangeFilter: {
        operator: 'between',
        startTime: yesterday8pm.toISOString(),
        endTime: today8am.toISOString(),
      },
    });

    if (!sleepRecords.records.length) return null;
    const session = sleepRecords.records[0];

    // Get heart rate during sleep
    const hrRecords = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'between',
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });

    // Get SpO2 during sleep
    const spo2Records = await readRecords('OxygenSaturation', {
      timeRangeFilter: {
        operator: 'between',
        startTime: session.startTime,
        endTime: session.endTime,
      },
    });

    // Get skin temperature records
    let skinTempRecords: any[] = [];
    try {
      skinTempRecords = (await readRecords('SkinTemperature', {
        timeRangeFilter: {
          operator: 'between',
          startTime: session.startTime,
          endTime: session.endTime,
        },
      })).records;
    } catch {
      // SkinTemperature may not be available on older Health Connect versions
    }

    return {
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: (new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000,
      stages: session.stages || [],
      avgHeartRate: this.average(hrRecords.records.flatMap(r => r.samples.map((s: any) => s.beatsPerMinute))),
      minHeartRate: Math.min(...hrRecords.records.flatMap(r => r.samples.map((s: any) => s.beatsPerMinute))),
      avgSpO2: this.average(spo2Records.records.map((r: any) => r.percentage)),
      minSpO2: Math.min(...spo2Records.records.map((r: any) => r.percentage)),
      skinTempReadings: skinTempRecords.map((r: any) => ({
        time: r.time,
        deltaFromBaseline: r.deltaFromBaseline?.inCelsius ?? 0,
      })),
      deepSleepMinutes: this.calculateStageDuration(session.stages, 'STAGE_TYPE_SLEEPING_DEEP'),
      remSleepMinutes: this.calculateStageDuration(session.stages, 'STAGE_TYPE_SLEEPING_REM'),
      lightSleepMinutes: this.calculateStageDuration(session.stages, 'STAGE_TYPE_SLEEPING_LIGHT'),
    };
  }

  private average(numbers: number[]): number {
    if (!numbers.length) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  private calculateStageDuration(stages: any[], stageType: string): number {
    return stages
      .filter(s => s.stage === stageType)
      .reduce((total, s) => {
        return total + (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 60000;
      }, 0);
  }
}

export interface SleepAnalysis {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  stages: any[];
  avgHeartRate: number;
  minHeartRate: number;
  avgSpO2: number;
  minSpO2: number;
  skinTempReadings: Array<{ time: string; deltaFromBaseline: number }>;
  deepSleepMinutes: number;
  remSleepMinutes: number;
  lightSleepMinutes: number;
}
```

VERIFY:
1. Build Kotlin module → no Gradle errors
2. Install watch app → service starts → logcat shows sensor readings
3. Send a test message from watch → RN emits "WatchBiometricUpdate" event
4. Health Connect permissions granted → sleep data reads from last night
5. WatchBridge.getWatchStatus() returns { connected: true }
```

---

### Prompt 7B-3: Biometric AC Engine (TypeScript)

```
You are building the core biometric-to-AC intelligence engine for SmartAC.
This runs on the phone, receives biometric signals from the watch every 5 minutes,
and decides whether to adjust the AC.

WORKING DIRECTORY: SmartACApp/src/services/

FILE: biometricACEngine.ts

DESIGN PHILOSOPHY:
- CONSERVATIVE: AC only adjusts if signal is consistent across 2+ readings (not noise)
- GRADUATED: adjustments are small (+/-1°C, -1 fan speed step) — never drastic
- FLOORS: SpO2 < 93% = AC is too cold → override and raise temp
- REVERSIBLE: user override always takes priority, system backs off
- SILENT: during deep sleep, no notifications — adjustments happen silently

```ts
import { NativeEventEmitter, NativeModules } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────

interface BiometricPacket {
  timestamp: number;
  heartRate: number;      // BPM
  hrv: number;            // RMSSD ms — higher is better/more relaxed
  skinTempRaw: number;    // Raw °C from watch sensor
  ambientTemp: number;    // Room temp at wrist level
  spO2: number;           // Blood oxygen %
  source: string;
}

interface BiometricSignal {
  // Derived signals (calculated from raw packets)
  skinTempDelta: number;         // °C above/below personal baseline
  skinTempTrend: 'rising' | 'stable' | 'falling';
  heartRateStatus: 'low' | 'normal' | 'elevated';
  hrvStatus: 'good' | 'moderate' | 'poor';
  spO2Status: 'safe' | 'low' | 'critical';
  thermalComfort: 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot';
  overallStress: number;         // 0-100 (0=relaxed, 100=stressed)
  confidence: number;            // 0-1 (how reliable is this signal)
}

interface ACDecision {
  shouldAdjust: boolean;
  reason: string;
  action: 'none' | 'temp_up' | 'temp_down' | 'fan_down' | 'fan_up' | 'mode_switch';
  magnitude: number;             // How much (1 or 2 degrees, 1 fan step)
  urgency: 'low' | 'medium' | 'high';
  explanation: string;           // Human-readable explanation shown in morning report
}

interface PersonalBaseline {
  avgSkinTemp: number;           // Personal avg skin temp during comfortable sleep
  avgRestingHR: number;          // Personal resting HR during sleep
  avgSpO2: number;               // Personal avg SpO2
  avgHRV: number;                // Personal avg HRV
  samplesCount: number;          // How many nights of data
  lastUpdated: string;
}

// ─────────────────────────────────────────
// BIOMETRIC BASELINE — PERSONALISATION
// ─────────────────────────────────────────

export class BiometricBaseline {
  private static STORAGE_KEY = 'biometric_baseline';

  static async get(): Promise<PersonalBaseline | null> {
    const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  static async update(newPackets: BiometricPacket[]): Promise<PersonalBaseline> {
    const current = await this.get();
    const validPackets = newPackets.filter(p => p.heartRate > 40 && p.heartRate < 120);
    if (!validPackets.length) return current!;

    const avgSkinTemp = validPackets.reduce((s, p) => s + p.skinTempRaw, 0) / validPackets.length;
    const avgHR = validPackets.reduce((s, p) => s + p.heartRate, 0) / validPackets.length;
    const avgSpO2 = validPackets.reduce((s, p) => s + p.spO2, 0) / validPackets.length;
    const avgHRV = validPackets.reduce((s, p) => s + p.hrv, 0) / validPackets.length;

    // Exponential moving average — recent data weighted more
    const alpha = 0.15; // 15% new data, 85% existing baseline
    const updated: PersonalBaseline = current ? {
      avgSkinTemp: current.avgSkinTemp * (1 - alpha) + avgSkinTemp * alpha,
      avgRestingHR: current.avgRestingHR * (1 - alpha) + avgHR * alpha,
      avgSpO2: current.avgSpO2 * (1 - alpha) + avgSpO2 * alpha,
      avgHRV: current.avgHRV * (1 - alpha) + avgHRV * alpha,
      samplesCount: current.samplesCount + 1,
      lastUpdated: new Date().toISOString(),
    } : {
      avgSkinTemp, avgRestingHR: avgHR, avgSpO2, avgHRV,
      samplesCount: 1, lastUpdated: new Date().toISOString(),
    };

    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
}

// ─────────────────────────────────────────
// SIGNAL INTERPRETER
// ─────────────────────────────────────────

export class SignalInterpreter {

  interpretPacket(packet: BiometricPacket, baseline: PersonalBaseline, history: BiometricPacket[]): BiometricSignal {

    // 1. SKIN TEMP DELTA — relative to personal baseline
    const skinTempDelta = packet.skinTempRaw - baseline.avgSkinTemp;

    // 2. SKIN TEMP TREND — compare last 3 readings
    const recentTemps = history.slice(-3).map(p => p.skinTempRaw);
    const skinTempTrend: BiometricSignal['skinTempTrend'] =
      recentTemps.length < 2 ? 'stable' :
      recentTemps[recentTemps.length - 1] - recentTemps[0] > 0.3 ? 'rising' :
      recentTemps[recentTemps.length - 1] - recentTemps[0] < -0.3 ? 'falling' : 'stable';

    // 3. HEART RATE STATUS (relative to personal baseline)
    const hrDelta = packet.heartRate - baseline.avgRestingHR;
    const heartRateStatus: BiometricSignal['heartRateStatus'] =
      hrDelta < -5 ? 'low' :
      hrDelta > 8 ? 'elevated' : 'normal';

    // Elevated HR during sleep often = thermal discomfort (body working to cool/heat)

    // 4. HRV STATUS — higher RMSSD = more relaxed
    const hrvStatus: BiometricSignal['hrvStatus'] =
      packet.hrv > baseline.avgHRV * 1.2 ? 'good' :
      packet.hrv < baseline.avgHRV * 0.7 ? 'poor' : 'moderate';

    // 5. SpO2 STATUS
    const spO2Status: BiometricSignal['spO2Status'] =
      packet.spO2 < 90 ? 'critical' :
      packet.spO2 < 94 ? 'low' : 'safe';

    // 6. THERMAL COMFORT — combine skin temp delta + HR signal
    let thermalComfort: BiometricSignal['thermalComfort'];
    if (skinTempDelta > 1.5 || (skinTempDelta > 0.8 && heartRateStatus === 'elevated')) {
      thermalComfort = 'hot';
    } else if (skinTempDelta > 0.5) {
      thermalComfort = 'warm';
    } else if (skinTempDelta < -1.5 || spO2Status !== 'safe') {
      thermalComfort = 'cold';
    } else if (skinTempDelta < -0.5) {
      thermalComfort = 'cool';
    } else {
      thermalComfort = 'comfortable';
    }

    // 7. OVERALL STRESS score (0-100)
    const overallStress = Math.min(100, Math.max(0,
      (hrDelta > 0 ? hrDelta * 3 : 0) +
      (hrvStatus === 'poor' ? 30 : hrvStatus === 'moderate' ? 10 : 0) +
      (spO2Status === 'critical' ? 40 : spO2Status === 'low' ? 20 : 0) +
      (thermalComfort === 'hot' ? 25 : thermalComfort === 'cold' ? 15 : 0)
    ));

    // 8. CONFIDENCE — lower if readings seem invalid
    const confidence = (
      packet.heartRate > 30 && packet.heartRate < 200 &&
      (packet.spO2 === 0 || (packet.spO2 > 80 && packet.spO2 <= 100)) &&
      packet.skinTempRaw > 20 && packet.skinTempRaw < 45
    ) ? 0.9 : 0.4; // Low confidence = ignore this packet

    return {
      skinTempDelta, skinTempTrend, heartRateStatus, hrvStatus,
      spO2Status, thermalComfort, overallStress, confidence
    };
  }
}

// ─────────────────────────────────────────
// DECISION ENGINE — THE CORE LOGIC
// ─────────────────────────────────────────

export class BiometricDecisionEngine {
  private consecutiveWarmReadings = 0;
  private consecutiveColdReadings = 0;
  private lastAdjustmentTime = 0;
  private MIN_ADJUSTMENT_INTERVAL = 15 * 60 * 1000; // 15 min between adjustments
  private userOverrideActive = false;
  private userOverrideExpiry = 0;

  makeDecision(
    signal: BiometricSignal,
    currentACState: { temp: number; fan: string; power: string },
    sleepStage: string // 'awake' | 'light' | 'deep' | 'rem'
  ): ACDecision {

    // 0. SAFETY: Don't act on low-confidence readings
    if (signal.confidence < 0.6) {
      return { shouldAdjust: false, reason: 'low_confidence', action: 'none',
               magnitude: 0, urgency: 'low', explanation: 'Signal unreliable — skipped' };
    }

    // 1. SAFETY OVERRIDE: SpO2 critical — room too cold
    if (signal.spO2Status === 'critical') {
      return {
        shouldAdjust: true, reason: 'spo2_critical',
        action: 'temp_up', magnitude: 2, urgency: 'high',
        explanation: `SpO₂ dropped to dangerous level — raised AC temperature to warm room`
      };
    }
    if (signal.spO2Status === 'low') {
      return {
        shouldAdjust: true, reason: 'spo2_low',
        action: 'temp_up', magnitude: 1, urgency: 'medium',
        explanation: `Low blood oxygen detected — room may be too cold`
      };
    }

    // 2. USER OVERRIDE — respect for configured duration
    if (this.userOverrideActive && Date.now() < this.userOverrideExpiry) {
      return { shouldAdjust: false, reason: 'user_override', action: 'none',
               magnitude: 0, urgency: 'low', explanation: 'User override active' };
    }

    // 3. RATE LIMITING — don't adjust too frequently
    if (Date.now() - this.lastAdjustmentTime < this.MIN_ADJUSTMENT_INTERVAL) {
      return { shouldAdjust: false, reason: 'rate_limited', action: 'none',
               magnitude: 0, urgency: 'low', explanation: 'Recent adjustment — waiting' };
    }

    // 4. DEEP SLEEP — conservative, minimal interference
    if (sleepStage === 'deep') {
      // Only act on extreme signals during deep sleep
      if (signal.thermalComfort === 'hot' && signal.skinTempTrend === 'rising') {
        this.consecutiveWarmReadings++;
        if (this.consecutiveWarmReadings >= 3) { // 15+ min of warmth
          return this.makeWarmAdjustment(currentACState, 'deep', signal);
        }
      } else {
        this.consecutiveWarmReadings = 0;
      }
      return { shouldAdjust: false, reason: 'deep_sleep_conserve', action: 'none',
               magnitude: 0, urgency: 'low', explanation: 'Deep sleep — conserving' };
    }

    // 5. TOO WARM — body is heating up
    if (signal.thermalComfort === 'warm' || signal.thermalComfort === 'hot') {
      this.consecutiveWarmReadings++;
      this.consecutiveColdReadings = 0;

      // Need 2 consecutive warm readings (10 min) before acting — avoids noise
      if (this.consecutiveWarmReadings >= 2) {
        return this.makeWarmAdjustment(currentACState, sleepStage, signal);
      }
    }

    // 6. TOO COOL — body is cooling down
    else if (signal.thermalComfort === 'cool' || signal.thermalComfort === 'cold') {
      this.consecutiveColdReadings++;
      this.consecutiveWarmReadings = 0;

      if (this.consecutiveColdReadings >= 2) {
        return this.makeCoolAdjustment(currentACState, sleepStage, signal);
      }
    }

    // 7. COMFORTABLE — no action needed
    else {
      this.consecutiveWarmReadings = 0;
      this.consecutiveColdReadings = 0;
    }

    return {
      shouldAdjust: false, reason: 'comfortable',
      action: 'none', magnitude: 0, urgency: 'low',
      explanation: 'Body signals comfortable — no adjustment needed'
    };
  }

  private makeWarmAdjustment(state: any, sleepStage: string, signal: BiometricSignal): ACDecision {
    this.consecutiveWarmReadings = 0;
    this.lastAdjustmentTime = Date.now();

    // Prefer fan reduction to temp reduction (quieter, less disruptive)
    const fanSpeeds = ['auto', 'low', 'medium', 'high', 'turbo'];
    const currentFanIndex = fanSpeeds.indexOf(state.fan);

    if (signal.thermalComfort === 'warm' && currentFanIndex < fanSpeeds.length - 1) {
      return {
        shouldAdjust: true, reason: 'body_warm',
        action: 'fan_up', magnitude: 1, urgency: 'low',
        explanation: `Skin temp rising +${signal.skinTempDelta.toFixed(1)}°C — increased fan speed`
      };
    }

    // Drop temperature
    const tempDrop = signal.thermalComfort === 'hot' ? 2 : 1;
    const newTemp = Math.max(16, state.temp - tempDrop);

    return {
      shouldAdjust: state.temp > 16, reason: 'body_too_warm',
      action: 'temp_down', magnitude: tempDrop, urgency: signal.thermalComfort === 'hot' ? 'medium' : 'low',
      explanation: `Body warming detected (HR ${signal.heartRateStatus}, skin delta +${signal.skinTempDelta.toFixed(1)}°C) — cooled to ${newTemp}°C`
    };
  }

  private makeCoolAdjustment(state: any, sleepStage: string, signal: BiometricSignal): ACDecision {
    this.consecutiveColdReadings = 0;
    this.lastAdjustmentTime = Date.now();

    // During REM: body temp naturally drops — don't fight it unless SpO2 is falling
    if (sleepStage === 'rem' && signal.spO2Status === 'safe') {
      return { shouldAdjust: false, reason: 'rem_natural_drop', action: 'none',
               magnitude: 0, urgency: 'low', explanation: 'REM sleep — natural temp drop is normal' };
    }

    const tempRise = 1; // Always gentle +1°C when too cold
    const newTemp = Math.min(30, state.temp + tempRise);

    return {
      shouldAdjust: true, reason: 'body_too_cool',
      action: 'temp_up', magnitude: 1, urgency: 'low',
      explanation: `Body cooling detected (skin delta ${signal.skinTempDelta.toFixed(1)}°C) — warmed to ${newTemp}°C`
    };
  }

  setUserOverride(durationMinutes: number): void {
    this.userOverrideActive = true;
    this.userOverrideExpiry = Date.now() + durationMinutes * 60 * 1000;
  }
}

// ─────────────────────────────────────────
// MAIN ENGINE — WIRES EVERYTHING TOGETHER
// ─────────────────────────────────────────

export class BiometricACEngine {
  private interpreter = new SignalInterpreter();
  private decisionEngine = new BiometricDecisionEngine();
  private packetHistory: BiometricPacket[] = [];
  private baseline: PersonalBaseline | null = null;
  private nightLog: Array<{ time: string; decision: ACDecision; signal: BiometricSignal }> = [];
  private watchEventEmitter: NativeEventEmitter;
  private isMonitoring = false;

  constructor() {
    this.watchEventEmitter = new NativeEventEmitter(NativeModules.WatchBridge);
  }

  async startSleepMonitoring(deviceId: string): Promise<void> {
    if (this.isMonitoring) return;
    this.isMonitoring = true;
    this.nightLog = [];
    this.packetHistory = [];

    // Load personal baseline
    this.baseline = await BiometricBaseline.get();

    // Subscribe to watch biometric updates
    this.watchEventEmitter.addListener('WatchBiometricUpdate', async (json: string) => {
      try {
        const packet: BiometricPacket = JSON.parse(json);
        await this.processPacket(packet, deviceId);
      } catch (e) {
        console.error('BiometricACEngine: bad packet', e);
      }
    });

    // Also start the watch service
    await NativeModules.WatchBridge.sendCommandToWatch('START_SLEEP_MONITOR');

    console.log('BiometricACEngine: sleep monitoring started');
  }

  async stopSleepMonitoring(): Promise<NightReport> {
    this.isMonitoring = false;
    this.watchEventEmitter.removeAllListeners('WatchBiometricUpdate');
    await NativeModules.WatchBridge.sendCommandToWatch('STOP_SLEEP_MONITOR');

    // Update personal baseline with tonight's data
    if (this.baseline && this.packetHistory.length > 5) {
      this.baseline = await BiometricBaseline.update(this.packetHistory);
    }

    return this.generateNightReport();
  }

  private async processPacket(packet: BiometricPacket, deviceId: string): Promise<void> {
    if (!this.baseline) {
      // Not enough baseline data — collect but don't act
      this.packetHistory.push(packet);
      if (this.packetHistory.length >= 10) {
        this.baseline = await BiometricBaseline.update(this.packetHistory);
      }
      return;
    }

    this.packetHistory.push(packet);

    const signal = this.interpreter.interpretPacket(packet, this.baseline, this.packetHistory);
    const sleepStage = await this.getCurrentSleepStage();
    const acState = await this.getCurrentACState(deviceId);

    const decision = this.decisionEngine.makeDecision(signal, acState, sleepStage);

    this.nightLog.push({
      time: new Date(packet.timestamp).toISOString(),
      decision, signal
    });

    if (decision.shouldAdjust) {
      await this.executeDecision(decision, acState, deviceId);
    }
  }

  private async executeDecision(
    decision: ACDecision,
    currentState: any,
    deviceId: string
  ): Promise<void> {
    console.log(`BiometricACEngine: executing ${decision.action} — ${decision.explanation}`);

    const commands: Record<string, () => Promise<void>> = {
      'temp_down': () => this.setACTemp(deviceId, currentState.temp - decision.magnitude),
      'temp_up': () => this.setACTemp(deviceId, currentState.temp + decision.magnitude),
      'fan_up': () => this.setACFanUp(deviceId, currentState.fan),
      'fan_down': () => this.setACFanDown(deviceId, currentState.fan),
      'mode_switch': () => this.setACMode(deviceId, 'auto'),
      'none': async () => {},
    };

    await commands[decision.action]?.();

    // Log the adjustment event
    await this.logAdjustment(deviceId, decision);

    // Update watch with new AC state
    const newState = await this.getCurrentACState(deviceId);
    await NativeModules.WatchBridge.updateWatchACStatus(
      newState.power === 'on', newState.temp, newState.mode, 0
    );
  }

  private generateNightReport(): NightReport {
    const adjustments = this.nightLog.filter(l => l.decision.shouldAdjust);
    const avgSkinTempDelta = this.average(this.nightLog.map(l => l.signal.skinTempDelta));
    const avgHR = this.average(this.packetHistory.map(p => p.heartRate));
    const thermalComfortScore = this.calculateThermalComfortScore();

    return {
      date: new Date().toISOString(),
      totalReadings: this.packetHistory.length,
      adjustmentsMade: adjustments.length,
      adjustments: adjustments.map(a => ({
        time: a.time, action: a.decision.action,
        reason: a.decision.explanation
      })),
      avgSkinTempDelta: avgSkinTempDelta,
      avgHeartRate: avgHR,
      thermalComfortScore,
      grade: this.scoreToGrade(thermalComfortScore),
      insight: this.generateInsight(adjustments, avgSkinTempDelta, avgHR),
    };
  }

  private calculateThermalComfortScore(): number {
    const comfortReadings = this.nightLog.filter(
      l => l.signal.thermalComfort === 'comfortable'
    ).length;
    return Math.round((comfortReadings / Math.max(1, this.nightLog.length)) * 100);
  }

  private average(arr: number[]): number {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B+';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'D';
  }

  private generateInsight(adjustments: any[], avgTempDelta: number, avgHR: number): string {
    if (adjustments.length === 0) return 'Your AC was perfectly tuned — no adjustments needed all night!';
    if (avgTempDelta > 0.8) return `You ran warm last night (+${avgTempDelta.toFixed(1)}°C above baseline). Consider starting 1°C lower tomorrow.`;
    if (avgTempDelta < -0.5) return 'You got a bit cold. Try raising the start temperature by 1°C.';
    return `Smart adjustments made ${adjustments.length} correction${adjustments.length > 1 ? 's' : ''} to keep you comfortable.`;
  }

  // These call the existing ConnectionManager from Phase 1B
  private async setACTemp(deviceId: string, temp: number): Promise<void> {
    const clamped = Math.max(16, Math.min(30, temp));
    await fetch(`http://localhost:3000/api/${deviceId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [{ component: 'main', capability: 'thermostatCoolingSetpoint', command: 'setCoolingSetpoint', arguments: [clamped] }] })
    });
  }

  private async setACFanUp(deviceId: string, currentFan: string): Promise<void> {
    const speeds = ['auto', 'low', 'medium', 'high', 'turbo'];
    const next = speeds[Math.min(speeds.indexOf(currentFan) + 1, speeds.length - 1)];
    await fetch(`http://localhost:3000/api/${deviceId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [{ component: 'main', capability: 'airConditionerFanMode', command: 'setFanMode', arguments: [next] }] })
    });
  }

  private async setACFanDown(deviceId: string, currentFan: string): Promise<void> {
    const speeds = ['auto', 'low', 'medium', 'high', 'turbo'];
    const prev = speeds[Math.max(speeds.indexOf(currentFan) - 1, 0)];
    await fetch(`http://localhost:3000/api/${deviceId}/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [{ component: 'main', capability: 'airConditionerFanMode', command: 'setFanMode', arguments: [prev] }] })
    });
  }

  private async setACMode(deviceId: string, mode: string): Promise<void> { /* ... */ }
  private async getCurrentACState(deviceId: string): Promise<any> { /* ... fetch from cache */ }
  private async getCurrentSleepStage(): Promise<string> { /* ... from Health Connect if available */ return 'light'; }
  private async logAdjustment(deviceId: string, decision: ACDecision): Promise<void> { /* ... SQLite */ }
}

export interface NightReport {
  date: string;
  totalReadings: number;
  adjustmentsMade: number;
  adjustments: Array<{ time: string; action: string; reason: string }>;
  avgSkinTempDelta: number;
  avgHeartRate: number;
  thermalComfortScore: number;
  grade: string;
  insight: string;
}
```

VERIFY:
1. BiometricBaseline.update() with 10 mock packets → stores in AsyncStorage
2. SignalInterpreter produces 'hot' for skinTempDelta +1.8°C + elevated HR
3. DecisionEngine returns 'temp_down' after 2 consecutive warm signals
4. SpO2 = 91% → immediately returns 'temp_up' at high urgency
5. REM sleep stage + cold signal → returns 'none' (natural drop, don't fight it)
```

---

### Prompt 7B-4: Sleep Mode Integration + Automated Trigger

```
You are wiring the BiometricACEngine into the SmartAC app's sleep flow.

FILES:
- SmartACApp/src/screens/SleepModeScreen.tsx (new)
- SmartACApp/src/screens/MorningReportScreen.tsx (new)
- SmartACApp/src/services/sleepOrchestrator.ts (new)

TASK: Build the end-to-end biometric sleep flow

PART 1 — SLEEP ORCHESTRATOR

FILE: sleepOrchestrator.ts

```ts
export class SleepOrchestrator {
  private biometricEngine: BiometricACEngine;
  private healthConnect: HealthConnectService;
  private isSleepActive = false;

  // Called when user activates "Smart Sleep Mode"
  async startSleepSession(deviceId: string, deviceSettings: DeviceSettings): Promise<void> {
    this.isSleepActive = true;

    // 1. Apply initial preset (ultra-saver or AI-learned)
    await applyPreset(deviceId, deviceSettings.sleepPreset);

    // 2. Start watch biometric monitoring
    await this.biometricEngine.startSleepMonitoring(deviceId);

    // 3. Schedule morning auto-stop
    const wakeTime = deviceSettings.wakeTime ?? '07:00';
    this.scheduleWakeup(wakeTime, deviceId);

    // 4. Log session start
    await logEvent(deviceId, 'sleep_session_start', {
      preset: deviceSettings.sleepPreset,
      biometricActive: true,
    });
  }

  // Called at wake time OR when user taps "Good morning"
  async endSleepSession(deviceId: string): Promise<NightReport> {
    this.isSleepActive = false;

    // 1. Stop biometric monitoring, get night report
    const biometricReport = await this.biometricEngine.stopSleepMonitoring();

    // 2. Fetch Health Connect sleep data (now available as session ended)
    const sleepAnalysis = await this.healthConnect.getLastNightSleep();

    // 3. Calculate thermal comfort score
    const fullReport = {
      ...biometricReport,
      sleepDurationMinutes: sleepAnalysis?.durationMinutes ?? 0,
      deepSleepMinutes: sleepAnalysis?.deepSleepMinutes ?? 0,
      remSleepMinutes: sleepAnalysis?.remSleepMinutes ?? 0,
      avgSpO2: sleepAnalysis?.avgSpO2 ?? 0,
      skinTempReadings: sleepAnalysis?.skinTempReadings ?? [],
    };

    // 4. Update RL optimizer with session outcome
    await rlOptimizer.processSession({
      conditions: await getCurrentConditions(),
      comfortScore: biometricReport.thermalComfortScore,
      kwhSaved: await calculateSessionKwh(deviceId),
      baselineKwh: baselineKwh,
      actionTaken: 0,
    });

    // 5. Update sleep learning engine
    await sleepLearner.analyzePatterns(deviceId);

    // 6. Navigate to morning report
    return fullReport;
  }

  private scheduleWakeup(wakeTime: string, deviceId: string): void {
    const [h, m] = wakeTime.split(':').map(Number);
    const wakeDate = new Date();
    wakeDate.setHours(h, m, 0, 0);
    if (wakeDate < new Date()) wakeDate.setDate(wakeDate.getDate() + 1);

    const msUntilWake = wakeDate.getTime() - Date.now();
    setTimeout(async () => {
      const report = await this.endSleepSession(deviceId);
      // Show morning report notification
      await notifee.displayNotification({
        title: `Good morning! Comfort score: ${report.grade}`,
        body: report.insight,
        data: { screen: 'MorningReport', reportJson: JSON.stringify(report) },
        android: { channelId: 'morning_report', smallIcon: 'ic_sun' }
      });
    }, msUntilWake);
  }
}
```

PART 2 — SLEEP MODE SCREEN (SleepModeScreen.tsx)

DESIGN:
Full-screen dark mode screen with lunar/biometric aesthetic

SCREEN SECTIONS:

TOP — WATCH CONNECTION STATUS:
- If watch connected + service running:
  Animated Bluetooth ring around Galaxy Watch icon
  "● Live biometrics active" in Bio-Safe green, pulsing gently
- If not connected:
  Gray ring, "Watch not connected" + "Set up watch" link

CENTER — LIVE BIOMETRIC CARD:
Glowing card (soft mint glow) showing real-time values from watch:
┌──────────────────────────────────────────────────┐
│                 🩺 Biometrics                    │
│   💓 72 bpm          🌡️ +0.3°C                   │
│   Resting ●          Normal ●                    │
│                                                  │
│   SpO₂: 98%          HRV: 42ms                  │
│                                                  │
│   Comfort: ─────────●────── Comfortable          │
│            cold           hot                   │
└──────────────────────────────────────────────────┘
Values update every 5 minutes (animate the number change)
Comfort slider: a horizontal gradient bar (blue→red) with a white dot that moves
The dot position = thermalComfort (0=cold, 50=comfortable, 100=hot)

MIDDLE — AC CURRENT STATE:
┌──────────────────────────────────────────────────┐
│  ❄️ AC Active                    Auto-adjust ON  │
│  24°C · Cool · Low fan                          │
│  ──────────────────────────────────────────────  │
│  Last AI adjustment: 11:42 PM                   │
│  "Body warming detected — cooled to 24°C"       │
└──────────────────────────────────────────────────┘

BOTTOM — SLEEP TIMELINE:
Vertical timeline from sleep start to now, with dots for:
- AC adjustments (mint dots)
- Anomalies (coral dots)
- Sleep stage changes (indigo/purple gradient blocks)
Timeline scrolls as night progresses

CONTROLS:
- "Override AI" button: pauses biometric AC control for 30 min
  Shows timer countdown while override active
- "Adjust manually" → goes to normal AC control screen
- "Good morning" button (appears at 5 AM) → ends session

PART 3 — MORNING REPORT SCREEN (MorningReportScreen.tsx)

Appears as modal over HomeScreen after sleep session ends.

DESIGN:
- Gradient header: deep blue → purple → black (morning sky)
- Date: "Wednesday, Feb 24 · Sleep Report" in muted mono
- Comfort grade: huge letter grade in center (A+) with circular ring
  Ring color = grade (A=mint, B=blue, C=yellow, D=coral)
  Animated fill from 0 → final score on mount

METRIC ROW (horizontal scroll):
┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐
│ 7h │ │ 92%│ │+0.2│ │ 3x │ │ B+ │
│ 22m│ │SpO₂│ │ ΔT │ │adj │ │HRV │
└────┘ └────┘ └────┘ └────┘ └────┘
sleep  blood  skin  AC    HRV
hours  oxygen temp  adj   grade

ADJUSTMENTS TIMELINE:
Compact list of all AC changes made during the night:
11:23 PM ● Cooled to 24°C — skin temp rising (+0.8°C)
01:14 AM ● Raised to 25°C — SpO₂ dropped slightly
03:47 AM ● Fan reduced — body entered deep sleep

INSIGHT CARD:
Mint border card with AI insight text
"You ran 0.8°C warmer than average. Consider starting at 23°C tomorrow."
OR "Perfect night — biometrics stayed in comfort zone all night! 🎉"

SHARE BUTTON:
"Share sleep report" → ShareableCard with biometric data

VERIFY:
1. Tap "Start Smart Sleep" → watch service starts → biometric card shows live data
2. Mock send warm biometric packet → decision fires → AC cools by 1°C
3. Override button pauses decisions for 30 min
4. "Good morning" → morning report modal appears with correct data
5. Health Connect sleep stages appear in timeline
```

---

### Prompt 7B-5: Biometric Dashboard UI Components

```
You are building the biometric data visualization components for SmartAC.

FILES:
- SmartACApp/src/components/biometric/LiveBiometricCard.tsx
- SmartACApp/src/components/biometric/SleepTimeline.tsx
- SmartACApp/src/components/biometric/ThermalComfortGauge.tsx
- SmartACApp/src/components/biometric/NightAdjustmentLog.tsx
- SmartACApp/src/components/biometric/WatchConnectionBadge.tsx

DESIGN TOKENS (biometric-specific):
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

COMPONENT 1 — LiveBiometricCard.tsx

Real-time biometric display card, updates every 5 min via WatchBiometricUpdate event.

Layout: 2x2 grid of metric tiles + horizontal comfort slider below

METRIC TILE design:
- Rounded square, bg #1E1E2A, border-radius 12
- Top: small label (DM Sans 11px, muted) e.g. "HEART RATE"
- Center: value in JetBrains Mono 28px, colored
  HR: normal=white, elevated=coral, low=blue
  Skin temp delta: positive=coral, negative=blue, ±0=mint
  SpO2: >95=mint, 90-94=yellow, <90=coral
  HRV: higher=mint, lower=coral
- Bottom: status dot + label e.g. "● Resting"

COMFORT SLIDER:
- Full width, height 8px
- Track gradient: #38BDF8 → #00FFB2 → #FF6B35 (cold → comfortable → hot)
- White dot (18px circle, shadow) at current thermalComfort position
- Animated slide when value changes (spring physics)
- Labels: "Cold" (left) ·  "Comfortable" (center) · "Hot" (right)

Updates with animated number change (Animated.Value → spring to new value)

COMPONENT 2 — SleepTimeline.tsx

Vertical timeline for the sleep mode screen showing the whole night:
- Rendered as a SVG-backed view using react-native-svg
- Left side: time labels (10PM, 11PM, 12AM... 7AM)
- Center: vertical line (1px, rgba white 0.2)
- Right side: events (dots + labels)

EVENT DOTS:
- AC cool adjustment: mint circle + "↓ 24°C" label
- AC warm adjustment: coral circle + "↑ 25°C" label
- Biometric alert: yellow triangle + brief description
- Sleep stage change: colored horizontal band extending right
  deep = #818CF8/30 band
  REM  = #C084FC/30 band
  light = #94A3B8/20 band

Current time marker: animated pulsing mint dot with "NOW" label

COMPONENT 3 — ThermalComfortGauge.tsx

A semicircular gauge (SVG arc) showing current body thermal comfort:
- Range: 0 (cold) to 100 (hot), 50 = comfortable
- Arc spans 180° (bottom-center semicircle)
- Filled arc: gradient mint (comfort zone 40-60) → coral (hot) → blue (cold)
- Pointer: white needle that rotates to value
- Center bottom: comfort state label "COMFORTABLE" in uppercase mono
- Outer ring: 24 tick marks, 5 major (at 0/25/50/75/100)
- Animates smoothly on new readings (Animated.Value + interpolation to SVG rotation)

COMPONENT 4 — NightAdjustmentLog.tsx

A compact, scrollable list of all AC adjustments made by the biometric engine:

Each entry:
- Left: time in mono (11:23 PM)
- Center: colored action chip: "↓ 24°C" (mint=temp down) | "↑ 25°C" (coral=temp up)
- Right: brief reason text in 11px muted DM Sans
  "skin temp rising"
- Separator: subtle divider

Empty state: "No adjustments yet — monitoring your comfort 👁️"

Tapping an entry expands to show full biometricSignal snapshot:
HR · HRV · Skin temp delta · SpO2 · Sleep stage

COMPONENT 5 — WatchConnectionBadge.tsx

Small status indicator used in multiple screens:

CONNECTED state:
- Animated Bluetooth rings: outer ring pulses opacity 1→0.3 every 2s
- Galaxy Watch emoji or custom icon
- "Live · Galaxy Watch 7" in mint
- Tap → goes to watch app pairing guide

DISCONNECTED state:
- Gray icon, no animation
- "Watch not connected" in muted text
- Tap → shows setup guide bottom sheet:
  1. Install SmartAC on your Galaxy Watch (link)
  2. Open watch app → Start monitoring
  3. Keep watch and phone on same WiFi or Bluetooth

DATA STALE (>10 min since last packet):
- Yellow indicator, "Last update: 12 min ago"

VERIFY:
1. LiveBiometricCard renders with mock data — all 4 tiles correct colors
2. Comfort slider at 75 → orange/warm zone
3. SleepTimeline renders with 5 mock events — correct timestamps
4. ThermalComfortGauge pointer animates from 30 to 70 smoothly
5. WatchConnectionBadge shows 3 states correctly
```

---

### Prompt 7B-6: Settings + Baseline Calibration

```
You are adding the Galaxy Watch settings and biometric calibration flow to SmartAC.

FILES:
- SmartACApp/src/screens/WatchSetupScreen.tsx (new)
- SmartACApp/src/screens/BiometricSettingsScreen.tsx (new)
- SmartACApp/src/components/BaselineCalibrationCard.tsx (new)

TASK: Watch setup flow + biometric preference configuration

PART 1 — WATCH SETUP SCREEN (WatchSetupScreen.tsx)

3-step onboarding for Galaxy Watch integration:

STEP 1 — REQUIREMENTS CHECK:
Checklist with real-time status:
✅ Galaxy Watch 7 detected (connected via Bluetooth)
✅ SmartAC watch app installed
⏳ Body sensor permission granted on watch
✅ Health Connect enabled in Samsung Health
✅ Sleep data sync active

Each item auto-checks on screen mount. Failed items show "Fix →" button.

STEP 2 — FIRST NIGHT BASELINE:
Explanation card:
"We need 3 nights of sleep data to learn your personal biometric baseline.
 Tonight, just wear your watch while sleeping normally — no changes needed.
 After 3 nights, biometric AC control activates automatically."

Progress: baseline progress bar 0/3 nights
If already have baseline: "✅ Baseline established (8 nights of data)"

STEP 3 — SENSITIVITY:
Slider: AC Adjustment Sensitivity
[Minimal] ←──────●──────→ [Aggressive]
- Minimal: only adjusts for extreme signals (SpO2 safety only)
- Balanced (default): adjusts after 2 consistent readings  
- Responsive: adjusts after 1 reading
- Aggressive: proactive, adjusts before discomfort peaks

PART 2 — BIOMETRIC SETTINGS SCREEN (BiometricSettingsScreen.tsx)

Added as a section in the main Settings screen.

Settings:
1. "Smart Sleep Mode" toggle — enable/disable biometric AC control
2. "AC Adjustment Sensitivity" — same slider as setup
3. "Minimum SpO₂ floor" — slider 88-96% (default 93%)
   Below this → always raise AC temp regardless of other signals
4. "Override duration" — when user manually overrides: 20/30/60/90 min
5. "Deep sleep conserve mode" — toggle: no AC changes during deep sleep
6. "Personal baseline" — shows current baseline values:
   Avg skin temp: 36.1°C | Avg resting HR: 58 bpm | Avg HRV: 45ms | Avg SpO2: 97%
   "Reset baseline" button (clears 3-night requirement, starts over)
7. "Biometric data privacy" — info that all data stays on device, never uploaded

PART 3 — BASELINE CALIBRATION CARD (BaselineCalibrationCard.tsx)

Shown on Analytics screen while baseline is being built (first 3 nights):

DESIGN:
- Card with violet (#7B61FF) gradient
- Top: "🏗️ Building Your Baseline" in Clash Display
- Progress: "Night 2 of 3 complete"
  3 moon icons: filled = complete, outline = pending
  🌑 🌕 🌑  →  🌕 🌕 🌑  →  🌕 🌕 🌕
- Body text: "Wear your watch tonight to complete calibration.
  We're learning your personal resting heart rate, skin temperature,
  and SpO₂ during comfortable sleep."
- ETA: "Biometric AC control activates tomorrow night"

When baseline is established: card changes to:
- "✅ Baseline Active — 12 nights of learning"
- Shows the 4 baseline values
- "Recalibrate" link

VERIFY:
1. WatchSetupScreen checklist auto-detects watch connection
2. 3-night progress persists across app restarts (AsyncStorage)
3. Sensitivity slider changes MIN_ADJUSTMENT_INTERVAL in BiometricDecisionEngine
4. SpO2 floor setting propagates to decision engine
5. Reset baseline clears AsyncStorage + resets night counter
```

---

## Data Flow Summary

```
SLEEP STARTS (user taps "Smart Sleep")
    ↓
Apply initial preset (ultra-saver or AI-learned)
    ↓
Start SensorTrackingService on Galaxy Watch
    ↓
    ┌─────────────────────────── EVERY 5 MINUTES ──────────────────────────┐
    │  Galaxy Watch reads: HR + HRV + SkinTemp + SpO2 + AmbientTemp       │
    │      ↓ (Wearable Data Layer API over Bluetooth)                     │
    │  Android WatchListenerService receives JSON packet                   │
    │      ↓ (NativeEventEmitter)                                          │
    │  React Native BiometricACEngine.processPacket()                     │
    │      ↓                                                               │
    │  SignalInterpreter → BiometricSignal                                │
    │      ↓                                                               │
    │  BiometricDecisionEngine.makeDecision()                             │
    │      ↓                                                               │
    │  If adjustment needed → execute AC command                          │
    │      ↓                                                               │
    │  Log to SQLite + update watch tile                                  │
    └──────────────────────────────────────────────────────────────────────┘
    ↓
MORNING (wake time)
    ↓
BiometricACEngine.stopSleepMonitoring()
    ↓
Health Connect reads full sleep session + stages
    ↓
NightReport generated → MorningReportScreen
    ↓
BiometricBaseline updated with tonight's data
    ↓
RL Optimizer + SleepLearner also process tonight's session
```

---

## Verification Criteria

- [ ] Galaxy Watch 7 app builds and installs on watch
- [ ] SensorTrackingService reads HR + skin temp on watch without crash
- [ ] Biometric packet received on phone every 5 minutes
- [ ] WatchBiometricUpdate event fires in React Native
- [ ] Mock warm signal → AC cools by 1°C via SmartThings
- [ ] SpO2 89% → immediate AC temp raise (safety override)
- [ ] Deep sleep stage → AC adjustments paused
- [ ] 3 nights of data → baseline established → biometric control activates
- [ ] Morning report shows correct adjustment count + grade
- [ ] Watch tile shows current AC status + quick toggle works
- [ ] Health Connect sleep stages appear in timeline
- [ ] Override button pauses engine for configured duration
- [ ] All biometric data stays on device (no cloud upload)

---

## Files Created

```
SmartACWatch/ (new Android Studio project)
├── app/src/main/kotlin/com/smartac/watch/
│   ├── MainActivity.kt
│   ├── SensorTrackingService.kt       ← reads HR + skin temp from watch
│   ├── SmartACTile.kt                 ← Wear OS tile for AC quick control
│   └── MainScreen.kt                  ← Compose UI on watch

SmartACApp/android/app/src/main/java/com/smartacapp/
├── WatchListenerService.kt            ← receives from watch on phone
├── WatchBridgeModule.kt               ← React Native native module
└── WatchBridgePackage.kt              ← registers native module

SmartACApp/src/
├── screens/
│   ├── SleepModeScreen.tsx            ← live biometric sleep view
│   ├── MorningReportScreen.tsx        ← post-sleep biometric report
│   ├── WatchSetupScreen.tsx           ← Galaxy Watch 7 setup flow
│   └── BiometricSettingsScreen.tsx    ← biometric preferences
├── components/biometric/
│   ├── LiveBiometricCard.tsx          ← real-time HR / SpO2 / skin temp
│   ├── SleepTimeline.tsx              ← night event timeline
│   ├── ThermalComfortGauge.tsx        ← semicircular comfort indicator
│   ├── NightAdjustmentLog.tsx         ← list of AC changes made
│   ├── WatchConnectionBadge.tsx       ← watch status indicator
│   └── BaselineCalibrationCard.tsx    ← 3-night calibration progress
└── services/
    ├── biometricACEngine.ts           ← core decision engine
    ├── sleepOrchestrator.ts           ← wires sleep start/stop flow
    └── healthConnect.ts               ← Health Connect API bridge
```

---

## Cost & SDK Requirements

| Component | Cost | Requirement |
|-----------|------|-------------|
| Samsung Health Sensor SDK | Free | Samsung Partner program registration (free for developers) |
| Wearable Data Layer API | Free | Included in Google Play Services |
| react-native-health-connect | Free (MIT) | Health Connect on Android 9+ |
| react-native-wear-connectivity | Free (MIT) | Galaxy Watch + Android |
| Health Connect | Free | Built into Android 14+, app install on 9-13 |
| All processing | On-device | Zero cloud cost |

**Total: ₹0/month**

## Important Limitations (Be Honest With Users)

Document clearly in the app:
1. Skin temperature data is a DELTA from personal baseline — not absolute body temperature
2. Biometric AC control requires 3 nights of calibration before it becomes reliable
3. Readings every 5 min (not continuous) to preserve watch battery
4. SpO2 and HRV readings on watch are not medical-grade
5. System is conservative by design — it will not over-adjust
6. Deep sleep stage detection depends on Samsung Health accuracy
7. Feature requires Galaxy Watch 5 or later (skin temp sensor), Samsung phone,
   Android, and Health Connect — does not work on iOS or non-Samsung watches
