/**
 * Base AC Protocol
 * All brand-specific protocol handlers extend this class.
 * Ensures a consistent interface regardless of how the AC is controlled.
 */

class ACProtocol {
  constructor(ip, port, options = {}) {
    this.ip = ip;
    this.port = port;
    this.options = options;
    this.connected = false;
    this.lastStatus = null;
  }

  /** Connect to the device */
  async connect() { throw new Error('Not implemented'); }

  /** Disconnect from the device */
  async disconnect() { this.connected = false; }

  /** Get current device status (normalized) */
  async getStatus() { throw new Error('Not implemented'); }

  /** Set power on/off */
  async setPower(on) { throw new Error('Not implemented'); }

  /** Set target temperature */
  async setTemperature(temp) { throw new Error('Not implemented'); }

  /** Set AC mode (cool, heat, auto, dry, fan) */
  async setMode(mode) { throw new Error('Not implemented'); }

  /** Set fan speed */
  async setFanSpeed(speed) { throw new Error('Not implemented'); }

  /** Set swing/oscillation mode */
  async setSwing(mode) { throw new Error('Not implemented'); }

  /** Set special/optional mode (eco, sleep, turbo, etc.) */
  async setSpecialMode(mode) { throw new Error('Not implemented'); }

  /** Get supported capabilities for this device */
  getCapabilities() {
    return {
      power: true,
      temperature: { min: 16, max: 30, unit: 'C' },
      modes: ['cool'],
      fanSpeeds: ['auto'],
      swingModes: [],
      specialModes: [],
    };
  }

  /**
   * Normalize brand-specific status to the SmartAC common format.
   * Subclasses override this to translate their raw status.
   */
  normalizeStatus(raw) {
    return {
      power: 'off',
      temperature: { current: null, target: null },
      humidity: null,
      mode: 'cool',
      fanSpeed: 'auto',
      swing: 'off',
      specialMode: 'off',
    };
  }

  /** Execute a generic command by name (accepts both 'power' and 'setPower' forms) */
  async executeCommand(command, value) {
    switch (command) {
      case 'power':
      case 'setPower': return this.setPower(value);
      case 'temperature':
      case 'setTemperature': return this.setTemperature(value);
      case 'mode':
      case 'setMode': return this.setMode(value);
      case 'fanSpeed':
      case 'setFanSpeed': return this.setFanSpeed(value);
      case 'swing':
      case 'setSwing': return this.setSwing(value);
      case 'specialMode':
      case 'setSpecialMode': return this.setSpecialMode(value);
      default: throw new Error(`Unknown command: ${command}`);
    }
  }
}

module.exports = ACProtocol;
