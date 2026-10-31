import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { securityPlugin } from './middleware/security.ts';
import { authPlugin } from './middleware/auth.ts';
import { errorPlugin } from './middleware/error.ts';
import { authRouter } from './modules/auth/auth.router.ts';
import { usersRouter } from './modules/users/users.router.ts';
import { catalogRouter } from './modules/catalog/catalog.router.ts';
import { subscriptionsRouter } from './modules/subscriptions/subscriptions.router.ts';
import { billingRouter } from './modules/billing/billing.router.ts';
import { paymentsRouter, razorpayPaymentRouter } from './modules/payments/payments.router.ts';
import { reportsRouter } from './modules/reports/reports.router.ts';
import { portalRouter } from './modules/portal/portal.router.ts';

export function createElysiaApp() {
  const app = new Elysia()
    // 1. CORS
    .use(
      cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        exposeHeaders: ['X-Device-Fingerprint', 'Retry-After'],
      })
    )

    // 2. Device Fingerprinting & Anti-Bot Defense Layer (First line of security)
    .use(securityPlugin)

    // 3. Swagger OpenAPI Documentation
    .use(
      swagger({
        documentation: {
          info: {
            title: 'Brightloop Subscription Management API',
            version: '1.0.0',
            description:
              'Modular Elysia API with Device Fingerprinting & Anti-Bot Security Layer',
          },
          tags: [
            { name: 'Auth', description: 'Authentication and password management' },
            { name: 'Users', description: 'User and internal staff administration' },
            { name: 'Catalog', description: 'Products, variants, plans, and quotation templates' },
            { name: 'Subscriptions', description: 'Subscription lifecycle management' },
            { name: 'Billing', description: 'Invoices, taxes, discounts, and billing jobs' },
            { name: 'Payments', description: 'Payment processing and invoice settlement' },
            { name: 'Reports', description: 'Finance dashboard and reporting metrics' },
            { name: 'Portal', description: 'Customer self-service portal' },
          ],
        },
      })
    )

    // 4. Error Handling
    .use(errorPlugin)

    // 5. Global Authentication Default (protects all non-whitelisted endpoints)
    .use(authPlugin)

    // 6. Public Health Check
    .get('/health', () => ({
      status: 'ok',
      service: 'Brightloop Subscription Management Backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      pid: process.pid,
    }))

    // 7. Mount Modular Path Routers
    .use(authRouter)
    .use(usersRouter)
    .use(catalogRouter)
    .use(subscriptionsRouter)
    .use(billingRouter)
    .use(paymentsRouter)
    .use(razorpayPaymentRouter)
    .use(reportsRouter)
    .use(portalRouter);

  return app;
}

export const app = createElysiaApp();
export type App = typeof app;
