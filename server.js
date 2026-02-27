const express = require("express");
const path = require("path");
const { parseCapabilities } = require("./lib/capabilities");
const brands = require("./lib/brands");
const scannerParser = require("./lib/scanner-parser");
const database = require("./lib/database");
const discovery = require("./lib/discovery");
const connManager = require("./lib/connection-manager");
const irController = require("./lib/ir");

// Wire IR controller into connection manager
connManager.setIRController(irController);

const app = express();
const PORT = process.env.PORT || 3000;
const ST_API = "https://api.smartthings.com/v1";
const ST_AUTH_URL = "https://auth-global.api.smartthings.com";

// ─── OAuth2 Configuration ───
// Set these via env vars or .env file. Get them by running:
//   smartthings apps:create   (SmartThings CLI)
// Or register at https://developer.smartthings.com
const OAUTH_CLIENT_ID = process.env.ST_CLIENT_ID || "";
const OAUTH_CLIENT_SECRET = process.env.ST_CLIENT_SECRET || "";
const OAUTH_REDIRECT_URI = process.env.ST_REDIRECT_URI || `http://localhost:${PORT}/api/auth/callback`;
const OAUTH_SCOPES = "r:devices:* x:devices:* r:locations:* w:devices:* l:devices";

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Initialize SQLite database
database.initDB();

// ─── OAuth2 Token Management ───

/**
 * Get a valid Bearer token.
 * Priority: 1) Stored OAuth token (auto-refresh if expired)  2) Request header PAT
 * This lets the app work with both OAuth login AND manual PAT fallback.
 */
async function getValidToken(reqToken) {
  // Try stored OAuth token first
  const stored = database.getOAuthToken();
  if (stored) {
    // Check if expired (with 5 min buffer)
    const expiresAt = new Date(stored.expires_at);
    const bufferMs = 5 * 60 * 1000;
    if (expiresAt.getTime() - Date.now() < bufferMs) {
      // Token expired or about to expire — refresh it
      console.log('[oauth] Token expired or expiring soon, refreshing...');
      try {
        const refreshed = await refreshOAuthToken(stored.refresh_token);
        return `Bearer ${refreshed.access_token}`;
      } catch (e) {
        console.error('[oauth] Refresh failed:', e.message);
        // If refresh fails, fall through to request header
      }
    } else {
      return `Bearer ${stored.access_token}`;
    }
  }
  // Fallback: use the token from the request header (manual PAT)
  return reqToken || null;
}

/**
 * Refresh an OAuth token using the refresh_token grant.
 */
async function refreshOAuthToken(refreshToken) {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    refresh_token: refreshToken,
  });

  const response = await fetch(`${ST_AUTH_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[oauth] Refresh response:', text);
    // If refresh token is invalid, clear stored tokens
    database.deleteOAuthToken();
    throw new Error(`Token refresh failed: HTTP ${response.status}`);
  }

  const data = await response.json();
  console.log('[oauth] Token refreshed successfully, expires in', data.expires_in, 'seconds');
  database.saveOAuthToken({
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken, // Some providers don't return a new refresh token
    expires_in: data.expires_in || 86400,
    scope: data.scope || '',
  });
  return data;
}

// ─── Helper: call SmartThings API (now with auto-refresh) ───
async function stApiFetch(method, apiPath, token, body) {
  // Resolve the best available token
  const resolvedToken = await getValidToken(token);
  if (!resolvedToken) {
    const err = new Error('No valid token available. Please login via OAuth or provide a PAT.');
    err.status = 401;
    throw err;
  }

  const opts = {
    method,
    headers: {
      Authorization: resolvedToken,
      "Content-Type": "application/json",
    },
  };
  if (body && method !== "GET" && method !== "HEAD") {
    opts.body = JSON.stringify(body);
  }
  const url = `${ST_API}${apiPath}`;
  console.log(`[st-api] ${method} ${url}`);
  const response = await fetch(url, opts);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { error: `SmartThings returned non-JSON (HTTP ${response.status})`, raw: text.slice(0, 200) };
  }
  if (!response.ok) {
    // If 401 and we used a stored token, try refreshing once
    if (response.status === 401) {
      const stored = database.getOAuthToken();
      if (stored) {
        try {
          const refreshed = await refreshOAuthToken(stored.refresh_token);
          // Retry with new token
          opts.headers.Authorization = `Bearer ${refreshed.access_token}`;
          const retry = await fetch(url, opts);
          const retryText = await retry.text();
          try { data = JSON.parse(retryText); } catch { data = { error: retryText }; }
          if (retry.ok) return data;
        } catch (refreshErr) {
          console.error('[oauth] Retry after refresh failed:', refreshErr.message);
        }
      }
    }
    const err = new Error(data.error || data.message || `HTTP ${response.status}`);
    err.status = response.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ═══════════════════════════════════════
//  Use an Express Router for new APIs
//  so they match BEFORE the catchall proxy
// ═══════════════════════════════════════
const apiRouter = express.Router();

// ═══════════════════════════════════════
//  OAuth2 Authentication Routes
// ═══════════════════════════════════════

// Step 1: Start OAuth — returns the URL the app should open in browser/webview
apiRouter.get("/auth/login", (req, res) => {
  if (!OAUTH_CLIENT_ID) {
    return res.status(500).json({
      error: "OAuth not configured",
      message: "Set ST_CLIENT_ID, ST_CLIENT_SECRET env vars. Run: smartthings apps:create",
      fallback: "Use a Personal Access Token (PAT) from https://account.smartthings.com/tokens",
    });
  }
  const state = Math.random().toString(36).substring(2, 15);
  const authUrl = `${ST_AUTH_URL}/oauth/authorize?` + new URLSearchParams({
    response_type: 'code',
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    scope: OAUTH_SCOPES,
    state,
  }).toString();

  res.json({ authUrl, state });
});

// Step 2: OAuth callback — exchanges auth code for tokens
apiRouter.get("/auth/callback", async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    return res.status(400).send(`
      <html><body style="font-family:system-ui;text-align:center;padding:40px">
        <h2>❌ Authorization Failed</h2>
        <p>${error_description || error}</p>
        <p>Close this window and try again.</p>
      </body></html>
    `);
  }

  if (!code) {
    return res.status(400).send(`
      <html><body style="font-family:system-ui;text-align:center;padding:40px">
        <h2>❌ Missing Authorization Code</h2>
        <p>Close this window and try again.</p>
      </body></html>
    `);
  }

  try {
    // Exchange code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: OAUTH_CLIENT_ID,
      client_secret: OAUTH_CLIENT_SECRET,
      code,
      redirect_uri: OAUTH_REDIRECT_URI,
    });

    const tokenResponse = await fetch(`${ST_AUTH_URL}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      console.error('[oauth] Token exchange failed:', errText);
      throw new Error(`Token exchange failed: ${tokenResponse.status}`);
    }

    const tokenData = await tokenResponse.json();
    console.log('[oauth] Token obtained! Expires in:', tokenData.expires_in, 'seconds');

    // Store tokens in database
    database.saveOAuthToken({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in || 86400,
      scope: tokenData.scope || OAUTH_SCOPES,
    });

    // Return a success page that the app can detect
    res.send(`
      <html><body style="font-family:system-ui;text-align:center;padding:40px;background:#10b981;color:white">
        <h1>✅ Connected!</h1>
        <p>SmartThings account linked successfully.</p>
        <p style="font-size:14px">You can close this window and return to the app.</p>
        <script>
          // For React Native WebView detection
          if (window.ReactNativeWebView) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'oauth_success' }));
          }
          // For deep-link based apps — delayed so the user sees the success page briefly
          setTimeout(() => { window.location.href = 'smartac://auth/callback?success=true'; }, 1500);
        </script>
      </body></html>
    `);

  } catch (e) {
    console.error('[oauth] Callback error:', e);
    res.status(500).send(`
      <html><body style="font-family:system-ui;text-align:center;padding:40px">
        <h2>❌ Connection Failed</h2>
        <p>${e.message}</p>
        <p>Close this window and try again.</p>
      </body></html>
    `);
  }
});

// Check auth status — the app polls this after opening the OAuth URL
apiRouter.get("/auth/status", (req, res) => {
  const stored = database.getOAuthToken();
  if (!stored) {
    return res.json({ authenticated: false, method: null });
  }
  const isPAT = stored.scope === 'pat' || stored.refresh_token === 'pat_no_refresh';
  res.json({
    authenticated: true,
    method: isPAT ? 'pat' : 'oauth',
    expires_at: stored.expires_at,
    is_expired: stored.is_expired,
    scope: stored.scope,
  });
});

// Manual PAT entry — stores as if it were an OAuth token (no refresh though)
apiRouter.post("/auth/pat", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: "token required" });

  // Store the PAT (no refresh token, set long expiry since PATs last 24h)
  database.saveOAuthToken({
    access_token: token.replace(/^Bearer\s+/i, ''),
    refresh_token: 'pat_no_refresh',
    expires_in: 86400, // 24 hours
    scope: 'pat',
  });

  res.json({ success: true, method: 'pat', message: 'Token stored. Will expire in ~24 hours.' });
});

// Logout — clear stored tokens
apiRouter.post("/auth/logout", (req, res) => {
  database.deleteOAuthToken();
  res.json({ success: true });
});

// ── Capabilities (normalized) ──

apiRouter.get("/devices/:id/capabilities", async (req, res) => {
  const token = req.headers.authorization || null;

  try {
    const [deviceInfo, deviceStatus] = await Promise.all([
      stApiFetch("GET", `/devices/${req.params.id}`, token),
      stApiFetch("GET", `/devices/${req.params.id}/status`, token),
    ]);

    const profile = parseCapabilities(deviceInfo, deviceStatus);

    // Auto-save device to local DB
    database.saveDevice({
      deviceId: profile.deviceId,
      name: profile.name,
      brand: profile.brand,
      model: profile.model,
      wattage: profile.wattage,
    });

    res.json(profile);
  } catch (e) {
    console.error("Capabilities error:", e.message);
    res.status(e.status || 500).json({ error: e.message });
  }
});

// ── Brand Database ──

apiRouter.get("/brands", (req, res) => {
  res.json({ brands: brands.getAllBrands(), total: brands.getAllBrands().length });
});

apiRouter.get("/brands/lookup/:modelNumber", (req, res) => {
  const result = brands.lookupByModel(req.params.modelNumber);
  if (!result) {
    return res.json({ match: "not_found", query: req.params.modelNumber, suggestions: brands.getAllBrands().slice(0, 5) });
  }
  res.json({
    match: result.match,
    confidence: result.confidence,
    brand: {
      id: result.brand.id,
      name: result.brand.name,
      emoji: result.brand.logo_emoji,
      country: result.brand.country,
    },
    model: result.model,
    suggestedPresets: brands.generatePresets(
      { modes: ['cool', 'auto'], fanSpeeds: ['auto', 'low', 'medium', 'high'], specialModes: result.brand.specialCapabilities || [] },
      result.model?.wattage || result.brand.defaultWattage
    ),
  });
});

// ── Scanner / Barcode Lookup ──

apiRouter.post("/brands/scan", (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: "code is required" });
  try {
    const result = scannerParser.parseScannedCode(code);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/brands/search", (req, res) => {
  const query = req.query.q || '';
  try {
    const results = scannerParser.searchBrands(query);
    res.json({ results, count: results.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Usage Tracking ──

apiRouter.post("/usage/log", (req, res) => {
  const { deviceId, eventType, details } = req.body;
  if (!deviceId || !eventType) {
    return res.status(400).json({ error: "deviceId and eventType are required" });
  }

  try {
    database.logEvent(deviceId, eventType, details || {});

    // Auto-manage runtime sessions
    if (eventType === "power_on") {
      const device = database.getDevice(deviceId);
      database.startSession(deviceId, device?.wattage || 1500, details?.temp || 24, details?.mode || "cool");
    } else if (eventType === "power_off") {
      database.endSession(deviceId);
    }

    res.json({ success: true, eventType });
  } catch (e) {
    console.error("Usage log error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/usage/stats/:deviceId", (req, res) => {
  try {
    const period = req.query.period || "month";
    const stats = database.getUsageStats(req.params.deviceId, period);
    res.json(stats);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/usage/events/:deviceId", (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const events = database.getEvents(req.params.deviceId, limit);
    res.json({ events, count: events.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Savings ──

apiRouter.get("/savings/:deviceId", (req, res) => {
  try {
    const period = req.query.period || "month";
    const savings = database.getSavings(req.params.deviceId, period);
    res.json(savings);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Settings ──

apiRouter.get("/settings", (req, res) => {
  try {
    const settings = database.getSettings();
    const parsed = {};
    for (const [k, v] of Object.entries(settings)) {
      try { parsed[k] = JSON.parse(v); } catch { parsed[k] = v; }
    }
    res.json(parsed);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/settings", (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: "key is required" });

  try {
    database.updateSettings(key, value);
    res.json({ success: true, key, value });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Devices (local DB) ──

apiRouter.get("/local/devices", (req, res) => {
  try {
    const devices = database.getAllDevices();
    res.json({ devices, count: devices.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/local/devices", (req, res) => {
  try {
    database.saveDevice(req.body);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Network Discovery ──

apiRouter.post("/discover/local", async (req, res) => {
  try {
    const timeout = parseInt(req.query.timeout) || 8000;
    console.log(`[discovery] Starting local network scan (${timeout}ms)...`);
    const devices = await discovery.discoverAll(timeout);
    res.json({ devices, count: devices.length, scanDuration: timeout });
  } catch (e) {
    console.error("Discovery error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/discover/cache", (req, res) => {
  discovery.clearCache();
  res.json({ success: true, message: "Discovery cache cleared" });
});

// ── Connection Manager ──

apiRouter.post("/connections/register", (req, res) => {
  const { deviceId, ip, port, brand, smartThingsId, irBlasterId, connectionType } = req.body;
  if (!deviceId || !brand) {
    return res.status(400).json({ error: "deviceId and brand are required" });
  }

  // Normalize connection type
  let normalizedType = connectionType || 'auto';
  if (normalizedType === 'cloud') normalizedType = 'smartthings';

  try {
    connManager.registerDevice(deviceId, { ip, port, brand, smartThingsId, irBlasterId, connectionType: normalizedType });

    // Also save in database
    database.saveDevice({
      deviceId,
      brand,
      name: req.body.name || `${brand} AC`,
      connectionType: normalizedType,
      ip,
      port,
    });

    res.json({ success: true, deviceId, connectionType: connManager.getActiveConnectionType(deviceId) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.get("/connections/status", (req, res) => {
  res.json(connManager.getConnectionStatus());
});

// ── Local Control (via Connection Manager) ──

apiRouter.get("/local/control/:deviceId/status", async (req, res) => {
  try {
    const token = req.headers.authorization || null;
    // SmartThings fallback fetcher
    const stFetcher = async (stId) => {
      const status = await stApiFetch("GET", `/devices/${stId}/status`, token);
      return status;
    };

    const status = await connManager.getStatus(req.params.deviceId, stFetcher);
    res.json(status);
  } catch (e) {
    console.error("Local status error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/local/control/:deviceId/command", async (req, res) => {
  const { command, value } = req.body;
  if (!command) return res.status(400).json({ error: "command is required" });

  try {
    const token = req.headers.authorization || null;
    // SmartThings fallback sender
    const stSender = async (stId, cmd, val) => {
      // Map generic command to SmartThings command format
      const stCommands = {
        power: { component: 'main', capability: 'switch', command: val ? 'on' : 'off' },
        temperature: { component: 'main', capability: 'thermostatCoolingSetpoint', command: 'setCoolingSetpoint', arguments: [val] },
        mode: { component: 'main', capability: 'airConditionerMode', command: 'setAirConditionerMode', arguments: [val] },
        fanSpeed: { component: 'main', capability: 'airConditionerFanMode', command: 'setFanMode', arguments: [val] },
        swing: { component: 'main', capability: 'fanOscillationMode', command: 'setFanOscillationMode', arguments: [val] },
        specialMode: { component: 'main', capability: 'custom.airConditionerOptionalMode', command: 'setAcOptionalMode', arguments: [val] },
      };
      const stCmd = stCommands[cmd];
      if (!stCmd) throw new Error(`Unknown SmartThings command: ${cmd}`);
      return stApiFetch("POST", `/devices/${stId}/commands`, token, { commands: [stCmd] });
    };

    const result = await connManager.sendCommand(req.params.deviceId, command, value, stSender);

    // Log usage event
    database.logEvent(req.params.deviceId, `command_${command}`, { value, connectionType: result.connectionType });

    res.json(result);
  } catch (e) {
    console.error("Local control error:", e.message);
    res.status(500).json({ error: e.message });
  }
});

// ── IR Blaster ──

apiRouter.get("/ir/blasters", async (req, res) => {
  try {
    const blasters = irController.getBlasters();
    if (blasters.length === 0 && req.query.discover === 'true') {
      const found = await irController.discover();
      return res.json({ blasters: found, count: found.length, freshDiscovery: true });
    }
    res.json({ blasters, count: blasters.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/ir/discover", async (req, res) => {
  try {
    const blasters = await irController.discover();
    res.json({ blasters, count: blasters.length });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/ir/send", async (req, res) => {
  const { blasterId, brand, command, value } = req.body;
  if (!blasterId || !brand || !command) {
    return res.status(400).json({ error: "blasterId, brand, and command are required" });
  }

  try {
    const result = await irController.send(blasterId, brand, command, value);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.post("/ir/learn", async (req, res) => {
  const { blasterId, label } = req.body;
  if (!blasterId || !label) {
    return res.status(400).json({ error: "blasterId and label are required" });
  }

  try {
    const timeout = parseInt(req.query.timeout) || 15000;
    const result = await irController.learn(blasterId, label, timeout);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Rooms ──

apiRouter.get("/rooms", (req, res) => {
  try {
    const rooms = database.getRooms();
    res.json({ rooms, count: rooms.length });
  } catch (e) {
    res.json({ rooms: [], count: 0 });
  }
});

apiRouter.post("/rooms", (req, res) => {
  try {
    const { name, icon, deviceIds } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });
    const id = `room_${Date.now()}`;
    const room = database.saveRoom({ id, name, icon, device_ids: deviceIds || [] });
    res.json({ success: true, id, room });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/rooms/:id", (req, res) => {
  try {
    const updated = database.updateRoom(req.params.id, req.body);
    res.json({ success: true, room: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/rooms/:id", (req, res) => {
  try {
    database.deleteRoom(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Schedules ──

apiRouter.get("/schedules/:deviceId", (req, res) => {
  try {
    const schedules = database.getSchedules(req.params.deviceId);
    res.json({ schedules, count: schedules.length });
  } catch (e) {
    res.json({ schedules: [], count: 0 });
  }
});

apiRouter.get("/schedules", (req, res) => {
  try {
    const schedules = database.getSchedules();
    res.json({ schedules, count: schedules.length });
  } catch (e) {
    res.json({ schedules: [], count: 0 });
  }
});

apiRouter.post("/schedules", (req, res) => {
  try {
    const id = `sch_${Date.now()}`;
    const schedule = database.saveSchedule({ id, ...req.body });
    res.json({ success: true, schedule });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.put("/schedules/:id", (req, res) => {
  try {
    const updated = database.updateSchedule(req.params.id, req.body);
    res.json({ success: true, schedule: updated });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

apiRouter.delete("/schedules/:id", (req, res) => {
  try {
    database.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Weather (proxy to free API) ──

apiRouter.get("/weather", async (req, res) => {
  try {
    const lat = req.query.lat || 28.6139;
    const lon = req.query.lon || 77.209;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day&timezone=auto`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Geolocation (free IP-based) ──

apiRouter.get("/geolocation", async (req, res) => {
  try {
    // Try ip-api.com (free, no key, 45 req/min)
    const response = await fetch("http://ip-api.com/json/?fields=status,city,regionName,country,lat,lon,timezone");
    const data = await response.json();
    if (data.status === "success") {
      return res.json({
        city: data.city,
        region: data.regionName,
        country: data.country,
        lat: data.lat,
        lon: data.lon,
        timezone: data.timezone,
      });
    }
    // Fallback: default to Delhi
    res.json({ city: "New Delhi", region: "Delhi", country: "India", lat: 28.6139, lon: 77.209, timezone: "Asia/Kolkata" });
  } catch (e) {
    res.json({ city: "New Delhi", region: "Delhi", country: "India", lat: 28.6139, lon: 77.209, timezone: "Asia/Kolkata" });
  }
});

// ═══════════════════════════════════════
//  AI Intelligence Layer (Phase 7)
// ═══════════════════════════════════════
const nlpController = require("./lib/nlp-controller");

// ── NLP Command ──
apiRouter.post("/ai/command", async (req, res) => {
  try {
    const { text, deviceCapabilities } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });

    // Try quick parse first (no LLM needed)
    const quick = nlpController.tryQuickParse(text);
    if (quick) return res.json(quick);

    // Fall back to Ollama LLM
    const result = await nlpController.parseNaturalCommand(text, deviceCapabilities);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, understood: false });
  }
});

// ── Ollama Status ──
apiRouter.get("/ai/status", async (req, res) => {
  try {
    const ollamaOk = await nlpController.checkOllamaStatus();
    res.json({
      ollama: ollamaOk,
      gemini: !!process.env.GEMINI_API_KEY,
      nlp: ollamaOk,
      version: "7.0",
    });
  } catch (e) {
    res.json({ ollama: false, gemini: false, nlp: false, version: "7.0" });
  }
});

// ── Gemini Preset Description ──
apiRouter.post("/ai/generate-preset-description", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Gemini API key not configured" });

    const { preset, context } = req.body;
    const prompt = `You are an expert smart home AI. Generate a short, conversational description (2-3 sentences) for this AC preset:
Name: ${preset.name}
Temperature: ${preset.temp}°C, Mode: ${preset.mode}, Fan: ${preset.fan}
${preset.specialMode ? `Special: ${preset.specialMode}` : ''}
${context?.weather ? `Current weather: ${context.weather.temp}°C, ${context.weather.humidity}% humidity` : ''}
${context?.timeOfDay ? `Time: ${context.timeOfDay}` : ''}
Keep it friendly, mention comfort and any energy savings. Reply with ONLY the description text.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
        }),
      }
    );
    const data = await response.json();
    const description = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    res.json({ description: description.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── Gemini Preset Generation ──
apiRouter.post("/ai/generate-presets", async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(503).json({ error: "Gemini API key not configured" });

    const { capabilities, context } = req.body;
    const prompt = `You are a smart home AI for Indian climate. Generate exactly 4 AC presets as a JSON array.
Each preset: { "name": string, "temp": 16-30, "mode": "cool"|"heat"|"auto"|"dry", "fan": "auto"|"low"|"medium"|"high", "specialMode": "off"|"windFree"|"eco"|"sleep", "estimatedWatts": number, "description": string (1 sentence) }
${capabilities ? `Device supports: ${JSON.stringify(capabilities)}` : ''}
${context?.weather ? `Weather: ${context.weather.temp}°C, ${context.weather.humidity}% humidity` : ''}
${context?.timeOfDay ? `Time: ${context.timeOfDay}` : ''}
${context?.season ? `Season: ${context.season}` : ''}
Consider Indian climate patterns. Reply with ONLY the JSON array, no markdown.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 500, temperature: 0.8 },
        }),
      }
    );
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    // Extract JSON array from response
    const match = text.match(/\[[\s\S]*\]/);
    const presets = match ? JSON.parse(match[0]) : [];
    res.json({ presets });
  } catch (e) {
    res.status(500).json({ error: e.message, presets: [] });
  }
});

// Mount the router BEFORE the catchall proxy
app.use("/api", apiRouter);

// ═══════════════════════════════════════
//  EXISTING: SmartThings Proxy (KEPT)
//  Falls through from Router for unknown routes
//  Catches /api/* paths not handled by apiRouter
// ═══════════════════════════════════════

app.use("/api", async (req, res, next) => {
  // Skip if already handled by the router
  if (res.headersSent) return next();
  
  const apiPath = req.url;
  const token = req.headers.authorization || null;

  try {
    const resolvedToken = await getValidToken(token);
    if (!resolvedToken) return res.status(401).json({ error: "Not authenticated. Login via OAuth or provide a PAT." });

    const opts = {
      method: req.method,
      headers: {
        "Authorization": resolvedToken,
        "Content-Type": "application/json",
      },
    };

    if (req.method !== "GET" && req.method !== "HEAD" && req.body && Object.keys(req.body).length > 0) {
      opts.body = JSON.stringify(req.body);
    }

    const url = `${ST_API}${apiPath}`;
    console.log(`[proxy] ${req.method} ${url}`);

    const response = await fetch(url, opts);
    const text = await response.text();

    // Try to parse as JSON, otherwise wrap as error
    let body;
    try {
      body = JSON.parse(text);
    } catch {
      body = { error: `SmartThings returned non-JSON (HTTP ${response.status})`, raw: text.slice(0, 200) };
    }

    res.status(response.status).json(body);
  } catch (e) {
    console.error("Proxy error:", e.message);
    res.status(502).json({ error: "Proxy failed", detail: e.message });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n✓ Shutting down...");
  await connManager.disconnectAll();
  database.close();
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`✓ SmartAC Universal Controller running on http://localhost:${PORT}`);
  console.log(`  ├─ Brands: ${brands.getAllBrands().length} supported`);
  console.log(`  ├─ SQLite: ./data/smartac.db`);
  console.log(`  ├─ Discovery: mDNS + SSDP + port-scan`);
  console.log(`  ├─ Protocols: WiFi Direct / SmartThings / IR`);
  console.log(`  └─ API: /api/brands, /api/discover/local, /api/local/control/:id/*`);

  // Restore known devices into connection manager from database
  try {
    const savedDevices = database.getAllDevices();
    for (const dev of savedDevices) {
      try {
        connManager.registerDevice(dev.device_id, {
          ip: dev.ip || undefined,
          port: dev.port || undefined,
          brand: dev.brand || 'unknown',
          connectionType: dev.connection_type || 'auto',
        });
      } catch {}
    }
    if (savedDevices.length > 0) {
      console.log(`  ✓ Restored ${savedDevices.length} device(s) into connection manager`);
    }
  } catch {}
});
