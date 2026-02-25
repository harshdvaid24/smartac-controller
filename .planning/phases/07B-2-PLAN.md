# PHASE 7B — Plan 2: Android Native Module — Watch Bridge

## Goal
Build the Android native module that receives biometric data from the Galaxy Watch 7 via Wearable Data Layer API and exposes it to React Native via NativeEventEmitter. Also integrate Health Connect for post-sleep historical data.

## Wave
1 (parallel with Plan 1 — phone side doesn't need watch app to compile)

## Requirements
BIO-R1 (real-time biometric reading), BIO-R6 (morning report — needs Health Connect sleep data)

## Files
```
SmartACApp/android/app/src/main/java/com/smartacapp/
├── WatchListenerService.kt      ← receives biometric packets from watch
├── WatchBridgeModule.kt         ← React Native native module
└── WatchBridgePackage.kt        ← registers native module

SmartACApp/src/services/
└── healthConnect.ts             ← Health Connect API bridge (TypeScript)
```

## Dependencies
- com.google.android.gms:play-services-wearable:18.2.0 (add to android/app/build.gradle)
- react-native-health-connect@^2 (npm install)

---

<task type="create">
  <name>Add Wearable + Health Connect dependencies to Android build</name>
  <files>SmartACApp/android/app/build.gradle</files>
  <action>
    Add to dependencies block:
    - implementation("com.google.android.gms:play-services-wearable:18.2.0")
    
    Register WatchListenerService in AndroidManifest.xml:
    ```xml
    <service android:name=".WatchListenerService" android:exported="true">
      <intent-filter>
        <action android:name="com.google.android.gms.wearable.MESSAGE_RECEIVED" />
        <data android:host="*" android:pathPrefix="/smartac/biometrics" android:scheme="wear" />
      </intent-filter>
    </service>
    ```
    
    Install Health Connect package:
    npm install react-native-health-connect@^2
  </action>
  <verify>Android project builds with wearable dependency, no Gradle errors</verify>
  <done>Wearable Data Layer API and Health Connect available in Android build</done>
</task>

<task type="create">
  <name>Build WatchListenerService — receives biometric packets from watch</name>
  <files>SmartACApp/android/app/src/main/java/com/smartacapp/WatchListenerService.kt</files>
  <action>
    Extends WearableListenerService.
    
    Companion object holds reference to ReactApplicationContext (set by WatchBridgeModule.init).
    
    onMessageReceived(messageEvent):
      if path != "/smartac/biometrics" → return
      json = String(messageEvent.data)
      Emit to React Native via:
        reactContext?.getJSModule(RCTDeviceEventEmitter::class.java)?.emit("WatchBiometricUpdate", json)
      Log: "Received biometric packet: $json"
    
    onDataChanged(dataEvents):
      For each TYPE_CHANGED event at "/smartac/biometrics":
        Extract DataMap → convert to JSON → emit same event
      This is the alternative sync path (DataItem vs Message)
    
    dataMapToJson(dataMap):
      Build JSONObject with: timestamp, heartRate, hrv, skinTempRaw, ambientTemp, spO2
  </action>
  <verify>Mock send from watch → logcat shows "Received biometric packet"</verify>
  <done>WatchListenerService receives watch data and emits to React Native JS layer</done>
</task>

<task type="create">
  <name>Build WatchBridgeModule — React Native native module</name>
  <files>
    SmartACApp/android/app/src/main/java/com/smartacapp/WatchBridgeModule.kt,
    SmartACApp/android/app/src/main/java/com/smartacapp/WatchBridgePackage.kt
  </files>
  <action>
    WatchBridgeModule extends ReactContextBaseJavaModule:
    
    init block: Set WatchListenerService.reactContext = reactContext
    getName() = "WatchBridge"
    
    @ReactMethod getWatchStatus(promise):
      Wearable.getNodeClient(ctx).connectedNodes
      → map nodes to { connected: true, nodeName, nodeId }
      → promise.resolve(result)
    
    @ReactMethod sendCommandToWatch(command, promise):
      Get connected nodes → sendMessage to first node at "/smartac/commands"
      → promise.resolve(true) / promise.reject on failure
    
    @ReactMethod updateWatchACStatus(isOn, temp, mode, heartRate, promise):
      Build DataMap { isOn, temp, mode, heartRate, updatedAt }
      PutDataMapRequest.create("/smartac/ac_status").setUrgent()
      Wearable.getDataClient(ctx).putDataItem(request)
      → promise.resolve / reject
    
    @ReactMethod addListener(eventName) {}  // NativeEventEmitter support
    @ReactMethod removeListeners(count: Int) {}
    
    WatchBridgePackage implements ReactPackage:
      createNativeModules → listOf(WatchBridgeModule(reactContext))
      createViewManagers → emptyList()
    
    Register in MainApplication.kt: packages.add(WatchBridgePackage())
  </action>
  <verify>
    Build succeeds
    From RN: NativeModules.WatchBridge.getWatchStatus() returns object
    WatchBiometricUpdate event fires when watch sends data
  </verify>
  <done>WatchBridge native module exposes watch status, command sending, and AC status updates to React Native</done>
</task>

<task type="create">
  <name>Build Health Connect service for historical sleep data</name>
  <files>SmartACApp/src/services/healthConnect.ts</files>
  <action>
    TypeScript service using react-native-health-connect.
    
    PERMISSIONS (read-only):
    - HeartRate, SleepSession, OxygenSaturation, SkinTemperature, HeartRateVariability
    
    HealthConnectService class:
    
    initialize():
      Check SDK availability (SdkAvailabilityStatus)
      Call initialize() from library
      Return boolean
    
    requestPermissions():
      Request all PERMISSIONS
      Return true if all granted
    
    getLastNightSleep() → SleepAnalysis | null:
      Time range: yesterday 8 PM → today 8 AM
      
      Read SleepSession records → get first session
      Read HeartRate records during session → extract BPM samples
      Read OxygenSaturation records → extract SpO2 %
      Read SkinTemperature records → extract deltaFromBaseline values
      
      Return SleepAnalysis:
        startTime, endTime, durationMinutes
        stages (from SleepSession.stages)
        avgHeartRate, minHeartRate (from HR records)
        avgSpO2, minSpO2 (from SpO2 records)
        skinTempReadings: Array<{time, deltaFromBaseline}>
        deepSleepMinutes, remSleepMinutes, lightSleepMinutes
        (calculated via calculateStageDuration helper)
    
    Helper methods:
      average(numbers[]) → mean
      calculateStageDuration(stages, stageType) → minutes
    
    Export SleepAnalysis interface.
  </action>
  <verify>
    TypeScript compiles clean (npx tsc --noEmit)
    Health Connect permissions granted → getLastNightSleep() returns data or null
  </verify>
  <done>Health Connect reads full post-sleep data (HR, SpO2, skin temp, sleep stages)</done>
</task>
