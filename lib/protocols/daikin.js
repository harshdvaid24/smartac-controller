/**
 * Daikin WiFi AC Protocol
 * Communicates with Daikin ACs via their local HTTP API (port 80).
 * This is the best-documented protocol among AC brands.
 * 
 * Reference: Daikin uses simple HTTP GET with key=value params.
 * Endpoints:
 *   /common/basic_info     — device info, MAC, firmware
 *   /aircon/get_control_info — current control state (power, temp, mode, fan)
 *   /aircon/get_sensor_info  — sensor readings (room temp, outdoor temp, humidity)
 *   /aircon/set_control_info — set power, temp, mode, fan, swing
 */

const ACProtocol = require('./base');

// Daikin mode mapping
const MODE_MAP = { 0: 'auto', 1: 'auto', 2: 'dry', 3: 'cool', 4: 'heat', 6: 'fan' };
const MODE_REVERSE = { auto: 1, dry: 2, cool: 3, heat: 4, fan: 6 };

// Fan rate mapping
const FAN_MAP = { A: 'auto', B: 'quiet', '3': 'low', '4': 'medium-low', '5': 'medium', '6': 'medium-high', '7': 'high' };
const FAN_REVERSE = { auto: 'A', quiet: 'B', low: '3', 'medium-low': '4', medium: '5', 'medium-high': '6', high: '7' };

// Swing direction mapping
const SWING_MAP = { 0: 'off', 1: 'vertical', 2: 'horizontal', 3: 'both' };
const SWING_REVERSE = { off: 0, vertical: 1, horizontal: 2, both: 3, all: 3 };

class DaikinProtocol extends ACProtocol {
  constructor(ip, port = 80, options = {}) {
    super(ip, port, options);
    this.baseUrl = `http://${ip}:${port}`;
    this.lastControlInfo = {};
  }

  async connect() {
    try {
      const info = await this._httpGet('/common/basic_info');
      this.deviceInfo = info;
      this.connected = true;
      return info;
    } catch (e) {
      throw new Error(`Cannot connect to Daikin at ${this.ip}: ${e.message}`);
    }
  }

  async getStatus() {
    const [control, sensor] = await Promise.all([
      this._httpGet('/aircon/get_control_info'),
      this._httpGet('/aircon/get_sensor_info'),
    ]);

    this.lastControlInfo = control;
    return this.normalizeStatus({ control, sensor });
  }

  async setPower(on) {
    const current = this.lastControlInfo;
    return this._setControl({ ...current, pow: on ? '1' : '0' });
  }

  async setTemperature(temp) {
    const current = this.lastControlInfo;
    return this._setControl({ ...current, stemp: String(temp) });
  }

  async setMode(mode) {
    const current = this.lastControlInfo;
    const daikinMode = MODE_REVERSE[mode];
    if (daikinMode === undefined) throw new Error(`Unsupported mode: ${mode}`);
    return this._setControl({ ...current, mode: String(daikinMode) });
  }

  async setFanSpeed(speed) {
    const current = this.lastControlInfo;
    const daikinFan = FAN_REVERSE[speed] || FAN_REVERSE.auto;
    return this._setControl({ ...current, f_rate: daikinFan });
  }

  async setSwing(mode) {
    const current = this.lastControlInfo;
    const daikinDir = SWING_REVERSE[mode] ?? 0;
    return this._setControl({ ...current, f_dir: String(daikinDir) });
  }

  async setSpecialMode(mode) {
    // Daikin special modes: econo, powerful, streamer
    const current = this.lastControlInfo;
    if (mode === 'eco' || mode === 'econo') {
      return this._setControl({ ...current, en_econo: '1' });
    } else if (mode === 'turbo' || mode === 'powerful') {
      return this._setControl({ ...current, en_powerful: '1' });
    } else if (mode === 'off') {
      return this._setControl({ ...current, en_econo: '0', en_powerful: '0' });
    }
    return this._setControl(current);
  }

  getCapabilities() {
    return {
      power: true,
      temperature: { min: 16, max: 30, unit: 'C' },
      modes: ['cool', 'heat', 'auto', 'dry', 'fan'],
      fanSpeeds: ['auto', 'quiet', 'low', 'medium', 'high'],
      swingModes: ['off', 'vertical', 'horizontal', 'both'],
      specialModes: ['off', 'econo', 'powerful'],
    };
  }

  normalizeStatus(raw) {
    const { control, sensor } = raw;
    return {
      power: control.pow === '1' ? 'on' : 'off',
      temperature: {
        current: sensor.htemp ? parseFloat(sensor.htemp) : null,
        target: control.stemp ? parseFloat(control.stemp) : null,
        outdoor: sensor.otemp ? parseFloat(sensor.otemp) : null,
      },
      humidity: sensor.hhum ? parseInt(sensor.hhum) : null,
      mode: MODE_MAP[parseInt(control.mode)] || 'cool',
      fanSpeed: FAN_MAP[control.f_rate] || 'auto',
      swing: SWING_MAP[parseInt(control.f_dir)] || 'off',
      specialMode: control.en_econo === '1' ? 'econo' :
                   control.en_powerful === '1' ? 'powerful' : 'off',
    };
  }

  // ── Private methods ──

  async _httpGet(path) {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      return this._parseResponse(text);
    } catch (e) {
      clearTimeout(timeout);
      throw new Error(`Daikin HTTP GET ${path} failed: ${e.message}`);
    }
  }

  async _setControl(params) {
    const qs = new URLSearchParams();
    // Required params for set_control_info
    const required = ['pow', 'mode', 'stemp', 'shum', 'f_rate', 'f_dir'];
    for (const key of required) {
      if (params[key] !== undefined) qs.set(key, params[key]);
    }
    // Optional params
    for (const key of ['en_econo', 'en_powerful', 'adv']) {
      if (params[key] !== undefined) qs.set(key, params[key]);
    }

    const url = `${this.baseUrl}/aircon/set_control_info?${qs.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      const text = await res.text();
      const result = this._parseResponse(text);
      if (result.ret !== 'OK') throw new Error(`Daikin returned: ${result.ret}`);

      // Update cached state
      Object.assign(this.lastControlInfo, params);
      return result;
    } catch (e) {
      clearTimeout(timeout);
      throw new Error(`Daikin set_control failed: ${e.message}`);
    }
  }

  /**
   * Parse Daikin's key=value response format.
   * Example: "ret=OK,pow=1,mode=3,stemp=24.0,shum=0,f_rate=A,f_dir=0"
   */
  _parseResponse(text) {
    const obj = {};
    text.split(',').forEach(pair => {
      const [key, ...rest] = pair.split('=');
      if (key) obj[key.trim()] = rest.join('=');
    });
    return obj;
  }
}

module.exports = DaikinProtocol;
