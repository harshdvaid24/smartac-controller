# PHASE 3 — QR/Barcode Scanner for AC Setup

## Goal
Add camera-based QR code and barcode scanning to quickly identify AC models, auto-lookup brand database for wattage and preset suggestions, and streamline device setup.

## Requirements Covered
R3 (QR/Barcode Scanner)

## Dependencies
Phase 2 (React Native app must exist)

---

## Prompts

### Prompt 3-1: Camera Scanner Component

```
You are adding QR/barcode scanning to the SmartAC React Native app.

WORKING DIRECTORY: /Users/harshvaid/Work/AC/SmartACApp/

TASK: Build a barcode/QR scanner screen and component

1. Install dependencies:
   npm install react-native-vision-camera
   npm install react-native-worklets-core
   cd ios && pod install && cd ..

2. Create src/screens/ScannerScreen.tsx:
   
   DESIGN:
   - Full screen camera preview
   - Overlay with scanning frame (centered rectangle with animated border)
   - Title: "Scan Your AC" at top
   - Subtitle: "Point at the model number barcode or QR code on your AC unit"
   - Bottom sheet with:
     * "Where to find it?" — expandable help with illustration
     * "Enter manually instead" — text link to manual entry
   - Flash toggle button (top right)
   - Close button (top left)

   SCANNING BEHAVIOR:
   - Support barcode types: QR, Code128, Code39, EAN13, EAN8, UPC-A, UPC-E
   - On successful scan:
     * Haptic feedback (success pattern)
     * Pause camera
     * Extract text from barcode
     * Look up in brands database: POST /api/brands/lookup { code: scannedText }
     * If found → show result card with brand, model, wattage
     * If not found → show "Model not in database" + manual entry form
   - Debounce scans (ignore same code for 3 seconds)

3. Create src/components/ScanResult.tsx:
   - Card that slides up from bottom after successful scan
   - Shows: Brand logo emoji, Brand name, Model, Wattage, Tonnage
   - "Use This AC" button → saves to device profile
   - "Scan Again" button → resume camera
   - "Not my AC?" link → manual entry

4. Create src/screens/ManualModelEntry.tsx:
   - Search input with autocomplete
   - Searches brand database as user types
   - Results list showing matching models
   - "My model isn't listed" → generic setup (user enters wattage manually)
   - Common AC models shown as quick picks

5. Camera permissions:
   - iOS: Add NSCameraUsageDescription to Info.plist: "SmartAC uses your camera to scan AC model barcodes for automatic setup"
   - Android: Add CAMERA permission to AndroidManifest.xml
   - Handle permission denied gracefully → show manual entry instead

6. Integration with Setup flow:
   - Add "Scan AC Model" button to SetupScreen (after device discovery)
   - Flow: Discover device → Scan model → Auto-match brand/wattage → Save → Dashboard
   - Optional step — user can skip scanning

VERIFY: 
1. Open scanner → camera preview shows with overlay
2. Scan a barcode → lookup result appears
3. Permission denied → falls back to manual entry
```

### Prompt 3-2: Brand Matching Intelligence

```
You are enhancing the brand lookup logic for scanned AC codes.

FILE: Backend lib/brands.js + new lib/scanner-parser.js

TASK: Create intelligent model number parsing

AC model numbers often appear in different formats on labels vs databases.
Build a parser that handles:

1. EXACT MATCH: "AR18CYLANWKN" → Samsung AR18CYLANWKN
2. PARTIAL MATCH: "AR18CYL" → Samsung AR18 series (closest match)
3. BARCODE PREFIX: Remove common prefixes/suffixes from barcodes
   - "8801643" (Samsung EAN prefix) → Samsung brand
   - "489" (LG prefix)
   - "4548" (Panasonic prefix)
4. REGEX PATTERN: Match against brand patterns array
5. TEXT EXTRACTION: From QR codes that contain JSON or URLs
   - SmartThings QR: parse device info
   - WiFi setup QR: extract model from SSID like "SAMSUNG_AC_AR18..."

Create lib/scanner-parser.js:
```js
module.exports = {
  // Parse raw scanned text and return best match
  parseScannedCode(rawText) {
    // Returns: { type: 'exact'|'partial'|'brand_only'|'unknown', brand, model, wattage, confidence }
  },
  
  // Extract model number from various barcode formats
  extractModelNumber(barcodeText) { ... },
  
  // Parse SmartThings QR code
  parseSmartThingsQR(qrData) { ... },
  
  // Fuzzy match model number against database
  fuzzyMatch(modelNumber, tolerance) { ... }
}
```

Add backend endpoint:
POST /api/brands/lookup
Body: { code: "scanned text" }
Response: { 
  match: 'exact'|'partial'|'brand_only'|'not_found',
  confidence: 0.95,
  brand: { id, name, emoji },
  model: { number, wattage, tonnage },
  suggestedPresets: [...]
}

VERIFY: 
- lookupByCode("AR18CYLANWKN") → Samsung exact match, high confidence
- lookupByCode("8801643XXXXX") → Samsung brand match from EAN prefix
- lookupByCode("unknown123") → not_found with suggestions
```

---

## Verification Criteria
- [ ] Camera opens with scanning frame
- [ ] Scanning a barcode triggers lookup
- [ ] Known model → shows brand + wattage
- [ ] Unknown model → manual entry fallback
- [ ] Camera permission denied → graceful fallback
- [ ] Scanned info persists to device profile

## Files Created
```
SmartACApp/src/
├── screens/
│   ├── ScannerScreen.tsx
│   └── ManualModelEntry.tsx
├── components/
│   └── ScanResult.tsx

ac-controller/
├── lib/
│   └── scanner-parser.js
```
