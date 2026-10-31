import React from 'react';
import { render } from '@react-email/render';
import { prisma } from '../../database/client.ts';
import { sendEmail, APP_URL, type SendEmailResult } from './client.ts';
import { WelcomeEmail } from './templates/WelcomeEmail.tsx';
import { PasswordResetEmail } from './templates/PasswordResetEmail.tsx';
import { InvoiceGeneratedEmail, type InvoiceLineItem } from './templates/InvoiceGeneratedEmail.tsx';
import { PaymentReceiptEmail } from './templates/PaymentReceiptEmail.tsx';
import { OverdueReminderEmail } from './templates/OverdueReminderEmail.tsx';
import { AdminStatusReportEmail, type AdminReportData } from './templates/AdminStatusReportEmail.tsx';
import { StaffNotificationEmail, type StaffNotificationItem } from './templates/StaffNotificationEmail.tsx';

function formatDate(date: Date | string | null | undefined): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatPeriod(start: Date | string, end: Date | string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export class EmailService {
  /**
   * 1. Send Welcome Email upon user registration
   */
  static async sendWelcomeEmail(user: {
    name: string;
    email: string;
    companyName?: string | null;
  }): Promise<SendEmailResult> {
    const portalUrl = `${APP_URL}/portal`;
    const html = await render(
      React.createElement(WelcomeEmail, {
        name: user.name,
        email: user.email,
        companyName: user.companyName,
        portalUrl,
      })
    );

    return sendEmail({
      to: user.email,
      subject: `Welcome to Brightloop Software, ${user.name}!`,
      html,
    });
  }

  /**
   * 2. Send Password Reset Email with secure link
   */
  static async sendPasswordResetEmail(
    user: { name: string; email: string },
    resetToken: string
  ): Promise<SendEmailResult> {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${encodeURIComponent(resetToken)}`;
    const html = await render(
      React.createElement(PasswordResetEmail, {
        name: user.name,
        email: user.email,
        resetUrl,
        expiresInMinutes: 30,
      })
    );

    return sendEmail({
      to: user.email,
      subject: 'Reset your Brightloop password',
      html,
    });
  }

  /**
   * 3. Send Invoice Email when an invoice is generated or sent
   */
  static async sendInvoiceEmail(
    invoice: {
      id: string;
      number: string;
      invoiceDate: Date | string;
      dueDate: Date | string;
      billingPeriodStart: Date | string;
      billingPeriodEnd: Date | string;
      subtotal: any;
      discountTotal: any;
      taxTotal: any;
      grandTotal: any;
      amountPaid?: any;
      customerName?: string | null;
      customerEmail?: string | null;
    },
    lines: Array<{
      description: string;
      quantity: number;
      unitPrice: any;
      taxAmount: any;
      lineTotal: any;
    }>,
    customer?: { name?: string; email?: string }
  ): Promise<SendEmailResult> {
    const recipientEmail = customer?.email || invoice.customerEmail;
    if (!recipientEmail) {
      return { success: false, error: 'Recipient email not provided on invoice' };
    }

    const formattedLines: InvoiceLineItem[] = lines.map((l) => ({
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      taxAmount: Number(l.taxAmount || 0),
      lineTotal: Number(l.lineTotal),
    }));

    const paymentUrl = `${APP_URL}/portal/invoices/${invoice.id}`;

    const html = await render(
      React.createElement(InvoiceGeneratedEmail, {
        customerName: customer?.name || invoice.customerName || 'Valued Customer',
        customerEmail: recipientEmail,
        invoiceNumber: invoice.number,
        invoiceDate: formatDate(invoice.invoiceDate),
        dueDate: formatDate(invoice.dueDate),
        billingPeriod: formatPeriod(invoice.billingPeriodStart, invoice.billingPeriodEnd),
        subtotal: Number(invoice.subtotal),
        discountTotal: Number(invoice.discountTotal || 0),
        taxTotal: Number(invoice.taxTotal || 0),
        grandTotal: Number(invoice.grandTotal),
        amountPaid: Number(invoice.amountPaid || 0),
        lines: formattedLines,
        paymentUrl,
      })
    );

    return sendEmail({
      to: recipientEmail,
      subject: `New Invoice ${invoice.number} from Brightloop Software`,
      html,
    });
  }

  /**
   * 4. Send Payment Receipt after successful payment
   */
  static async sendPaymentReceiptEmail(
    payment: {
      amount: any;
      method: string;
      reference?: string | null;
      paymentDate: Date | string;
    },
    invoice: {
      id: string;
      number: string;
      grandTotal: any;
      amountPaid: any;
      customerName?: string | null;
      customerEmail?: string | null;
    },
    customer?: { name?: string; email?: string }
  ): Promise<SendEmailResult> {
    const recipientEmail = customer?.email || invoice.customerEmail;
    if (!recipientEmail) {
      return { success: false, error: 'Recipient email missing for receipt' };
    }

    const grandTotal = Number(invoice.grandTotal);
    const amountPaidTotal = Number(invoice.amountPaid);
    const remainingBalance = Math.max(0, grandTotal - amountPaidTotal);
    const portalUrl = `${APP_URL}/portal/invoices/${invoice.id}`;

    const html = await render(
      React.createElement(PaymentReceiptEmail, {
        customerName: customer?.name || invoice.customerName || 'Valued Customer',
        invoiceNumber: invoice.number,
        paymentReference: payment.reference || `PAY-${invoice.number}`,
        paymentDate: formatDate(payment.paymentDate),
        paymentMethod: payment.method,
        amountPaid: Number(payment.amount),
        invoiceGrandTotal: grandTotal,
        remainingBalance,
        portalUrl,
      })
    );

    return sendEmail({
      to: recipientEmail,
      subject: `Payment Receipt: Invoice ${invoice.number} Settlement`,
      html,
    });
  }

  /**
   * 5. Send Overdue Invoice Reminder
   */
  static async sendOverdueReminderEmail(
    invoice: {
      id: string;
      number: string;
      dueDate: Date | string;
      grandTotal: any;
      amountPaid: any;
      customerName?: string | null;
      customerEmail?: string | null;
    },
    customer?: { name?: string; email?: string },
    calculatedDaysOverdue?: number
  ): Promise<SendEmailResult> {
    const recipientEmail = customer?.email || invoice.customerEmail;
    if (!recipientEmail) {
      return { success: false, error: 'Recipient email missing for overdue notice' };
    }

    const grandTotal = Number(invoice.grandTotal);
    const amountPaid = Number(invoice.amountPaid);
    const balanceDue = Math.max(0, grandTotal - amountPaid);

    const dueTime = new Date(invoice.dueDate).getTime();
    const daysOverdue =
      calculatedDaysOverdue !== undefined
        ? calculatedDaysOverdue
        : Math.max(1, Math.floor((Date.now() - dueTime) / 86400000));

    const paymentUrl = `${APP_URL}/portal/invoices/${invoice.id}`;

    const html = await render(
      React.createElement(OverdueReminderEmail, {
        customerName: customer?.name || invoice.customerName || 'Valued Customer',
        invoiceNumber: invoice.number,
        dueDate: formatDate(invoice.dueDate),
        daysOverdue,
        grandTotal,
        amountPaid,
        balanceDue,
        paymentUrl,
      })
    );

    return sendEmail({
      to: recipientEmail,
      subject: `URGENT: Invoice ${invoice.number} is ${daysOverdue} days overdue`,
      html,
    });
  }

  /**
   * 6. Send Admin Business Status Report
   */
  static async sendAdminStatusReport(
    targetAdminEmail?: string,
    customReport?: Partial<AdminReportData>
  ): Promise<SendEmailResult> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Aggregate real-time data from database
    const [
      activeSubsCount,
      revenueAgg,
      revenueByMethod,
      confirmedInvoicesAgg,
      overdueAgg,
      topOverdueInvoices,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.payment.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'CONFIRMED' },
        _sum: { grandTotal: true, amountPaid: true },
        _count: { id: true },
      }),
      prisma.invoice.aggregate({
        where: { status: 'CONFIRMED', dueDate: { lt: today } },
        _sum: { grandTotal: true, amountPaid: true },
        _count: { id: true },
      }),
      prisma.invoice.findMany({
        where: { status: 'CONFIRMED', dueDate: { lt: today } },
        select: {
          number: true,
          customerName: true,
          dueDate: true,
          grandTotal: true,
          amountPaid: true,
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
    ]);

    const totalRev = Number(revenueAgg._sum.amount || 0);
    const outstanding = Math.max(
      0,
      Number(confirmedInvoicesAgg._sum.grandTotal || 0) - Number(confirmedInvoicesAgg._sum.amountPaid || 0)
    );
    const overdueAmt = Math.max(
      0,
      Number(overdueAgg._sum.grandTotal || 0) - Number(overdueAgg._sum.amountPaid || 0)
    );

    const reportData: AdminReportData = {
      asOfDate: formatDate(today),
      activeSubscriptionsCount: activeSubsCount,
      totalRevenue: totalRev,
      paymentsCount: revenueAgg._count.id,
      outstandingAmount: outstanding,
      outstandingInvoicesCount: confirmedInvoicesAgg._count.id,
      overdueAmount: overdueAmt,
      overdueInvoicesCount: overdueAgg._count.id,
      paymentMethods: revenueByMethod.map((m) => ({
        method: m.method,
        totalAmount: Number(m._sum.amount || 0),
        count: m._count.id,
        percentage: totalRev > 0 ? ((Number(m._sum.amount || 0) / totalRev) * 100).toFixed(1) : '0',
      })),
      topOverdueInvoices: topOverdueInvoices.map((inv) => {
        const bal = Math.max(0, Number(inv.grandTotal) - Number(inv.amountPaid));
        const dueTime = new Date(inv.dueDate).getTime();
        const days = Math.max(1, Math.floor((Date.now() - dueTime) / 86400000));
        return {
          number: inv.number,
          customerName: inv.customerName || 'Customer',
          daysOverdue: days,
          balance: bal,
        };
      }),
      ...customReport,
    };

    // Determine recipient admin(s)
    let recipients: string[] = [];
    if (targetAdminEmail) {
      recipients = [targetAdminEmail];
    } else {
      const admins = await prisma.user.findMany({
        where: { role: 'ADMIN', isActive: true },
        select: { email: true },
      });
      recipients = admins.map((a) => a.email);
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No active admin email found to deliver report' };
    }

    const dashboardUrl = `${APP_URL}/reports/dashboard`;
    const html = await render(
      React.createElement(AdminStatusReportEmail, {
        adminName: 'Administrator',
        report: reportData,
        dashboardUrl,
      })
    );

    return sendEmail({
      to: recipients,
      subject: `Brightloop Executive Business Health Report — ${reportData.asOfDate}`,
      html,
    });
  }

  /**
   * 7. Send Operational Alert Notification to Staff
   */
  static async sendStaffNotification(options: {
    title: string;
    message: string;
    badge?: string;
    badgeColor?: 'blue' | 'green' | 'yellow' | 'red';
    details?: StaffNotificationItem[];
    actionUrl?: string;
    actionLabel?: string;
    targetEmails?: string[];
  }): Promise<SendEmailResult> {
    let recipients = options.targetEmails || [];

    if (recipients.length === 0) {
      // Find all active staff and admins
      const staffUsers = await prisma.user.findMany({
        where: {
          role: { in: ['ADMIN', 'STAFF'] },
          isActive: true,
        },
        select: { email: true },
      });
      recipients = staffUsers.map((s) => s.email);
    }

    if (recipients.length === 0) {
      return { success: false, error: 'No staff or admin recipients found' };
    }

    const html = await render(
      React.createElement(StaffNotificationEmail, {
        title: options.title,
        badge: options.badge || 'STAFF NOTICE',
        badgeColor: options.badgeColor || 'blue',
        message: options.message,
        details: options.details,
        actionUrl: options.actionUrl,
        actionLabel: options.actionLabel,
      })
    );

    return sendEmail({
      to: recipients,
      subject: `[Brightloop Staff Alert] ${options.title}`,
      html,
    });
  }

  /**
   * Batch helper: Scan and trigger overdue reminders for all overdue confirmed invoices
   */
  static async dispatchBatchOverdueReminders(): Promise<{
    scanned: number;
    reminded: number;
    errors: string[];
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        status: 'CONFIRMED',
        dueDate: { lt: today },
      },
      include: {
        customer: { select: { name: true, email: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    let reminded = 0;
    const errors: string[] = [];

    for (const inv of overdueInvoices) {
      try {
        const res = await this.sendOverdueReminderEmail(
          inv,
          inv.customer
            ? { name: inv.customer.name, email: inv.customer.email }
            : { name: inv.customerName, email: inv.customerEmail }
        );
        if (res.success) {
          reminded++;
        } else if (res.error) {
          errors.push(`${inv.number}: ${res.error}`);
        }
      } catch (err: any) {
        errors.push(`${inv.number}: ${err.message || 'Send error'}`);
      }
    }

    return {
      scanned: overdueInvoices.length,
      reminded,
      errors,
    };
  }
}

export default EmailService;
