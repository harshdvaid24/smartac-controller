/**
 * SmartThings Capability Parser
 * Parses device info + status into a normalized capability profile
 * that works with ANY AC brand — no hardcoded assumptions.
 */

const brands = require('./brands');

/**
 * Parse SmartThings device info + status into normalized capability profile.
 * @param {object} deviceInfo  - GET /devices/:id response
 * @param {object} deviceStatus - GET /devices/:id/status response
 * @returns {object} Normalized capability profile
 */
function parseCapabilities(deviceInfo, deviceStatus) {
  const main = deviceStatus?.components?.main || {};
  const caps = extractCapabilityIds(deviceInfo);

  // Detect brand from manufacturer/model
  const manufacturer = deviceInfo.manufacturerName || deviceInfo.manufacturer || '';
  const model = deviceInfo.model || deviceInfo.ocf?.modelNumber || '';
  const brandInfo = brands.lookupByModel(model) || brands.lookupByManufacturer(manufacturer);

  // Build normalized profile
  const profile = {
    deviceId: deviceInfo.deviceId,
    name: deviceInfo.label || deviceInfo.name || 'AC Device',
    manufacturer,
    model,
    brand: brandInfo?.brand?.id || detectBrandSlug(manufacturer),
    brandName: brandInfo?.brand?.name || manufacturer || 'Unknown',
    brandEmoji: brandInfo?.brand?.logo_emoji || '❄️',
    online: deviceInfo.status === 'ONLINE' || true,
    capabilities: {},
    wattage: brandInfo?.model?.wattage || brandInfo?.brand?.defaultWattage || 1500,
    presets: [],
  };

  // ── Power ──
  if (caps.includes('switch')) {
    profile.capabilities.power = true;
    profile.capabilities.currentState = profile.capabilities.currentState || {};
    profile.capabilities.currentState.power = main?.switch?.switch?.value || 'off';
  }

  // ── Temperature ──
  if (caps.includes('thermostatCoolingSetpoint') || caps.includes('temperatureMeasurement')) {
    const target = main?.thermostatCoolingSetpoint?.coolingSetpoint?.value;
    const current = main?.temperatureMeasurement?.temperature?.value;
    const unit = main?.temperatureMeasurement?.temperature?.unit || 'C';

    profile.capabilities.temperature = {
      min: 16,
      max: 30,
      unit,
      current: current ?? null,
      target: target ?? null,
    };
  }

  // ── Humidity ──
  if (caps.includes('relativeHumidityMeasurement')) {
    const humidity = main?.relativeHumidityMeasurement?.humidity?.value;
    profile.capabilities.humidity = { current: humidity ?? null };
  }

  // ── AC Modes ──
  if (caps.includes('airConditionerMode')) {
    const supported = main?.airConditionerMode?.supportedAcModes?.value;
    const current = main?.airConditionerMode?.airConditionerMode?.value;
    profile.capabilities.modes = Array.isArray(supported) ? supported : ['cool'];
    profile.capabilities.currentState = profile.capabilities.currentState || {};
    profile.capabilities.currentState.mode = current || 'cool';
  }

  // ── Fan Speeds ──
  if (caps.includes('airConditionerFanMode')) {
    const supported = main?.airConditionerFanMode?.supportedAcFanModes?.value;
    const current = main?.airConditionerFanMode?.fanMode?.value;
    profile.capabilities.fanSpeeds = Array.isArray(supported) ? supported : ['auto'];
    profile.capabilities.currentState = profile.capabilities.currentState || {};
    profile.capabilities.currentState.fanSpeed = current || 'auto';
  }

  // ── Swing / Oscillation ──
  if (caps.includes('fanOscillationMode')) {
    const supported = main?.fanOscillationMode?.supportedFanOscillationModes?.value;
    const current = main?.fanOscillationMode?.fanOscillationMode?.value;
    profile.capabilities.swingModes = Array.isArray(supported) ? supported : [];
    profile.capabilities.currentState = profile.capabilities.currentState || {};
    profile.capabilities.currentState.swing = current || 'off';
  }

  // ── Special / Optional Modes ──
  const optionalCap = 'custom.airConditionerOptionalMode';
  if (caps.includes(optionalCap)) {
    const supported = main?.['custom.airConditionerOptionalMode']?.supportedAcOptionalMode?.value;
    const current = main?.['custom.airConditionerOptionalMode']?.acOptionalMode?.value;
    profile.capabilities.specialModes = Array.isArray(supported) ? supported : [];
    profile.capabilities.currentState = profile.capabilities.currentState || {};
    profile.capabilities.currentState.specialMode = current || 'off';
  }

  // ── Dust / Air Quality (some brands) ──
  if (caps.includes('dustSensor')) {
    const dust = main?.dustSensor?.dustLevel?.value;
    profile.capabilities.dustLevel = dust ?? null;
  }

  // ── Generate presets based on capabilities ──
  profile.presets = brands.generatePresets(profile.capabilities, profile.wattage);

  return profile;
}

/**
 * Extract all capability IDs from the device info.
 */
function extractCapabilityIds(deviceInfo) {
  const ids = [];
  if (deviceInfo.components) {
    for (const comp of deviceInfo.components) {
      if (comp.capabilities) {
        for (const cap of comp.capabilities) {
          ids.push(cap.id);
        }
      }
    }
  }
  return ids;
}

/**
 * Simple brand slug detection from manufacturer name.
 */
function detectBrandSlug(manufacturer) {
  if (!manufacturer) return 'unknown';
  const m = manufacturer.toLowerCase();
  if (m.includes('samsung')) return 'samsung';
  if (m.includes('lg')) return 'lg';
  if (m.includes('daikin')) return 'daikin';
  if (m.includes('carrier')) return 'carrier';
  if (m.includes('voltas')) return 'voltas';
  if (m.includes('blue star') || m.includes('bluestar')) return 'bluestar';
  if (m.includes('hitachi')) return 'hitachi';
  if (m.includes('panasonic')) return 'panasonic';
  if (m.includes('mitsubishi')) return 'mitsubishi';
  if (m.includes('whirlpool')) return 'whirlpool';
  if (m.includes('godrej')) return 'godrej';
  if (m.includes('lloyd')) return 'lloyd';
  if (m.includes('haier')) return 'haier';
  if (m.includes('toshiba')) return 'toshiba';
  if (m.includes('general') || m.includes('fujitsu')) return 'ogeneral';
  return 'unknown';
}

module.exports = { parseCapabilities };
