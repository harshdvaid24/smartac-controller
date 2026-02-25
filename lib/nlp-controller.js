/**
 * Natural Language AC Controller — Ollama integration (free, local LLM)
 * Requires: ollama pull llama3.2:3b
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

const SYSTEM_PROMPT = `You are an AI assistant for a Smart AC controller app.
The user will give you natural language commands about their air conditioner.
Parse the command and return ONLY a JSON object with these fields:

{
  "action": "set_temp" | "set_mode" | "set_fan" | "set_special" | "turn_on" | "turn_off" | "apply_preset",
  "values": {
    "temp": 24,
    "mode": "cool",
    "fan": "low",
    "specialMode": "sleep",
    "preset": "ultra-saver"
  },
  "confidence": 0.95,
  "explanation": "Setting temperature to 24°C for energy savings",
  "understood": true
}

Available modes: cool, heat, auto, dry, wind
Available fan speeds: auto, low, medium, high, turbo
Available special modes: off, quiet, sleep, windFree, windFreeSleep, speed, eco

Examples:
"make it cooler but save energy" → { "action": "set_temp", "values": { "temp": 24 }, "confidence": 0.82, "explanation": "Balanced cooling at 24°C", "understood": true }
"sleep mode now" → { "action": "set_special", "values": { "specialMode": "sleep" }, "confidence": 0.99, "explanation": "Activating sleep mode", "understood": true }
"it's really hot in here" → { "action": "set_temp", "values": { "temp": 20 }, "confidence": 0.75, "explanation": "Aggressive cooling for extreme heat", "understood": true }
"night mode" → { "action": "apply_preset", "values": { "preset": "smart_night" }, "confidence": 0.9, "explanation": "Applying Smart Night preset for sleep", "understood": true }
"turn off the ac" → { "action": "turn_off", "values": {}, "confidence": 0.99, "explanation": "Turning off the AC", "understood": true }
"wind free mode" → { "action": "set_special", "values": { "specialMode": "windFree" }, "confidence": 0.95, "explanation": "Enabling WindFree for gentle cooling", "understood": true }

Respond ONLY with JSON. No markdown, no explanation outside the JSON.`;

/**
 * Check if Ollama is running
 */
async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/version`);
    if (res.ok) {
      const data = await res.json();
      return { online: true, version: data.version };
    }
    return { online: false };
  } catch {
    return { online: false };
  }
}

/**
 * Parse a natural language command using Ollama
 */
async function parseNaturalCommand(userText, deviceCapabilities = {}) {
  const contextPrompt = deviceCapabilities.modes
    ? `Device capabilities: modes=${(deviceCapabilities.modes || []).join(',')}, 
    fanSpeeds=${(deviceCapabilities.fanSpeeds || []).join(',')}, 
    specialModes=${(deviceCapabilities.specialModes || []).join(',')}`
    : '';

  const fullPrompt = SYSTEM_PROMPT + '\n\n' + contextPrompt + `\n\nCommand: "${userText}"`;

  const response = await fetch(`${OLLAMA_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'llama3.2:3b',
      prompt: fullPrompt,
      stream: false,
      options: { temperature: 0.1, num_predict: 200 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  let text = (data.response || '').trim();

  // Strip markdown fencing if present
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
    // If LLM returned non-JSON, build a fallback
    return {
      action: 'unknown',
      values: {},
      confidence: 0,
      explanation: text.slice(0, 100),
      understood: false,
    };
  }
}

/**
 * Quick command shortcuts that don't need LLM
 */
function tryQuickParse(text) {
  const lower = text.toLowerCase().trim();

  const quickMap = {
    'turn on': { action: 'turn_on', values: {}, confidence: 1.0, explanation: 'Turning on AC', understood: true },
    'turn off': { action: 'turn_off', values: {}, confidence: 1.0, explanation: 'Turning off AC', understood: true },
    'on': { action: 'turn_on', values: {}, confidence: 0.9, explanation: 'Turning on AC', understood: true },
    'off': { action: 'turn_off', values: {}, confidence: 0.9, explanation: 'Turning off AC', understood: true },
    'sleep mode': { action: 'set_special', values: { specialMode: 'sleep' }, confidence: 1.0, explanation: 'Activating sleep mode', understood: true },
    'wind free': { action: 'set_special', values: { specialMode: 'windFree' }, confidence: 1.0, explanation: 'Enabling WindFree mode', understood: true },
    'windfree': { action: 'set_special', values: { specialMode: 'windFree' }, confidence: 1.0, explanation: 'Enabling WindFree mode', understood: true },
    'eco mode': { action: 'set_special', values: { specialMode: 'eco' }, confidence: 1.0, explanation: 'Switching to eco mode', understood: true },
    'turbo': { action: 'apply_preset', values: { preset: 'turbo_cool' }, confidence: 0.95, explanation: 'Max cooling', understood: true },
    'night mode': { action: 'apply_preset', values: { preset: 'smart_night' }, confidence: 0.95, explanation: 'Smart Night preset', understood: true },
    'smart night': { action: 'apply_preset', values: { preset: 'smart_night' }, confidence: 1.0, explanation: 'Smart Night preset', understood: true },
  };

  for (const [key, result] of Object.entries(quickMap)) {
    if (lower.includes(key)) return result;
  }

  // Temperature patterns: "set to 24", "24 degrees", "make it 22"
  const tempMatch = lower.match(/(?:set\s+(?:to|at)\s*|make\s+it\s*)?(\d{2})\s*(?:degrees?|°|deg)?/);
  if (tempMatch) {
    const temp = parseInt(tempMatch[1]);
    if (temp >= 16 && temp <= 30) {
      return {
        action: 'set_temp', values: { temp },
        confidence: 0.95, explanation: `Setting to ${temp}°C`, understood: true,
      };
    }
  }

  return null; // Need LLM for this one
}

module.exports = { parseNaturalCommand, tryQuickParse, checkOllamaStatus };
