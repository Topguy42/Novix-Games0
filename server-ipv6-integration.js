import bareServerPkg from "@tomphttp/bare-server-node";
const { createBareServer } = bareServerPkg;
import IPv6Rotator from './ipv6-rotator.js';
import crypto from 'crypto';

// Initialize IPv6 rotator with your HE.net routed prefix
const ipv6Rotator = new IPv6Rotator('2001:470:8:5ac');

/**
 * Get session ID from request
 * Uses cookies, IP, or generates random ID
 */
function getSessionId(req) {
  // Try to get from cookie first
  const cookies = parseCookies(req.headers.cookie);
  if (cookies.session_id) {
    return cookies.session_id;
  }
  
  // Fallback to IP-based (less ideal but works)
  const ip = req.headers['x-forwarded-for'] || 
             req.socket.remoteAddress || 
             'unknown';
  
  return crypto.createHash('sha256')
    .update(ip + req.headers['user-agent'])
    .digest('hex')
    .substring(0, 16);
}

/**
 * Create custom agent with rotating IPv6
 */
function createIPv6Agent(sessionId) {
  const ipv6Address = ipv6Rotator.getAddressForSession(sessionId);
  
  return {
    localAddress: ipv6Address,
    family: 6, // Force IPv6
    keepAlive: true,
    keepAliveMsecs: 1000,
    maxSockets: 10,
    maxFreeSockets: 5,
    timeout: 30000
  };
}

// Create Bare server with IPv6 rotation
const bare = createBareServer("/bare/", {
  requestOptions: {
    agent: false, // Disable default agent - we'll provide per-request
  },
  // Hook into request creation
  onRequest: (req, res) => {
    const sessionId = getSessionId(req);
    const agentOptions = createIPv6Agent(sessionId);
    
    // Log for debugging
    console.log(`[Bare] Session ${sessionId} -> IPv6: ${agentOptions.localAddress}`);
    
    return agentOptions;
  }
});

// For premium endpoints with dedicated rotation
const barePremium = createBareServer("/api/bare-premium/", {
  requestOptions: {
    agent: false,
  },
  onRequest: (req, res) => {
    // Premium users get fresh IPs more frequently (1 min TTL)
    const sessionId = getSessionId(req);
    const ipv6Address = ipv6Rotator.getAddressForSession(sessionId, 60000);
    
    console.log(`[Bare Premium] Session ${sessionId} -> IPv6: ${ipv6Address}`);
    
    return {
      localAddress: ipv6Address,
      family: 6,
      keepAlive: true,
      maxSockets: 15, // Higher concurrency for premium
      timeout: 30000
    };
  }
});

function parseCookies(header) {
  if (!header) return {};
  return header.split(';').reduce((acc, cookie) => {
    const [name, value] = cookie.trim().split('=');
    acc[name] = value;
    return acc;
  }, {});
}

export { bare, barePremium, ipv6Rotator };