/**
 * Midea AC Protocol (Stub)
 * Used by: Midea, Carrier, Toshiba (some), Comfee, Klimaire, Pioneer, and 20+ OEM brands.
 * 
 * Protocol: Binary over TCP port 6444, AES encrypted.
 * Reference: https://github.com/mill1000/midea-msmart
 * 
 * This is a stub implementation. The full binary protocol requires 
 * significant reverse engineering work. See midea-msmart for Python reference.
 */

const ACProtocol = require('./base');

class MideaProtocol extends ACProtocol {
  constructor(ip, port = 6444, options = {}) {
    super(ip, port, options);
    this.deviceId = options.deviceId || null;
    this.token = options.token || null;
    this.key = options.key || null;
  }

  async connect() {
    // TODO: Implement Midea TCP handshake + authentication
    // 1. TCP connect to port 6444
    // 2. Send device query packet
    // 3. Receive response with device info
    // 4. Authenticate with token/key
    throw new Error('Midea protocol: full implementation pending. Use SmartThings cloud for now.');
  }

  async getStatus() {
    // TODO: Send status query command (0x41), decode binary response
    throw new Error('Midea getStatus: not yet implemented');
  }

  async setPower(on) {
    // TODO: Build command packet with power bit
    throw new Error('Midea setPower: not yet implemented');
  }

  async setTemperature(temp) {
    // TODO: Build command packet with temperature byte
    throw new Error('Midea setTemperature: not yet implemented');
  }

  async setMode(mode) {
    throw new Error('Midea setMode: not yet implemented');
  }

  async setFanSpeed(speed) {
    throw new Error('Midea setFanSpeed: not yet implemented');
  }

  async setSwing(mode) {
    throw new Error('Midea setSwing: not yet implemented');
  }

  getCapabilities() {
    return {
      power: true,
      temperature: { min: 16, max: 30, unit: 'C' },
      modes: ['cool', 'heat', 'auto', 'dry', 'fan'],
      fanSpeeds: ['auto', 'low', 'medium', 'high'],
      swingModes: ['off', 'vertical', 'horizontal', 'both'],
      specialModes: ['off', 'eco', 'turbo', 'sleep'],
      status: 'stub_implementation',
    };
  }

  normalizeStatus(raw) {
    // Placeholder until binary protocol is implemented
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

module.exports = MideaProtocol;
