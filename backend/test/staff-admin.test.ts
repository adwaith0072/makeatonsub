import { beforeAll, describe, expect, it } from 'bun:test';
import { app } from '../src/app.ts';

describe('Production-Grade Staff & Admin System', () => {
  const legitHeaders = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-CH-UA': '"Chromium";v="124", "Google Chrome";v="124"',
    'Sec-CH-UA-Platform': '"Windows"',
    'Sec-CH-UA-Mobile': '?0',
  };

  let adminToken: string = '';
  let staffToken: string = '';
  let customerToken: string = '';
  let customerId: string = '';

  beforeAll(async () => {
    // 1. Admin login
    const adminRes = await app.handle(
      new Request('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { ...legitHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@brightloop.com', password: 'Password@123' }),
      })
    );
    expect(adminRes.status).toBe(200);
    const adminData = (await adminRes.json()) as any;
    expect(adminData.user.role).toBe('ADMIN');
    adminToken = adminData.token;

    // 2. Staff login
    const staffRes = await app.handle(
      new Request('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { ...legitHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'sarah.sales@brightloop.com', password: 'Password@123' }),
      })
    );
    expect(staffRes.status).toBe(200);
    const staffData = (await staffRes.json()) as any;
    expect(staffData.user.role).toBe('STAFF');
    staffToken = staffData.token;

    // 3. Customer login
    const custRes = await app.handle(
      new Request('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { ...legitHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'billing@acmecorp.com', password: 'Password@123' }),
      })
    );
    expect(custRes.status).toBe(200);
    const custData = (await custRes.json()) as any;
    expect(custData.user.role).toBe('CUSTOMER');
    customerToken = custData.token;
    customerId = custData.user.id;
  });

  describe('Admin Staff Management', () => {
    let createdStaffId: string = '';

    it('allows Admin to create a new staff member', async () => {
      const email = `staff.${Date.now()}@brightloop.com`;
      const res = await app.handle(
        new Request('http://localhost:3000/users/staff', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: 'New Support Agent',
            email,
            password: 'Password@123',
            phone: '+1-555-8888',
          }),
        })
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.user.role).toBe('STAFF');
      expect(data.user.email).toBe(email);
      createdStaffId = data.user.id;
    });

    it('allows Admin to list all staff members', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/users/staff', {
          headers: {
            ...legitHeaders,
            Authorization: `Bearer ${adminToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.some((s: any) => s.id === createdStaffId)).toBe(true);
    });

    it('allows Admin to update staff profile and toggle active status', async () => {
      const res = await app.handle(
        new Request(`http://localhost:3000/users/staff/${createdStaffId}`, {
          method: 'PATCH',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: 'Updated Support Lead',
            isActive: false, // Deactivate
          }),
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.user.name).toBe('Updated Support Lead');
      expect(data.user.isActive).toBe(false);
    });
  });

  describe('Admin Configuration Privileges vs Staff Restrictions', () => {
    it('allows Admin to create taxes, but strictly blocks Staff with 403', async () => {
      // 1. Staff attempts to create tax -> 403 Forbidden
      const staffRes = await app.handle(
        new Request('http://localhost:3000/taxes', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffToken}`,
          },
          body: JSON.stringify({ name: 'Staff Tax', rate: 5.0 }),
        })
      );
      expect(staffRes.status).toBe(403);
      const staffData = (await staffRes.json()) as any;
      expect(staffData.error.code).toBe('FORBIDDEN');

      // 2. Admin creates tax -> 201 Created
      const adminRes = await app.handle(
        new Request('http://localhost:3000/taxes', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({ name: `Regional Tax ${Date.now()}`, rate: 7.5 }),
        })
      );
      expect(adminRes.status).toBe(201);
    });

    it('allows Admin to create discount rules, but strictly blocks Staff with 403', async () => {
      // 1. Staff attempts to create discount -> 403 Forbidden
      const staffRes = await app.handle(
        new Request('http://localhost:3000/discounts', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffToken}`,
          },
          body: JSON.stringify({
            name: 'Staff Promo',
            type: 'PERCENTAGE',
            value: 20,
            scope: 'SUBSCRIPTION',
            startDate: '2026-01-01',
          }),
        })
      );
      expect(staffRes.status).toBe(403);

      // 2. Admin creates discount -> 201 Created
      const adminRes = await app.handle(
        new Request('http://localhost:3000/discounts', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
          },
          body: JSON.stringify({
            name: `Admin Promo ${Date.now()}`,
            code: `PROMO${Math.floor(1000 + Math.random() * 9000)}`,
            type: 'FIXED',
            value: 50,
            scope: 'SUBSCRIPTION',
            startDate: '2026-01-01',
          }),
        })
      );
      expect(adminRes.status).toBe(201);
    });

    it('blocks Staff from creating staff members (Admin only)', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/users/staff', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffToken}`,
          },
          body: JSON.stringify({
            name: 'Unauthorized Staff',
            email: 'unauth@brightloop.com',
            password: 'Password@123',
          }),
        })
      );

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });

  describe('Staff Day-to-Day Customer & Subscription Operations', () => {
    let newCustomerId: string = '';

    it('allows Staff to onboard/create a new customer business', async () => {
      const email = `client.${Date.now()}@acme.com`;
      const res = await app.handle(
        new Request('http://localhost:3000/users/customers', {
          method: 'POST',
          headers: {
            ...legitHeaders,
            'Content-Type': 'application/json',
            Authorization: `Bearer ${staffToken}`,
          },
          body: JSON.stringify({
            name: 'David Reynolds',
            email,
            companyName: 'Reynolds Logistics Ltd',
            phone: '+1-555-7777',
            billingAddress: '42 Port Road, Seattle, WA',
            taxNumber: 'US-TAX-334455',
          }),
        })
      );

      expect(res.status).toBe(201);
      const data = (await res.json()) as any;
      expect(data.customer.role).toBe('CUSTOMER');
      expect(data.customer.companyName).toBe('Reynolds Logistics Ltd');
      newCustomerId = data.customer.id;
    });

    it('allows Staff to view the finance dashboard', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/reports/dashboard', {
          headers: {
            ...legitHeaders,
            Authorization: `Bearer ${staffToken}`,
          },
        })
      );

      expect(res.status).toBe(200);
      const data = (await res.json()) as any;
      expect(data.summary).toBeDefined();
      expect(typeof data.summary.activeSubscriptions?.count).toBe('number');
      expect(typeof data.summary.revenue?.totalCollected).toBe('number');
    });

    it('strictly blocks Customer from accessing the finance dashboard', async () => {
      const res = await app.handle(
        new Request('http://localhost:3000/reports/dashboard', {
          headers: {
            ...legitHeaders,
            Authorization: `Bearer ${customerToken}`,
          },
        })
      );

      expect(res.status).toBe(403);
      const data = (await res.json()) as any;
      expect(data.error.code).toBe('FORBIDDEN');
    });
  });
});
