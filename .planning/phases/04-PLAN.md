# PHASE 4 — Smart Presets & Night Mode (Generic)

## Goal
Generalize the night mode / preset system so it works with any AC brand. Add a custom preset builder, schedule system with notifications, and smart suggestions based on environmental data.

## Requirements Covered
R4 (Smart Presets)

## Dependencies
Phase 1 (Backend), Phase 2 (RN App)

---

## Prompts

### Prompt 4-1: Dynamic Preset Engine

```
You are building the generic preset engine for SmartAC.

FILES:
- SmartACApp/src/services/presets.ts (new)
- SmartACApp/src/components/PresetCard.tsx (update)
- SmartACApp/src/screens/DeviceControlScreen.tsx (update preset section)
- ac-controller/lib/brands.js (update generatePresets function)

TASK: Build a preset system that adapts to any AC's capabilities

CORE LOGIC — Backend (lib/brands.js → generatePresets):

Given a device's capabilities, generate appropriate presets:

```js
function generatePresets(capabilities, wattage) {
  const presets = [];
  
  // 1. ULTRA SAVER
  const ultraSaver = {
    id: 'ultra-saver',
    name: 'Ultra Saver',
    icon: '🌙',
    description: 'Max savings',
    temp: 26,
    mode: capabilities.modes.includes('cool') ? 'cool' : capabilities.modes[0],
    fan: capabilities.fanSpeeds.includes('low') ? 'low' : capabilities.fanSpeeds[0],
    specialMode: pickBestEcoMode(capabilities.specialModes),
    swing: 'off',
    estimatedWattage: wattage * 0.42,
  };
  // If brand has sleep/eco/windFreeSleep → use it
  // If not → use lowest available option
  
  // 2. BALANCED — 24°C, auto fan, quiet if available
  // 3. COMFORT — 22°C, auto fan, comfort/windFree if available  
  // 4. TURBO COOL — 18°C, turbo/high fan, full power
  
  return presets;
}

function pickBestEcoMode(specialModes) {
  // Priority: windFreeSleep > sleep > quiet > eco > off
  const priority = ['windFreeSleep', 'sleep', 'quiet', 'eco', 'off'];
  for (const mode of priority) {
    if (specialModes.includes(mode)) return mode;
  }
  return specialModes[0] || 'off';
}
```

CORE LOGIC — Frontend (src/services/presets.ts):

```ts
interface Preset {
  id: string;
  name: string;
  icon: string;
  description: string;
  temp: number;
  mode: string;
  fan: string;
  specialMode?: string;
  swing?: string;
  estimatedWattage: number;
  isCustom: boolean;
}

export function applyPreset(deviceId: string, preset: Preset): Promise<void> {
  // Send commands in sequence:
  // 1. switch ON
  // 2. set mode
  // 3. set temp
  // 4. set fan
  // 5. set special mode (if supported)
  // 6. set swing (if supported)
  // With 800ms delay between each command
}
```

PRESET CARD COMPONENT:
- Card with gradient border when selected
- Shows: icon, name, description, estimated temp, estimated saving
- Tap → applies preset with step-by-step progress indicator
- Each step shows ✓ as it completes (like existing web app)
- Long press → edit preset (custom presets only)

PRESET LIST on Device Control Screen:
- Horizontal scrollable row at top (quick access)
- Expandable full view below
- "+" button to add custom preset

VERIFY:
1. Samsung AC → presets show WindFree options
2. Generic AC (no special modes) → presets use basic cool/fan only
3. Tapping preset sends all commands in sequence
```

### Prompt 4-2: Custom Preset Builder

```
You are building the custom preset creation flow for SmartAC.

FILE: SmartACApp/src/screens/PresetBuilderScreen.tsx

TASK: Full-screen modal for creating/editing custom presets

SCREEN DESIGN:
- Title: "Create Preset" / "Edit Preset"
- Close (X) button top-right

FORM FIELDS:

1. PRESET NAME
   - Text input with character limit (20)
   - Placeholder: "e.g., Movie Night"

2. ICON PICKER
   - Grid of emoji: 🌙 ❄️ 🔥 💤 🌬️ ⚡ 🎬 📚 🏋️ 🎮 🍳 🧘 💻 🌅 🌃
   - Tap to select

3. TEMPERATURE
   - Slider from device's min to max
   - Large number display above slider
   - Blue (cool) to Red (hot) gradient on slider track

4. AC MODE
   - Only modes this device supports
   - Pill buttons (same as device control screen)

5. FAN SPEED
   - Only speeds this device supports
   - Pill buttons

6. SPECIAL MODE (if device has any)
   - Pill buttons for device's special modes

7. SWING (if device supports)
   - Pill buttons

8. ESTIMATED SAVINGS PREVIEW
   - Real-time calculation as user adjusts:
     "This preset uses ~X watts, saving ~₹Y per hour vs full blast"

9. SAVE BUTTON (full width, gradient)

STORAGE:
- Custom presets saved to SQLite via OP-SQLite v9+ (devices table → custom_presets JSON column)
- Also stored in Zustand store for immediate access
- Max 10 custom presets per device

VERIFY:
1. Create a preset → appears in preset list
2. Apply custom preset → sends correct commands
3. Edit existing preset → changes persist
4. Delete preset (swipe left) → removed
```

### Prompt 4-3: Schedule System + Notifications

```
You are adding scheduled preset activation to SmartAC.

FILES:
- SmartACApp/src/screens/ScheduleScreen.tsx (new)
- SmartACApp/src/services/scheduler.ts (new)
- SmartACApp/src/components/ScheduleCard.tsx (new)

INSTALL:
npm install @notifee/react-native@^9   # Push notifications (latest, Notifee v9+)
npm install @react-native-community/datetimepicker  # Time picker

TASK: Build schedule system

SCHEDULE MODEL:
```ts
interface Schedule {
  id: string;
  name: string;         // "Bedtime", "Wake Up", "Work Hours"
  deviceId: string;
  presetId: string;      // which preset to activate
  time: string;          // "22:00" (HH:MM)
  days: number[];        // [0,1,2,3,4,5,6] (0=Sun, 6=Sat)
  enabled: boolean;
  action: 'activate_preset' | 'turn_off';
}
```

SCHEDULE SCREEN:
- List of schedules
- "Add Schedule" FAB button
- Each schedule card shows:
  * Name + time
  * Days (M T W T F S S — highlighted circles)
  * Preset name or "Turn OFF"
  * Toggle switch to enable/disable
  * Swipe to delete

ADD SCHEDULE MODAL:
- Name input
- Time picker (native)
- Day selector (tap to toggle each day)
- Action: "Apply preset" (picker) or "Turn OFF"
- Save button

BACKEND EXECUTION:
- Schedules stored in SQLite (OP-SQLite)
- Background task checks schedules every 30 seconds
- When schedule triggers:
  * Send push notification via Notifee v9+: "🌙 Bedtime mode activated on Living Room AC"
  * Apply preset or turn off via ConnectionManager (works with Cloud/WiFi/IR)
  * Log event to usage tracking

COMMON SCHEDULES (pre-created suggestions):
- 🌙 Bedtime (10 PM, Ultra Saver preset, every day)
- ☀️ Wake Up (6 AM, Turn OFF, weekdays)
- 🏢 Away (9 AM, Turn OFF, weekdays)
- 🏠 Come Home (5 PM, Balanced preset, weekdays)

VERIFY:
1. Create bedtime schedule → triggers at set time
2. Notification appears when schedule fires
3. Toggle schedule on/off works
4. Days selector filters correctly
```

### Prompt 4-4: Smart Suggestions

```
You are adding smart suggestions to SmartAC.

FILE: SmartACApp/src/services/suggestions.ts + SmartACApp/src/components/SuggestionBanner.tsx

TASK: Show contextual suggestions based on conditions

SUGGESTION ENGINE:
```ts
interface Suggestion {
  id: string;
  type: 'eco' | 'comfort' | 'health' | 'schedule';
  title: string;
  description: string;
  action: () => void;
  icon: string;
  priority: number; // 1-10
}

function generateSuggestions(deviceStatus, settings, weather?, timeOfDay): Suggestion[] {
  const suggestions = [];
  
  // 1. HIGH TEMP ROOM, LOW TARGET
  if (status.roomTemp > 30 && status.targetTemp < 20) {
    suggestions.push({
      title: "Consider raising to 24°C",
      description: "Your AC is working hard. 24°C saves 40% energy with similar comfort.",
      action: () => setTemp(24),
      icon: '💡'
    });
  }
  
  // 2. LATE NIGHT, AC ON FULL BLAST  
  if (hour >= 23 && status.targetTemp < 22 && status.fan === 'turbo') {
    suggestions.push({
      title: "Switch to Night Mode?",
      description: "It's late! Night mode saves ₹15-20 per night.",
      action: () => activatePreset('ultra-saver'),
      icon: '🌙'
    });
  }
  
  // 3. AC RUNNING FOR LONG TIME
  if (sessionDuration > 4 * 3600 && status.mode !== 'auto') {
    suggestions.push({
      title: "Try Auto mode",
      description: "Your AC has been running 4+ hours. Auto mode adjusts for efficiency.",
      icon: '🔄'
    });
  }
  
  // 4. NO SCHEDULE SET
  if (!hasSchedules) {
    suggestions.push({
      title: "Set up a bedtime schedule",
      description: "Automatic Night Mode can save you ₹500-800/month",
      icon: '⏰'
    });
  }
  
  // 5. HIGH HUMIDITY
  if (status.humidity > 70 && status.mode !== 'dry') {
    suggestions.push({
      title: "Humidity is high (${status.humidity}%)",
      description: "Try Dry mode for 30 mins to dehumidify.",
      icon: '💧'
    });
  }
  
  return suggestions.sort((a,b) => b.priority - a.priority).slice(0, 3);
}
```

SUGGESTION BANNER UI:
- Horizontal scrollable cards on HomeScreen
- Each card: icon + title + description + action button
- Dismissable (swipe up or X)
- Subtle animation on appear
- Max 3 suggestions at a time

VERIFY:
1. Set AC to 18°C → "Consider raising to 24°C" suggestion appears
2. After 11 PM → "Night mode" suggestion appears
3. Dismiss suggestion → doesn't reappear for 24 hours
```

---

## Verification Criteria
- [ ] Default presets generated dynamically per device capabilities
- [ ] Custom preset creation/edit/delete works
- [ ] Presets send commands in sequence with progress
- [ ] Schedule creates and fires at correct time
- [ ] Push notification on schedule trigger
- [ ] Smart suggestions appear based on real conditions
- [ ] Suggestions dismissable and non-intrusive

## Files Created
```
SmartACApp/src/
├── screens/
│   ├── PresetBuilderScreen.tsx
│   └── ScheduleScreen.tsx
├── components/
│   ├── ScheduleCard.tsx
│   └── SuggestionBanner.tsx
├── services/
│   ├── presets.ts
│   ├── scheduler.ts
│   └── suggestions.ts
```
