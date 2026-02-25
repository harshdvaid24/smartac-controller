/**
 * SmartAC Brand Database
 * Comprehensive AC brand database with model patterns, wattages, and preset generation.
 * Covers 15+ major brands sold globally (especially India).
 */

const brands = [
  {
    id: 'samsung',
    name: 'Samsung',
    country: 'South Korea',
    logo_emoji: '🌀',
    defaultWattage: 1580,
    patterns: [/^AR\d/i, /^F-AR/i, /^AJ\d/i],
    specialCapabilities: ['windFree', 'windFreeSleep'],
    models: [
      { model: 'AR18CYLANWKN', wattage: 1580, tonnage: 1.5, type: 'Split Inverter' },
      { model: 'AR24CYLANWKN', wattage: 2100, tonnage: 2.0, type: 'Split Inverter' },
      { model: 'AR12TYAANWKN', wattage: 1180, tonnage: 1.0, type: 'Split Inverter' },
      { model: 'AR18BYFAMWKN', wattage: 1580, tonnage: 1.5, type: 'WindFree' },
      { model: 'AR24BYFAMWKN', wattage: 2100, tonnage: 2.0, type: 'WindFree' },
      { model: 'AR18CYECAWKN', wattage: 1580, tonnage: 1.5, type: 'Convertible 5-in-1' },
      { model: 'AR18AY5YATZ', wattage: 1580, tonnage: 1.5, type: 'WindFree' },
      { model: 'AR24AY5YATZ', wattage: 2100, tonnage: 2.0, type: 'WindFree' },
    ],
  },
  {
    id: 'lg',
    name: 'LG',
    country: 'South Korea',
    logo_emoji: '🔵',
    defaultWattage: 1600,
    patterns: [/^LS-/i, /^PS-/i, /^RS-/i, /^MS-/i, /^KS-/i, /^BSQ/i, /^TSQ/i],
    specialCapabilities: ['AI', 'ThinQ'],
    models: [
      { model: 'LS-Q18YNZA', wattage: 1600, tonnage: 1.5, type: 'Dual Inverter' },
      { model: 'PS-Q19YNZE', wattage: 1700, tonnage: 1.5, type: 'Super Convertible 6-in-1' },
      { model: 'RS-Q19YNZE', wattage: 1700, tonnage: 1.5, type: 'Dual Inverter' },
      { model: 'MS-Q18YNZA', wattage: 1600, tonnage: 1.5, type: 'Convertible 4-in-1' },
      { model: 'LS-Q24YNZA', wattage: 2200, tonnage: 2.0, type: 'Dual Inverter' },
      { model: 'BSQ18YNZE', wattage: 1600, tonnage: 1.5, type: 'AI Convertible 6-in-1' },
      { model: 'TSQ18YNZE', wattage: 1600, tonnage: 1.5, type: 'AI Convertible' },
    ],
  },
  {
    id: 'daikin',
    name: 'Daikin',
    country: 'Japan',
    logo_emoji: '🟢',
    defaultWattage: 1500,
    patterns: [/^FTK/i, /^FTKF/i, /^FTKM/i, /^JTKJ/i, /^FTL/i, /^FTHT/i, /^MTKL/i],
    specialCapabilities: ['coanda', 'econo', 'streamer'],
    models: [
      { model: 'FTKF50UV16V', wattage: 1500, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'FTKM50UV16V', wattage: 1600, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'JTKJ50TV16U', wattage: 1580, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'FTHT50UV16V', wattage: 1580, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'MTKL50TV16W', wattage: 1500, tonnage: 1.5, type: 'Convertible' },
      { model: 'FTL50TV16W3', wattage: 1500, tonnage: 1.5, type: '3 Star Inverter' },
    ],
  },
  {
    id: 'carrier',
    name: 'Carrier',
    country: 'USA',
    logo_emoji: '🔴',
    defaultWattage: 1580,
    patterns: [/^CAI/i, /^ESTAR/i, /^24K/i, /^ESTER/i],
    specialCapabilities: ['flexicool', 'convertible4in1'],
    models: [
      { model: 'CAI18EK5R39F0', wattage: 1580, tonnage: 1.5, type: 'Flexicool Inverter' },
      { model: 'ESTAR18K5R39F0', wattage: 1620, tonnage: 1.5, type: '5 Star Inverter' },
      { model: 'CAI24EK5R39F0', wattage: 2200, tonnage: 2.0, type: 'Flexicool Inverter' },
      { model: 'CAI18ES5R30F0', wattage: 1500, tonnage: 1.5, type: '5 Star Split' },
    ],
  },
  {
    id: 'voltas',
    name: 'Voltas',
    country: 'India',
    logo_emoji: '🟡',
    defaultWattage: 1580,
    patterns: [/^183V/i, /^184V/i, /^SAC_/i, /^185V/i, /^243V/i, /^244V/i],
    specialCapabilities: ['adjustableInverter'],
    models: [
      { model: '183V_CZTT', wattage: 1580, tonnage: 1.5, type: 'Split Inverter' },
      { model: '184V_CZTT', wattage: 1580, tonnage: 1.5, type: 'Split Inverter' },
      { model: '183V_EAZR', wattage: 1500, tonnage: 1.5, type: 'Adjustable Inverter' },
      { model: '185V_DAZR', wattage: 1620, tonnage: 1.5, type: '5 Star Inverter' },
      { model: '183V_CAZJ', wattage: 1500, tonnage: 1.5, type: '3 Star Inverter' },
      { model: '243V_CZTT', wattage: 2200, tonnage: 2.0, type: 'Split Inverter' },
    ],
  },
  {
    id: 'bluestar',
    name: 'Blue Star',
    country: 'India',
    logo_emoji: '🔷',
    defaultWattage: 1610,
    patterns: [/^IC\d/i, /^IA\d/i, /^ID\d/i, /^FS\d/i, /^BS-/i],
    specialCapabilities: ['precisionCooling'],
    models: [
      { model: 'IC518DATU', wattage: 1610, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'IA518DLU', wattage: 1600, tonnage: 1.5, type: '5 Star Inverter' },
      { model: 'ID518DLU', wattage: 1620, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'IC524DATU', wattage: 2200, tonnage: 2.0, type: 'Inverter Split' },
    ],
  },
  {
    id: 'hitachi',
    name: 'Hitachi',
    country: 'Japan',
    logo_emoji: '⚫',
    defaultWattage: 1620,
    patterns: [/^RAU/i, /^RSB/i, /^RSNG/i, /^RMNG/i, /^RSQG/i],
    specialCapabilities: ['iCleen', 'tropicalInverter'],
    models: [
      { model: 'RSNG518HCEA', wattage: 1620, tonnage: 1.5, type: 'Tropical Inverter' },
      { model: 'RMNG518HCEA', wattage: 1610, tonnage: 1.5, type: 'Inverter Split' },
      { model: 'RSQG518HCEA', wattage: 1600, tonnage: 1.5, type: '5 Star Inverter' },
    ],
  },
  {
    id: 'panasonic',
    name: 'Panasonic',
    country: 'Japan',
    logo_emoji: '🟦',
    defaultWattage: 1580,
    patterns: [/^CS-?CU/i, /^CS-/i, /^CU-/i, /^NA-/i],
    specialCapabilities: ['nanoeX', 'MirAIe'],
    models: [
      { model: 'CS-CU-NU18YKY5W', wattage: 1580, tonnage: 1.5, type: 'Wi-Fi Inverter' },
      { model: 'CS-CU-WU18YKYXF', wattage: 1600, tonnage: 1.5, type: 'Wi-Fi Split' },
      { model: 'CS-CU-NU24YKY5W', wattage: 2200, tonnage: 2.0, type: 'Wi-Fi Inverter' },
      { model: 'CS-CU-ZU18YKYXF', wattage: 1600, tonnage: 1.5, type: '5 Star Wi-Fi' },
    ],
  },
  {
    id: 'mitsubishi',
    name: 'Mitsubishi Electric',
    country: 'Japan',
    logo_emoji: '🔺',
    defaultWattage: 1550,
    patterns: [/^MSZ/i, /^MSY/i, /^MUZ/i, /^SRK/i],
    specialCapabilities: ['3DiSeeSensor', 'econoCool'],
    models: [
      { model: 'MSZ-EF42VGK', wattage: 1550, tonnage: 1.5, type: 'Designer Series' },
      { model: 'MSY-GR18VF', wattage: 1460, tonnage: 1.5, type: 'Heavy Duty' },
      { model: 'MSZ-AP50VGK', wattage: 1600, tonnage: 1.5, type: 'Premium Inverter' },
      { model: 'SRK20ZS-S', wattage: 1200, tonnage: 1.0, type: 'Inverter Split' },
    ],
  },
  {
    id: 'whirlpool',
    name: 'Whirlpool',
    country: 'USA',
    logo_emoji: '🌊',
    defaultWattage: 1600,
    patterns: [/^SAI\d/i, /^MAGICOOL/i, /^3DCOOL/i],
    specialCapabilities: ['3DCool', 'intelliFresh'],
    models: [
      { model: 'SAI18B39MC0', wattage: 1600, tonnage: 1.5, type: '3D Cool Inverter' },
      { model: 'MAGICOOL PRO 3S', wattage: 1580, tonnage: 1.5, type: '3 Star Split' },
      { model: 'SAI18K39DC0', wattage: 1580, tonnage: 1.5, type: 'Intellicool Inverter' },
    ],
  },
  {
    id: 'godrej',
    name: 'Godrej',
    country: 'India',
    logo_emoji: '🟤',
    defaultWattage: 1590,
    patterns: [/^GIC/i, /^GSC/i, /^AC\d/i],
    specialCapabilities: ['iSense', 'convertible5in1'],
    models: [
      { model: 'GIC18HTC5-WTA', wattage: 1590, tonnage: 1.5, type: '5 Star Inverter' },
      { model: 'GIC18UGC5-WTA', wattage: 1600, tonnage: 1.5, type: 'Convertible 5-in-1' },
      { model: 'GIC24HTC5-WTA', wattage: 2200, tonnage: 2.0, type: '5 Star Inverter' },
    ],
  },
  {
    id: 'lloyd',
    name: 'Lloyd',
    country: 'India',
    logo_emoji: '🟩',
    defaultWattage: 1600,
    patterns: [/^GLS\d/i, /^LS\d/i, /^LC\d/i],
    specialCapabilities: ['goldenFin', 'antiBacterialFilter'],
    models: [
      { model: 'GLS18I5FWBEV', wattage: 1600, tonnage: 1.5, type: '5 Star Inverter' },
      { model: 'GLS18I3FWRHD', wattage: 1620, tonnage: 1.5, type: '3 Star Inverter' },
      { model: 'GLS24I5FWBEV', wattage: 2200, tonnage: 2.0, type: '5 Star Inverter' },
    ],
  },
  {
    id: 'haier',
    name: 'Haier',
    country: 'China',
    logo_emoji: '🧊',
    defaultWattage: 1580,
    patterns: [/^HSU/i, /^AS\d/i],
    specialCapabilities: ['selfClean', 'frostWash'],
    models: [
      { model: 'HSU18C-TFW5B(INV)', wattage: 1580, tonnage: 1.5, type: 'Frost Self-Clean' },
      { model: 'HSU18C-TQG5BE(INV)', wattage: 1590, tonnage: 1.5, type: 'Kinouchi 5 Star' },
      { model: 'HSU24C-TFW5B(INV)', wattage: 2200, tonnage: 2.0, type: 'Frost Self-Clean' },
    ],
  },
  {
    id: 'toshiba',
    name: 'Toshiba',
    country: 'Japan',
    logo_emoji: '🟣',
    defaultWattage: 1540,
    patterns: [/^RAS-/i, /^RAV-/i],
    specialCapabilities: ['hiWall', 'smartDiagnosis'],
    models: [
      { model: 'RAS-18U2KCV-IN', wattage: 1540, tonnage: 1.5, type: 'Hi-Wall Inverter' },
      { model: 'RAS-24S3KCV-IN', wattage: 2100, tonnage: 2.0, type: 'Hi-Wall Inverter' },
    ],
  },
  {
    id: 'ogeneral',
    name: "O'General (Fujitsu)",
    country: 'Japan',
    logo_emoji: '🏔️',
    defaultWattage: 1580,
    patterns: [/^ASGG/i, /^ASGA/i, /^ASGC/i, /^ASGK/i],
    specialCapabilities: ['hyperTropicalInverter'],
    models: [
      { model: 'ASGG18CGTB', wattage: 1580, tonnage: 1.5, type: 'Hyper Tropical Inverter' },
      { model: 'ASGA18BMWA', wattage: 1600, tonnage: 1.5, type: 'Split Inverter' },
      { model: 'ASGG24CGTB', wattage: 2200, tonnage: 2.0, type: 'Hyper Tropical Inverter' },
    ],
  },
];

/**
 * Look up brand & model info by model number.
 * Tries exact match first, then pattern match.
 */
function lookupByModel(modelNumber) {
  if (!modelNumber) return null;
  const q = modelNumber.trim();

  for (const brand of brands) {
    // Exact model match
    const exactModel = brand.models.find(
      m => m.model.toLowerCase() === q.toLowerCase()
    );
    if (exactModel) {
      return { brand, model: exactModel, match: 'exact', confidence: 1.0 };
    }
  }

  // Pattern match
  for (const brand of brands) {
    for (const pattern of brand.patterns) {
      if (pattern.test(q)) {
        // Try partial model match
        const partial = brand.models.find(m =>
          q.toLowerCase().startsWith(m.model.toLowerCase().slice(0, 6))
        );
        return {
          brand,
          model: partial || { model: q, wattage: brand.defaultWattage, tonnage: null, type: 'Unknown' },
          match: partial ? 'partial' : 'pattern',
          confidence: partial ? 0.8 : 0.6,
        };
      }
    }
  }

  return null;
}

/**
 * Look up brand info from manufacturer name.
 */
function lookupByManufacturer(manufacturer) {
  if (!manufacturer) return null;
  const m = manufacturer.toLowerCase();

  for (const brand of brands) {
    if (m.includes(brand.id) || m.includes(brand.name.toLowerCase())) {
      return {
        brand,
        model: null,
        match: 'manufacturer',
        confidence: 0.5,
      };
    }
  }
  return null;
}

/**
 * Get all brands summary for API.
 */
function getAllBrands() {
  return brands.map(b => ({
    id: b.id,
    name: b.name,
    country: b.country,
    emoji: b.logo_emoji,
    modelCount: b.models.length,
    specialCapabilities: b.specialCapabilities,
  }));
}

/**
 * Get a brand by its slug id.
 */
function getBrand(brandId) {
  return brands.find(b => b.id === brandId) || null;
}

/**
 * Generate smart presets based on actual device capabilities.
 * Adapts to whatever the device supports — no hardcoded assumptions.
 */
function generatePresets(capabilities, wattage) {
  const presets = [];
  const modes = capabilities.modes || ['cool'];
  const fans = capabilities.fanSpeeds || ['auto'];
  const specials = capabilities.specialModes || [];

  // Helper to pick best available mode
  const pick = (priority, available) => {
    for (const p of priority) {
      if (available.includes(p)) return p;
    }
    return available[0] || 'off';
  };

  // 1. ULTRA SAVER — max savings
  presets.push({
    id: 'ultra-saver',
    name: 'Ultra Saver',
    icon: '🌙',
    description: 'Maximum savings, minimal power',
    temp: 26,
    mode: pick(['cool', 'auto', 'dry'], modes),
    fan: pick(['low', 'auto', '1', 'quiet'], fans),
    specialMode: pick(['windFreeSleep', 'sleep', 'quiet', 'eco', 'off'], specials),
    swing: 'off',
    estimatedWattage: Math.round(wattage * 0.42),
    isCustom: false,
  });

  // 2. BALANCED — comfort + savings
  presets.push({
    id: 'balanced',
    name: 'Balanced',
    icon: '⚖️',
    description: 'Good comfort with energy savings',
    temp: 24,
    mode: pick(['cool', 'auto'], modes),
    fan: pick(['auto', 'medium', '3'], fans),
    specialMode: pick(['quiet', 'eco', 'windFree', 'off'], specials),
    swing: 'off',
    estimatedWattage: Math.round(wattage * 0.6),
    isCustom: false,
  });

  // 3. COMFORT — prioritize comfort
  presets.push({
    id: 'comfort',
    name: 'Comfort',
    icon: '❄️',
    description: 'Comfortable temperature, auto everything',
    temp: 22,
    mode: pick(['cool', 'auto'], modes),
    fan: pick(['auto', 'medium', '3'], fans),
    specialMode: pick(['windFree', 'comfort', 'off'], specials),
    swing: capabilities.swingModes?.includes('horizontal') ? 'horizontal' : 'off',
    estimatedWattage: Math.round(wattage * 0.72),
    isCustom: false,
  });

  // 4. TURBO COOL — max cooling
  presets.push({
    id: 'turbo-cool',
    name: 'Turbo Cool',
    icon: '🧊',
    description: 'Maximum cooling, full power',
    temp: 18,
    mode: pick(['cool'], modes),
    fan: pick(['turbo', 'high', '5', 'auto'], fans),
    specialMode: pick(['speed', 'turbo', 'off'], specials),
    swing: capabilities.swingModes?.includes('all') ? 'all' :
           capabilities.swingModes?.includes('vertical') ? 'vertical' : 'off',
    estimatedWattage: wattage,
    isCustom: false,
  });

  return presets;
}

module.exports = {
  brands,
  lookupByModel,
  lookupByManufacturer,
  getAllBrands,
  getBrand,
  generatePresets,
};
