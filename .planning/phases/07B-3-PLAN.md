# PHASE 7B — Plan 3: Biometric AC Engine (TypeScript)

## Goal
Build the core biometric-to-AC intelligence engine. Receives biometric signals from the watch every 5 minutes, interprets body state, and decides whether to adjust the AC — conservatively, safely, and reversibly.

## Wave
2 (depends on Plan 2 — needs WatchBridge NativeEventEmitter + Health Connect types)

## Requirements
BIO-R2 (skin temp tracking), BIO-R3 (HR comfort detection), BIO-R4 (sleep-stage AC), BIO-R5 (SpO2 safety floor), BIO-R6 (morning report), BIO-R8 (baseline learning)

## Files
```
SmartACApp/src/services/
└── biometricACEngine.ts    ← signal interpretation + decision engine + night report
```

---

<task type="create">
  <name>Define biometric data types and interfaces</name>
  <files>SmartACApp/src/services/biometricACEngine.ts</files>
  <action>
    Define TypeScript interfaces at top of file:
    
    BiometricPacket: { timestamp, heartRate, hrv, skinTempRaw, ambientTemp, spO2, source }
    
    BiometricSignal (derived from packet + baseline + history):
      skinTempDelta: number (°C from personal baseline)
      skinTempTrend: 'rising' | 'stable' | 'falling'
      heartRateStatus: 'low' | 'normal' | 'elevated'
      hrvStatus: 'good' | 'moderate' | 'poor'
      spO2Status: 'safe' | 'low' | 'critical'
      thermalComfort: 'cold' | 'cool' | 'comfortable' | 'warm' | 'hot'
      overallStress: 0-100
      confidence: 0-1
    
    ACDecision: { shouldAdjust, reason, action, magnitude, urgency, explanation }
    PersonalBaseline: { avgSkinTemp, avgRestingHR, avgSpO2, avgHRV, samplesCount, lastUpdated }
    NightReport: { date, totalReadings, adjustmentsMade, adjustments[], avgSkinTempDelta, avgHeartRate, thermalComfortScore, grade, insight }
  </action>
  <verify>Types compile clean</verify>
  <done>All biometric interfaces defined for engine, signals, decisions, and reports</done>
</task>

<task type="create">
  <name>Build BiometricBaseline — personal calibration via exponential moving average</name>
  <files>SmartACApp/src/services/biometricACEngine.ts</files>
  <action>
    BiometricBaseline class with static methods using AsyncStorage:
    
    STORAGE_KEY = 'biometric_baseline'
    
    get(): Load from AsyncStorage, parse JSON, return PersonalBaseline | null
    
    update(newPackets: BiometricPacket[]):
      Filter valid packets (HR 40-120 range — plausible sleep HR)
      Calculate averages: avgSkinTemp, avgHR, avgSpO2, avgHRV
      
      If existing baseline exists:
        Exponential moving average with alpha=0.15
        new.avgSkinTemp = old.avgSkinTemp * 0.85 + current * 0.15
        (same for all 4 metrics)
        Increment samplesCount
      
      If no existing baseline:
        Set initial baseline from first night's data
        samplesCount = 1
      
      Save to AsyncStorage, return updated baseline
  </action>
  <verify>BiometricBaseline.update() with 10 mock packets → stores in AsyncStorage correctly</verify>
  <done>Personal baseline builds over time, weighted toward recent nights</done>
</task>

<task type="create">
  <name>Build SignalInterpreter — converts raw packets to meaningful signals</name>
  <files>SmartACApp/src/services/biometricACEngine.ts</files>
  <action>
    SignalInterpreter class:
    
    interpretPacket(packet, baseline, history) → BiometricSignal:
    
    1. SKIN TEMP DELTA = packet.skinTempRaw - baseline.avgSkinTemp
    
    2. SKIN TEMP TREND — compare last 3 readings:
       rising if last - first > +0.3°C
       falling if last - first < -0.3°C
       else stable
    
    3. HEART RATE STATUS (relative to personal baseline):
       hrDelta = packet.heartRate - baseline.avgRestingHR
       low: hrDelta < -5
       elevated: hrDelta > +8  (elevated during sleep = thermal discomfort)
       normal: otherwise
    
    4. HRV STATUS:
       good: packet.hrv > baseline.avgHRV * 1.2
       poor: packet.hrv < baseline.avgHRV * 0.7
       moderate: otherwise
    
    5. SpO2 STATUS:
       critical: < 90%
       low: < 94%
       safe: >= 94%
    
    6. THERMAL COMFORT (combine skin temp + HR):
       hot:  skinTempDelta > 1.5  OR  (> 0.8 AND HR elevated)
       warm: skinTempDelta > 0.5
       cold: skinTempDelta < -1.5  OR  SpO2 not safe
       cool: skinTempDelta < -0.5
       comfortable: otherwise
    
    7. OVERALL STRESS (0-100):
       Sum of: hrDelta*3 (if positive) + HRV penalty + SpO2 penalty + comfort penalty
       Clamped 0-100
    
    8. CONFIDENCE:
       0.9 if HR 30-200 AND SpO2 70-100 AND skinTemp 20-45 (plausible range)
       0.4 otherwise (ignore this reading)
  </action>
  <verify>
    interpretPacket with skinTempDelta +1.8°C + elevated HR → thermalComfort = 'hot'
    interpretPacket with SpO2 = 91 → spO2Status = 'low'
  </verify>
  <done>Raw biometric packets are transformed into actionable thermal comfort signals</done>
</task>

<task type="create">
  <name>Build BiometricDecisionEngine — the core AC adjustment logic</name>
  <files>SmartACApp/src/services/biometricACEngine.ts</files>
  <action>
    BiometricDecisionEngine class with internal state:
    
    State:
      consecutiveWarmReadings = 0
      consecutiveColdReadings = 0
      lastAdjustmentTime = 0
      MIN_ADJUSTMENT_INTERVAL = 15 * 60 * 1000 (15 min)
      userOverrideActive = false
      userOverrideExpiry = 0
    
    makeDecision(signal, currentACState, sleepStage) → ACDecision:
    
    Priority chain (first match wins):
    
    0. LOW CONFIDENCE (< 0.6): → no action, reason 'low_confidence'
    
    1. SpO2 CRITICAL (< 90%): → IMMEDIATELY temp_up +2°C, urgency 'high'
       "SpO2 critically low — raising AC temp for safety"
    
    2. SpO2 LOW (< 94%): → temp_up +1°C, urgency 'medium'
       "SpO2 below safe floor — gentle temp raise"
    
    3. USER OVERRIDE active: → no action, reason 'user_override'
    
    4. RATE LIMITED (< 15 min since last): → no action, reason 'rate_limited'
    
    5. DEEP SLEEP: only act on extreme signals (hot or cold, not warm/cool)
    
    6. TOO WARM (warm or hot):
       consecutiveWarmReadings++
       If >= 2 consecutive: → makeWarmAdjustment()
    
    7. TOO COOL (cool or cold):
       consecutiveColdReadings++
       If >= 2 consecutive: → makeCoolAdjustment()
    
    8. COMFORTABLE: reset counters, no action
    
    makeWarmAdjustment(state, sleepStage, signal):
      Reset counter + set lastAdjustmentTime
      Prefer fan increase over temp decrease (quieter, less disruptive)
      If 'warm' and fan can increase → fan_up
      Else → temp_down: 2°C for 'hot', 1°C for 'warm' (min 16°C)
    
    makeCoolAdjustment(state, sleepStage, signal):
      Reset counter + set lastAdjustmentTime
      During REM + SpO2 safe → no action (natural body temp drop)
      Else → temp_up +1°C (max 30°C)
    
    setUserOverride(durationMinutes):
      Set flags, calculate expiry timestamp
  </action>
  <verify>
    2 consecutive warm signals → returns temp_down action
    SpO2 89% → IMMEDIATELY returns temp_up urgency high
    REM sleep + cold signal → returns 'none' (natural drop)
    User override active → returns 'none'
  </verify>
  <done>Decision engine applies conservative, safe, rate-limited AC adjustments based on biometric signals</done>
</task>

<task type="create">
  <name>Build BiometricACEngine — main orchestrator wiring everything together</name>
  <files>SmartACApp/src/services/biometricACEngine.ts</files>
  <action>
    BiometricACEngine class — the top-level controller:
    
    Members:
      interpreter = new SignalInterpreter()
      decisionEngine = new BiometricDecisionEngine()
      packetHistory: BiometricPacket[] = []
      baseline: PersonalBaseline | null
      nightLog: Array<{ time, decision, signal }> = []
      watchEventEmitter: NativeEventEmitter (from NativeModules.WatchBridge)
      isMonitoring = false
    
    startSleepMonitoring(deviceId):
      Set isMonitoring, clear logs
      Load baseline from AsyncStorage
      Subscribe to 'WatchBiometricUpdate' event → processPacket()
      Send 'START_SLEEP_MONITOR' command to watch via WatchBridge
    
    stopSleepMonitoring() → NightReport:
      Unsubscribe events
      Send 'STOP_SLEEP_MONITOR' to watch
      If enough data (>5 packets): update baseline
      Return generateNightReport()
    
    processPacket(packet, deviceId):
      If no baseline → collect data silently, don't act
        After 3 nights (samplesCount >= 3), start acting
      Else:
        interpretPacket → get signal
        getCurrentSleepStage → get sleep stage
        getCurrentACState → get AC state
        makeDecision → get decision
        Log to nightLog
        If shouldAdjust → executeDecision()
    
    executeDecision(decision, currentState, deviceId):
      Map action to AC command:
        temp_down → setACTemp(deviceId, currentTemp - magnitude)
        temp_up → setACTemp(deviceId, currentTemp + magnitude)
        fan_up → setACFanUp(deviceId, currentFan)
        fan_down → setACFanDown(deviceId, currentFan)
      Log adjustment
      Update watch with new AC state via WatchBridge
    
    generateNightReport() → NightReport:
      adjustments = nightLog entries where shouldAdjust=true
      avgSkinTempDelta = average of all signal.skinTempDelta
      thermalComfortScore = (comfortable readings / total) * 100
      grade = scoreToGrade(thermalComfortScore) — A+/A/B+/B/C/D
      insight = generateInsight() — contextual text
    
    AC command methods (use existing connection manager):
      setACTemp → POST /api/local/control/{deviceId}/command with {command:'temperature', value}
      setACFanUp/Down → POST with {command:'fanSpeed', value: next/prev speed}
    
    Export NightReport interface.
  </action>
  <verify>
    startSleepMonitoring → subscribes to watch events
    Mock warm packet twice → AC cools by 1°C
    stopSleepMonitoring → returns NightReport with correct adjustment count
    TypeScript compiles clean
  </verify>
  <done>Full biometric-to-AC pipeline: watch data → signal interpretation → decision → AC command → night report</done>
</task>
