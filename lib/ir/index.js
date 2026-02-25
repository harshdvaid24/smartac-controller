/**
 * IR AC Controller
 * High-level IR blaster management — discovers blasters, sends commands,
 * manages learning mode, and provides the interface used by ConnectionManager.
 */

const { discoverBlasters, BroadlinkDevice } = require('./broadlink');
const codes = require('./codes');

// Registered IR blasters keyed by ID (ip:mac)
const blasters = new Map();

/**
 * Discover and register available IR blasters on the network.
 * @returns {Promise<Array>} List of discovered blasters
 */
async function discover() {
  const found = await discoverBlasters(5000);

  for (const device of found) {
    const id = `${device.ip}:${device.mac.toString('hex')}`;
    blasters.set(id, device);
  }

  return found.map(d => ({
    id: `${d.ip}:${d.mac.toString('hex')}`,
    ip: d.ip,
    mac: d.mac.toString('hex'),
    type: d.deviceType,
  }));
}

/**
 * Get all registered blasters.
 */
function getBlasters() {
  return Array.from(blasters.entries()).map(([id, d]) => ({
    id,
    ip: d.ip,
    mac: d.mac.toString('hex'),
    type: d.deviceType,
    authorized: d.authorized,
  }));
}

/**
 * Send an IR command to an AC via a specific blaster.
 * @param {string} blasterId — blaster ID (ip:mac)
 * @param {string} brand — AC brand
 * @param {string} command — power, temperature, mode, fanSpeed, swing
 * @param {*} value — command value
 */
async function send(blasterId, brand, command, value) {
  const blaster = blasters.get(blasterId);
  if (!blaster) throw new Error(`IR blaster not found: ${blasterId}`);

  // First check for learned codes
  const learnedCode = codes.getLearnedCode(blasterId, `${brand}_${command}_${value}`);
  if (learnedCode) {
    await blaster.sendIR(learnedCode.raw);
    return { sent: true, source: 'learned', command, value };
  }

  // Map high-level command to IR command key
  const irCommand = mapToIRCommand(command, value);
  if (!irCommand) {
    throw new Error(`Cannot map command '${command}=${value}' to IR code`);
  }

  const code = codes.getCode(brand, irCommand);
  if (!code) {
    throw new Error(`No IR code for ${brand}/${irCommand}. Use learning mode to capture it.`);
  }

  // For composite state commands (e.g., set everything at once)
  if (command === 'state') {
    const stateCmd = codes.buildStateCommand(brand, value);
    // In production, this would encode the full state into an IR frame
    return { sent: true, source: 'state_composite', state: stateCmd.state };
  }

  // In production, we'd convert the code to raw timing data and send
  // For now, return a structured response
  return { sent: true, source: 'database', code: code.command, brand };
}

/**
 * Enter learning mode on a blaster to capture an IR code.
 * @param {string} blasterId
 * @param {string} label — what to name this code (e.g., "samsung_power_on")
 * @param {number} timeoutMs
 */
async function learn(blasterId, label, timeoutMs = 15000) {
  const blaster = blasters.get(blasterId);
  if (!blaster) throw new Error(`IR blaster not found: ${blasterId}`);

  console.log(`[ir] Learning mode active on ${blasterId} — waiting for IR signal...`);

  const rawCode = await blaster.learnIR(timeoutMs);

  // Save the learned code
  codes.saveLearnedCode(blasterId, label, rawCode);

  return {
    success: true,
    label,
    blasterId,
    codeLength: rawCode.length,
  };
}

/**
 * Map a high-level AC command to an IR command key.
 */
function mapToIRCommand(command, value) {
  const map = {
    power: (v) => v === true || v === 'on' ? 'power_on' : 'power_off',
    temperature: () => 'temp_up',  // simplified — real implementation tracks state
    mode: (v) => `mode_${v}`,
    fanSpeed: (v) => `fan_${v}`,
    swing: (v) => v === true || v === 'on' ? 'swing_on' : 'swing_off',
  };

  const mapper = map[command];
  return mapper ? mapper(value) : null;
}

module.exports = { discover, getBlasters, send, learn };
