/**
 * IR AC Code Database
 * Maps brand + command to IR hex/raw codes for common AC models.
 * 
 * Codes are stored in raw timing format (microseconds) for maximum
 * compatibility across IR blasters (Broadlink, Tuya, ESPHome, etc).
 * 
 * Users can also learn and save custom codes.
 */

// Standard AC IR protocol timings (NEC-like for most brands)
const PROTOCOLS = {
  nec: { header: [9000, 4500], one: [560, 1690], zero: [560, 560], end: [560] },
  samsung: { header: [3000, 9000], one: [500, 1500], zero: [500, 500], end: [500] },
  daikin: { header: [3500, 1750], one: [430, 1300], zero: [430, 430], end: [430] },
  lg: { header: [8400, 4200], one: [560, 1560], zero: [560, 560], end: [560] },
  mitsubishi: { header: [3400, 1750], one: [450, 1300], zero: [450, 420], end: [450] },
};

/**
 * Common AC IR command templates per brand.
 * Each entry: { command hex (or Base64 for Broadlink), description }
 * 
 * For production, these would be populated from a community database (LIRC/IRDB).
 * This is a placeholder structure — real codes depend on exact AC model.
 */
const CODE_DB = {
  // Generic NEC-based codes (work with many Samsung/LG/etc)
  generic: {
    power_on:    { protocol: 'nec', description: 'Power On' },
    power_off:   { protocol: 'nec', description: 'Power Off' },
    temp_up:     { protocol: 'nec', description: 'Temperature +1' },
    temp_down:   { protocol: 'nec', description: 'Temperature -1' },
    mode_cool:   { protocol: 'nec', description: 'Set Cool Mode' },
    mode_heat:   { protocol: 'nec', description: 'Set Heat Mode' },
    mode_dry:    { protocol: 'nec', description: 'Set Dry Mode' },
    mode_fan:    { protocol: 'nec', description: 'Set Fan Only' },
    mode_auto:   { protocol: 'nec', description: 'Set Auto Mode' },
    fan_low:     { protocol: 'nec', description: 'Fan Low' },
    fan_med:     { protocol: 'nec', description: 'Fan Medium' },
    fan_high:    { protocol: 'nec', description: 'Fan High' },
    fan_auto:    { protocol: 'nec', description: 'Fan Auto' },
    swing_on:    { protocol: 'nec', description: 'Swing On' },
    swing_off:   { protocol: 'nec', description: 'Swing Off' },
  },
};

// Custom learned codes stored per device
const learnedCodes = new Map();

/**
 * Get the IR command code for a brand + command combination.
 * Falls back to generic if brand-specific code isn't available.
 */
function getCode(brand, command) {
  const brandCodes = CODE_DB[brand] || CODE_DB.generic;
  const code = brandCodes[command] || CODE_DB.generic[command];
  if (!code) return null;
  return { ...code, brand, command };
}

/**
 * Build a composite IR command for setting a specific AC state.
 * AC IR protocols often send the complete state in one burst.
 * 
 * @param {string} brand
 * @param {object} state — { power, temperature, mode, fanSpeed, swing }
 * @returns {object} IR command packet
 */
function buildStateCommand(brand, state) {
  return {
    brand,
    type: 'composite_state',
    state: {
      power: state.power || 'on',
      temperature: state.temperature || 24,
      mode: state.mode || 'cool',
      fanSpeed: state.fanSpeed || 'auto',
      swing: state.swing || 'off',
    },
    description: `Set AC to ${state.temperature || 24}°C ${state.mode || 'cool'} mode`,
  };
}

/**
 * Save a learned IR code for a device + command.
 */
function saveLearnedCode(deviceId, command, rawCode) {
  if (!learnedCodes.has(deviceId)) {
    learnedCodes.set(deviceId, {});
  }
  learnedCodes.get(deviceId)[command] = {
    raw: rawCode,
    learnedAt: Date.now(),
  };
}

/**
 * Get a learned code for a device + command.
 */
function getLearnedCode(deviceId, command) {
  return learnedCodes.get(deviceId)?.[command] || null;
}

/**
 * Get all learned codes for a device.
 */
function getLearnedCodes(deviceId) {
  return learnedCodes.get(deviceId) || {};
}

/**
 * List all available commands for a brand.
 */
function getAvailableCommands(brand) {
  const brandCodes = CODE_DB[brand] || CODE_DB.generic;
  return Object.entries(brandCodes).map(([key, val]) => ({
    command: key,
    description: val.description,
    protocol: val.protocol,
  }));
}

module.exports = {
  getCode,
  buildStateCommand,
  saveLearnedCode,
  getLearnedCode,
  getLearnedCodes,
  getAvailableCommands,
  PROTOCOLS,
};
