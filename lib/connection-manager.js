/**
 * Connection Manager
 * Unified abstraction layer that routes AC commands through the best available
 * connection method per device: WiFi Direct → SmartThings Cloud → IR Blaster.
 * 
 * Handles connection lifecycle, health checking, automatic failover,
 * and a normalized command/status interface.
 */

const {getProtocol, hasProtocol} = require('./protocols');

// Active connections keyed by deviceId
const connections = new Map();

// Connection health state
const healthStatus = new Map();

const CONNECTION_TYPES = {
    WIFI: 'wifi',
    SMARTTHINGS: 'smartthings',
    IR: 'ir',
    BLE: 'ble',
};

const CONNECTION_PRIORITY = [
    CONNECTION_TYPES.WIFI,
    CONNECTION_TYPES.BLE,
    CONNECTION_TYPES.SMARTTHINGS,
    CONNECTION_TYPES.IR,
];

/**
 * Register a device with its connection configuration.
 * @param {string} deviceId
 * @param {object} config — { ip, port, brand, smartThingsId, irBlasterId, connectionType, options }
 */
function registerDevice(deviceId, config) {
    // Normalize connection type aliases
    let connType = config.connectionType || 'auto';
    if (connType === 'cloud') connType = 'smartthings';
    if (connType === 'wifi_local') connType = 'wifi';

    // Auto-detect smartThingsId for cloud devices
    const smartThingsId = config.smartThingsId || (connType === 'smartthings' ? deviceId : null);

    connections.set(deviceId, {
        deviceId,
        ip: config.ip,
        port: config.port,
        brand: config.brand,
        smartThingsId,
        irBlasterId: config.irBlasterId || null,
        preferredType: connType,
        options: config.options || {},
        protocol: null,     // lazily initialized
        connected: false,
        lastSeen: null,
    });

    healthStatus.set(deviceId, {
        wifi: {available: !!config.ip, healthy: false, lastCheck: 0, failCount: 0},
        smartthings: {available: !!smartThingsId, healthy: true, lastCheck: 0, failCount: 0},
        ir: {available: !!config.irBlasterId, healthy: false, lastCheck: 0, failCount: 0},
        ble: {available: false, healthy: false, lastCheck: 0, failCount: 0},
    });
}

/**
* Get the active connection type for a device.
*/
function getActiveConnectionType(deviceId) {
    const conn = connections.get(deviceId);
    if (!conn) return null;

    if (conn.preferredType !== 'auto') {
        return conn.preferredType;
    }

    // Auto-select: try in priority order
    const health = healthStatus.get(deviceId);
    if (!health) return CONNECTION_TYPES.SMARTTHINGS;

    for (const type of CONNECTION_PRIORITY) {
        if (health[type]?.available && (health[type]?.healthy || health[type]?.failCount < 3)) {
            return type;
        }
    }

    return CONNECTION_TYPES.SMARTTHINGS; // fallback
}

/**
 * Get device status through the best available connection.
 * @param {string} deviceId
 * @param {Function} smartThingsFetcher — async (deviceId) => status, for cloud fallback
 * @returns {Promise<object>} Normalized status
 */
async function getStatus(deviceId, smartThingsFetcher) {
    const connType = getActiveConnectionType(deviceId);
    const conn = connections.get(deviceId);

    if (!conn) {
        throw new Error(`Device ${deviceId} not registered`);
    }

    try {
        let status;

        switch (connType) {
            case CONNECTION_TYPES.WIFI:
                status = await getStatusWiFi(conn);
                break;
            case CONNECTION_TYPES.SMARTTHINGS:
                if (!smartThingsFetcher) throw new Error('SmartThings fetcher not provided');
                status = await smartThingsFetcher(conn.smartThingsId || deviceId);
                break;
            case CONNECTION_TYPES.IR:
                // IR is send-only, can't read status
                status = {power: 'unknown', note: 'IR connection — status not available'};
                break;
            default:
                throw new Error(`Unsupported connection type: ${connType}`);
        }

        // Mark healthy
        markHealthy(deviceId, connType);
        conn.lastSeen = Date.now();

        return {...status, connectionType: connType, deviceId};
    } catch (error) {
        // Mark unhealthy and try fallback
        markUnhealthy(deviceId, connType);

        if (connType === CONNECTION_TYPES.WIFI && smartThingsFetcher) {
            console.log(`[conn-mgr] WiFi failed for ${deviceId}, falling back to SmartThings`);
            try {
                const status = await smartThingsFetcher(conn.smartThingsId || deviceId);
                markHealthy(deviceId, CONNECTION_TYPES.SMARTTHINGS);
                return {...status, connectionType: 'smartthings_fallback', deviceId};
            } catch (fallbackErr) {
                markUnhealthy(deviceId, CONNECTION_TYPES.SMARTTHINGS);
                throw new Error(`All connections failed for ${deviceId}: WiFi: ${error.message}, SmartThings: ${fallbackErr.message}`);
            }
        }

        throw error;
    }
}

/**
 * Send a command through the best available connection.
 * @param {string} deviceId
 * @param {string} command — power, temperature, mode, fanSpeed, swing, specialMode
 * @param {*} value — command-specific value
 * @param {Function} smartThingsSender — async (deviceId, command, value) => result
 * @returns {Promise<object>} Command result
 */
async function sendCommand(deviceId, command, value, smartThingsSender) {
    const connType = getActiveConnectionType(deviceId);
    const conn = connections.get(deviceId);

    if (!conn) {
        throw new Error(`Device ${deviceId} not registered`);
    }

    try {
        let result;

        switch (connType) {
            case CONNECTION_TYPES.WIFI:
                result = await sendCommandWiFi(conn, command, value);
                break;
            case CONNECTION_TYPES.SMARTTHINGS:
                if (!smartThingsSender) throw new Error('SmartThings sender not provided');
                result = await smartThingsSender(conn.smartThingsId || deviceId, command, value);
                break;
            case CONNECTION_TYPES.IR:
                result = await sendCommandIR(conn, command, value);
                break;
            default:
                throw new Error(`Unsupported connection type: ${connType}`);
        }

        markHealthy(deviceId, connType);
        conn.lastSeen = Date.now();

        return {success: true, connectionType: connType, deviceId, command, value, result};
    } catch (error) {
        markUnhealthy(deviceId, connType);

        // Failover chain
        if (connType === CONNECTION_TYPES.WIFI) {
            if (smartThingsSender) {
                try {
                    const result = await smartThingsSender(conn.smartThingsId || deviceId, command, value);
                    markHealthy(deviceId, CONNECTION_TYPES.SMARTTHINGS);
                    return {success: true, connectionType: 'smartthings_fallback', deviceId, command, value, result};
                } catch { }
            }
        }

        throw error;
    }
}

// ---------- WiFi Direct Helpers ----------

async function getStatusWiFi(conn) {
    const protocol = getOrCreateProtocol(conn);
    if (!conn.connected) {
        await protocol.connect();
        conn.connected = true;
    }
    return protocol.getStatus();
}

async function sendCommandWiFi(conn, command, value) {
    const protocol = getOrCreateProtocol(conn);
    if (!conn.connected) {
        await protocol.connect();
        conn.connected = true;
    }
    return protocol.executeCommand(command, value);
}

function getOrCreateProtocol(conn) {
    if (!conn.protocol) {
        if (!hasProtocol(conn.brand)) {
            throw new Error(`No WiFi protocol for brand: ${conn.brand}`);
        }
        conn.protocol = getProtocol(conn.brand, conn.ip, conn.port, conn.options);
    }
    return conn.protocol;
}

// ---------- IR Helpers ----------

let irController = null;

function setIRController(controller) {
    irController = controller;
}

async function sendCommandIR(conn, command, value) {
    if (!irController) throw new Error('IR controller not configured');
    return irController.send(conn.irBlasterId, conn.brand, command, value);
}

// ---------- Health Management ----------

function markHealthy(deviceId, type) {
    const health = healthStatus.get(deviceId);
    if (health && health[type]) {
        health[type].healthy = true;
        health[type].failCount = 0;
        health[type].lastCheck = Date.now();
    }
}

function markUnhealthy(deviceId, type) {
    const health = healthStatus.get(deviceId);
    if (health && health[type]) {
        health[type].failCount++;
        if (health[type].failCount >= 3) {
            health[type].healthy = false;
        }
        health[type].lastCheck = Date.now();
    }
}

/**
 * Get connection status for all registered devices.
 */
function getConnectionStatus() {
    const result = {};
    for (const [deviceId, conn] of connections) {
        result[deviceId] = {
            brand: conn.brand,
            ip: conn.ip,
            preferredType: conn.preferredType,
            activeType: getActiveConnectionType(deviceId),
            connected: conn.connected,
            lastSeen: conn.lastSeen,
            health: healthStatus.get(deviceId),
        };
    }
    return result;
}

/**
 * Disconnect a device and clean up resources.
 */
async function disconnectDevice(deviceId) {
    const conn = connections.get(deviceId);
    if (conn?.protocol) {
        try {await conn.protocol.disconnect();} catch { }
        conn.protocol = null;
        conn.connected = false;
    }
}

/**
 * Disconnect all devices.
 */
async function disconnectAll() {
    for (const deviceId of connections.keys()) {
        await disconnectDevice(deviceId);
    }
}

module.exports = {
    registerDevice,
    getStatus,
    sendCommand,
    getActiveConnectionType,
    getConnectionStatus,
    disconnectDevice,
    disconnectAll,
    setIRController,
    CONNECTION_TYPES,
};
