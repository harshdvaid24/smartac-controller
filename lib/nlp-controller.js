/**
 * Natural Language AC Controller — Ollama + Gemini fallback
 * Ollama: free, local LLM (requires: ollama pull llama3.2:3b)
 * Gemini: cloud fallback when Ollama is unavailable (requires: GEMINI_API_KEY)
 */

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = 'gemini-2.0-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

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
 * Build full prompt with device capabilities context
 */
function buildPrompt(userText, deviceCapabilities = {}) {
  const contextPrompt = deviceCapabilities.modes
    ? `Device capabilities: modes=${(deviceCapabilities.modes || []).join(',')},
    fanSpeeds=${(deviceCapabilities.fanSpeeds || []).join(',')},
    specialModes=${(deviceCapabilities.specialModes || []).join(',')}`
    : '';

  return SYSTEM_PROMPT + '\n\n' + contextPrompt + `\n\nCommand: "${userText}"`;
}

/**
 * Parse LLM text response into structured JSON
 */
function parseLLMResponse(text) {
  // Strip markdown fencing if present
  text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

  try {
    return JSON.parse(text);
  } catch {
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
 * Parse using Ollama (local LLM)
 */
async function parseWithOllama(userText, deviceCapabilities = {}) {
  const fullPrompt = buildPrompt(userText, deviceCapabilities);

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
  return parseLLMResponse((data.response || '').trim());
}

/**
 * Parse using Google Gemini (cloud fallback)
 */
async function parseWithGemini(userText, deviceCapabilities = {}) {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  const fullPrompt = buildPrompt(userText, deviceCapabilities);

  const response = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: { maxOutputTokens: 200, temperature: 0.1 },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const text = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  return parseLLMResponse(text);
}

/**
 * Parse a natural language command — tries Ollama first, falls back to Gemini
 */
async function parseNaturalCommand(userText, deviceCapabilities = {}) {
  // Try Ollama first (local, free)
  try {
    return await parseWithOllama(userText, deviceCapabilities);
  } catch (ollamaError) {
    console.log('[nlp] Ollama unavailable, trying Gemini fallback:', ollamaError.message);
  }

  // Fallback to Gemini (cloud)
  try {
    return await parseWithGemini(userText, deviceCapabilities);
  } catch (geminiError) {
    console.log('[nlp] Gemini also failed:', geminiError.message);
    throw new Error(
      'AI processing unavailable. Try a simpler command like "set to 24 degrees" or "turn on".'
    );
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
    // Extended quick commands
    'make it cool': { action: 'set_temp', values: { temp: 24 }, confidence: 0.85, explanation: 'Cooling to 24°C', understood: true },
    'make it cold': { action: 'set_temp', values: { temp: 20 }, confidence: 0.85, explanation: 'Cooling to 20°C', understood: true },
    'make it warm': { action: 'set_temp', values: { temp: 26 }, confidence: 0.85, explanation: 'Warming to 26°C', understood: true },
    'make it warmer': { action: 'set_temp', values: { temp: 26 }, confidence: 0.85, explanation: 'Warming to 26°C', understood: true },
    'cool down': { action: 'set_temp', values: { temp: 22 }, confidence: 0.85, explanation: 'Cooling down to 22°C', understood: true },
    'too hot': { action: 'set_temp', values: { temp: 22 }, confidence: 0.8, explanation: 'Lowering temperature for comfort', understood: true },
    'too cold': { action: 'set_temp', values: { temp: 26 }, confidence: 0.8, explanation: 'Raising temperature for comfort', understood: true },
    'quiet mode': { action: 'set_special', values: { specialMode: 'quiet' }, confidence: 1.0, explanation: 'Switching to quiet mode', understood: true },
    'max cooling': { action: 'apply_preset', values: { preset: 'turbo_cool' }, confidence: 0.95, explanation: 'Maximum cooling', understood: true },
    'full blast': { action: 'apply_preset', values: { preset: 'turbo_cool' }, confidence: 0.9, explanation: 'Maximum cooling', understood: true },
    'dry mode': { action: 'set_mode', values: { mode: 'dry' }, confidence: 1.0, explanation: 'Switching to dehumidify mode', understood: true },
    'auto mode': { action: 'set_mode', values: { mode: 'auto' }, confidence: 1.0, explanation: 'Switching to auto mode', understood: true },
    'fan only': { action: 'set_mode', values: { mode: 'wind' }, confidence: 0.95, explanation: 'Fan only mode', understood: true },
    'save energy': { action: 'set_special', values: { specialMode: 'eco' }, confidence: 0.85, explanation: 'Energy saving eco mode', understood: true },
    'morning routine': { action: 'apply_preset', values: { preset: 'morning_fresh' }, confidence: 0.9, explanation: 'Morning routine preset', understood: true },
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

  // Fan speed patterns: "low fan", "fan on high", "medium speed"
  const fanMatch = lower.match(/(?:fan\s+(?:on\s+)?|set\s+fan\s+(?:to\s+)?)(auto|low|medium|high|turbo)/);
  if (fanMatch) {
    return {
      action: 'set_fan', values: { fan: fanMatch[1] },
      confidence: 0.95, explanation: `Setting fan to ${fanMatch[1]}`, understood: true,
    };
  }

  // Mode patterns: "switch to cool", "change to heat", "put it on dry"
  const modeMatch = lower.match(/(?:switch|change|put\s+(?:it\s+)?on|set)\s+(?:to\s+|mode\s+)?(cool|heat|auto|dry|wind|fan)/);
  if (modeMatch) {
    const mode = modeMatch[1] === 'fan' ? 'wind' : modeMatch[1];
    return {
      action: 'set_mode', values: { mode },
      confidence: 0.95, explanation: `Switching to ${mode} mode`, understood: true,
    };
  }

  // Timer patterns: "turn off in 1 hour", "off in 30 minutes"
  const timerMatch = lower.match(/(?:turn\s+)?off\s+in\s+(\d+)\s*(hour|hr|minute|min)/);
  if (timerMatch) {
    const val = parseInt(timerMatch[1]);
    const unit = timerMatch[2].startsWith('min') ? 'minutes' : 'hours';
    return {
      action: 'set_timer', values: { duration: val, unit },
      confidence: 0.9, explanation: `Timer: off in ${val} ${unit}`, understood: true,
    };
  }

  return null; // Need LLM for this one
}

module.exports = { parseNaturalCommand, parseWithGemini, tryQuickParse, checkOllamaStatus };
