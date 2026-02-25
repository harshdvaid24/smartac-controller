# PHASE 7 — AI Intelligence Layer

## Goal
Embed a full AI intelligence layer into SmartAC using entirely free/on-device resources.
Seven AI subsystems: natural language control (Ollama), anomaly detection (TensorFlow.js),
sleep pattern learning, AI preset generation (Gemini free tier), weather-aware suggestions,
usage pattern predictor, and a comfort-efficiency reinforcement optimizer.

## Design Language
Inspired by high-contrast editorial mobile UIs — bold rounded cards with deep ink backgrounds,
neon accent slashes (electric mint #00FFB2 + vivid coral #FF5757), chunky tactile buttons
with micro-shadow depth, playful but confident typographic scale, and smooth spring animations
on every interaction. Think: premium health app meets smart home control panel.

Color Palette:
- Background: #0A0A0F (near-black ink)
- Surface: #13131A (card base)
- Surface-2: #1E1E2A (elevated card)
- Accent-Primary: #00FFB2 (electric mint — AI actions)
- Accent-Secondary: #FF5757 (coral — warnings/anomalies)
- Accent-Tertiary: #7B61FF (violet — predictions/ML)
- Text-Primary: #F0F0FF (near-white)
- Text-Muted: #6B6B8A (mid-gray)

Typography:
- Display: Clash Display (bold, wide)
- Body: DM Sans (clean, readable)
- Mono: JetBrains Mono (data/numbers)

---

## Requirements Covered
AI-R1: Natural Language Control (Ollama — free, local)
AI-R2: Anomaly Detection (TensorFlow.js — free, on-device)
AI-R3: Sleep Pattern Learning (on-device ML — free)
AI-R4: AI Preset Generator (Google Gemini API — free tier)
AI-R5: Weather-Aware AI Suggestions (OpenWeatherMap — free tier already in Phase 6)
AI-R6: Usage Pattern Predictor (on-device, SQLite-trained — free)
AI-R7: Comfort-Efficiency Optimizer (RL loop — free, local)

## Dependencies
Phase 1A (Backend + SQLite), Phase 2 (RN App), Phase 4 (Presets), Phase 5 (Analytics), Phase 6 (Comfort Score + Weather)

---

## Prompts

### Prompt 7-1: Ollama Natural Language AC Control

```
You are adding natural language AC control to SmartAC using Ollama (free, local LLM).

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/ and SmartACApp/

DESIGN STYLE:
- AI chat input: pill-shaped frosted input at bottom of device control screen
- Chips float above showing recent commands: "make it cooler", "sleep mode", "save energy"
- Parsed command animates visually: settings sliders jump to new values with spring physics
- Color feedback: green flash = executed, red flash = not understood
- Use Clash Display for command result labels, DM Sans for suggestions

TASK: Build natural language command processing

BACKEND SETUP:
1. Ensure Ollama is installed locally (document steps — it's free, no API key):
   curl -fsSL https://ollama.ai/install.sh | sh
   ollama pull llama3.2:3b  # Small, fast, free model
   
   # Ollama runs on http://localhost:11434 by default

2. Create lib/nlp-controller.js:

```js
const SYSTEM_PROMPT = `You are an AI assistant for a Smart AC controller app.
The user will give you natural language commands about their air conditioner.
Parse the command and return ONLY a JSON object with these fields:

{
  "action": "set_temp" | "set_mode" | "set_fan" | "set_special" | "turn_on" | "turn_off" | "apply_preset",
  "values": {
    "temp": 24,              // if action is set_temp (16-30)
    "mode": "cool",          // if action is set_mode  
    "fan": "low",            // if action is set_fan
    "specialMode": "sleep",  // if action is set_special
    "preset": "ultra-saver"  // if action is apply_preset
  },
  "confidence": 0.95,        // 0.0 to 1.0
  "explanation": "Setting temperature to 24°C for energy savings",
  "understood": true
}

Available modes: cool, heat, auto, dry, wind
Available fan speeds: auto, low, medium, high, turbo
Available special modes: off, quiet, sleep, windFree, windFreeSleep, speed, eco

Examples:
"make it cooler but save energy" → { action: "set_temp", values: { temp: 24 }, confidence: 0.82, explanation: "Balanced cooling at 24°C" }
"sleep mode now" → { action: "set_special", values: { specialMode: "sleep" }, confidence: 0.99 }
"it's really hot in here" → { action: "set_temp", values: { temp: 20 }, confidence: 0.75 }
"night mode" → { action: "apply_preset", values: { preset: "ultra-saver" }, confidence: 0.9 }

Respond ONLY with JSON. No markdown, no explanation outside the JSON.`;

async function parseNaturalCommand(userText, deviceCapabilities) {
  // Build context-aware prompt including this device's available modes
  const contextPrompt = `Device capabilities: modes=${deviceCapabilities.modes.join(',')}, 
    fanSpeeds=${deviceCapabilities.fanSpeeds.join(',')}, 
    specialModes=${deviceCapabilities.specialModes.join(',')}
    
    Command: "${userText}"`;
  
  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.2:3b',
      prompt: SYSTEM_PROMPT + '\n\n' + contextPrompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 200 }
    })
  });
  
  const data = await response.json();
  return JSON.parse(data.response);
}

module.exports = { parseNaturalCommand };
```

3. Add backend endpoint:
POST /api/ai/command
Body: { text: "make it cooler", deviceId: "xxx" }
Steps:
  a. Get device capabilities from /api/devices/:id/capabilities
  b. Call parseNaturalCommand(text, capabilities)
  c. If understood → execute the command via SmartThings proxy
  d. Log event to SQLite
  e. Return: { parsed, executed, result }

4. REACT NATIVE — Create src/components/AICommandInput.tsx:

DESIGN:
- Fixed bottom position on DeviceControlScreen (above preset row)
- Pill-shaped input: background #1E1E2A, border 1px solid rgba(0,255,178,0.3)
- Left: sparkle icon (✨) in mint green
- Input text: DM Sans 14px, #F0F0FF
- Right: mic icon (🎤) for voice input via device speech recognition
- Placeholder: "Ask AI anything... "make it sleep mode""
- Border glows mint (0 0 12px rgba(0,255,178,0.4)) when focused

SUGGESTION CHIPS (above input):
- Horizontal scroll: "🌙 Night mode" · "❄️ Cooler" · "⚡ Save energy" · "💤 Sleep"
- Chips: rounded-full, bg #1E1E2A, border rgba(0,255,178,0.2), text mint
- Tap chip → fills input + submits

RESULT DISPLAY:
- After command executed: slide-up banner from input
- Background: success=#00FFB2/10, error=#FF5757/10
- Shows: parsed command + explanation text
- Auto-dismisses after 3 seconds with fade
- Each slider/button on device control screen animates to new value with spring

LOADING STATE:
- Input border pulses mint while processing
- Sparkle icon spins
- "Thinking..." text in muted gray

OFFLINE STATE (Ollama not running):
- Shows: "AI offline — Ollama not running locally"
- Link to setup instructions

VERIFY:
1. Type "make it cooler" → Ollama parses → temp drops to 20-22°C
2. Type "sleep mode" → special mode sets to sleep/windFreeSleep
3. Suggestion chip tap → executes command
4. Unknown command → "I didn't understand that" with suggestions
```

---

### Prompt 7-2: TensorFlow.js Anomaly Detection

```
You are adding AI anomaly detection to SmartAC using TensorFlow.js (free, on-device).

WORKING DIRECTORY: SmartACApp/

DESIGN STYLE:
- Anomaly alert: bottom sheet sliding up with coral (#FF5757) accent bar at top
- Alert card: deep card bg #13131A, coral left border strip 4px
- Header: ⚠️ + bold "Anomaly Detected" in Clash Display
- Body text: DM Sans, describes the issue plainly
- Trend mini-chart: shows the last 2 hours of temp data in coral
- Two CTA buttons: "Dismiss" (outline) + "Investigate" (coral filled)
- Notification badge: red dot on the Analytics tab icon

INSTALL:
npm install @tensorflow/tfjs@^4 @tensorflow/tfjs-react-native@^0.8

TASK: Build on-device anomaly detection model

FILE: SmartACApp/src/services/anomalyDetector.ts

```ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-react-native';

// ANOMALY TYPES:
// 1. THERMAL DRIFT — room temp not dropping after AC on for 20+ minutes
// 2. POWER SPIKE — estimated wattage suddenly 30%+ higher than baseline
// 3. HUMIDITY SPIKE — humidity rising despite AC running
// 4. NIGHT RUN — AC running at full power between 1-5 AM (likely forgotten on)
// 5. TEMP OSCILLATION — target temp changing >5 times in 30 minutes (unstable)

interface AnomalyResult {
  detected: boolean;
  type: AnomalyType;
  severity: 'info' | 'warning' | 'critical';
  confidence: number;
  description: string;
  suggestion: string;
  dataPoints: number[];  // the values that triggered it
}

export class AnomalyDetector {
  private model: tf.LayersModel | null = null;
  
  // Build a simple autoencoder for time-series anomaly detection
  // Autoencoder learns "normal" patterns; high reconstruction error = anomaly
  async buildModel(): Promise<void> {
    const model = tf.sequential();
    
    // Encoder
    model.add(tf.layers.lstm({
      units: 32,
      inputShape: [20, 4], // 20 timesteps, 4 features: [roomTemp, targetTemp, humidity, estimatedWatts]
      returnSequences: false
    }));
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }));
    
    // Decoder
    model.add(tf.layers.repeatVector({ n: 20 }));
    model.add(tf.layers.lstm({ units: 32, returnSequences: true }));
    model.add(tf.layers.timeDistributed({
      layer: tf.layers.dense({ units: 4, activation: 'linear' })
    }));
    
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError'
    });
    
    this.model = model;
  }
  
  // Train on last 7 days of "normal" usage data from SQLite
  async trainOnHistory(sessions: RuntimeSession[]): Promise<void> {
    if (!this.model) await this.buildModel();
    
    const sequences = this.extractSequences(sessions);
    if (sequences.length < 50) return; // Not enough data yet
    
    const xs = tf.tensor3d(sequences);
    await this.model!.fit(xs, xs, {
      epochs: 20,
      batchSize: 16,
      verbose: 0,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          if (epoch % 5 === 0) console.log(`Training epoch ${epoch}: loss=${logs?.loss.toFixed(4)}`);
        }
      }
    });
    
    xs.dispose();
    
    // Save model to AsyncStorage for persistence
    await this.model!.save('asyncstorage://smartac-anomaly-model');
  }
  
  // Load saved model
  async loadModel(): Promise<boolean> {
    try {
      this.model = await tf.loadLayersModel('asyncstorage://smartac-anomaly-model');
      return true;
    } catch {
      return false;
    }
  }
  
  // Check current readings for anomalies
  async detect(recentReadings: SensorReading[], deviceStatus: DeviceStatus): Promise<AnomalyResult | null> {
    // Rule-based checks first (fast, no ML needed)
    const ruleResult = this.ruleBasedCheck(recentReadings, deviceStatus);
    if (ruleResult) return ruleResult;
    
    // ML-based check if model trained
    if (this.model && recentReadings.length >= 20) {
      return await this.mlBasedCheck(recentReadings);
    }
    
    return null;
  }
  
  private ruleBasedCheck(readings: SensorReading[], status: DeviceStatus): AnomalyResult | null {
    const latest = readings[readings.length - 1];
    const twentyMinAgo = readings[Math.max(0, readings.length - 40)]; // 30s intervals = 20min
    
    // THERMAL DRIFT: AC on, cooling mode, but temp hasn't dropped in 20 min
    if (status.power === 'on' && status.mode === 'cool') {
      const tempDelta = twentyMinAgo.roomTemp - latest.roomTemp;
      if (twentyMinAgo.roomTemp > status.targetTemp + 2 && tempDelta < 0.3) {
        return {
          detected: true,
          type: 'thermal_drift',
          severity: 'warning',
          confidence: 0.87,
          description: `AC has been cooling for 20 minutes but room temp only dropped ${tempDelta.toFixed(1)}°C`,
          suggestion: 'This may indicate a refrigerant issue, blocked filter, or a room that is too large for this AC unit.',
          dataPoints: readings.slice(-40).map(r => r.roomTemp)
        };
      }
    }
    
    // NIGHT RUN: AC full blast between 1-5 AM
    const hour = new Date().getHours();
    if (hour >= 1 && hour <= 5 && status.power === 'on' && status.targetTemp <= 20) {
      return {
        detected: true,
        type: 'night_run',
        severity: 'info',
        confidence: 0.99,
        description: `AC running at ${status.targetTemp}°C at ${hour}:00 AM — likely left on`,
        suggestion: 'Consider setting a 5 AM auto-off schedule to save energy while you sleep.',
        dataPoints: [status.targetTemp]
      };
    }
    
    // HUMIDITY SPIKE: AC on but humidity rising
    if (status.power === 'on' && latest.humidity > 75 && latest.humidity > twentyMinAgo.humidity + 5) {
      return {
        detected: true,
        type: 'humidity_spike',
        severity: 'warning',
        confidence: 0.82,
        description: `Humidity rose ${(latest.humidity - twentyMinAgo.humidity).toFixed(0)}% in 20 min despite AC running`,
        suggestion: 'Try switching to Dry mode for 30 minutes to dehumidify the room.',
        dataPoints: readings.slice(-40).map(r => r.humidity)
      };
    }
    
    return null;
  }
  
  private async mlBasedCheck(readings: SensorReading[]): Promise<AnomalyResult | null> {
    const sequence = this.extractSequences([{ readings }])[0];
    const input = tf.tensor3d([sequence]);
    const reconstructed = this.model!.predict(input) as tf.Tensor;
    
    const original = tf.tensor3d([sequence]);
    const loss = tf.losses.meanSquaredError(original, reconstructed).dataSync()[0];
    
    input.dispose();
    reconstructed.dispose();
    original.dispose();
    
    // Threshold: 2x the training loss is anomalous
    const ANOMALY_THRESHOLD = 0.08;
    if (loss > ANOMALY_THRESHOLD) {
      return {
        detected: true,
        type: 'pattern_anomaly',
        severity: 'info',
        confidence: Math.min(0.99, loss / ANOMALY_THRESHOLD * 0.5),
        description: 'Unusual AC usage pattern detected — this session looks different from your normal patterns.',
        suggestion: 'Review the current settings — they may not be optimal for current conditions.',
        dataPoints: readings.slice(-20).map(r => r.roomTemp)
      };
    }
    
    return null;
  }
  
  private extractSequences(sessions: any[]): number[][][] {
    // Extract 20-step windows of [roomTemp, targetTemp, humidity, watts]
    const sequences: number[][][] = [];
    // ... implementation
    return sequences;
  }
}
```

FILE: SmartACApp/src/components/AnomalyAlert.tsx

DESIGN (bottom sheet):
- Slides up from bottom with spring: translateY 300 → 0, easing spring(0.6, 14, 2)
- Coral top bar: 6px height, full width, rgba(255,87,87,1)
- Header row: "⚠️ Anomaly Detected" (Clash Display 18px, #FF5757) + dismiss X
- Severity badge: rounded chip: critical=coral, warning=orange, info=violet
- Description text: DM Sans 14px, #F0F0FF, lineHeight 22
- Mini sparkline: last 2 hours of anomalous data in coral, built using react-native-svg
- Bottom buttons: "Dismiss" (outline coral) · "Investigate →" (filled coral)
- Auto-dismisses after 15s for 'info', stays for 'warning'/'critical'

INTEGRATION:
- AnomalyDetector runs every 5 minutes via background task
- Stores detected anomalies in SQLite: anomalies table
- Push notification via Notifee for 'warning' and 'critical' severity
- Analytics screen: "Anomaly History" section showing past alerts

TRAINING TRIGGER:
- On app launch: check if model exists → if not and >7 days data → train silently
- Weekly re-training in background task

VERIFY:
1. Simulate thermal drift (set mock data where temp doesn't drop) → alert fires
2. Model trains on 7 days history without crashing
3. Alert bottom sheet slides up with correct data
4. Dismiss + push notification both work
```

---

### Prompt 7-3: Sleep Pattern Learning Engine

```
You are building an on-device sleep pattern learning engine for SmartAC. Free, no external API.

WORKING DIRECTORY: SmartACApp/src/services/

DESIGN STYLE:
- Pattern insight card: violet (#7B61FF) gradient card on Analytics screen
- "🧠 AI Learned" label in mono font at top-left of card
- Shows discovered patterns as clean stat rows:
  "You typically sleep at 24°C on weekdays"
  "Weekend nights: you prefer 22°C"
  "Your sleep sessions average 7.2 hours"
- "Apply this pattern" button: violet filled, full-width
- Subtle brain/circuit pattern as card background texture (SVG)

FILE: SmartACApp/src/services/sleepLearner.ts

```ts
// Sleep Pattern Learning — pure TypeScript, no external ML lib needed
// Uses statistical analysis on SQLite data to find patterns

interface SleepPattern {
  avgBedtime: string;        // "22:15"
  avgWakeTime: string;       // "06:30"
  avgNightTemp: number;      // 23.5
  weekdayTemp: number;
  weekendTemp: number;
  avgFanSpeed: string;       // "low"
  avgSpecialMode: string;    // "windFreeSleep"
  avgDuration: number;       // minutes
  preferredMode: string;
  consistency: number;       // 0-1, how consistent are the patterns
  dataPoints: number;        // how many sessions were analyzed
  weekdayPattern: DayPattern;
  weekendPattern: DayPattern;
  seasonalAdjustment: {
    summer: number;          // temp delta for summer (+2 = use 2°C higher in summer)
    winter: number;          // temp delta for winter
  };
}

interface DayPattern {
  avgStartHour: number;
  avgTemp: number;
  avgFan: string;
  avgDuration: number;
  confidence: number;
}

export class SleepLearner {
  
  // Analyze all sessions between 9 PM and 8 AM as "sleep sessions"
  async analyzePatterns(deviceId: string): Promise<SleepPattern | null> {
    const sessions = await this.getSleepSessions(deviceId);
    if (sessions.length < 5) return null; // Need min 5 sessions to learn
    
    const pattern: SleepPattern = {
      avgBedtime: this.calculateMeanTime(sessions.map(s => s.startTime)),
      avgWakeTime: this.calculateMeanTime(sessions.map(s => s.endTime)),
      avgNightTemp: this.mean(sessions.map(s => s.avgTemp)),
      
      weekdayTemp: this.mean(
        sessions.filter(s => this.isWeekday(s.startTime)).map(s => s.avgTemp)
      ),
      weekendTemp: this.mean(
        sessions.filter(s => !this.isWeekday(s.startTime)).map(s => s.avgTemp)
      ),
      
      avgFanSpeed: this.mode(sessions.map(s => s.fanSpeed)),
      avgSpecialMode: this.mode(sessions.map(s => s.specialMode)),
      avgDuration: this.mean(sessions.map(s => s.durationMinutes)),
      preferredMode: this.mode(sessions.map(s => s.mode)),
      
      consistency: this.calculateConsistency(sessions),
      dataPoints: sessions.length,
      
      weekdayPattern: this.extractDayPattern(sessions.filter(s => this.isWeekday(s.startTime))),
      weekendPattern: this.extractDayPattern(sessions.filter(s => !this.isWeekday(s.startTime))),
      
      seasonalAdjustment: this.calculateSeasonalAdjustment(sessions)
    };
    
    // Save learned pattern to SQLite
    await this.savePattern(deviceId, pattern);
    
    return pattern;
  }
  
  // Generate a preset from learned pattern
  generateSmartPreset(pattern: SleepPattern, capabilities: DeviceCapabilities): Preset {
    const today = new Date();
    const isWeekend = today.getDay() === 0 || today.getDay() === 6;
    const currentMonth = today.getMonth(); // 0-11
    
    // Seasonal adjustment (India: hot = March-June, cool = Dec-Feb)
    let tempAdjust = 0;
    if (currentMonth >= 2 && currentMonth <= 5) tempAdjust = pattern.seasonalAdjustment.summer;
    if (currentMonth === 11 || currentMonth <= 1) tempAdjust = pattern.seasonalAdjustment.winter;
    
    const baseTemp = isWeekend ? pattern.weekendTemp : pattern.weekdayTemp;
    const adjustedTemp = Math.round(Math.max(16, Math.min(30, baseTemp + tempAdjust)));
    
    return {
      id: 'ai-learned-sleep',
      name: '🧠 AI Sleep',
      icon: '🧠',
      description: `Learned from your ${pattern.dataPoints} sleep sessions`,
      temp: adjustedTemp,
      mode: pattern.preferredMode,
      fan: pattern.avgFanSpeed,
      specialMode: capabilities.specialModes.includes(pattern.avgSpecialMode)
        ? pattern.avgSpecialMode
        : pickBestEcoMode(capabilities.specialModes),
      estimatedWattage: 0, // calculated elsewhere
      isCustom: false,
      isAiGenerated: true,
      confidence: pattern.consistency,
      lastUpdated: new Date().toISOString()
    };
  }
  
  // Statistical helpers
  private mean(values: number[]): number {
    return values.reduce((a, b) => a + b, 0) / values.length;
  }
  
  private mode<T>(values: T[]): T {
    const counts = new Map<T, number>();
    values.forEach(v => counts.set(v, (counts.get(v) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  
  private calculateMeanTime(times: string[]): string {
    // Convert HH:MM to minutes, average, convert back
    const minutes = times.map(t => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    });
    const avgMinutes = Math.round(this.mean(minutes));
    const h = Math.floor(avgMinutes / 60) % 24;
    const m = avgMinutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  
  private calculateConsistency(sessions: any[]): number {
    const temps = sessions.map(s => s.avgTemp);
    const stdDev = Math.sqrt(
      temps.map(t => Math.pow(t - this.mean(temps), 2)).reduce((a, b) => a + b, 0) / temps.length
    );
    // StdDev of 0 = perfectly consistent (1.0), StdDev of 5+ = very inconsistent (0.0)
    return Math.max(0, 1 - stdDev / 5);
  }
  
  private calculateSeasonalAdjustment(sessions: any[]): { summer: number; winter: number } {
    const summerSessions = sessions.filter(s => {
      const m = new Date(s.startTime).getMonth();
      return m >= 2 && m <= 5;
    });
    const winterSessions = sessions.filter(s => {
      const m = new Date(s.startTime).getMonth();
      return m === 11 || m <= 1;
    });
    const allAvgTemp = this.mean(sessions.map(s => s.avgTemp));
    return {
      summer: summerSessions.length > 2 ? this.mean(summerSessions.map(s => s.avgTemp)) - allAvgTemp : 0,
      winter: winterSessions.length > 2 ? this.mean(winterSessions.map(s => s.avgTemp)) - allAvgTemp : 0
    };
  }
}
```

REACT NATIVE — LearnedPatternCard.tsx:

DESIGN (card on Analytics screen):
- Gradient: linear from #7B61FF to #4A3FCC, 160px tall
- Top-left: "🧠 AI LEARNED" chip (mono font 10px, violet/20 bg, violet border)
- Main stat: "You sleep best at 23°C" (Clash Display 22px, white)
- Sub stats row: icons + values in DM Sans 12px
  🕙 Bedtime: 10:15 PM · ⏰ Wake: 6:30 AM · 📊 Confidence: 87%
- Bottom: "Apply tonight →" button (white/15 bg, white border, rounded)
- If not enough data: "Analyzing 5+ nights... (3/5 collected)" with progress dots

WHEN TO RUN:
- After each sleep session ends → re-analyze patterns
- Min 5 sessions before showing pattern
- Update weekly
- Show "🧠 AI Sleep" as a special preset after 5 sessions

VERIFY:
1. After 5 mock sleep sessions → pattern generated
2. LearnedPatternCard shows correct avg bedtime, temp
3. "Apply tonight" creates a preset with learned settings
4. Weekday vs weekend temps differ if usage differs
```

---

### Prompt 7-4: Google Gemini AI Preset Generator

```
You are adding AI-generated preset descriptions using Google Gemini API free tier.

WORKING DIRECTORY: SmartACApp/src/

DESIGN STYLE:
- Gemini-generated content has a special "✨ AI" badge (mint green, small pill)
- Preset description text in italics DM Sans — feels more "written", less generic
- Generation loading state: shimmer on the description area
- Regenerate button: tiny circular refresh icon in mint green next to description
- Generated descriptions are warmer, context-aware: "Perfect for humid Mumbai nights"

FREE TIER USAGE: 
- Gemini 2.0 Flash: 15 requests/minute, 1 million tokens/day FREE
- No credit card required
- API key: get from https://aistudio.google.com/ (free)

INSTALL:
npm install @google/generative-ai@^0.24  # Official Gemini JS SDK (latest)

FILE: SmartACApp/src/services/geminiPresets.ts

```ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

interface PresetGenerationContext {
  deviceBrand: string;
  deviceModel: string;
  currentTemp: number;
  currentHumidity: number;
  timeOfDay: string;       // "morning" | "afternoon" | "evening" | "night"
  season: string;          // "summer" | "monsoon" | "winter" | "spring"
  city: string;            // "Mumbai" | "Delhi" | etc
  existingPresets: string[]; // names of existing presets
  userPreferences?: {
    prefersCooler: boolean;
    energyConscious: boolean;
    likesQuietMode: boolean;
  }
}

// Generate a SINGLE creative preset with AI-crafted name + description
export async function generatePresetDescription(
  preset: Preset,
  context: PresetGenerationContext
): Promise<{ name: string; description: string; tags: string[] }> {
  
  const prompt = `You are helping a smart AC app user in ${context.city}, India understand their AC preset.
  
Current conditions:
- Outside: ${context.season}, ${context.timeOfDay}
- Room temp: ${context.currentTemp}°C, humidity: ${context.currentHumidity}%
- AC brand: ${context.deviceBrand}
- Preset settings: ${preset.temp}°C, ${preset.mode} mode, ${preset.fan} fan, ${preset.specialMode || 'no'} special mode

Write a SHORT, warm, context-aware preset description (max 12 words) that makes this preset feel personal and useful.
Then write a one-sentence explanation (max 20 words) of WHY this preset is good right now.
Also suggest 2-3 emoji tags that describe this preset.

Respond ONLY in JSON:
{
  "name": "Mumbai Monsoon Night",
  "description": "Cool comfort for humid evenings",
  "explanation": "Perfect for tonight — high humidity means 26°C feels cooler than usual.",
  "tags": ["🌧️", "💤", "💚"]
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  
  // Strip markdown if present
  const clean = text.replace(/```json|```/g, '').trim();
  return JSON.parse(clean);
}

// Generate a complete set of 4 presets for a new device
export async function generateDevicePresets(
  capabilities: DeviceCapabilities,
  context: PresetGenerationContext
): Promise<GeneratedPreset[]> {
  
  const prompt = `Create 4 smart AC presets for a ${context.deviceBrand} AC in ${context.city} during ${context.season}.

Device capabilities: 
- Modes: ${capabilities.modes.join(', ')}
- Fan speeds: ${capabilities.fanSpeeds.join(', ')}
- Special modes: ${capabilities.specialModes.join(', ')}
- Temp range: ${capabilities.temperature.min}-${capabilities.temperature.max}°C

Design these 4 presets:
1. ULTRA SAVER — for maximum energy savings
2. NIGHT COMFORT — for sleeping
3. QUICK COOL — for when it's very hot
4. A CUSTOM SEASONAL PRESET — creative, specific to ${context.season} in ${context.city}

For each preset respond with creative, local-flavor naming. ONLY JSON array:
[
  {
    "id": "ultra-saver",
    "name": "₹ Power Saver",
    "icon": "💰",
    "description": "Saves ₹15 per night",
    "temp": 26,
    "mode": "cool",
    "fan": "low",
    "specialMode": "windFreeSleep",
    "story": "Designed for Indian summers — 26°C with gentle airflow feels surprisingly comfortable when humidity drops at night."
  }
]`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json|```/g, '').trim();
  return JSON.parse(text);
}

// Rate-limit wrapper (15 req/min free tier)
const requestQueue: Array<() => Promise<any>> = [];
let lastRequestTime = 0;
const MIN_INTERVAL = 4100; // 4.1 seconds = ~14.6 req/min (safe under 15/min limit)

export async function queueGeminiRequest<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    requestQueue.push(async () => {
      const now = Date.now();
      const wait = Math.max(0, MIN_INTERVAL - (now - lastRequestTime));
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
      lastRequestTime = Date.now();
      try { resolve(await fn()); }
      catch (e) { reject(e); }
    });
    if (requestQueue.length === 1) processQueue();
  });
}
```

REACT NATIVE — AIPresetStory.tsx:
Shows the Gemini-generated "story" text for a preset as a small expandable section:

DESIGN:
- Below preset description: "✨ Why this preset?" expandable row
- Expands to show Gemini's story text in DM Sans italic 13px, muted text
- "✨ AI" pill badge in mint green (3px border-radius, 8px padding)
- Regenerate button: circular refresh ↻ in mint green (calls Gemini again)
- Generation loading: 3-dot pulse animation in mint

BACKEND PROXY (to protect API key):
- Add POST /api/ai/generate-preset to backend
- Keep GEMINI_API_KEY in .env (never expose to RN bundle)
- Backend calls Gemini SDK, returns result to app

VERIFY:
1. New device added → Gemini generates 4 preset descriptions
2. Mumbai summer context → descriptions mention heat/humidity
3. Rate limiter prevents >15 requests/minute
4. API key in .env, not exposed in React Native bundle
```

---

### Prompt 7-5: Weather-Aware AI Suggestion Engine

```
You are building the weather-aware AI suggestion engine for SmartAC.

WORKING DIRECTORY: SmartACApp/src/services/

DESIGN STYLE:
- Weather AI cards: tall cards with weather gradient backdrop
  * Hot: #FF5757 → #FF8C42 gradient
  * Humid: #7B61FF → #4A90E2 gradient
  * Cool: #00FFB2 → #0066FF gradient
  * Rain: #4A90E2 → #2C3E8F gradient
- Card has large weather emoji (64px) + conditions
- AI insight text: Clash Display 16px, bold, white
- "Apply suggestion" CTA: white pill button
- Animated: card slides in from right edge when suggestion is ready

FILE: SmartACApp/src/services/weatherAI.ts

```ts
interface WeatherConditions {
  outsideTemp: number;
  outsideHumidity: number;
  condition: 'clear' | 'cloudy' | 'rain' | 'thunderstorm' | 'fog' | 'haze';
  uvIndex: number;
  windSpeed: number;
  forecast: ForecastItem[];
  feelsLike: number;
  city: string;
}

interface WeatherSuggestion {
  id: string;
  priority: number;           // 1-10
  trigger: string;            // what caused this suggestion
  headline: string;           // short, impactful (Clash Display)
  explanation: string;        // why (DM Sans)
  action: PresetAction;       // what to do
  gradient: [string, string]; // card gradient colors
  emoji: string;
  estimatedSavings?: string;  // "saves ~₹8 tonight"
}

export function generateWeatherSuggestions(
  weather: WeatherConditions,
  deviceStatus: DeviceStatus,
  userSchedules: Schedule[],
  comingHomeTime?: string
): WeatherSuggestion[] {
  const suggestions: WeatherSuggestion[] = [];
  const hour = new Date().getHours();
  
  // 1. EXTREME HEAT PRECOOL
  if (weather.outsideTemp > 36 && comingHomeTime) {
    const homeHour = parseInt(comingHomeTime.split(':')[0]);
    const precoolHour = homeHour - 1;
    if (Math.abs(hour - precoolHour) < 2) {
      suggestions.push({
        id: 'precool',
        priority: 9,
        trigger: `outside_temp:${weather.outsideTemp}`,
        headline: `${weather.outsideTemp}°C outside`,
        explanation: `Start cooling now — room will reach 24°C right when you arrive at ${comingHomeTime}.`,
        action: { type: 'schedule_start', time: `${precoolHour}:00`, preset: 'turbo-cool' },
        gradient: ['#FF5757', '#FF8C42'],
        emoji: '🔥',
        estimatedSavings: 'room ready in 45 min'
      });
    }
  }
  
  // 2. SKIP AC — PLEASANT OUTSIDE
  if (weather.outsideTemp < 24 && weather.outsideHumidity < 60 && deviceStatus.power === 'on') {
    suggestions.push({
      id: 'skip-ac',
      priority: 8,
      trigger: 'pleasant_weather',
      headline: 'Perfect window weather',
      explanation: `It's ${weather.outsideTemp}°C outside. Opening windows might be more comfortable than AC.`,
      action: { type: 'turn_off' },
      gradient: ['#00FFB2', '#0066FF'],
      emoji: '🌬️',
      estimatedSavings: 'saves ~₹12 this session'
    });
  }
  
  // 3. MONSOON HUMIDITY
  if (weather.outsideHumidity > 80 && weather.condition === 'rain') {
    suggestions.push({
      id: 'monsoon-dry',
      priority: 7,
      trigger: 'monsoon',
      headline: 'Monsoon humidity alert',
      explanation: 'High outdoor humidity will seep inside. Dry mode for 30 min prevents mold and stuffiness.',
      action: { type: 'set_mode', mode: 'dry', duration: 30 },
      gradient: ['#7B61FF', '#4A90E2'],
      emoji: '🌧️'
    });
  }
  
  // 4. OVERNIGHT COOL DOWN (natural cooling)
  const forecast = weather.forecast;
  const nextMorningTemp = forecast.find(f => {
    const h = new Date(f.time).getHours();
    return h >= 5 && h <= 7;
  })?.temp;
  
  if (nextMorningTemp && nextMorningTemp < 22 && deviceStatus.targetTemp < 24) {
    suggestions.push({
      id: 'raise-overnight',
      priority: 6,
      trigger: 'cool_forecast',
      headline: 'Natural cooling tonight',
      explanation: `Forecast: ${nextMorningTemp}°C at dawn. Raise your AC to 26°C — it won't need to work as hard.`,
      action: { type: 'set_temp', temp: 26 },
      gradient: ['#00FFB2', '#0066FF'],
      emoji: '🌙',
      estimatedSavings: 'saves ~₹6 overnight'
    });
  }
  
  // 5. UV / HEAT LOAD
  if (weather.uvIndex > 8 && hour >= 11 && hour <= 15) {
    suggestions.push({
      id: 'peak-heat',
      priority: 8,
      trigger: `uv:${weather.uvIndex}`,
      headline: 'Peak sun hours',
      explanation: `UV index ${weather.uvIndex}. Close curtains to cut heat load by ~30% — then your AC does less work.`,
      action: { type: 'suggest_action', message: 'Close south-facing curtains' },
      gradient: ['#FF8C42', '#FFD700'],
      emoji: '☀️',
      estimatedSavings: 'reduces AC load ~30%'
    });
  }
  
  // 6. POST-RAIN TEMPERATURE DROP
  if (weather.condition === 'rain' && weather.outsideTemp < deviceStatus.targetTemp - 2) {
    suggestions.push({
      id: 'post-rain',
      priority: 7,
      trigger: 'rain_cooling',
      headline: 'Rain is cooling things down',
      explanation: `Outside dropped to ${weather.outsideTemp}°C. Raise your AC target by 2°C for same comfort, less energy.`,
      action: { type: 'adjust_temp', delta: +2 },
      gradient: ['#4A90E2', '#2C3E8F'],
      emoji: '🌧️',
      estimatedSavings: 'saves ~₹4 per hour'
    });
  }
  
  return suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3);
}
```

REACT NATIVE — WeatherAICard.tsx:

Full-width card with gradient, animated entrance, shown on HomeScreen:
- Card animates in from right (translateX: screen_width → 0) with spring
- Weather emoji bounces on entrance
- Headline in Clash Display 20px, white
- Explanation in DM Sans 14px, white/80
- Savings badge: small pill with white/20 bg, "saves ~₹8 tonight" text
- CTA button at bottom: white/15 bg, rounded, "Apply →"
- Dismiss: X button top right; swiping card right dismisses
- Multiple suggestions: horizontal scroll, dot indicators

INTEGRATION:
- WeatherService (Phase 6) runs every 30 min
- On new weather data → generateWeatherSuggestions runs
- Suggestions stored in Zustand store
- HomeScreen subscribes and shows top suggestion as banner

VERIFY:
1. Mock 38°C weather → precool suggestion appears
2. Mock rain → monsoon dry mode suggestion
3. "Apply" → executes the suggested AC change
4. Swipe to dismiss → suggestion gone for 4 hours
```

---

### Prompt 7-6: Usage Pattern Predictor

```
You are building the usage pattern predictor for SmartAC. No external API — runs on SQLite data.

WORKING DIRECTORY: SmartACApp/src/services/

DESIGN STYLE:
- Prediction cards: distinct from regular UI — left border stripe in violet #7B61FF
- Header: "📊 Pattern Detected" in violet, DM Sans bold
- Prediction text: large, confident: "You'll turn on AC at 10:00 PM tonight"
- Confidence bar: thin horizontal bar, violet fill width = confidence %
- Action buttons: "Create schedule" (violet filled) · "Ignore" (outline)
- Subtle dotted background pattern on card bg

FILE: SmartACApp/src/services/patternPredictor.ts

```ts
interface UsagePattern {
  type: 'daily_routine' | 'weekly_cycle' | 'temp_trigger' | 'duration_pattern';
  description: string;
  confidence: number;       // 0-1
  prediction: {
    nextOccurrence: Date;
    suggestedAction: string;
    suggestedPreset?: string;
    suggestedTemp?: number;
  };
  evidence: {
    occurrences: number;    // how many times we've seen this
    lastSeen: Date;
    consistency: number;    // how consistent the timing is
  };
}

export class PatternPredictor {
  
  async analyzeAllPatterns(deviceId: string): Promise<UsagePattern[]> {
    const sessions = await this.getAllSessions(deviceId);
    const events = await this.getAllEvents(deviceId);
    
    const patterns: UsagePattern[] = [];
    
    // 1. DAILY ON-TIME: Do they turn on AC at a consistent time each day?
    const dailyOnPattern = this.findDailyOnPattern(sessions);
    if (dailyOnPattern) patterns.push(dailyOnPattern);
    
    // 2. TEMP ADJUSTMENT: Do they always bump the temp up after X minutes?
    const tempAdjust = this.findTempAdjustmentPattern(events);
    if (tempAdjust) patterns.push(tempAdjust);
    
    // 3. BEDTIME ROUTINE: Consistent sleep session start?
    const bedtime = this.findBedtimePattern(sessions);
    if (bedtime) patterns.push(bedtime);
    
    // 4. DURATION: Do they always run for ~N hours?
    const duration = this.findDurationPattern(sessions);
    if (duration) patterns.push(duration);
    
    // 5. WEEKEND DIFFERENCE: Different usage on weekends?
    const weekend = this.findWeekendPattern(sessions);
    if (weekend) patterns.push(weekend);
    
    return patterns.filter(p => p.confidence > 0.65);
  }
  
  private findDailyOnPattern(sessions: RuntimeSession[]): UsagePattern | null {
    // Group session start times by weekday
    const byHour = sessions.map(s => new Date(s.startedAt).getHours() + new Date(s.startedAt).getMinutes() / 60);
    
    // Find clustering: are >70% of start times within 1.5 hours of each other?
    const sortedHours = byHour.sort((a, b) => a - b);
    
    // Sliding window to find densest cluster
    let bestClusterCount = 0;
    let bestClusterCenter = 0;
    for (const hour of sortedHours) {
      const windowCount = sortedHours.filter(h => Math.abs(h - hour) <= 0.75).length;
      if (windowCount > bestClusterCount) {
        bestClusterCount = windowCount;
        bestClusterCenter = hour;
      }
    }
    
    const confidence = bestClusterCount / sessions.length;
    if (confidence < 0.65 || sessions.length < 5) return null;
    
    const avgHour = Math.floor(bestClusterCenter);
    const avgMinute = Math.round((bestClusterCenter - avgHour) * 60);
    const timeStr = `${avgHour.toString().padStart(2, '0')}:${avgMinute.toString().padStart(2, '0')}`;
    
    // When is the next occurrence?
    const now = new Date();
    const next = new Date();
    next.setHours(avgHour, avgMinute, 0, 0);
    if (next < now) next.setDate(next.getDate() + 1);
    
    return {
      type: 'daily_routine',
      description: `You usually turn on your AC around ${timeStr}`,
      confidence,
      prediction: {
        nextOccurrence: next,
        suggestedAction: `Activate AC at ${timeStr} tomorrow`,
        suggestedPreset: avgHour >= 21 || avgHour <= 6 ? 'ultra-saver' : 'balanced'
      },
      evidence: {
        occurrences: sessions.length,
        lastSeen: new Date(sessions[sessions.length - 1].startedAt),
        consistency: confidence
      }
    };
  }
  
  private findTempAdjustmentPattern(events: UsageEvent[]): UsagePattern | null {
    // Find cases where: temp_change event happened within 30 minutes of power_on
    const powerOnEvents = events.filter(e => e.eventType === 'power_on');
    const tempChanges = events.filter(e => e.eventType === 'temp_change');
    
    let adjustmentsWithin30min = 0;
    let avgDeltaMinutes = 0;
    let avgTempDelta = 0;
    
    powerOnEvents.forEach(onEvent => {
      const nearbyChange = tempChanges.find(tc => {
        const diff = (new Date(tc.createdAt).getTime() - new Date(onEvent.createdAt).getTime()) / 60000;
        return diff > 0 && diff < 30;
      });
      if (nearbyChange) {
        adjustmentsWithin30min++;
        const details = JSON.parse(nearbyChange.details || '{}');
        avgTempDelta += (details.newTemp || 24) - (details.oldTemp || 18);
        avgDeltaMinutes += (new Date(nearbyChange.createdAt).getTime() - new Date(onEvent.createdAt).getTime()) / 60000;
      }
    });
    
    if (adjustmentsWithin30min < 4) return null;
    const confidence = adjustmentsWithin30min / powerOnEvents.length;
    if (confidence < 0.6) return null;
    
    avgDeltaMinutes /= adjustmentsWithin30min;
    avgTempDelta /= adjustmentsWithin30min;
    
    return {
      type: 'temp_trigger',
      description: `You always raise the temp by ${avgTempDelta.toFixed(0)}°C after ${avgDeltaMinutes.toFixed(0)} min`,
      confidence,
      prediction: {
        nextOccurrence: new Date(Date.now() + avgDeltaMinutes * 60000),
        suggestedAction: 'Start at your adjusted temp instead',
        suggestedTemp: 24 // calculate from avg
      },
      evidence: {
        occurrences: adjustmentsWithin30min,
        lastSeen: new Date(),
        consistency: confidence
      }
    };
  }
  
  // Generate human-readable notification text
  formatPredictionNotification(pattern: UsagePattern): string {
    switch (pattern.type) {
      case 'daily_routine':
        return `🕐 It's almost ${pattern.description.match(/\d+:\d+/)![0]} — ready to turn on your AC?`;
      case 'temp_trigger':
        return `💡 You usually adjust the temp after a while. Start at ${pattern.prediction.suggestedTemp}°C instead?`;
      case 'bedtime_routine':
        return `🌙 Bedtime coming up — switch to Night Mode?`;
      default:
        return `📊 AI noticed a pattern: ${pattern.description}`;
    }
  }
}
```

REACT NATIVE — PatternCard.tsx + integration:

DESIGN:
- Card: bg #13131A, left border 4px violet, border-radius 16
- Badge: "📊 PATTERN" mono font 10px uppercase, violet/20 bg
- Confidence bar: full-width thin bar below description
  bg: #1E1E2A, fill: violet, width = confidence * 100%
  Label: "87% confidence · seen 23 times"
- Next occurrence: "Tomorrow at 10:00 PM" in mint
- Two buttons: Create Schedule (violet filled) · Not me (outline)

NOTIFICATION:
- When predicted time is 30 min away → Notifee local notification
- Actionable: "Turn on AC" + "Dismiss" buttons in notification
- Tap "Turn on AC" → deep link → execute command

BACKGROUND PROCESSING:
- PatternPredictor runs after each session ends
- Predictions stored in SQLite: ai_predictions table
- Background check every 30 min: are any predictions due in <30 min?

VERIFY:
1. 5+ sessions with consistent 10 PM start → daily_routine pattern detected
2. 4+ temp adjustments within 30 min → temp_trigger pattern detected
3. Pattern card shows with confidence bar
4. "Create schedule" → opens ScheduleScreen pre-filled with pattern
5. Notification fires 30 min before predicted time
```

---

### Prompt 7-7: Comfort-Efficiency Reinforcement Optimizer

```
You are building the comfort-efficiency RL optimizer for SmartAC. Free, on-device only.

WORKING DIRECTORY: SmartACApp/src/services/

DESIGN STYLE:
- Optimizer status card: unique "biomorphic" shape — not a rectangle, uses SVG clip-path for a flowing rounded blob shape
- Background: deep radial gradient from #00FFB2/10 center to #0A0A0F edges
- Center: circular gauge showing current "efficiency score" 0-100
- Score number: large JetBrains Mono 48px, mint colored
- Below: "optimized over X sessions" in muted DM Sans
- Two dials (visual only, no interaction): Comfort ← 0 ──●── 100 → Efficiency
- "Currently optimizing for: Balanced" label with a sliding indicator

FILE: SmartACApp/src/services/rlOptimizer.ts

```ts
// Lightweight Q-Learning implementation — no external ML lib needed
// State: (timeOfDay, humidity, outsideTemp, currentComfortScore)
// Action: (tempDelta, fanAdjust, modeSwitch)
// Reward: comfortScore * comfortWeight + efficiencySaving * efficiencyWeight

interface RLState {
  timeSlot: number;        // 0-47 (48 half-hour slots in a day)
  humidityBucket: number;  // 0=dry(<40%), 1=normal(40-65%), 2=humid(>65%)
  outsideTempBucket: number; // 0=cool(<22), 1=mild(22-30), 2=hot(30-36), 3=extreme(>36)
  comfortBucket: number;   // 0=poor(<60), 1=ok(60-79), 2=good(80+)
}

interface RLAction {
  id: number;
  description: string;
  tempDelta: number;       // -2, -1, 0, +1, +2
  fanChange: 'keep' | 'up' | 'down';
  specialMode?: string;
}

const ACTIONS: RLAction[] = [
  { id: 0, description: 'Keep current settings', tempDelta: 0, fanChange: 'keep' },
  { id: 1, description: 'Raise temp by 1°C', tempDelta: +1, fanChange: 'keep' },
  { id: 2, description: 'Raise temp by 2°C', tempDelta: +2, fanChange: 'keep' },
  { id: 3, description: 'Lower temp by 1°C', tempDelta: -1, fanChange: 'keep' },
  { id: 4, description: 'Lower temp by 2°C', tempDelta: -2, fanChange: 'keep' },
  { id: 5, description: 'Raise temp + lower fan', tempDelta: +1, fanChange: 'down' },
  { id: 6, description: 'Keep temp + lower fan', tempDelta: 0, fanChange: 'down' },
  { id: 7, description: 'Switch to Sleep mode', tempDelta: 0, fanChange: 'keep', specialMode: 'sleep' },
  { id: 8, description: 'Switch to WindFree', tempDelta: +1, fanChange: 'keep', specialMode: 'windFree' },
];

export class RLOptimizer {
  // Q-table: Map<stateKey, number[]> where number[] = Q values per action
  private qTable: Map<string, number[]> = new Map();
  private alpha = 0.1;    // Learning rate
  private gamma = 0.9;    // Discount factor
  private epsilon = 0.15; // Exploration rate (15% random actions)
  
  // User-configurable bias (set in Settings)
  public comfortWeight = 0.5;    // 0 = only efficiency, 1 = only comfort
  public efficiencyWeight = 0.5;
  
  // Encode state to string key
  private stateKey(state: RLState): string {
    return `${state.timeSlot}_${state.humidityBucket}_${state.outsideTempBucket}_${state.comfortBucket}`;
  }
  
  // Get Q values for state (initialize if new)
  private getQValues(state: RLState): number[] {
    const key = this.stateKey(state);
    if (!this.qTable.has(key)) {
      this.qTable.set(key, new Array(ACTIONS.length).fill(0));
    }
    return this.qTable.get(key)!;
  }
  
  // Select action (epsilon-greedy policy)
  selectAction(state: RLState): RLAction {
    if (Math.random() < this.epsilon) {
      // Explore: random action
      return ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    }
    // Exploit: best known action
    const qValues = this.getQValues(state);
    const bestIdx = qValues.indexOf(Math.max(...qValues));
    return ACTIONS[bestIdx];
  }
  
  // Learn from outcome
  learn(
    state: RLState, 
    actionId: number, 
    reward: number,
    nextState: RLState
  ): void {
    const qValues = this.getQValues(state);
    const nextQValues = this.getQValues(nextState);
    const maxNextQ = Math.max(...nextQValues);
    
    // Q-learning update
    const currentQ = qValues[actionId];
    const newQ = currentQ + this.alpha * (reward + this.gamma * maxNextQ - currentQ);
    qValues[actionId] = newQ;
  }
  
  // Calculate reward for a session
  calculateReward(comfortScore: number, kwhSaved: number, baselineKwh: number): number {
    const comfortReward = (comfortScore / 100) * this.comfortWeight;
    const efficiencyReward = Math.min(1, kwhSaved / baselineKwh) * this.efficiencyWeight;
    return comfortReward + efficiencyReward; // 0-1
  }
  
  // After session ends: learn from it
  async processSession(session: RLSession): Promise<void> {
    const state = this.encodeState(session.conditions);
    const reward = this.calculateReward(
      session.comfortScore,
      session.kwhSaved,
      session.baselineKwh
    );
    
    if (session.previousState) {
      this.learn(session.previousState, session.actionTaken, reward, state);
    }
    
    // Save Q-table to AsyncStorage
    await AsyncStorage.setItem('rl-qtable', JSON.stringify(Object.fromEntries(this.qTable)));
  }
  
  // Get the optimizer's recommendation for current conditions
  async getRecommendation(
    currentState: RLState,
    currentSettings: DeviceSettings
  ): Promise<OptimizationRecommendation | null> {
    const action = this.selectAction(currentState);
    if (action.id === 0) return null; // Keep current = no recommendation needed
    
    const newTemp = Math.max(16, Math.min(30, currentSettings.temp + action.tempDelta));
    
    return {
      action,
      suggestedTemp: newTemp,
      suggestedFan: this.adjustFanSpeed(currentSettings.fan, action.fanChange),
      suggestedSpecialMode: action.specialMode,
      reasoning: action.description,
      estimatedComfortImpact: await this.estimateComfortImpact(action, currentState),
      estimatedSavings: await this.estimateSavings(action, currentSettings)
    };
  }
  
  // Encode current conditions into RLState
  encodeState(conditions: EnvironmentConditions): RLState {
    const now = new Date();
    const halfHourSlot = now.getHours() * 2 + (now.getMinutes() >= 30 ? 1 : 0);
    
    return {
      timeSlot: halfHourSlot,
      humidityBucket: conditions.humidity < 40 ? 0 : conditions.humidity < 65 ? 1 : 2,
      outsideTempBucket: conditions.outsideTemp < 22 ? 0 : conditions.outsideTemp < 30 ? 1 : conditions.outsideTemp < 36 ? 2 : 3,
      comfortBucket: conditions.lastComfortScore < 60 ? 0 : conditions.lastComfortScore < 80 ? 1 : 2
    };
  }
  
  // Load Q-table from storage
  async load(): Promise<void> {
    const stored = await AsyncStorage.getItem('rl-qtable');
    if (stored) {
      const obj = JSON.parse(stored);
      this.qTable = new Map(Object.entries(obj));
    }
  }
  
  // Statistics for UI
  getStats(): { sessionsLearned: number; topAction: string; convergence: number } {
    const allQValues = [...this.qTable.values()].flat();
    const maxQ = Math.max(...allQValues);
    const bestStateIdx = [...this.qTable.values()]
      .map(qs => Math.max(...qs))
      .indexOf(maxQ);
    
    return {
      sessionsLearned: this.qTable.size,
      topAction: ACTIONS[
        [...this.qTable.values()][bestStateIdx]?.indexOf(maxQ) || 0
      ]?.description || 'Learning...',
      convergence: Math.min(1, this.qTable.size / 100) // Rough convergence estimate
    };
  }
}
```

REACT NATIVE — OptimizerCard.tsx + Settings integration:

DESIGN (Analytics screen — full-width):
- SVG blob background (use react-native-svg to draw a rounded blob shape)
- Radial gradient glow: mint at center, fading to #0A0A0F
- Central circular gauge (react-native-svg arc):
  * Track: #1E1E2A, 8px stroke
  * Fill: gradient mint→violet, animated
  * Center: score number in JetBrains Mono 48px
- Sub-label: "OPTIMIZER SCORE" in mono 10px uppercase, muted
- Two stat rows below:
  * 🎯 Comfort weight: [slider 0-100]  
  * ⚡ Efficiency weight: [slider 0-100]
  (sliders are linked: moving one adjusts the other to maintain sum = 100)
- Bottom: "Sessions learned: 47" · "Convergence: 78%" in muted mono text

OPTIMIZER SETTINGS (Settings Screen — new section):
- "AI Optimizer" section with toggle: Enable/Disable
- Comfort vs Efficiency preference slider with two labels at ends
- "Learning history" — shows sessions analyzed
- "Reset optimizer" (clear Q-table) with confirmation

ACTIVE SUGGESTIONS:
- When optimizer has a recommendation: shows as a small banner
  "💡 Optimizer suggests: Raise to 25°C + WindFree · saves ₹3.2 tonight"
  - Tap "Apply" or "Later"
  - "Later" snoozes for 2 hours

VERIFY:
1. 10 sessions → Q-table has entries, stats show learning progress
2. Comfort weight slider changes → next recommendations bias toward comfort
3. Optimizer card shows score + correct stats
4. After session: processSession called, Q-table updated
5. Recommendation banner appears with valid suggestion
```

---

## AI Features Summary Card (HomeScreen widget)

### Prompt 7-8: AI Status Dashboard Widget

```
You are building the AI status overview widget for SmartAC.

FILE: SmartACApp/src/components/AIStatusPanel.tsx

DESIGN:
Collapsible panel on HomeScreen that shows status of all 7 AI subsystems:

COLLAPSED STATE (48px tall, tap to expand):
- Left: "🤖 AI Active · 5 systems running"
- Right: mint circle with count of active suggestions

EXPANDED STATE:
┌─────────────────────────────────────────┐
│  🤖 AI INTELLIGENCE                  ▲  │
│  ─────────────────────────────────────  │
│  💬 Natural Language    ● Online        │
│  ⚠️  Anomaly Detection   ● Monitoring   │
│  🧠 Sleep Learning      📊 23 nights   │
│  ✨ Gemini Presets       ✅ 4 generated │
│  🌦️  Weather AI          💡 2 insights  │
│  📊 Pattern Predictor   🔮 1 prediction │
│  ⚡ RL Optimizer         🎯 47 sessions │
│  ─────────────────────────────────────  │
│  Tap any row to configure              │
└─────────────────────────────────────────┘

DESIGN:
- Panel bg: #13131A, rounded-2xl, 1px border rgba(0,255,178,0.1)
- Collapsed bar: mint left border strip 3px
- Each row: icon + name (DM Sans 13px) + status chip right-aligned
- Status chip colors: green=online, violet=learning, mint=active, gray=disabled
- Tap row → navigates to relevant screen/settings
- Row separator: 0.5px line rgba(255,255,255,0.06)
- Expand/collapse: smooth height animation with LayoutAnimation

VERIFY:
1. Panel collapses and expands smoothly
2. Each status reflects real service state
3. Tapping Anomaly Detection row → goes to Analytics anomalies
4. Tapping Natural Language → scrolls to AI command input
```

---

## Verification Criteria
- [ ] Ollama NL commands: type "cooler" → temp drops, "sleep mode" → special mode activates
- [ ] TensorFlow anomaly model trains without crash on 7-day data
- [ ] Anomaly alert bottom sheet appears with correct data
- [ ] Sleep learner identifies consistent bedtime temp after 5 sessions
- [ ] Gemini generates context-aware preset descriptions (rate-limited correctly)
- [ ] Weather suggestions change based on real weather conditions
- [ ] Pattern predictor finds daily routine after 5+ consistent sessions
- [ ] RL Q-table persists across app restarts
- [ ] AI status panel shows correct state for all 7 systems
- [ ] All AI features degrade gracefully when offline / insufficient data

## Files Created
```
SmartACApp/src/
├── components/
│   ├── AICommandInput.tsx        # NL control input
│   ├── AnomalyAlert.tsx          # TF.js anomaly bottom sheet
│   ├── LearnedPatternCard.tsx    # Sleep pattern insight card
│   ├── AIPresetStory.tsx         # Gemini-generated preset description
│   ├── WeatherAICard.tsx         # Weather suggestion card
│   ├── PatternCard.tsx           # Usage pattern prediction card
│   ├── OptimizerCard.tsx         # RL optimizer gauge card
│   └── AIStatusPanel.tsx         # All-in-one AI status overview
├── services/
│   ├── anomalyDetector.ts        # TensorFlow.js autoencoder
│   ├── sleepLearner.ts           # Sleep pattern statistical analyzer
│   ├── geminiPresets.ts          # Gemini API integration
│   ├── weatherAI.ts              # Weather-aware suggestion engine
│   ├── patternPredictor.ts       # Usage pattern predictor
│   └── rlOptimizer.ts            # Q-Learning comfort optimizer

ac-controller/lib/
├── nlp-controller.js             # Ollama integration
```

## Free Resource Summary
| Feature | Resource | Cost | Limit |
|---------|----------|------|-------|
| NL Control | Ollama llama3.2:3b local | Free | Unlimited |
| Anomaly Detection | TensorFlow.js | Free | Unlimited |
| Sleep Learning | Pure TypeScript | Free | Unlimited |
| Preset Descriptions | Gemini 2.0 Flash | Free | 15 req/min, 1M tokens/day |
| Weather AI | OpenWeatherMap | Free | 1000 calls/day |
| Pattern Predictor | Pure TypeScript + SQLite | Free | Unlimited |
| RL Optimizer | Pure TypeScript | Free | Unlimited |

**Total external API cost: ₹0**
</document_content>