import type { ClientDeviceInfo } from './device-fingerprint.ts';

export interface BotCheckResult {
  isBot: boolean;
  reason?: string;
  category?: 'KNOWN_AUTOMATION' | 'SCANNER' | 'HEADER_ANOMALY' | 'HONEYPOT' | 'RATE_LIMIT';
}

// 1. Headless browsers & automation frameworks
const KNOWN_AUTOMATION_PATTERNS = [
  /headlesschrome/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /webdriver/i,
  /phantomjs/i,
  /cypress/i,
  /electron/i,
];

// 2. Automated scrapers, libraries, and CLI tools
const KNOWN_SCRAPER_PATTERNS = [
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /scrapy/i,
  /go-http-client/i,
  /java\//i,
  /libwww-perl/i,
  /wget\//i,
  /httpie/i,
  /curl\//i,
];

// 3. Security scanners and attack tools
const KNOWN_SCANNER_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /masscan/i,
  /nmap/i,
  /acunetix/i,
  /dirbuster/i,
  /gobuster/i,
  /zgrab/i,
  /censys/i,
  /shodan/i,
  /wpscan/i,
];

// 4. Commercial crawlers & web spiders (should not be hitting private SaaS billing APIs)
const CRAWLER_PATTERNS = [
  /semrushbot/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /bytespider/i,
  /petalsearch/i,
];

// Honeypot field names to detect form spamming bots
export const HONEYPOT_FIELDS = ['_hp_trap', '_bot_check', 'website_url_hp', 'fax_number_hp'];

// In-Memory Sliding Window Rate Limiter
interface RateLimitRecord {
  timestamps: number[];
  blockedUntil?: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    record.timestamps = record.timestamps.filter((ts) => now - ts < 60_000);
    if (record.timestamps.length === 0 && (!record.blockedUntil || record.blockedUntil < now)) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60_000);

export function checkRateLimit(
  key: string,
  maxRequests: number = 120,
  windowMs: number = 60_000,
  blockDurationMs: number = 120_000
): { allowed: boolean; remaining: number; retryAfter?: number } {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Check if currently blocked
  if (record.blockedUntil && record.blockedUntil > now) {
    const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  // Filter timestamps within the rolling window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxRequests) {
    // Excessive burst: apply block duration
    record.blockedUntil = now + blockDurationMs;
    const retryAfter = Math.ceil(blockDurationMs / 1000);
    return { allowed: false, remaining: 0, retryAfter };
  }

  record.timestamps.push(now);
  const remaining = Math.max(0, maxRequests - record.timestamps.length);
  return { allowed: true, remaining };
}

/**
 * Evaluates whether an incoming request exhibits bot / automated crawler behavior.
 */
export function evaluateBotThreat(
  request: Request,
  info: ClientDeviceInfo,
  body?: any
): BotCheckResult {
  const ua = info.userAgent;

  // Exemption for health check or internal test runner if configured
  const isTestEnv = process.env.NODE_ENV === 'test';
  const isInternal = info.ip === '127.0.0.1' || info.ip === '::1';

  // 1. Check known vulnerability scanners (highest risk - block immediately)
  for (const pattern of KNOWN_SCANNER_PATTERNS) {
    if (pattern.test(ua)) {
      return {
        isBot: true,
        reason: `Detected malicious scanner signature: ${ua.slice(0, 50)}`,
        category: 'SCANNER',
      };
    }
  }

  // 2. Check headless browsers and automation frameworks
  for (const pattern of KNOWN_AUTOMATION_PATTERNS) {
    if (pattern.test(ua)) {
      return {
        isBot: true,
        reason: `Detected headless browser / automation framework: ${ua.slice(0, 50)}`,
        category: 'KNOWN_AUTOMATION',
      };
    }
  }

  // 3. Check commercial crawlers and web spiders
  for (const pattern of CRAWLER_PATTERNS) {
    if (pattern.test(ua)) {
      return {
        isBot: true,
        reason: `Detected automated search crawler hitting private API: ${ua.slice(0, 50)}`,
        category: 'KNOWN_AUTOMATION',
      };
    }
  }

  // 4. Check known scraper/HTTP client libraries (unless test mode or internal localhost testing)
  if (!isTestEnv) {
    for (const pattern of KNOWN_SCRAPER_PATTERNS) {
      if (pattern.test(ua)) {
        // Allow curl only if explicit ALLOW_CLI_DEV is set
        if (/curl\//i.test(ua) && process.env.ALLOW_CLI_DEV === 'true') {
          continue;
        }
        return {
          isBot: true,
          reason: `Detected automated script/scraper client: ${ua.slice(0, 50)}`,
          category: 'KNOWN_AUTOMATION',
        };
      }
    }
  }

  // 5. Header Anomaly & Spoofing Detection
  if (!isTestEnv) {
    // If User-Agent is completely empty on an external request
    if (!ua && !isInternal) {
      return {
        isBot: true,
        reason: 'Missing required User-Agent header.',
        category: 'HEADER_ANOMALY',
      };
    }

    // If User-Agent claims to be Mozilla/5.0 (modern browser) but lacks Accept-Language
    if (ua.startsWith('Mozilla/5.0') && !info.acceptLanguage && !isInternal) {
      return {
        isBot: true,
        reason: 'Browser impersonation detected (missing Accept-Language header).',
        category: 'HEADER_ANOMALY',
      };
    }

    // Platform mismatch: Claims Windows in Sec-CH-UA-Platform but User-Agent says Mac/Linux
    if (info.secChUaPlatform) {
      const cleanPlatform = info.secChUaPlatform.toLowerCase().replace(/"/g, '');
      if (cleanPlatform === 'windows' && /macintosh|iphone|android|linux/i.test(ua) && !/windows/i.test(ua)) {
        return {
          isBot: true,
          reason: 'Client hints header mismatch with User-Agent (platform spoofing).',
          category: 'HEADER_ANOMALY',
        };
      }
    }
  }

  // 6. Honeypot Trap Detection (Checks form bodies for hidden bait inputs)
  if (body && typeof body === 'object') {
    for (const field of HONEYPOT_FIELDS) {
      if (field in body && body[field] !== undefined && body[field] !== null && body[field] !== '') {
        return {
          isBot: true,
          reason: `Honeypot trap triggered (bot filled hidden field: ${field}).`,
          category: 'HONEYPOT',
        };
      }
    }
  }

  return { isBot: false };
}
