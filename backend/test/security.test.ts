import { describe, expect, it } from 'bun:test';
import { app } from '../src/app.ts';
import {
  extractClientInfo,
  generateDeviceFingerprint,
} from '../src/security/device-fingerprint.ts';

describe('Security Layer: Device Fingerprinting & Bot Elimination', () => {
  const legitHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124"',
    'Sec-CH-UA-Platform': '"Windows"',
    'Sec-CH-UA-Mobile': '?0',
  };

  describe('Device Fingerprinting', () => {
    it('returns X-Device-Fingerprint and security headers on responses', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/health', {
          headers: legitHeaders,
        })
      );
      expect(res.status).toBe(200);
      const fp = res.headers.get('x-device-fingerprint');
      expect(fp).toBeTruthy();
      expect(fp?.length).toBe(64); // SHA-256 hex string
      expect(res.headers.get('x-content-type-options')).toBe('nosniff');
      expect(res.headers.get('x-frame-options')).toBe('DENY');
    });

    it('generates consistent fingerprints for identical client configurations', () => {
      const req1 = new Request('http://localhost:3000/', { headers: legitHeaders });
      const req2 = new Request('http://localhost:3000/', { headers: legitHeaders });

      const fp1 = generateDeviceFingerprint(extractClientInfo(req1));
      const fp2 = generateDeviceFingerprint(extractClientInfo(req2));

      expect(fp1).toBe(fp2);
    });

    it('generates different fingerprints for different client platforms or languages', () => {
      const macHeaders = {
        ...legitHeaders,
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        'Sec-CH-UA-Platform': '"macOS"',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      };

      const req1 = new Request('http://localhost:3000/', { headers: legitHeaders });
      const req2 = new Request('http://localhost:3000/', { headers: macHeaders });

      const fp1 = generateDeviceFingerprint(extractClientInfo(req1));
      const fp2 = generateDeviceFingerprint(extractClientInfo(req2));

      expect(fp1).not.toBe(fp2);
    });
  });

  describe('Bot Elimination: Known Automation & Scrapers', () => {
    it('blocks HeadlessChrome automation', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'User-Agent':
              'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/124.0.0.0 Safari/537.36',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com', password: 'Password@123' }),
        })
      );

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('BOT_DETECTED');
      expect(data.error.category).toBe('KNOWN_AUTOMATION');
    });

    it('blocks Puppeteer automation signatures', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64) Puppeteer/22.0.0',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@example.com', password: 'Password@123' }),
        })
      );

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('BOT_DETECTED');
    });

    it('blocks Playwright and Selenium automated browsers', async () => {
      const frameworks = [
        'Mozilla/5.0 Playwright/1.43.0 (x64) Chrome',
        'Mozilla/5.0 (Windows NT 10.0; Win64) Selenium/4.18.0 WebDriver',
      ];

      for (const ua of frameworks) {
        const res = await app.handle(
          new Request('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'User-Agent': ua, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'bot@example.com', password: 'Password@123' }),
          })
        );
        expect(res.status).toBe(403);
        const data = (await res.json()) as any;
        expect(data.error.code).toBe('BOT_DETECTED');
      }
    });

    it('blocks security vulnerability scanners (sqlmap, nikto)', async () => {
      const scanners = ['sqlmap/1.8#stable', 'Mozilla/5.0 (compatible; Nikto/2.1.6)'];

      for (const ua of scanners) {
        const res = await app.handle(
          new Request('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'User-Agent': ua, 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'scanner@example.com', password: 'Password@123' }),
          })
        );
        expect(res.status).toBe(403);
        const data = (await res.json()) as any;
        expect(data.error.code).toBe('BOT_DETECTED');
        expect(data.error.category).toBe('SCANNER');
      }
    });

    it('blocks automated commercial crawlers (SemrushBot, AhrefsBot)', async () => {
      const crawlers = [
        'Mozilla/5.0 (compatible; SemrushBot/7~bl; +http://www.semrush.com/bot.html)',
        'Mozilla/5.0 (compatible; AhrefsBot/7.0; +http://ahrefs.com/robot/)',
      ];

      for (const ua of crawlers) {
        const res = await app.handle(
          new Request('http://localhost:3000/products', {
            headers: { 'User-Agent': ua },
          })
        );
        expect(res.status).toBe(403);
        const data = (await res.json()) as any;
        expect(data.error.code).toBe('BOT_DETECTED');
      }
    });
  });

  describe('Bot Elimination: Honeypot Trap', () => {
    it('detects and blocks bot when hidden honeypot field is filled', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/auth/signup', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'Spam Bot',
            email: 'spambot@example.com',
            password: 'Password@123',
            _hp_trap: 'http://spam-link.ru', // honeypot filled by bot
          }),
        })
      );

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('BOT_DETECTED');
      expect(data.error.category).toBe('HONEYPOT');
    });
  });

  describe('Session Fingerprint Binding (Anti-Session Hijacking)', () => {
    it('binds JWT token to device fingerprint and blocks session replay on a different device', async () => {
      // 1. Device A logs in
      const loginRes = await app.handle(
        new Request('http://localhost:3000/auth/login', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: 'admin@brightloop.com',
            password: 'Password@123',
          }),
        })
      );

      expect(loginRes.status).toBe(200);
      const loginData = (await loginRes.json()) as any;
      const token = loginData.token;
      expect(token).toBeTruthy();

      // 2. Request from Device A (matching headers) -> Succeeds!
      const deviceARes = await app.handle(
        new Request('http://localhost:3000/auth/me', {
          headers: {
            ...legitHeaders,
            Authorization: `Bearer ${token}`,
          },
        })
      );
      expect(deviceARes.status).toBe(200);

      // 3. Request from Device B (different platform/user-agent attempting to hijack session) -> Blocked!
      const deviceBHeaders = {
        ...legitHeaders,
        'User-Agent':
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Sec-CH-UA-Platform': '"iOS"',
        'Sec-CH-UA-Mobile': '?1',
        Authorization: `Bearer ${token}`,
      };

      const deviceBRes = await app.handle(
        new Request('http://localhost:3000/auth/me', {
          headers: deviceBHeaders,
        })
      );

      // Mismatched device fingerprint invalidates the session
      expect(deviceBRes.status).toBe(401);
    });
  });
});
