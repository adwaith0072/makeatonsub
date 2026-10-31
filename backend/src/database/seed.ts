import { prisma } from './client.ts';

async function seed() {
  console.log('🌱 Starting Brightloop database seed...');

  // 1. Seed Master Admin
  const adminPassword = await Bun.password.hash('Password@123');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@brightloop.com' },
    update: { role: 'ADMIN', passwordHash: adminPassword, isActive: true },
    create: {
      name: 'System Admin',
      email: 'admin@brightloop.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });
  console.log(`✅ Admin user ready: ${admin.email} (Role: ${admin.role})`);

  // 2. Seed Internal Staff Members
  const staffPassword = await Bun.password.hash('Password@123');
  const staff1 = await prisma.user.upsert({
    where: { email: 'sarah.sales@brightloop.com' },
    update: { role: 'STAFF', passwordHash: staffPassword, isActive: true },
    create: {
      name: 'Sarah Jenkins (Sales Rep)',
      email: 'sarah.sales@brightloop.com',
      passwordHash: staffPassword,
      role: 'STAFF',
      phone: '+1-555-0199',
      isActive: true,
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: 'mike.billing@brightloop.com' },
    update: { role: 'STAFF', passwordHash: staffPassword, isActive: true },
    create: {
      name: 'Mike Chen (Billing Specialist)',
      email: 'mike.billing@brightloop.com',
      passwordHash: staffPassword,
      role: 'STAFF',
      phone: '+1-555-0188',
      isActive: true,
    },
  });
  console.log(`✅ Staff members ready: ${staff1.email}, ${staff2.email}`);

  // 3. Seed Sample Customers
  const customerPassword = await Bun.password.hash('Password@123');
  const customer1 = await prisma.user.upsert({
    where: { email: 'billing@acmecorp.com' },
    update: { role: 'CUSTOMER' },
    create: {
      name: 'Alice Cooper',
      email: 'billing@acmecorp.com',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      companyName: 'Acme Corporation',
      phone: '+1-555-4001',
      billingAddress: '100 Industrial Parkway, Suite 400, Chicago, IL',
      taxNumber: 'US-TAX-987654',
      isActive: true,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'finance@techstart.io' },
    update: { role: 'CUSTOMER' },
    create: {
      name: 'Bob Miller',
      email: 'finance@techstart.io',
      passwordHash: customerPassword,
      role: 'CUSTOMER',
      companyName: 'TechStart Innovations',
      phone: '+1-555-4002',
      billingAddress: '500 Silicon Way, San Francisco, CA',
      taxNumber: 'US-TAX-123456',
      isActive: true,
    },
  });
  console.log(`✅ Customers ready: ${customer1.companyName}, ${customer2.companyName}`);

  // 4. Seed Taxes (Admin Rule)
  const gstTax = await prisma.tax.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { name: 'Standard GST / VAT (18%)', rate: 18.0 },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Standard GST / VAT (18%)',
      rate: 18.0,
      isActive: true,
    },
  });

  const zeroTax = await prisma.tax.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { name: 'Zero Tax (0%)', rate: 0.0 },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      name: 'Zero Tax (0%)',
      rate: 0.0,
      isActive: true,
    },
  });
  console.log(`✅ Taxes ready: ${gstTax.name}, ${zeroTax.name}`);

  // 5. Seed Products with Variants
  const softwareProduct = await prisma.product.upsert({
    where: { id: '10000000-0000-0000-0000-000000000001' },
    update: { salesPrice: 99.0, costPrice: 20.0 },
    create: {
      id: '10000000-0000-0000-0000-000000000001',
      name: 'Brightloop Business Suite',
      type: 'software',
      salesPrice: 99.0,
      costPrice: 20.0,
      notes: 'Core ERP & SaaS subscription platform',
      taxId: gstTax.id,
      isActive: true,
    },
  });

  // Variant: Brand = Odoo adds 560 to price
  await prisma.productVariant.upsert({
    where: {
      productId_attribute_value: {
        productId: softwareProduct.id,
        attribute: 'Brand',
        value: 'Odoo Edition',
      },
    },
    update: { extraPrice: 560.0 },
    create: {
      productId: softwareProduct.id,
      attribute: 'Brand',
      value: 'Odoo Edition',
      extraPrice: 560.0,
      isActive: true,
    },
  });

  const backupAddon = await prisma.product.upsert({
    where: { id: '10000000-0000-0000-0000-000000000002' },
    update: { salesPrice: 29.0 },
    create: {
      id: '10000000-0000-0000-0000-000000000002',
      name: 'Automated Cloud Backup Add-on',
      type: 'add-on',
      salesPrice: 29.0,
      costPrice: 5.0,
      notes: 'Daily automated cloud storage backup',
      taxId: gstTax.id,
      isActive: true,
    },
  });
  console.log(`✅ Products ready: ${softwareProduct.name} (with Odoo variant +$560), ${backupAddon.name}`);

  // 6. Seed Plans
  const monthlyPlan = await prisma.plan.upsert({
    where: { id: '20000000-0000-0000-0000-000000000001' },
    update: { price: 99.0 },
    create: {
      id: '20000000-0000-0000-0000-000000000001',
      name: 'Monthly Professional Plan',
      description: 'Monthly recurring billing for growing businesses',
      price: 99.0,
      billingPeriod: 'MONTHLY',
      minQuantity: 1,
      autoClose: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
      isActive: true,
    },
  });

  const yearlyPlan = await prisma.plan.upsert({
    where: { id: '20000000-0000-0000-0000-000000000002' },
    update: { price: 999.0 },
    create: {
      id: '20000000-0000-0000-0000-000000000002',
      name: 'Yearly Enterprise Contract',
      description: 'Annual commitment with enterprise-level SLAs',
      price: 999.0,
      billingPeriod: 'YEARLY',
      minQuantity: 5,
      autoClose: false,
      allowEarlyClose: false,
      allowPause: true,
      allowRenewal: true,
      isActive: true,
    },
  });
  console.log(`✅ Plans ready: ${monthlyPlan.name}, ${yearlyPlan.name}`);

  // 7. Seed Discounts (Admin Only)
  const bulkDiscount = await prisma.discount.upsert({
    where: { id: '30000000-0000-0000-0000-000000000001' },
    update: { value: 10.0 },
    create: {
      id: '30000000-0000-0000-0000-000000000001',
      name: 'Volume Seat Discount (10% Off)',
      code: 'VOLUME10',
      type: 'PERCENTAGE',
      value: 10.0,
      scope: 'SUBSCRIPTION',
      minQuantity: 5,
      startDate: new Date('2026-01-01'),
      usageLimit: 100,
      isActive: true,
    },
  });
  console.log(`✅ Discount rules ready: ${bulkDiscount.name}`);

  console.log('✨ Seed completed successfully! All admin, staff, and catalog data are initialized.');
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
