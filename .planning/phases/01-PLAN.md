# PHASE 1 — Backend: Generic Multi-Device API

## Goal
Refactor the Express server from a Samsung-specific proxy into a universal SmartThings AC controller backend. Add dynamic capability detection, a comprehensive AC brand database (15+ brands), SQLite usage tracking, and energy savings calculation API.

## Requirements Covered
R1 (Generic AC), R7 (Backend API), R6.1 (SQLite)

## Context
The current `server.js` is a thin proxy that forwards `/api/*` to SmartThings. The frontend hardcodes Samsung-specific capabilities (`windFree`, `windFreeSleep`, mode lists). We need the backend to parse device capabilities and serve them dynamically so any AC brand works without frontend changes.

---

## Prompts

### Prompt 1-1: Refactor Server + Add Capability Detection

```
You are building a universal Smart AC controller backend. The existing codebase is in /Users/harshvaid/Work/AC/ac-controller/.

CURRENT STATE:
- server.js: Express app that proxies /api/* → SmartThings API v1
- Hardcoded for Samsung AR18CYLANWKN
- No database, no usage tracking

TASK: Refactor server.js into a modular backend

1. KEEP the existing /api/* proxy (it works, don't break it)

2. ADD new endpoint: GET /api/devices/:id/capabilities
   - Call SmartThings GET /devices/:id
   - Call SmartThings GET /devices/:id/status
   - Parse the response and return a normalized capability profile:
   {
     "deviceId": "xxx",
     "name": "Living Room AC",
     "manufacturer": "Samsung",
     "model": "AR18CYLANWKN",
     "brand": "samsung",
     "online": true,
     "capabilities": {
       "power": true,
       "temperature": { "min": 16, "max": 30, "unit": "C", "current": 24, "target": 23 },
       "humidity": { "current": 65 },
       "modes": ["cool", "heat", "auto", "dry", "wind"],
       "fanSpeeds": ["auto", "low", "medium", "high", "turbo"],
       "swingModes": ["off", "fixed", "vertical", "horizontal", "all"],
       "specialModes": ["off", "quiet", "sleep", "windFree", "windFreeSleep", "speed"],
       "currentState": {
         "power": "on",
         "mode": "cool",
         "fanSpeed": "auto",
         "swing": "off",
         "specialMode": "off"
       }
     },
     "wattage": 1580,
     "presets": [...]
   }
   
   - Parse capabilities dynamically from the SmartThings response:
     * airConditionerMode → extract supportedAcModes list
     * airConditionerFanMode → extract supportedAcFanModes list  
     * fanOscillationMode → extract supportedFanOscillationModes list
     * custom.airConditionerOptionalMode → extract supportedAcOptionalMode list
     * thermostatCoolingSetpoint → temperature range
     * temperatureMeasurement → current temp
     * relativeHumidityMeasurement → humidity
     * switch → power state
   - If a capability doesn't exist on the device, omit it from the response (don't error)

3. ADD new endpoint: GET /api/brands
   Return the full known-brand database (see Prompt 1-2)

4. ADD new endpoint: GET /api/brands/:modelNumber
   Look up a specific model number and return brand info + wattage + presets

5. Structure the code:
   - server.js — Express app, routes, middleware
   - lib/capabilities.js — SmartThings capability parser
   - lib/brands.js — Brand database and lookup
   - Keep package.json dependencies minimal (express + better-sqlite3)

6. Install better-sqlite3 for SQLite support

VERIFY: Start server, call GET /api/devices/:id/capabilities with a real device and confirm it returns normalized capabilities.
```

### Prompt 1-2: AC Brand Database

```
You are building the brand database for SmartAC universal controller.

TASK: Create lib/brands.js with a comprehensive AC brand database

The database should be a JS object mapping model number patterns to brand info.
Include ALL major AC brands sold globally, especially in India:

BRANDS TO INCLUDE (with real model number patterns and typical wattage):

1. SAMSUNG
   - Pattern: AR*, F-AR*, AR18*, AR24*
   - Models: AR18CYLANWKN (1580W), AR24CYLANWKN (2100W), AR12TYAANWKN (1180W)
   - Special: windFree, windFreeSleep, AI modes

2. LG
   - Pattern: LS-*, PS-*, RS-*, MS-*, KS-*
   - Models: LS-Q18YNZA (1600W), PS-Q19YNZE (1700W), RS-Q19YNZE (1700W)
   - Special: ThinQ modes, Dual Inverter

3. DAIKIN
   - Pattern: FTK*, FTKF*, FTKM*, JTKJ*
   - Models: FTKF50UV16V (1500W), FTKM50UV16V (1600W), JTKJ50TV16U (1580W)
   - Special: Coanda, Econo mode, Streamer

4. CARRIER
   - Pattern: CAI*, ESTAR*, 24K*
   - Models: CAI18EK5R39F0 (1580W), ESTAR18K5R39F0 (1620W)
   - Special: Flexicool, 4-in-1 convertible

5. VOLTAS
   - Pattern: 18*, 24*, SAC_*, 183V*, 184V*
   - Models: 183V_CZTT (1580W), 184V_CZTT (1580W), 183V_EAZR (1500W)
   - Special: Adjustable Inverter

6. BLUE STAR
   - Pattern: IC*, IA*, ID*, FS*, BS-*
   - Models: IC518DATU (1610W), IA518DLU (1600W), ID518DLU (1620W)
   - Special: Precision cooling

7. HITACHI
   - Pattern: RAU*, RSB*, RSNG*, RMNG*
   - Models: RSNG518HCEA (1620W), RMNG518HCEA (1610W)
   - Special: iCleen, Tropical Inverter

8. PANASONIC
   - Pattern: CS*, CU*, CS-CU*, NA-*
   - Models: CS-CU-NU18YKY5W (1580W), CS-CU-WU18YKYXF (1600W)
   - Special: nanoe X, MirAIe

9. MITSUBISHI
   - Pattern: MSZ*, MSY*, MUZ*, SRK*
   - Models: MSZ-EF42VGK (1550W), MSY-GR18VF (1460W)
   - Special: 3D i-See Sensor, Econo Cool

10. WHIRLPOOL
    - Pattern: SAI*, MAGICOOL*, 3DCool*
    - Models: SAI18B39MC0 (1600W), MAGICOOL PRO 3S (1580W)
    - Special: 3D Cool, IntelliFresh

11. GODREJ
    - Pattern: GIC*, GSC*, AC*
    - Models: GIC18HTC5-WTA (1590W), GIC18UGC5-WTA (1600W)
    - Special: I-Sense, 5-in-1 convertible

12. LLOYD
    - Pattern: GLS*, LS*, LC*
    - Models: GLS18I5FWBEV (1600W), GLS18I3FWRHD (1620W)
    - Special: Golden Fin, Anti-bacterial filter

13. HAIER
    - Pattern: HSU*, AS*
    - Models: HSU18C-TFW5B(INV) (1580W), HSU18C-TQG5BE(INV) (1590W)
    - Special: Self-clean, Frost-wash

14. TOSHIBA
    - Pattern: RAS*, RAV*
    - Models: RAS-18U2KCV-IN (1540W), RAS-24S3KCV-IN (2100W)
    - Special: Hi-Wall, Smart Diagnosis

15. GENERAL (O'General / Fujitsu)
    - Pattern: ASGG*, ASGA*, ASGC*
    - Models: ASGG18CGTB (1580W), ASGA18BMWA (1600W)
    - Special: Hyper Tropical Inverter

STRUCTURE:
```js
module.exports = {
  // Array of brand objects
  brands: [ { id, name, logo_emoji, country, patterns: [regex], models: [...] } ],
  
  // Function: lookupByModel(modelNumber) → brand + wattage + presets
  lookupByModel(modelNumber) { ... },
  
  // Function: lookupByManufacturer(manufacturer) → brand info
  lookupByManufacturer(manufacturer) { ... },
  
  // Function: getAllBrands() → summary list
  getAllBrands() { ... },
  
  // Generate smart presets based on capabilities
  generatePresets(capabilities, wattage) { ... }
}
```

Each brand should have:
- id: lowercase slug
- name: Display name
- country: Country of origin
- logo_emoji: Emoji representing the brand
- patterns: Array of regex patterns to match model numbers
- models: Array of { model, wattage, tonnage, type } for known models
- specialModes: Array of brand-specific special modes

The generatePresets function should create 4 presets:
1. Ultra Saver — highest temp (26-28°C), lowest fan, sleep/eco mode if available
2. Balanced — 24°C, auto fan, quiet mode if available
3. Comfort — 22-23°C, auto fan, brand-specific comfort mode
4. Turbo Cool — lowest temp (18-20°C), turbo/high fan, full power

VERIFY: require('./lib/brands') and call lookupByModel('AR18CYLANWKN') returns Samsung with 1580W.
```

### Prompt 1-3: SQLite Usage Tracking + Savings API

```
You are adding usage tracking and energy savings calculation to the SmartAC backend.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/

TASK 1: Create lib/database.js — SQLite database module

Tables:
1. usage_events
   - id INTEGER PRIMARY KEY AUTOINCREMENT
   - device_id TEXT NOT NULL
   - event_type TEXT NOT NULL ('power_on', 'power_off', 'temp_change', 'mode_change', 'fan_change', 'preset_activated')
   - details TEXT (JSON: { temp: 24, mode: 'cool', fan: 'auto', preset: 'balanced' })
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

2. runtime_sessions
   - id INTEGER PRIMARY KEY AUTOINCREMENT
   - device_id TEXT NOT NULL
   - started_at DATETIME NOT NULL
   - ended_at DATETIME
   - avg_temp REAL
   - mode TEXT
   - wattage INTEGER
   - kwh_used REAL (calculated on session end)

3. settings
   - key TEXT PRIMARY KEY
   - value TEXT (JSON)
   Default rows:
   - electricity_rate: { amount: 8, currency: 'INR', symbol: '₹' }
   - temperature_unit: 'C'
   - baseline_hours: 8
   - baseline_temp: 18
   - co2_per_kwh: 0.82

4. devices
   - device_id TEXT PRIMARY KEY
   - name TEXT
   - brand TEXT
   - model TEXT
   - wattage INTEGER
   - room TEXT
   - custom_presets TEXT (JSON array)
   - created_at DATETIME DEFAULT CURRENT_TIMESTAMP

Functions to export:
- initDB() — create tables if not exist
- logEvent(deviceId, eventType, details) — insert usage event
- startSession(deviceId, wattage, temp, mode) — create runtime session
- endSession(deviceId) — close session, calculate kWh
- getUsageStats(deviceId, period) — period: 'day'|'week'|'month'|'year'
- getSavings(deviceId, period) — returns { kwhSaved, moneySaved, co2Saved, currency, sessions }
- getSettings() / updateSettings(key, value)
- saveDevice(device) / getDevice(deviceId) / getAllDevices()

SQLite file: ./data/smartac.db (create ./data/ dir if not exist)

TASK 2: Add API routes in server.js

POST /api/usage/log
  Body: { deviceId, eventType, details }
  → logEvent + if power_on → startSession, if power_off → endSession

GET /api/usage/stats/:deviceId?period=month
  → getUsageStats

GET /api/savings/:deviceId?period=month
  → getSavings
  Response: {
    period: 'month',
    baseline: { hours: 240, temp: 18, kwhTotal: 379.2, cost: 3033.6 },
    actual: { hours: 180, avgTemp: 24, kwhTotal: 213.3, cost: 1706.4 },
    saved: { kwh: 165.9, cost: 1327.2, co2: 136.04, percentage: 43.7 },
    currency: { code: 'INR', symbol: '₹', rate: 8 }
  }

GET /api/settings
  → getSettings

PUT /api/settings
  Body: { key, value }
  → updateSettings

Savings calculation formula:
- Baseline kWh = (wattage / 1000) × baseline_hours × days_in_period
  (worst case: running at 18°C full blast all the time)
- Actual kWh = sum of all runtime_sessions.kwh_used in period
  kWh per session = (wattage × efficiency_factor / 1000) × session_hours
  efficiency_factor = varies by temp: 18°C=1.0, 20°C=0.85, 22°C=0.72, 24°C=0.6, 26°C=0.5, 28°C=0.42
- Saved kWh = baseline - actual
- Saved money = saved_kwh × electricity_rate
- Saved CO₂ = saved_kwh × co2_per_kwh

VERIFY: 
1. Start server, POST a power_on event, wait, POST power_off
2. GET /api/savings/:deviceId should return non-zero savings
3. GET /api/settings should return default ₹8/kWh rate
```

---

## Verification Criteria
- [ ] Server starts without errors
- [ ] GET /api/devices/:id/capabilities returns normalized profile for any AC
- [ ] GET /api/brands returns 15+ brands
- [ ] GET /api/brands/AR18CYLANWKN returns Samsung with 1580W
- [ ] POST /api/usage/log creates events in SQLite
- [ ] GET /api/savings/:id returns calculated savings
- [ ] Existing web UI still works (backward compatible)

## Files Created/Modified
- `server.js` (modified — new routes)
- `lib/capabilities.js` (new)
- `lib/brands.js` (new)
- `lib/database.js` (new)
- `data/smartac.db` (new — auto-created)
- `package.json` (modified — add better-sqlite3)
