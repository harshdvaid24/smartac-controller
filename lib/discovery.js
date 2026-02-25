/**
 * Local Network AC Discovery
 * Finds smart ACs on the local WiFi network using multiple discovery methods:
 * 1. mDNS/Bonjour — standard service discovery
 * 2. SSDP/UPnP — universal plug and play discovery
 * 3. Port scanning — probe known AC ports on local subnet
 * 
 * Results are merged and deduplicated by IP address.
 */

const Bonjour = require('bonjour-service').Bonjour;
const { Client: SSDPClient } = require('node-ssdp');
const { networkInterfaces } = require('os');

// Known mDNS service types for AC brands
const MDNS_SERVICES = [
  { type: 'samsung-ac', protocol: 'tcp', brand: 'samsung' },
  { type: 'daikin', protocol: 'tcp', brand: 'daikin' },
  { type: 'lg-smart', protocol: 'tcp', brand: 'lg' },
  { type: 'midea', protocol: 'tcp', brand: 'midea' },
  { type: 'haier-ac', protocol: 'tcp', brand: 'haier' },
  { type: 'aircon', protocol: 'tcp', brand: 'unknown' },
  { type: 'http', protocol: 'tcp', brand: 'unknown' },  // generic, filter by TXT
];

// Known AC ports for port scanning
const AC_PORTS = [
  { port: 80, brand: 'daikin', path: '/common/basic_info', protocol: 'http' },
  { port: 8888, brand: 'samsung', path: '/devices/0', protocol: 'http' },
  { port: 8889, brand: 'samsung', path: '/devices/0', protocol: 'https' },
  { port: 6444, brand: 'midea', path: null, protocol: 'tcp' },
  { port: 7000, brand: 'gree', path: null, protocol: 'udp' },
  { port: 56800, brand: 'haier', path: null, protocol: 'tcp' },
];

// Cache discovered devices
let discoveryCache = { devices: [], timestamp: 0 };
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Run all discovery methods in parallel and merge results.
 * @param {number} timeoutMs - How long to scan (default 8 seconds)
 * @returns {Promise<Array>} Discovered devices
 */
async function discoverAll(timeoutMs = 8000) {
  // Check cache
  if (Date.now() - discoveryCache.timestamp < CACHE_TTL && discoveryCache.devices.length > 0) {
    return discoveryCache.devices;
  }

  const results = [];

  try {
    const [mdnsResults, ssdpResults, portResults] = await Promise.allSettled([
      discoverMDNS(timeoutMs),
      discoverSSDP(timeoutMs),
      scanPorts(timeoutMs),
    ]);

    if (mdnsResults.status === 'fulfilled') results.push(...mdnsResults.value);
    if (ssdpResults.status === 'fulfilled') results.push(...ssdpResults.value);
    if (portResults.status === 'fulfilled') results.push(...portResults.value);
  } catch (e) {
    console.error('[discovery] Error during scan:', e.message);
  }

  // Deduplicate by IP address (prefer mDNS > SSDP > port scan)
  const deduped = deduplicateByIP(results);

  // Cache results
  discoveryCache = { devices: deduped, timestamp: Date.now() };

  return deduped;
}

/**
 * Discover devices via mDNS/Bonjour.
 */
function discoverMDNS(timeoutMs) {
  return new Promise(resolve => {
    const devices = [];
    const bonjour = new Bonjour();
    const browsers = [];

    for (const service of MDNS_SERVICES) {
      const browser = bonjour.find({ type: service.type, protocol: service.protocol }, (svc) => {
        // Filter HTTP services for AC-related keywords
        if (service.type === 'http') {
          const name = (svc.name || '').toLowerCase();
          const isAC = name.includes('ac') || name.includes('aircon') || name.includes('daikin') ||
                       name.includes('samsung') || name.includes('midea') || name.includes('hvac');
          if (!isAC) return;
        }

        const deviceIP = svc.referer?.address || svc.addresses?.[0] || '';
        devices.push({
          ip: deviceIP,
          port: svc.port || 80,
          name: cleanDeviceName(svc.name || '', service.brand, deviceIP),
          brand: service.brand,
          discoveryMethod: 'mdns',
          serviceType: `_${service.type}._${service.protocol}`,
          txt: svc.txt || {},
        });
      });
      browsers.push(browser);
    }

    setTimeout(() => {
      browsers.forEach(b => { try { b.stop(); } catch {} });
      try { bonjour.destroy(); } catch {}
      resolve(devices);
    }, timeoutMs);
  });
}

/**
 * Discover devices via SSDP/UPnP.
 * Only accepts devices that match AC-specific signatures.
 */
function discoverSSDP(timeoutMs) {
  return new Promise(resolve => {
    const devices = [];

    try {
      const client = new SSDPClient();

      client.on('response', (headers, statusCode, rinfo) => {
        const location = headers.LOCATION || '';
        const server = (headers.SERVER || '').toLowerCase();
        const usn = (headers.USN || '').toLowerCase();
        const st = (headers.ST || '').toLowerCase();
        const combined = `${server} ${usn} ${location} ${st}`;

        // Strict AC-only filter — must match known AC keywords
        const AC_KEYWORDS = [
          'hvac', 'airconditioner', 'air_conditioner', 'aircon',
          'daikin', 'samsung', 'lg', 'midea', 'haier', 'gree',
          'carrier', 'voltas', 'bluestar', 'hitachi', 'panasonic',
          'mitsubishi', 'toshiba', 'whirlpool', 'godrej', 'lloyd',
        ];
        const AC_PORT_PATHS = [':8888', ':80/aircon', ':80/common/basic_info'];

        const isAC = AC_KEYWORDS.some(kw => combined.includes(kw)) ||
                     AC_PORT_PATHS.some(p => location.includes(p));

        if (!isAC) return; // Skip non-AC devices

        const brand = detectBrandFromSSDP(headers.SERVER || '', headers.USN || '', location);
        devices.push({
          ip: rinfo.address,
          port: rinfo.port,
          name: cleanDeviceName(headers.SERVER || '', brand, rinfo.address),
          brand,
          discoveryMethod: 'ssdp',
          location,
          usn: headers.USN || '',
        });
      });

      // Search for AC-specific UPnP types
      client.search('urn:schemas-upnp-org:device:hvac:1');
      setTimeout(() => client.search('urn:samsung.com:device:AirConditioner:1'), 300);
      setTimeout(() => client.search('ssdp:all'), 600);

      setTimeout(() => {
        try { client.stop(); } catch {}
        resolve(devices);
      }, timeoutMs);
    } catch {
      resolve([]);
    }
  });
}

/**
 * Scan known AC ports on the local subnet.
 * Only probes specific ports — not a full port scan.
 */
async function scanPorts(timeoutMs) {
  const subnet = getLocalSubnet();
  if (!subnet) return [];

  const devices = [];
  const startTime = Date.now();
  const [base, _] = subnet.split('/');
  const baseOctets = base.split('.').slice(0, 3).join('.');

  // Only scan Daikin (port 80) and Samsung (port 8888) for now
  // Full subnet scan of all ports would be too slow
  const quickPorts = AC_PORTS.filter(p => p.protocol === 'http');

  // Scan a limited range to avoid being too slow
  const scanPromises = [];
  for (let i = 1; i <= 254 && (Date.now() - startTime < timeoutMs - 1000); i++) {
    const ip = `${baseOctets}.${i}`;
    for (const portInfo of quickPorts) {
      scanPromises.push(probePort(ip, portInfo, 2000).catch(() => null));
    }
  }

  // Run in batches of 50 to avoid overwhelming the network
  for (let i = 0; i < scanPromises.length; i += 50) {
    if (Date.now() - startTime >= timeoutMs - 500) break;
    const batch = scanPromises.slice(i, i + 50);
    const results = await Promise.allSettled(batch);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        devices.push(r.value);
      }
    }
  }

  return devices;
}

/**
 * Probe a single IP:port to check for an AC device.
 */
async function probePort(ip, portInfo, probeTimeout) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), probeTimeout);

  try {
    const prefix = portInfo.protocol === 'https' ? 'https' : 'http';
    const url = `${prefix}://${ip}:${portInfo.port}${portInfo.path}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json, text/plain' },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const text = await res.text();
      // Verify it's actually an AC device
      const isAC = text.includes('ret=OK') || // Daikin
                   text.includes('deviceId') || // Samsung
                   text.includes('aircon') ||   // Generic AC
                   text.includes('temperature');

      if (isAC) {
        const brandLabel = portInfo.brand.charAt(0).toUpperCase() + portInfo.brand.slice(1);
        // Try extracting a model name from the response
        let model = '';
        const modelMatch = text.match(/name=([^&\n]+)/) || text.match(/"name"\s*:\s*"([^"]+)"/);
        if (modelMatch) model = ` ${modelMatch[1]}`;
        return {
          ip,
          port: portInfo.port,
          name: `${brandLabel}${model} AC (${ip})`,
          brand: portInfo.brand,
          discoveryMethod: 'port_scan',
          responseSnippet: text.slice(0, 100),
        };
      }
    }
  } catch {
    clearTimeout(timeout);
  }
  return null;
}

/**
 * Get the local subnet in CIDR notation.
 */
function getLocalSubnet() {
  const interfaces = networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return `${iface.address}/24`;
      }
    }
  }
  return null;
}

/**
 * Detect brand from SSDP response fields.
 */
function detectBrandFromSSDP(server, usn, location) {
  const combined = `${server} ${usn} ${location}`.toLowerCase();
  const brandMap = [
    ['daikin', 'daikin'], ['samsung', 'samsung'], ['lg', 'lg'],
    ['midea', 'midea'], ['haier', 'haier'], ['gree', 'gree'],
    ['carrier', 'carrier'], ['voltas', 'voltas'], ['bluestar', 'bluestar'],
    ['hitachi', 'hitachi'], ['panasonic', 'panasonic'],
    ['mitsubishi', 'mitsubishi'], ['toshiba', 'toshiba'],
    ['whirlpool', 'whirlpool'], ['godrej', 'godrej'], ['lloyd', 'lloyd'],
  ];
  for (const [keyword, brand] of brandMap) {
    if (combined.includes(keyword)) return brand;
  }
  return 'unknown';
}

/**
 * Clean up raw device names into user-friendly labels.
 */
function cleanDeviceName(rawName, brand, ip) {
  if (!rawName || rawName === 'SSDP Device' || rawName === 'Unknown AC') {
    const brandLabel = brand && brand !== 'unknown'
      ? brand.charAt(0).toUpperCase() + brand.slice(1)
      : 'Smart';
    return `${brandLabel} AC (${ip})`;
  }
  // Remove protocol/version junk like "Unspecified, UPnP/1.0, Unspecified"
  let cleaned = rawName
    .replace(/,?\s*UPnP\/[\d.]+/gi, '')
    .replace(/,?\s*Unspecified/gi, '')
    .replace(/,?\s*Portable SDK for UPnP devices\/[\d.]+/gi, '')
    .replace(/,?\s*Linux\/[\d.]+/gi, '')
    .replace(/^[\s,]+|[\s,]+$/g, '') // trim leading/trailing commas/spaces
    .trim();
  if (!cleaned || cleaned.length < 2) {
    const brandLabel = brand && brand !== 'unknown'
      ? brand.charAt(0).toUpperCase() + brand.slice(1)
      : 'Smart';
    return `${brandLabel} AC (${ip})`;
  }
  return cleaned;
}

/**
 * Deduplicate devices by IP address.
 * Prefers mDNS results > SSDP > port scan.
 */
function deduplicateByIP(devices) {
  const map = new Map();
  const priority = { mdns: 1, ssdp: 2, port_scan: 3 };

  for (const device of devices) {
    if (!device.ip) continue;
    const existing = map.get(device.ip);
    if (!existing || (priority[device.discoveryMethod] || 99) < (priority[existing.discoveryMethod] || 99)) {
      map.set(device.ip, device);
    }
  }

  return Array.from(map.values());
}

/**
 * Clear the discovery cache.
 */
function clearCache() {
  discoveryCache = { devices: [], timestamp: 0 };
}

module.exports = { discoverAll, discoverMDNS, discoverSSDP, scanPorts, clearCache };
