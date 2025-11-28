import crypto from 'crypto';
import { networkInterfaces } from 'os';

/**
 * IPv6 Address Rotator
 * Generates random IPv6 addresses from your routed prefix
 */
class IPv6Rotator {
  constructor(prefix = '2001:470:8:5ac') {
    this.prefix = prefix;
    this.activeAddresses = new Map(); // Track per-session
  }

  /**
   * Generate a random IPv6 address from the /64 prefix
   */
  generateAddress() {
    // Generate random 64-bit interface identifier
    const randomHex = crypto.randomBytes(8).toString('hex');
    const parts = [];
    
    for (let i = 0; i < randomHex.length; i += 4) {
      parts.push(randomHex.substr(i, 4));
    }
    
    return `${this.prefix}::${parts.join(':')}`;
  }

  /**
   * Get or create IPv6 address for a session
   * @param {string} sessionId - Unique session identifier
   * @param {number} ttl - Time to live in ms (default: 5 minutes)
   */
  getAddressForSession(sessionId, ttl = 300000) {
    const existing = this.activeAddresses.get(sessionId);
    
    if (existing && Date.now() - existing.created < ttl) {
      return existing.address;
    }
    
    const newAddress = this.generateAddress();
    this.activeAddresses.set(sessionId, {
      address: newAddress,
      created: Date.now()
    });
    
    // Cleanup old entries
    this.cleanup();
    
    return newAddress;
  }

  /**
   * Clean up expired sessions
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 3600000; // 1 hour
    
    for (const [sessionId, data] of this.activeAddresses.entries()) {
      if (now - data.created > maxAge) {
        this.activeAddresses.delete(sessionId);
      }
    }
  }

  /**
   * Get a random address (no session persistence)
   */
  getRandomAddress() {
    return this.generateAddress();
  }
}

export default IPv6Rotator;