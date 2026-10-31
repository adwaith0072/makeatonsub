import { describe, expect, it } from 'bun:test';
import { app } from '../src/app.ts';

describe('Elysia Server & Default Authentication', () => {
  it('allows public access to /health', async () => {
    const res = await app.handle(new Request('http://localhost:3000/health'));
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
    expect(data.service).toContain('Brightloop');
  });

  it('rejects protected endpoints with 401 UNAUTHORIZED by default without token', async () => {
    const endpoints = [
      '/products',
      '/plans',
      '/quotation-templates',
      '/subscriptions',
      '/invoices',
      '/payments',
      '/taxes',
      '/discounts',
      '/reports/dashboard',
      '/portal/subscriptions',
    ];

    for (const ep of endpoints) {
      const res = await app.handle(new Request(`http://localhost:3000${ep}`));
      expect(res.status).toBe(401);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('UNAUTHORIZED');
      expect(data.error.message).toContain('Authentication required');
    }
  });

  it('rejects invalid password format on signup', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'short', // under 8 chars
        }),
      })
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects password without special character or uppercase', async () => {
    const res = await app.handle(
      new Request('http://localhost:3000/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test User',
          email: 'test@example.com',
          password: 'password123', // no uppercase or special char
        }),
      })
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('allows public access to /swagger and /swagger/json', async () => {
    const res = await app.handle(new Request('http://localhost:3000/swagger'));
    // Swagger returns HTML redirect or 200
    expect([200, 301, 302, 308]).toContain(res.status);

    const jsonRes = await app.handle(new Request('http://localhost:3000/swagger/json'));
    expect(jsonRes.status).toBe(200);
    const spec = (await jsonRes.json()) as any;
    expect(spec.info.title).toContain('Brightloop');
  });
});
