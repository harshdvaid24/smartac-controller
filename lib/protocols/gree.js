/**
 * Gree / Hisense AC Protocol (Stub)
 * 
 * Protocol: JSON over encrypted UDP (port 7000, AES-128-ECB).
 * Default discovery key: "a3K8Bx%2r8Y7#xDh"
 * Commands: scan, bind, status, cmd
 * 
 * Used by: Gree, Hisense, Tosot, Cooper&Hunter, and several OEM brands.
 */

const ACProtocol = require('./base');

class GreeProtocol extends ACProtocol {
  constructor(ip, port = 7000, options = {}) {
    super(ip, port, options);
    this.key = options.key || 'a3K8Bx%2r8Y7#xDh'; // default discovery key
    this.deviceKey = null; // set after binding
  }

  async connect() {
    // TODO: Implement Gree UDP protocol
    // 1. Send scan command (UDP broadcast to port 7000)
    // 2. Receive device info (AES-128-ECB encrypted with default key)
    // 3. Send bind command to get device-specific key
    // 4. Use device key for all subsequent communication
    throw new Error('Gree protocol: full implementation pending. Use SmartThings cloud for now.');
  }

  async getStatus() {
    // TODO: Send status request via encrypted UDP
    throw new Error('Gree getStatus: not yet implemented');
  }

  async setPower(on) {
    throw new Error('Gree setPower: not yet implemented');
  }

  async setTemperature(temp) {
    throw new Error('Gree setTemperature: not yet implemented');
  }

  async setMode(mode) {
    throw new Error('Gree setMode: not yet implemented');
  }

  async setFanSpeed(speed) {
    throw new Error('Gree setFanSpeed: not yet implemented');
  }

  async setSwing(mode) {
    throw new Error('Gree setSwing: not yet implemented');
  }

  getCapabilities() {
    return {
      power: true,
      temperature: { min: 16, max: 30, unit: 'C' },
      modes: ['cool', 'heat', 'auto', 'dry', 'fan'],
      fanSpeeds: ['auto', 'low', 'medium', 'high', 'turbo'],
      swingModes: ['off', 'vertical', 'horizontal', 'both'],
      specialModes: ['off', 'sleep', 'turbo', 'eco'],
      status: 'stub_implementation',
    };
  }

  normalizeStatus(raw) {
    return {
      power: 'unknown',
      temperature: { current: null, target: null },
      humidity: null,
      mode: 'cool',
      fanSpeed: 'auto',
      swing: 'off',
      specialMode: 'off',
    };
  }
}

module.exports = GreeProtocol;
