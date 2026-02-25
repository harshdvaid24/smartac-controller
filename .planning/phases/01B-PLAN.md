# PHASE 1B — Direct WiFi / BLE / IR Blaster Control

## Goal
Add local network AC discovery and direct control — bypassing SmartThings cloud entirely. Support WiFi HTTP/MQTT APIs for major brands, BLE initial pairing, and IR blaster integration for controlling any AC (even non-smart units).

## Requirements Covered
R1B (Direct WiFi / Bluetooth / IR Control)

## Dependencies
Phase 1A (shared brand database + device model)

---

## Prompts

### Prompt 1B-1: Local WiFi AC Discovery (mDNS + SSDP)

```
You are adding local network AC discovery to the SmartAC backend and mobile app.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/

TASK: Create a local device discovery service that finds ACs on the WiFi network

1. Create lib/discovery.js — Local Network AC Scanner

The scanner should use MULTIPLE discovery protocols simultaneously:

A) mDNS/Bonjour Discovery (primary):
   - Use 'bonjour-service' npm package (lightweight mDNS)
   - Scan for known AC service types:
     * _samsung-ac._tcp      → Samsung WiFi ACs
     * _daikin._tcp           → Daikin WiFi ACs  
     * _lg-smart._tcp         → LG ThinQ ACs
     * _midea._tcp            → Midea/Carrier/Toshiba ACs
     * _haier-ac._tcp         → Haier ACs
     * _aircon._tcp           → Generic AC services
     * _http._tcp             → scan labels for AC keywords
   - Parse TXT records for model info, firmware, capabilities
   - Return: { ip, port, name, manufacturer, model, serviceType }

B) SSDP Discovery (secondary):
   - Use 'node-ssdp' npm package
   - Send M-SEARCH for:
     * urn:schemas-upnp-org:device:hvac:1
     * urn:samsung.com:device:AirConditioner:1
   - Parse XML device description for model info

C) Port Scanning (fallback):
   - For known AC ports on local subnet:
     * Port 8888/8889 → Samsung AC HTTP API
     * Port 80/443    → Daikin HTTP API
     * Port 6444      → Midea protocol
     * Port 56800     → Haier AC
     * Port 7000 UDP  → Gree/Hisense
   - Scan local subnet (e.g., 192.168.1.1-254)
   - Only scan known ports, not full port scan
   - Verify by sending brand-specific handshake

2. Create API endpoints:

POST /api/discover/local
  - Trigger local network scan (all 3 methods)
  - Returns results as they come in (SSE or polling)
  Response: {
    scanning: true,
    devices: [
      {
        ip: '192.168.1.45',
        port: 80,
        name: 'DaikinAP12345',
        brand: 'daikin',
        model: 'FTKF50UV16V',
        connectionType: 'wifi_local',
        discoveryMethod: 'mdns',
        capabilities: { ... } // probed from device
      }
    ]
  }

GET /api/discover/local/status
  - Check scan progress (for polling approach)

3. Backend should cache discovered devices for 5 minutes

DEPENDENCIES:
npm install bonjour-service node-ssdp

VERIFY:
1. Start server on same WiFi as a smart AC
2. POST /api/discover/local
3. If any smart AC is on the network, it appears in results
4. If no AC found, returns empty array (no error)
```

### Prompt 1B-2: Direct WiFi AC Control — Brand Protocols

```
You are implementing direct WiFi control for major AC brands.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/

TASK: Create protocol handlers for controlling ACs directly over WiFi

Create lib/protocols/ directory with a handler per brand:

1. lib/protocols/base.js — Base protocol class
```js
class ACProtocol {
  constructor(ip, port, options = {}) {
    this.ip = ip;
    this.port = port;
  }
  
  // Common interface every protocol must implement
  async connect() { throw new Error('Not implemented'); }
  async disconnect() { }
  async getStatus() { throw new Error('Not implemented'); }
  async setPower(on) { throw new Error('Not implemented'); }
  async setTemperature(temp) { throw new Error('Not implemented'); }
  async setMode(mode) { throw new Error('Not implemented'); }
  async setFanSpeed(speed) { throw new Error('Not implemented'); }
  async setSwing(mode) { throw new Error('Not implemented'); }
  async setSpecialMode(mode) { throw new Error('Not implemented'); }
  
  // Normalize brand-specific status to common format
  normalizeStatus(raw) { throw new Error('Not implemented'); }
  
  // Get supported capabilities
  getCapabilities() { throw new Error('Not implemented'); }
}
module.exports = ACProtocol;
```

2. lib/protocols/daikin.js — Daikin WiFi (best documented, start here)
```
Daikin AC WiFi API is HTTP-based and well-documented:

GET http://{ip}/aircon/get_control_info
  → ret=OK,pow=1,mode=3,stemp=24.0,shum=0,f_rate=A,f_dir=0,...

GET http://{ip}/aircon/get_sensor_info
  → ret=OK,htemp=26.0,otemp=33.5,hhum=65,...

GET http://{ip}/aircon/set_control_info?pow=1&mode=3&stemp=24&f_rate=A&f_dir=0
  → ret=OK

Mode mapping: 0=auto, 1=auto, 2=dry, 3=cool, 4=heat, 6=fan
Fan rate: A=auto, B=silent, 3=lvl1, 4=lvl2, 5=lvl3, 6=lvl4, 7=lvl5
Fan direction: 0=off, 1=vertical, 2=horizontal, 3=both

Implement full Daikin HTTP protocol with:
- Status polling (get_control_info + get_sensor_info)
- All controls (power, temp, mode, fan, swing)
- Auto-detect Daikin via /common/basic_info endpoint
- Normalize to SmartAC common status format
```

3. lib/protocols/samsung-local.js — Samsung WiFi
```
Samsung smart ACs expose a local API:
- Port 8888 (HTTP) or 8889 (HTTPS)
- REST API with JSON payloads
- Requires device token (one-time pairing)
- Supports all Samsung features including WindFree

GET http://{ip}:8888/devices/0
  → Device info + status

PUT http://{ip}:8888/devices/0
  Body: { "desired": { "temperature": 24, "mode": "cool", ... } }

Implement:
- Token-based pairing flow
- Status reading
- Full control
- WindFree, WindFreeSleep support
```

4. lib/protocols/midea.js — Midea Protocol (covers 20+ brands)
```
Midea protocol is used by: Midea, Carrier, Toshiba (some), Comfee, 
Klimaire, Pioneer, Artel, Ikon, and many OEM brands.

- TCP port 6444
- Binary protocol with encryption (AES + data encoding)
- Use msmart-ng protocol spec (open source)

Implement:
- Device discovery (broadcast to port 6444)
- Handshake + authentication
- Status query (decode binary response)
- Control commands (encode binary request)
- Normalize Midea status to common format

Note: This is complex. Start with basic power/temp/mode. 
Refer to: https://github.com/mill1000/midea-msmart (Python reference)
```

5. lib/protocols/gree.js — Gree/Hisense
```
Gree protocol:
- UDP port 7000
- JSON over encrypted UDP (AES-128-ECB)
- Default key for discovery: "a3K8Bx%2r8Y7#xDh"
- Commands: scan, bind, status, cmd

Implement:
- UDP broadcast discovery
- Device binding
- Status polling
- Basic controls (power, temp, mode, fan)
```

6. lib/protocols/index.js — Protocol Router
```js
const protocols = {
  daikin: require('./daikin'),
  samsung: require('./samsung-local'),
  midea: require('./midea'),
  gree: require('./gree'),
  haier: require('./haier'),
};

function getProtocol(brand, ip, port) {
  const Protocol = protocols[brand];
  if (!Protocol) throw new Error(`No protocol handler for ${brand}`);
  return new Protocol(ip, port);
}

module.exports = { getProtocol, protocols };
```

7. Add unified API endpoints in server.js:

POST /api/local/control
  Body: { ip, port, brand, action: 'setPower', value: true }
  → Routes to correct protocol handler
  Response: { success: true, status: { ... normalized ... } }

GET /api/local/status
  Query: ?ip=192.168.1.45&port=80&brand=daikin
  → Returns normalized status from direct device query

API uses the SAME normalized status format as SmartThings capabilities,
so the frontend doesn't need to know which connection method is active.

VERIFY:
1. If you have a Daikin AC on WiFi → GET /api/local/status returns temp/mode
2. If you have a Samsung AC on WiFi → pairing + control works  
3. Protocol router correctly dispatches to right handler
4. Unknown brand → returns "protocol not supported" error
```

### Prompt 1B-3: IR Blaster Integration (Broadlink / Switchbot)

```
You are adding IR blaster support to SmartAC for controlling non-smart ACs.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/

TASK: Support IR blasters so SmartAC can control ANY air conditioner

1. Create lib/ir/ directory:

lib/ir/broadlink.js — Broadlink RM4 Pro / RM4 Mini
```
Broadlink devices expose a local API:
- UDP discovery (port 80, broadcast)
- Device authentication (AES encrypted)
- Send IR code command
- Learn IR code command

Use 'broadlinkjs-rm' or implement from protocol spec.

Functions:
- discoverBroadlink() → find RM devices on network
- authenticateDevice(ip, mac) → get auth key
- sendIR(ip, irCode) → send IR command to AC
- learnIR(ip) → enter learn mode, return captured IR code
- getTemperature(ip) → RM4 Pro has temp sensor
```

lib/ir/switchbot.js — Switchbot Hub Mini
```
Switchbot Hub exposes:
- BLE API for local control
- HTTP API via Switchbot Cloud (simpler)
- Can learn and send IR codes

Functions:
- discoverSwitchbot() → find hub via BLE
- sendIR(hubId, irCode) → send IR command
- learnIR(hubId) → learn from remote
```

lib/ir/codes.js — IR Code Database
```
Massive IR code database for AC brands.
Structure:

const IR_CODES = {
  samsung: {
    // Base codes for common Samsung remotes
    power_on:  '260050000001...hex...',
    power_off: '260050000001...hex...',
    temp: {
      16: '2600...', 17: '2600...', ..., 30: '2600...'
    },
    mode: {
      cool: '2600...', heat: '2600...', auto: '2600...', dry: '2600...'
    },
    fan: {
      auto: '2600...', low: '2600...', medium: '2600...', high: '2600...'
    }
  },
  lg: { ... },
  daikin: { ... },
  voltas: { ... },
  // ... 50+ brands
};

// Source: combine from LIRC database, Broadlink community codes,
// and Switchbot IR database

function getIRCode(brand, remote_model, command, value) { ... }
function getAllBrands() { ... }
function getRemoteModels(brand) { ... }
```

2. Create lib/ir/ir-ac-controller.js — High-level IR AC interface
```js
class IRAirConditioner {
  constructor(blasterType, blasterConfig, acBrand, remoteModel) {
    this.blaster = blasterType === 'broadlink' 
      ? new Broadlink(blasterConfig) 
      : new Switchbot(blasterConfig);
    this.codes = IRCodes.getCodesFor(acBrand, remoteModel);
  }
  
  // Same interface as WiFi protocol handlers:
  async setPower(on) {
    const code = this.codes[on ? 'power_on' : 'power_off'];
    await this.blaster.sendIR(code);
  }
  
  async setTemperature(temp) {
    // IR is stateless — we send the full state each time
    const code = this.codes.buildFullCommand({
      power: true, temp, mode: this.lastMode, fan: this.lastFan
    });
    await this.blaster.sendIR(code);
    this.lastTemp = temp;
  }
  
  async setMode(mode) { ... }
  async setFanSpeed(speed) { ... }
  
  // IR limitation: can't READ status from AC
  // Maintain assumed state locally
  getStatus() {
    return {
      power: this.lastPower,
      temp: this.lastTemp,
      mode: this.lastMode,
      fan: this.lastFan,
      source: 'ir_assumed' // UI shows "assumed" badge
    };
  }
  
  // Learn unknown remote
  async learnCommand(commandName) {
    console.log('Press the button on your remote now...');
    const code = await this.blaster.learnIR();
    this.codes.custom[commandName] = code;
    return code;
  }
}
```

3. Add API endpoints:

GET /api/ir/blasters
  → Discover IR blasters on network (Broadlink, Switchbot)

GET /api/ir/brands
  → List all brands with IR codes available

GET /api/ir/brands/:brand/remotes
  → List remote models for a brand

POST /api/ir/send
  Body: { blasterIp, brand, remote, command: 'setTemp', value: 24 }
  → Send IR command via blaster

POST /api/ir/learn
  Body: { blasterIp, commandName: 'power_on' }
  → Enter learn mode, wait for IR signal, return captured code

4. IR Setup Flow (for the mobile app):
   Step 1: Discover IR blaster on network
   Step 2: Select AC brand from list (50+ brands)
   Step 3: Select remote model (or "I don't know")
   Step 4: Test - "Press Test to turn ON your AC" 
   Step 5: If test fails → enter Learn Mode
   Step 6: Save configuration

LIMITATIONS TO DOCUMENT:
- IR is one-way: can send commands but can't read AC status
- Status is "assumed" based on last command sent
- If someone uses the physical remote, app won't know
- No room temperature reading (unless blaster has sensor, like RM4 Pro)
- Latency is slightly higher than WiFi direct

VERIFY:
1. Discover Broadlink RM on network
2. Send power_on IR code → AC turns on
3. Verify IR code database has codes for Samsung, LG, Daikin, Voltas
4. Learn mode captures a custom code
```

### Prompt 1B-4: BLE Pairing + Connection Manager

```
You are adding BLE pairing and a unified connection manager to SmartAC.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/ac-controller/

TASK 1: Create lib/ble.js — BLE AC Pairing Service (for React Native side)

Note: BLE code runs on the mobile app, not the Express backend.
This is a React Native module spec.

Create SmartACApp/src/services/ble.ts:
```ts
import { BleManager, Device } from 'react-native-ble-plx';

// BLE is used primarily for:
// 1. Initial WiFi provisioning (help AC connect to home WiFi)
// 2. Direct control on some Midea/Carrier models
// 3. IR blaster discovery (Switchbot Hub)

interface BLEACDevice {
  id: string;              // BLE device ID
  name: string;            // e.g., "AC_MIDEA_1234"
  brand: string;           // Detected brand
  rssi: number;            // Signal strength
  serviceUUIDs: string[];  // BLE service UUIDs
}

class BLEService {
  private manager: BleManager;
  
  constructor() {
    this.manager = new BleManager();
  }
  
  // Scan for AC devices advertising via BLE
  async scanForACs(timeoutMs = 10000): Promise<BLEACDevice[]> {
    // Known AC BLE service UUIDs:
    // Midea: 0000FFF0-0000-1000-8000-00805F9B34FB
    // Some Samsung: Custom UUID
    // Switchbot: cba20d00-224d-11e6-9fb8-0002a5d5c51b
    
    // Also scan by name prefix:
    // "AC_", "MIDEA_", "CARRIER_", "DAIKIN_", "SAMSUNG_"
  }
  
  // WiFi provisioning: send WiFi credentials to AC via BLE
  async provisionWiFi(deviceId: string, ssid: string, password: string): Promise<boolean> {
    // Write WiFi credentials to provisioning characteristic
    // AC connects to WiFi, BLE can be disconnected
    // After provisioning, discover AC on WiFi network
  }
  
  // Direct BLE control (limited models)
  async sendBLECommand(deviceId: string, command: object): Promise<void> {
    // Encode command for BLE characteristic write
  }
  
  async getBLEStatus(deviceId: string): Promise<object> {
    // Read status from BLE characteristic
  }
}

export default new BLEService();
```

TASK 2: Create lib/connection-manager.js — Unified Connection Manager

This is the KEY abstraction layer. The rest of the app talks ONLY to this manager.
It handles routing to the right connection method automatically.

```js
// lib/connection-manager.js

class ConnectionManager {
  constructor(db, brands) {
    this.db = db;        // SQLite database
    this.brands = brands; // Brand database
    this.connections = new Map(); // deviceId → active connection
  }
  
  // Register a device with its connection method
  async registerDevice(device) {
    // device = { 
    //   id, name, brand, model,
    //   connectionType: 'smartthings' | 'wifi_local' | 'ir' | 'ble',
    //   config: { 
    //     // SmartThings: { token, deviceId }
    //     // WiFi: { ip, port, protocol }
    //     // IR: { blasterIp, brand, remote }
    //     // BLE: { bleDeviceId }
    //   }
    // }
    this.db.saveDevice(device);
  }
  
  // UNIFIED control — works regardless of connection type
  async getStatus(deviceId) {
    const device = this.db.getDevice(deviceId);
    switch (device.connectionType) {
      case 'smartthings':
        return this.getSmartThingsStatus(device);
      case 'wifi_local':
        return this.getWiFiStatus(device);
      case 'ir':
        return this.getIRStatus(device); // assumed state
      case 'ble':
        return this.getBLEStatus(device);
    }
  }
  
  async sendCommand(deviceId, command, value) {
    const device = this.db.getDevice(deviceId);
    // Route to correct protocol
    // Return normalized result
    // Log usage event
  }
  
  // Auto-detect best connection for a device
  async autoDetect(deviceHint) {
    const results = [];
    
    // 1. Try local WiFi first (fastest)
    const localDevices = await discovery.scan();
    const match = localDevices.find(d => d.model === deviceHint.model);
    if (match) results.push({ type: 'wifi_local', ...match, priority: 1 });
    
    // 2. Try SmartThings (if token available)
    if (deviceHint.token) {
      const stDevices = await smartthings.getDevices(deviceHint.token);
      const stMatch = stDevices.find(d => d.name === deviceHint.name);
      if (stMatch) results.push({ type: 'smartthings', ...stMatch, priority: 2 });
    }
    
    // 3. Suggest IR blaster (if nothing else found)
    results.push({ type: 'ir', priority: 3, requiresBlaster: true });
    
    return results.sort((a,b) => a.priority - b.priority);
  }
  
  // Hybrid mode: prefer local WiFi, fallback to SmartThings
  async getStatusHybrid(deviceId) {
    try {
      // Try local WiFi first (faster, no internet needed)
      return await this.getWiFiStatus(device);
    } catch {
      // Fallback to SmartThings cloud
      return await this.getSmartThingsStatus(device);
    }
  }
}
```

TASK 3: Add connection method info to all API responses

Every device status response should include:
```json
{
  "deviceId": "xxx",
  "connectionType": "wifi_local",
  "connectionIcon": "📶",
  "latency": 45,        // ms
  "lastUpdated": "2026-02-23T10:30:00Z",
  "capabilities": { ... },
  "status": { ... }
}
```

Connection type badges for the UI:
- ☁️ Cloud (SmartThings) — works remotely, requires internet
- 📶 WiFi (Local) — fastest, works without internet  
- 🔴 IR (Infrared) — any AC, status assumed
- 🔵 BLE (Bluetooth) — close range, for setup

VERIFY:
1. ConnectionManager routes getStatus to correct protocol
2. Auto-detect finds local WiFi device AND SmartThings device
3. Hybrid mode falls back gracefully
4. API responses include connectionType field
```

---

## Verification Criteria
- [ ] mDNS/SSDP discovers smart ACs on local network
- [ ] Daikin WiFi direct control works (HTTP API)
- [ ] Samsung WiFi direct control works (local API)
- [ ] IR blaster discovery finds Broadlink on network
- [ ] IR send command turns AC on/off
- [ ] IR learn mode captures custom codes
- [ ] BLE scan finds AC devices (if BLE-capable)
- [ ] ConnectionManager routes to correct protocol
- [ ] Auto-detect picks best connection method
- [ ] Hybrid mode: local WiFi → SmartThings fallback
- [ ] All connection types return normalized status format

## Files Created/Modified
```
ac-controller/
├── lib/
│   ├── discovery.js          (mDNS + SSDP + port scanner)
│   ├── connection-manager.js (unified routing layer)
│   ├── ble.js                (BLE service spec for RN)
│   ├── protocols/
│   │   ├── base.js           (base protocol class)
│   │   ├── daikin.js         (Daikin HTTP API)
│   │   ├── samsung-local.js  (Samsung local API)
│   │   ├── midea.js          (Midea binary protocol)
│   │   ├── gree.js           (Gree UDP protocol)
│   │   ├── haier.js          (Haier HTTP API)
│   │   └── index.js          (protocol router)
│   └── ir/
│       ├── broadlink.js      (Broadlink RM control)
│       ├── switchbot.js      (Switchbot Hub control)
│       ├── codes.js          (IR code database 50+ brands)
│       └── ir-ac-controller.js (high-level IR interface)

SmartACApp/src/
├── services/
│   └── ble.ts                (React Native BLE service)
```
