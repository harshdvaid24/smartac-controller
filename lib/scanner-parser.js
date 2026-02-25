/**
 * Scanner Parser — Intelligent AC model number matching
 * Parses scanned barcodes, QR codes, and text to identify AC brand/model.
 */

const brands = require('./brands');

// EAN/UPC manufacturer prefixes for known AC brands
const EAN_PREFIXES = [
  { prefix: '8801643', brand: 'samsung' },
  { prefix: '880164', brand: 'samsung' },
  { prefix: '88016', brand: 'samsung' },
  { prefix: '489', brand: 'lg' },
  { prefix: '4548', brand: 'panasonic' },
  { prefix: '4902', brand: 'panasonic' },
  { prefix: '4974', brand: 'daikin' },
  { prefix: '4951', brand: 'daikin' },
  { prefix: '6933', brand: 'midea' },
  { prefix: '6935', brand: 'haier' },
  { prefix: '6921', brand: 'gree' },
  { prefix: '884', brand: 'carrier' },
  { prefix: '890', brand: 'voltas' },
  { prefix: '891', brand: 'bluestar' },
  { prefix: '4902370', brand: 'hitachi' },
];

// WiFi SSID patterns that indicate AC brands
const SSID_PATTERNS = [
  { regex: /SAMSUNG[_-]AC/i, brand: 'samsung' },
  { regex: /DaikinAP/i, brand: 'daikin' },
  { regex: /LG[_-]AC/i, brand: 'lg' },
  { regex: /MIDEA[_-]/i, brand: 'midea' },
  { regex: /GREE[_-]/i, brand: 'gree' },
  { regex: /HAIER[_-]/i, brand: 'haier' },
  { regex: /CARRIER[_-]/i, brand: 'carrier' },
];

/**
 * Parse raw scanned text and return best match.
 * @param {string} rawText — barcode/QR content
 * @returns {{ type: string, brand: object|null, model: object|null, confidence: number, suggestedPresets: array }}
 */
function parseScannedCode(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { type: 'not_found', brand: null, model: null, confidence: 0, suggestedPresets: [] };
  }

  const text = rawText.trim();

  // 1. Try SmartThings QR code
  const stResult = parseSmartThingsQR(text);
  if (stResult) return stResult;

  // 2. Try WiFi setup QR (WIFI:T:WPA;S:SSID;P:password;;)
  const wifiResult = parseWiFiQR(text);
  if (wifiResult) return wifiResult;

  // 3. Try URL-based QR
  const urlResult = parseURLQR(text);
  if (urlResult) return urlResult;

  // 4. Try JSON QR
  const jsonResult = parseJSONQR(text);
  if (jsonResult) return jsonResult;

  // 5. Extract model number and try exact match
  const modelNumber = extractModelNumber(text);
  const exactResult = brands.lookupByModel(modelNumber);
  if (exactResult && exactResult.match !== 'not_found') {
    return {
      type: exactResult.match,
      brand: {
        id: exactResult.brand.id,
        name: exactResult.brand.name,
        emoji: exactResult.brand.logo_emoji,
        country: exactResult.brand.country,
      },
      model: exactResult.model || { number: modelNumber, wattage: exactResult.brand.defaultWattage },
      confidence: exactResult.confidence || (exactResult.match === 'exact' ? 0.98 : 0.75),
      suggestedPresets: brands.generatePresets(
        { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: exactResult.brand.specialCapabilities || [] },
        exactResult.model?.wattage || exactResult.brand.defaultWattage
      ),
    };
  }

  // 6. Try EAN/UPC prefix brand detection
  const eanResult = matchEANPrefix(text);
  if (eanResult) return eanResult;

  // 7. Try fuzzy match
  const fuzzyResult = fuzzyMatch(modelNumber);
  if (fuzzyResult) return fuzzyResult;

  // 8. Not found
  return {
    type: 'not_found',
    brand: null,
    model: null,
    confidence: 0,
    query: text,
    suggestedPresets: [],
  };
}

/**
 * Extract model number from barcode text, stripping common prefixes/suffixes.
 */
function extractModelNumber(text) {
  // Remove common separators and whitespace
  let cleaned = text.replace(/[\s\-_]/g, '').toUpperCase();

  // Remove trailing serial number patterns (long numeric suffixes)
  cleaned = cleaned.replace(/(\d{8,})$/, '');

  // Remove common barcode wrappers
  cleaned = cleaned.replace(/^\[|\]$/g, '');

  // If it looks like an EAN-13 (13 digits), extract manufacturer code
  if (/^\d{13}$/.test(cleaned)) {
    return cleaned; // Let EAN prefix matching handle it
  }

  // If it looks like a model number (alphanumeric mix), return as-is
  if (/^[A-Z]{1,4}\d{2,}[A-Z0-9]*$/.test(cleaned)) {
    return cleaned;
  }

  return text.trim();
}

/**
 * Parse SmartThings QR code data.
 */
function parseSmartThingsQR(text) {
  try {
    // SmartThings QR codes are usually JSON with mnId, setupPayload, etc.
    if (text.includes('mnId') || text.includes('smartthings')) {
      const data = JSON.parse(text);
      const modelNumber = data.modelNumber || data.model || data.mnId || '';
      if (modelNumber) {
        const result = brands.lookupByModel(modelNumber);
        if (result && result.match !== 'not_found') {
          return {
            type: 'smartthings_qr',
            brand: { id: result.brand.id, name: result.brand.name, emoji: result.brand.logo_emoji, country: result.brand.country },
            model: result.model || { number: modelNumber, wattage: result.brand.defaultWattage },
            confidence: 0.99,
            smartThingsData: data,
            suggestedPresets: brands.generatePresets(
              { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: result.brand.specialCapabilities || [] },
              result.model?.wattage || result.brand.defaultWattage
            ),
          };
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Parse WiFi QR code (WIFI:T:WPA;S:SSID;P:password;;)
 */
function parseWiFiQR(text) {
  const wifiMatch = text.match(/WIFI:.*S:([^;]+)/i);
  if (!wifiMatch) return null;

  const ssid = wifiMatch[1];
  for (const pattern of SSID_PATTERNS) {
    if (pattern.regex.test(ssid)) {
      const allBrands = brands.getAllBrands();
      const brand = allBrands.find(b => b.id === pattern.brand);
      if (brand) {
        // Try to extract model from SSID
        const modelMatch = ssid.match(/[A-Z]{2,4}\d{2,}[A-Z0-9]*/i);
        let model = null;
        if (modelMatch) {
          const lookup = brands.lookupByModel(modelMatch[0]);
          if (lookup && lookup.model) model = lookup.model;
        }
        return {
          type: 'wifi_qr',
          brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
          model: model || { number: ssid, wattage: brand.defaultWattage },
          confidence: 0.85,
          wifiSSID: ssid,
          suggestedPresets: brands.generatePresets(
            { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: brand.specialCapabilities || [] },
            model?.wattage || brand.defaultWattage
          ),
        };
      }
    }
  }
  return null;
}

/**
 * Parse URL-based QR code.
 */
function parseURLQR(text) {
  try {
    if (text.startsWith('http')) {
      const url = new URL(text);
      const modelParam = url.searchParams.get('model') || url.searchParams.get('mn');
      if (modelParam) {
        const result = brands.lookupByModel(modelParam);
        if (result && result.match !== 'not_found') {
          return {
            type: 'url_qr',
            brand: { id: result.brand.id, name: result.brand.name, emoji: result.brand.logo_emoji, country: result.brand.country },
            model: result.model || { number: modelParam, wattage: result.brand.defaultWattage },
            confidence: 0.90,
            url: text,
            suggestedPresets: brands.generatePresets(
              { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: result.brand.specialCapabilities || [] },
              result.model?.wattage || result.brand.defaultWattage
            ),
          };
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Parse JSON QR code with device info.
 */
function parseJSONQR(text) {
  try {
    if (text.startsWith('{')) {
      const data = JSON.parse(text);
      const modelNumber = data.model || data.modelNumber || data.product || '';
      if (modelNumber) {
        const result = brands.lookupByModel(modelNumber);
        if (result && result.match !== 'not_found') {
          return {
            type: 'json_qr',
            brand: { id: result.brand.id, name: result.brand.name, emoji: result.brand.logo_emoji, country: result.brand.country },
            model: result.model || { number: modelNumber },
            confidence: 0.92,
            suggestedPresets: [],
          };
        }
      }
    }
  } catch {}
  return null;
}

/**
 * Match EAN/UPC barcode prefixes to brand.
 */
function matchEANPrefix(text) {
  const digits = text.replace(/\D/g, '');
  if (digits.length < 8) return null;

  for (const { prefix, brand: brandId } of EAN_PREFIXES) {
    if (digits.startsWith(prefix)) {
      const allBrands = brands.getAllBrands();
      const brand = allBrands.find(b => b.id === brandId);
      if (brand) {
        return {
          type: 'brand_only',
          brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
          model: null,
          confidence: 0.60,
          eanCode: digits,
          suggestedPresets: brands.generatePresets(
            { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: brand.specialCapabilities || [] },
            brand.defaultWattage
          ),
        };
      }
    }
  }
  return null;
}

/**
 * Fuzzy match a model number against the database.
 */
function fuzzyMatch(text) {
  if (!text || text.length < 3) return null;

  const upper = text.toUpperCase();
  const allBrands = brands.getAllBrands();

  // Try matching the first 4-6 chars against brand model patterns
  for (const brand of allBrands) {
    if (!brand.models) continue;
    for (const model of brand.models) {
      if (!model.number) continue;
      const modelUpper = model.number.toUpperCase();
      // Check if the input starts with the same prefix (first 4+ chars)
      const commonLen = Math.min(upper.length, modelUpper.length, 6);
      const inputPrefix = upper.slice(0, commonLen);
      const modelPrefix = modelUpper.slice(0, commonLen);
      if (inputPrefix === modelPrefix && commonLen >= 4) {
        return {
          type: 'partial',
          brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
          model: model,
          confidence: 0.65 + (commonLen * 0.05),
          suggestedPresets: brands.generatePresets(
            { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: brand.specialCapabilities || [] },
            model.wattage || brand.defaultWattage
          ),
        };
      }
    }
  }

  // Try brand name in text
  for (const brand of allBrands) {
    if (upper.includes(brand.name.toUpperCase())) {
      return {
        type: 'brand_only',
        brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
        model: null,
        confidence: 0.50,
        suggestedPresets: [],
      };
    }
  }

  return null;
}

/**
 * Search brands by partial text (for autocomplete).
 */
function searchBrands(query) {
  if (!query || query.length < 2) return [];

  const upper = query.toUpperCase();
  const results = [];
  const allBrands = brands.getAllBrands();

  for (const brand of allBrands) {
    // Match brand name
    if (brand.name.toUpperCase().includes(upper)) {
      results.push({
        brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
        models: (brand.models || []).slice(0, 5),
        matchType: 'brand_name',
      });
      continue;
    }

    // Match model numbers
    if (brand.models) {
      const matchingModels = brand.models.filter(m =>
        m.number && m.number.toUpperCase().includes(upper)
      );
      if (matchingModels.length > 0) {
        results.push({
          brand: { id: brand.id, name: brand.name, emoji: brand.logo_emoji, country: brand.country },
          models: matchingModels.slice(0, 5),
          matchType: 'model_number',
        });
      }
    }
  }

  return results.slice(0, 10);
}

module.exports = {
  parseScannedCode,
  extractModelNumber,
  parseSmartThingsQR,
  fuzzyMatch,
  searchBrands,
};
