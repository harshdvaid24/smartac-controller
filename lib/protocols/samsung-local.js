/**
 * Samsung Local WiFi AC Protocol
 * Communicates with Samsung ACs via their local HTTP API (port 8888/8889).
 * 
 * Samsung smart ACs expose a REST API for local control.
 * Supports WindFree, WindFreeSleep, and all Samsung-specific features.
 * 
 * Note: Requires initial token pairing (one-time setup).
 */

const ACProtocol = require('./base');

class SamsungLocalProtocol extends ACProtocol {
  constructor(ip, port = 8888, options = {}) {
    super(ip, port, options);
    this.baseUrl = `http://${ip}:${port}`;
    this.token = options.token || null;
    this.cachedStatus = {};
  }

  async connect() {
    try {
      const res = await this._request('GET', '/devices/0');
      this.deviceInfo = res;
      this.connected = true;
      return res;
    } catch (e) {
      throw new Error(`Cannot connect to Samsung AC at ${this.ip}:${this.port}: ${e.message}`);
    }
  }

  async getStatus() {
    const raw = await this._request('GET', '/devices/0/status');
    this.cachedStatus = raw;
    return this.normalizeStatus(raw);
  }

  async setPower(on) {
    return this._sendDesired({ switch: on ? 'on' : 'off' });
  }

  async setTemperature(temp) {
    return this._sendDesired({ desiredTemperature: temp });
  }

  async setMode(mode) {
    return this._sendDesired({ mode });
  }

  async setFanSpeed(speed) {
    return this._sendDesired({ fanMode: speed });
  }

  async setSwing(mode) {
    return this._sendDesired({ fanOscillationMode: mode });
  }

  async setSpecialMode(mode) {
    return this._sendDesired({ optionalMode: mode });
  }

  getCapabilities() {
    return {
      power: true,
      temperature: { min: 16, max: 30, unit: 'C' },
      modes: ['cool', 'heat', 'auto', 'dry', 'wind'],
      fanSpeeds: ['auto', 'low', 'medium', 'high', 'turbo'],
      swingModes: ['off', 'fixed', 'vertical', 'horizontal', 'all'],
      specialModes: ['off', 'quiet', 'sleep', 'windFree', 'windFreeSleep', 'speed'],
    };
  }

  normalizeStatus(raw) {
    // Samsung local API returns nested status
    const status = raw?.status || raw?.desired || raw || {};
    return {
      power: status.switch || status.power || 'off',
      temperature: {
        current: status.temperature ?? status.currentTemperature ?? null,
        target: status.desiredTemperature ?? status.targetTemperature ?? null,
      },
      humidity: status.humidity ?? null,
      mode: status.mode || 'cool',
      fanSpeed: status.fanMode || status.fanSpeed || 'auto',
      swing: status.fanOscillationMode || 'off',
      specialMode: status.optionalMode || status.specialMode || 'off',
    };
  }

  /**
   * Token-based pairing flow.
   * Samsung ACs require a one-time token exchange.
   */
  async pair() {
    try {
      // Step 1: Request pairing (AC shows code on display or blinks)
      const pairRes = await this._request('POST', '/devices/0/pair', {});
      this.token = pairRes.token || pairRes.accessToken;
      return { success: true, token: this.token };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  // ── Private methods ──

  async _request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;
    
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { ...opts, signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    } catch (e) {
      clearTimeout(timeout);
      throw new Error(`Samsung local request failed: ${e.message}`);
    }
  }

  async _sendDesired(desired) {
    return this._request('PUT', '/devices/0', { desired });
  }
}

module.exports = SamsungLocalProtocol;
