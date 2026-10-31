import crypto from 'node:crypto';

export interface ClientDeviceInfo {
  ip: string;
  userAgent: string;
  acceptLanguage: string;
  acceptEncoding: string;
  secChUa: string;
  secChUaPlatform: string;
  secChUaMobile: string;
  clientExplicitFp: string;
  browser: string;
  os: string;
  isMobile: boolean;
}

const FINGERPRINT_SECRET =
  process.env.DEVICE_FINGERPRINT_SECRET ||
  process.env.JWT_SECRET ||
  'brightloop-device-fingerprint-salt-2026';

/**
 * Extracts and normalizes client device information from incoming HTTP request headers.
 */
export function extractClientInfo(request: Request): ClientDeviceInfo {
  const headers = request.headers;

  // 1. IP extraction (supports reverse proxies, Cloudflare, load balancers)
  const xForwardedFor = headers.get('x-forwarded-for');
  const ip =
    headers.get('cf-connecting-ip') ||
    headers.get('x-real-ip') ||
    (xForwardedFor ? xForwardedFor.split(',')[0]?.trim() : null) ||
    '127.0.0.1';

  const userAgent = headers.get('user-agent')?.trim() || '';
  const acceptLanguage = headers.get('accept-language')?.trim() || '';
  const acceptEncoding = headers.get('accept-encoding')?.trim() || '';
  const secChUa = headers.get('sec-ch-ua')?.trim() || '';
  const secChUaPlatform = headers.get('sec-ch-ua-platform')?.trim() || '';
  const secChUaMobile = headers.get('sec-ch-ua-mobile')?.trim() || '';
  const clientExplicitFp = headers.get('x-device-fingerprint')?.trim() || '';

  // Parse high-level OS and Browser for metadata
  let os = 'Unknown OS';
  if (/windows/i.test(userAgent) || /windows/i.test(secChUaPlatform)) os = 'Windows';
  else if (/macintosh|mac os x/i.test(userAgent) || /macos/i.test(secChUaPlatform)) os = 'macOS';
  else if (/android/i.test(userAgent) || /android/i.test(secChUaPlatform)) os = 'Android';
  else if (/iphone|ipad|ipod/i.test(userAgent) || /ios/i.test(secChUaPlatform)) os = 'iOS';
  else if (/linux/i.test(userAgent) || /linux/i.test(secChUaPlatform)) os = 'Linux';

  let browser = 'Unknown Browser';
  if (/edg\//i.test(userAgent)) browser = 'Edge';
  else if (/chrome|crios/i.test(userAgent)) browser = 'Chrome';
  else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
  else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
  else if (/opera|opr\//i.test(userAgent)) browser = 'Opera';

  const isMobile =
    secChUaMobile === '?1' ||
    /mobile|android|iphone|ipad|ipod/i.test(userAgent);

  return {
    ip,
    userAgent,
    acceptLanguage,
    acceptEncoding,
    secChUa,
    secChUaPlatform,
    secChUaMobile,
    clientExplicitFp,
    browser,
    os,
    isMobile,
  };
}

/**
 * Computes a deterministic, cryptographic SHA-256 HMAC device fingerprint.
 * Combines hardware, browser, language, and network metrics.
 */
export function generateDeviceFingerprint(info: ClientDeviceInfo): string {
  // Normalize language (e.g. en-US,en;q=0.9 -> en-US)
  const primaryLang = info.acceptLanguage.split(',')[0]?.toLowerCase().trim() || 'none';

  // Mask IP to subnet level (e.g. /24 for IPv4) to avoid false positives on dynamic mobile IP roaming
  let ipSubnet = info.ip;
  if (info.ip.includes('.')) {
    const parts = info.ip.split('.');
    if (parts.length === 4) {
      ipSubnet = `${parts[0]}.${parts[1]}.${parts[2]}.0`;
    }
  }

  const rawFingerprintPayload = [
    `clientFp=${info.clientExplicitFp}`,
    `ua=${info.userAgent}`,
    `lang=${primaryLang}`,
    `enc=${info.acceptEncoding}`,
    `ch_ua=${info.secChUa}`,
    `ch_platform=${info.secChUaPlatform}`,
    `ch_mob=${info.secChUaMobile}`,
    `subnet=${ipSubnet}`,
  ].join('|');

  return crypto
    .createHmac('sha256', FINGERPRINT_SECRET)
    .update(rawFingerprintPayload)
    .digest('hex');
}

/**
 * Validates that an expected fingerprint matches the current device fingerprint using constant-time comparison.
 */
export function verifyDeviceFingerprint(expectedFp: string, currentFp: string): boolean {
  if (!expectedFp || !currentFp || expectedFp.length !== currentFp.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(expectedFp), Buffer.from(currentFp));
  } catch {
    return false;
  }
}
