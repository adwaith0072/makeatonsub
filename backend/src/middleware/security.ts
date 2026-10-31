import { Elysia } from 'elysia';
import {
  extractClientInfo,
  generateDeviceFingerprint,
  type ClientDeviceInfo,
} from '../security/device-fingerprint.ts';
import {
  evaluateBotThreat,
  checkRateLimit,
  type BotCheckResult,
} from '../security/bot-detector.ts';

export const securityPlugin = new Elysia({ name: 'security-plugin' })
  .derive({ as: 'global' }, ({ request }): { clientInfo: ClientDeviceInfo; deviceFingerprint: string } => {
    const clientInfo = extractClientInfo(request);
    const deviceFingerprint = generateDeviceFingerprint(clientInfo);
    return { clientInfo, deviceFingerprint };
  })

  .onBeforeHandle({ as: 'global' }, ({ path, request, clientInfo, deviceFingerprint, body, set }) => {
    if (path === '/health') {
      return;
    }

    const botCheck: BotCheckResult = evaluateBotThreat(request, clientInfo, body);
    if (botCheck.isBot) {
      set.status = 403;
      return {
        error: {
          code: 'BOT_DETECTED',
          message: 'Automated access detected and blocked by security policy.',
          category: botCheck.category,
          reason: botCheck.reason,
          fingerprint: deviceFingerprint,
          timestamp: new Date().toISOString(),
        },
      };
    }


    const isAuthRoute =
      path.startsWith('/auth/login') ||
      path.startsWith('/auth/signup') ||
      path.startsWith('/auth/forgot-password') ||
      path.startsWith('/auth/reset-password');

    const maxReq = isAuthRoute ? 15 : 120;
    const windowMs = 60_000;
    const rateLimitKey = `${deviceFingerprint}:${isAuthRoute ? 'auth' : 'api'}`;

    const limit = checkRateLimit(rateLimitKey, maxReq, windowMs);
    if (!limit.allowed) {
      set.status = 429;
      set.headers['retry-after'] = String(limit.retryAfter || 60);
      return {
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests. Please slow down.',
          retryAfterSeconds: limit.retryAfter || 60,
          fingerprint: deviceFingerprint,
        },
      };
    }
  })

  // 3. Security & Device Headers on all responses
  .onAfterHandle({ as: 'global' }, ({ deviceFingerprint, set }) => {
    set.headers['x-device-fingerprint'] = deviceFingerprint;
    set.headers['x-content-type-options'] = 'nosniff';
    set.headers['x-frame-options'] = 'DENY';
    set.headers['x-xss-protection'] = '1; mode=block';
  });
