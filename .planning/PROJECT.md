# PROJECT: SmartAC — Universal Smart Air Conditioner Controller

## Vision
Transform a Samsung-specific AC night-mode controller into a **universal, brand-agnostic Smart AC mobile app** built with React Native. The app connects to ACs via **three methods** — SmartThings Cloud API, **direct WiFi (local network)**, or **IR blaster** — dynamically detects capabilities, provides smart presets, tracks energy usage, and calculates real monetary savings — all through a beautiful, native mobile experience.

## Connection Methods
| Method | How It Works | Requires | Covers |
|--------|-------------|----------|--------|
| **1. SmartThings Cloud** | API proxy → SmartThings servers → AC | SmartThings token + internet | Any SmartThings-connected AC |
| **2. Local WiFi (Direct)** | Phone → LAN → AC's built-in HTTP/MQTT API | Same WiFi network | Samsung, LG, Daikin, Midea, and any AC with WiFi module |
| **3. IR Blaster** | Phone → BLE/WiFi → IR blaster device → AC | Broadlink RM / Switchbot Hub / Tuya IR | ANY AC (even non-smart "dumb" ACs) |
| **4. Bluetooth (BLE)** | Phone → BLE → AC (for initial pairing/setup) | BLE-capable AC | Initial WiFi provisioning, some Midea/Carrier models |

**Priority:** Local WiFi first (fastest, no cloud dependency), SmartThings fallback (when away from home), IR blaster for non-smart ACs.

## Problem Statement
- The current controller is a single-page web app hardcoded for one Samsung model (AR18CYLANWKN)
- It only supports Samsung-specific capabilities (WindFree, WindFreeSleep)
- No energy tracking, no savings insights, no multi-device support
- Web-only — no native mobile experience, no push notifications, no widgets
- Setup requires manual token entry with no device scanning
- Cloud-only — depends entirely on SmartThings servers (no local/direct control)
- Can't control non-smart ACs at all

## Target Users
- **Primary:** Homeowners with 1-5 SmartThings-connected ACs who want to save money on electricity
- **Secondary:** Tech-savvy users who want granular AC control from their phone
- **Tertiary:** Families managing multiple ACs across rooms

## Tech Stack (Latest Versions — Feb 2026)
| Layer | Technology | Version |
|-------|------------|-------- |
| Mobile App | React Native (bare workflow) + TypeScript | 0.79+ (New Architecture enabled) |
| Navigation | React Navigation | v7 |
| State Management | Zustand | v5+ |
| Styling | NativeWind | v4 (Tailwind CSS v4 for RN) |
| Charts | Victory Native (Skia) | v41+ |
| Camera/Scanner | react-native-vision-camera | v4+ |
| Local DB | OP-SQLite (fastest RN SQLite) | v9+ |
| Cloud DB | Supabase (free tier — Postgres + Auth + Realtime) | v2+ |
| Backend API | Node.js + Express (existing, refactored) | Express 5 |
| Smart Home API | Samsung SmartThings API v1 | — |
| Local Network | react-native-zeroconf (mDNS/Bonjour) + TCP sockets | v0.13+ |
| BLE | react-native-ble-plx | v3+ |
| IR Blaster | Broadlink / Switchbot / Tuya local API | Custom lib |
| Notifications | Notifee | v9+ |
| Animations | react-native-reanimated | v3.16+ |
| Gestures | react-native-gesture-handler | v2.20+ |
| Icons | react-native-vector-icons | v10+ |

## Supported AC Brands (via SmartThings)
All brands that integrate with Samsung SmartThings, including:
- **Samsung** — WindFree, WindFreeSleep, AI modes
- **LG** — ThinQ integration via SmartThings
- **Daikin** — SmartThings compatible models
- **Carrier** — Wi-Fi enabled models with SmartThings
- **Voltas** — Smart AC models
- **Blue Star** — IoT-enabled models
- **Hitachi** — Connected models
- **Panasonic** — SmartThings linked
- **Mitsubishi** — Kumo Cloud → SmartThings
- **Whirlpool** — 3D Cool models
- **Godrej** — IoT models
- **Lloyd** — Smart models
- **Haier** — Smart Cool models
- **Toshiba** — SmartThings native
- **Any other** — Any AC exposing `airConditionerMode`, `thermostatCoolingSetpoint`, or `switch` capabilities on SmartThings

## Supported AC Brands (Direct WiFi — No Cloud Needed)
ACs with built-in WiFi modules that expose local HTTP/MQTT APIs:
- **Samsung** — Port 8888/8889 local API, mDNS `_samsung-ac._tcp`
- **LG ThinQ** — Local ThinQ API via mDNS `_lg-smart._tcp`
- **Daikin** — Port 80 HTTP API, mDNS `_daikin._tcp` (very well-documented)
- **Midea / Carrier / Toshiba** — Midea protocol (port 6444), used by 20+ OEM brands
- **Haier** — Local HTTP API on port 56800
- **Gree / Hisense** — UDP port 7000 local discovery
- **TCL / Bosch** — Via Midea protocol (OEM)

## Supported via IR Blaster (ANY AC)
With an IR blaster (Broadlink RM4, Switchbot Hub, Tuya IR), SmartAC can control:
- ANY air conditioner ever made (even 20-year-old non-smart units)
- IR code databases cover 5000+ AC models
- Learn-mode for unknown remotes

## Key Differentiator
Instead of hardcoding brand-specific features, SmartAC **dynamically reads each device's capability schema** — from SmartThings cloud, local WiFi API, or IR blaster — and renders only the controls that device actually supports. A Samsung with WindFree shows WindFree. A Daikin without it doesn't. Zero config needed.

**Works without internet** — Local WiFi control means your AC responds in <100ms even if your internet is down.

## Default Configuration
- Electricity rate: ₹8/kWh (configurable per user)
- Temperature unit: °C (configurable)
- Currency: INR (configurable)
- Baseline comparison: 8 hours at 18°C (worst case) vs actual usage

## Constraints
- Must maintain backward compatibility with existing web UI
- Node.js 18+ required (native fetch)
- SmartThings token required for cloud mode (not needed for local WiFi / IR)
- Free tier databases only (Supabase free: 500MB, 50K rows)
- React Native 0.79+ with New Architecture (Fabric + TurboModules) enabled by default
- Minimum iOS 15 / Android API 24 (Android 7.0)
