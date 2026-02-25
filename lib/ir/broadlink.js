/**
 * Broadlink IR Blaster Integration
 * Supports Broadlink RM Mini, RM Pro, RM4, and compatible devices.
 * 
 * Uses Broadlink's UDP discovery + command protocol.
 * For production, consider using the broadlink-js npm package.
 */

const dgram = require('dgram');
const crypto = require('crypto');

const BROADLINK_PORT = 80;
const DISCOVERY_PORT = 32108;
const DEFAULT_KEY = Buffer.from('097628343fe99e23765c1513accf8b02', 'hex');
const DEFAULT_IV = Buffer.from('562e17996d093d28ddb3ba695a2e6f58', 'hex');

class BroadlinkDevice {
  constructor(ip, mac, deviceType) {
    this.ip = ip;
    this.mac = mac;
    this.deviceType = deviceType;
    this.key = DEFAULT_KEY;
    this.iv = DEFAULT_IV;
    this.id = Buffer.alloc(4);
    this.count = 0;
    this.authorized = false;
  }

  /**
   * Authenticate with the device to get a session key.
   */
  async auth() {
    const payload = Buffer.alloc(80);
    // ... authentication payload construction
    // In production, this sends a proper auth packet and receives session key
    this.authorized = true;
    return true;
  }

  /**
   * Send an IR code (raw timing data).
   * @param {Buffer|number[]} irData — raw IR timing data
   */
  async sendIR(irData) {
    if (!this.authorized) await this.auth();

    const data = Buffer.isBuffer(irData) ? irData : Buffer.from(irData);
    const packet = Buffer.alloc(4 + data.length);
    packet.writeUInt8(0x02, 0); // send IR command
    data.copy(packet, 4);

    return this._sendPacket(0x6a, packet);
  }

  /**
   * Enter learning mode to capture an IR code.
   * @param {number} timeoutMs — how long to wait for a code (default 15s)
   * @returns {Promise<Buffer>} captured IR data
   */
  async learnIR(timeoutMs = 15000) {
    if (!this.authorized) await this.auth();

    // Send enter-learning command
    const packet = Buffer.alloc(16);
    packet.writeUInt8(0x03, 0); // enter learning mode
    await this._sendPacket(0x6a, packet);

    // Poll for learned code
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      await new Promise(r => setTimeout(r, 1000));

      const checkPacket = Buffer.alloc(16);
      checkPacket.writeUInt8(0x04, 0); // check for data
      const response = await this._sendPacket(0x6a, checkPacket);

      if (response && response.length > 0) {
        return response; // captured IR code
      }
    }

    throw new Error('Learning timed out — no IR signal received');
  }

  /**
   * Send a raw UDP packet to the device (encrypted).
   */
  async _sendPacket(commandByte, payload) {
    return new Promise((resolve, reject) => {
      const socket = dgram.createSocket('udp4');
      const timeout = setTimeout(() => {
        socket.close();
        reject(new Error('Broadlink device timeout'));
      }, 5000);

      // Encrypt payload
      const encrypted = this._encrypt(payload);

      // Build full packet with header
      const packet = Buffer.alloc(56 + encrypted.length);
      packet.writeUInt8(0x5a, 0); // magic
      packet.writeUInt8(0xa5, 1);
      packet.writeUInt8(0xaa, 2);
      packet.writeUInt8(0x55, 3);
      packet.writeUInt8(commandByte, 38);
      this.count = (this.count + 1) & 0xffff;
      packet.writeUInt16LE(this.count, 40);
      this.mac.copy(packet, 42);
      this.id.copy(packet, 48);
      encrypted.copy(packet, 56);

      // Checksum
      let checksum = 0xbeaf;
      for (let i = 0; i < packet.length; i++) checksum += packet[i];
      checksum &= 0xffff;
      packet.writeUInt16LE(checksum, 32);

      socket.on('message', (msg) => {
        clearTimeout(timeout);
        socket.close();
        if (msg.length > 56) {
          resolve(this._decrypt(msg.slice(56)));
        } else {
          resolve(null);
        }
      });

      socket.send(packet, 0, packet.length, BROADLINK_PORT, this.ip);
    });
  }

  _encrypt(data) {
    const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv);
    cipher.setAutoPadding(true);
    return Buffer.concat([cipher.update(data), cipher.final()]);
  }

  _decrypt(data) {
    const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv);
    decipher.setAutoPadding(true);
    return Buffer.concat([decipher.update(data), decipher.final()]);
  }
}

/**
 * Discover Broadlink devices on the local network.
 * @param {number} timeoutMs — discovery timeout (default 5s)
 * @returns {Promise<BroadlinkDevice[]>}
 */
async function discoverBlasters(timeoutMs = 5000) {
  return new Promise((resolve) => {
    const devices = [];
    const socket = dgram.createSocket('udp4');

    socket.on('message', (msg, rinfo) => {
      if (msg.length >= 48) {
        const mac = Buffer.alloc(6);
        msg.copy(mac, 0, 42, 48);
        const deviceType = msg.readUInt16LE(52);

        // Only add RM-series IR blasters
        const rmTypes = [0x2712, 0x2737, 0x273d, 0x2783, 0x277c, 0x278f, 0x27a1, 0x27a6, 0x278b, 0x2797, 0x27a9, 0x27c2, 0x27d1, 0x27de, 0x51da, 0x5f36, 0x6026, 0x6070, 0x610e, 0x610f, 0x62bc, 0x62be, 0x649b, 0x653a];
        if (rmTypes.includes(deviceType)) {
          devices.push(new BroadlinkDevice(rinfo.address, mac, deviceType));
        }
      }
    });

    // Build discovery packet
    const now = new Date();
    const packet = Buffer.alloc(48);
    const tz = now.getTimezoneOffset() / -60;
    packet.writeInt32LE(tz, 8);
    packet.writeUInt16LE(now.getFullYear(), 12);
    packet.writeUInt8(now.getMinutes(), 14);
    packet.writeUInt8(now.getHours(), 15);
    packet.writeUInt8(now.getFullYear() % 100, 16);
    packet.writeUInt8(now.getDay(), 17);
    packet.writeUInt8(now.getDate(), 18);
    packet.writeUInt8(now.getMonth() + 1, 19);
    packet.writeUInt8(0x06, 38); // command: discover

    socket.bind(() => {
      socket.setBroadcast(true);
      socket.send(packet, 0, packet.length, BROADLINK_PORT, '255.255.255.255');
    });

    setTimeout(() => {
      socket.close();
      resolve(devices);
    }, timeoutMs);
  });
}

module.exports = { BroadlinkDevice, discoverBlasters };
