/**
 * Protocol Router
 * Maps brand names to protocol handler classes.
 * Provides a single entry point for creating protocol instances.
 */

const DaikinProtocol = require('./daikin');
const SamsungLocalProtocol = require('./samsung-local');
const MideaProtocol = require('./midea');
const GreeProtocol = require('./gree');

const protocolMap = {
  daikin: DaikinProtocol,
  samsung: SamsungLocalProtocol,
  midea: MideaProtocol,
  carrier: MideaProtocol,      // Carrier uses Midea protocol
  comfee: MideaProtocol,       // Comfee is Midea OEM
  toshiba: MideaProtocol,      // Some Toshiba uses Midea
  gree: GreeProtocol,
  hisense: GreeProtocol,       // Hisense uses Gree protocol
  tosot: GreeProtocol,         // Tosot is Gree subsidiary
};

/**
 * Get a protocol handler for a brand.
 * @param {string} brand - Brand slug (e.g., 'daikin', 'samsung')
 * @param {string} ip - Device IP address
 * @param {number} port - Device port
 * @param {object} options - Protocol-specific options
 * @returns {ACProtocol} Protocol handler instance
 */
function getProtocol(brand, ip, port, options = {}) {
  const Protocol = protocolMap[brand.toLowerCase()];
  if (!Protocol) {
    throw new Error(`No local WiFi protocol handler for brand: ${brand}. Supported: ${Object.keys(protocolMap).join(', ')}`);
  }
  return new Protocol(ip, port, options);
}

/**
 * Check if a brand has a local WiFi protocol handler.
 */
function hasProtocol(brand) {
  return !!protocolMap[brand.toLowerCase()];
}

/**
 * List all brands with local WiFi protocol support.
 */
function getSupportedBrands() {
  return Object.keys(protocolMap);
}

module.exports = { getProtocol, hasProtocol, getSupportedBrands, protocolMap };
