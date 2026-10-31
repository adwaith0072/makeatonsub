import * as React from 'react';
import {
  Html,
  Head,
  Preview,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Row,
  Column,
} from '@react-email/components';

export interface AdminReportData {
  asOfDate: string;
  activeSubscriptionsCount: number;
  totalRevenue: number;
  paymentsCount: number;
  outstandingAmount: number;
  outstandingInvoicesCount: number;
  overdueAmount: number;
  overdueInvoicesCount: number;
  paymentMethods: Array<{
    method: string;
    totalAmount: number;
    count: number;
    percentage: string;
  }>;
  topOverdueInvoices: Array<{
    number: string;
    customerName: string;
    daysOverdue: number;
    balance: number;
  }>;
}

export interface AdminStatusReportEmailProps {
  adminName?: string;
  report: AdminReportData;
  dashboardUrl?: string;
}

export function AdminStatusReportEmail({
  adminName = 'Administrator',
  report = {
    asOfDate: 'Oct 31, 2026',
    activeSubscriptionsCount: 1420,
    totalRevenue: 12450000,
    paymentsCount: 842,
    outstandingAmount: 1845200,
    outstandingInvoicesCount: 64,
    overdueAmount: 642000,
    overdueInvoicesCount: 18,
    paymentMethods: [
      { method: 'BANK_TRANSFER', totalAmount: 7200000, count: 310, percentage: '57.8' },
      { method: 'CARD', totalAmount: 3150000, count: 340, percentage: '25.3' },
      { method: 'UPI', totalAmount: 2100000, count: 192, percentage: '16.9' },
    ],
    topOverdueInvoices: [
      { number: 'INV-000104', customerName: 'Acme Corp', daysOverdue: 21, balance: 120000 },
      { number: 'INV-000219', customerName: 'Starlight Tech', daysOverdue: 14, balance: 85000 },
    ],
  },
  dashboardUrl = 'http://localhost:3000/reports/dashboard',
}: AdminStatusReportEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Brightloop Business Status Report: {formatCurrency(report.totalRevenue)} collected ({report.activeSubscriptionsCount} active subs)</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
            <Text style={headerSubtitle}>Executive Financial & Business Health Briefing</Text>
          </Section>

          <Section style={contentSection}>
            <Row>
              <Column>
                <Heading as="h2" style={greeting}>
                  Business Status Briefing
                </Heading>
                <Text style={introText}>
                  Hello <strong>{adminName}</strong>, here is the current business pulse and revenue snapshot as of{' '}
                  <strong>{report.asOfDate}</strong>.
                </Text>
              </Column>
            </Row>

            {/* 4 KPI Grid (2x2 table) */}
            <Section style={kpiGrid}>
              <Row style={{ marginBottom: '12px' }}>
                <Column style={kpiColLeft}>
                  <div style={kpiCardBlue}>
                    <Text style={kpiLabel}>Active Subscriptions</Text>
                    <Text style={kpiValue}>{report.activeSubscriptionsCount.toLocaleString()}</Text>
                    <Text style={kpiMeta}>Active recurring contracts</Text>
                  </div>
                </Column>
                <Column style={kpiColRight}>
                  <div style={kpiCardGreen}>
                    <Text style={kpiLabel}>Revenue Collected</Text>
                    <Text style={kpiValue}>{formatCurrency(report.totalRevenue)}</Text>
                    <Text style={kpiMeta}>{report.paymentsCount} transactions</Text>
                  </div>
                </Column>
              </Row>
              <Row>
                <Column style={kpiColLeft}>
                  <div style={kpiCardYellow}>
                    <Text style={kpiLabel}>Total Outstanding</Text>
                    <Text style={kpiValue}>{formatCurrency(report.outstandingAmount)}</Text>
                    <Text style={kpiMeta}>{report.outstandingInvoicesCount} confirmed invoices</Text>
                  </div>
                </Column>
                <Column style={kpiColRight}>
                  <div style={kpiCardRed}>
                    <Text style={kpiLabel}>Overdue Invoices</Text>
                    <Text style={kpiValue}>{formatCurrency(report.overdueAmount)}</Text>
                    <Text style={kpiMeta}>{report.overdueInvoicesCount} invoices past due</Text>
                  </div>
                </Column>
              </Row>
            </Section>

            {/* Payment Method Collections */}
            {report.paymentMethods && report.paymentMethods.length > 0 && (
              <Section style={subSection}>
                <Heading as="h3" style={sectionHeading}>
                  Revenue by Payment Method
                </Heading>
                {report.paymentMethods.map((m, idx) => (
                  <Row key={idx} style={metricRow}>
                    <Column style={{ width: '40%' }}>
                      <Text style={metricName}>{m.method.replace('_', ' ')}</Text>
                    </Column>
                    <Column style={{ width: '25%', textAlign: 'center' }}>
                      <Text style={metricCount}>{m.count} txns</Text>
                    </Column>
                    <Column style={{ width: '35%', textAlign: 'right' }}>
                      <Text style={metricAmount}>
                        {formatCurrency(m.totalAmount)} ({m.percentage}%)
                      </Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            )}

            {/* Urgent Overdue Accounts */}
            {report.topOverdueInvoices && report.topOverdueInvoices.length > 0 && (
              <Section style={subSection}>
                <Heading as="h3" style={sectionHeadingUrgent}>
                  ⚠️ Overdue Accounts Requiring Attention
                </Heading>
                {report.topOverdueInvoices.map((inv, idx) => (
                  <Row key={idx} style={metricRow}>
                    <Column style={{ width: '50%' }}>
                      <Text style={invName}>
                        <strong>{inv.number}</strong> — {inv.customerName}
                      </Text>
                    </Column>
                    <Column style={{ width: '25%', textAlign: 'center' }}>
                      <span style={urgentBadge}>{inv.daysOverdue}d overdue</span>
                    </Column>
                    <Column style={{ width: '25%', textAlign: 'right' }}>
                      <Text style={urgentAmount}>{formatCurrency(inv.balance)}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            )}

            {/* Dashboard Link */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={dashboardUrl}>
                Open Full Finance Dashboard →
              </Button>
            </Section>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              Automated executive business status digest delivered to authorized Brightloop administrators.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export default AdminStatusReportEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  padding: '40px 0',
};

const container = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  maxWidth: '620px',
  margin: '0 auto',
  overflow: 'hidden',
  border: '1px solid #e2e8f0',
};

const header = {
  backgroundColor: '#0f172a',
  padding: '28px 36px',
  textAlign: 'center' as const,
};

const brandBadge = {
  display: 'inline-block',
  width: '36px',
  height: '36px',
  lineHeight: '36px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
  color: '#ffffff',
  fontWeight: '800' as const,
  fontSize: '18px',
  marginBottom: '6px',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '800' as const,
  margin: '4px 0 0',
};

const headerSubtitle = {
  color: '#94a3b8',
  fontSize: '13px',
  margin: '4px 0 0',
};

const contentSection = {
  padding: '32px 36px',
};

const greeting = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '0 0 8px',
};

const introText = {
  color: '#475569',
  fontSize: '14px',
  margin: '0 0 24px',
  lineHeight: '1.5',
};

const kpiGrid = {
  margin: '0 0 24px',
};

const kpiColLeft = {
  width: '49%',
  paddingRight: '6px',
};

const kpiColRight = {
  width: '49%',
  paddingLeft: '6px',
};

const kpiCardBase = {
  borderRadius: '8px',
  padding: '16px',
  border: '1px solid #e2e8f0',
};

const kpiCardBlue = {
  ...kpiCardBase,
  backgroundColor: '#eff6ff',
  borderColor: '#bfdbfe',
};

const kpiCardGreen = {
  ...kpiCardBase,
  backgroundColor: '#f0fdf4',
  borderColor: '#bbf7d0',
};

const kpiCardYellow = {
  ...kpiCardBase,
  backgroundColor: '#fffbeb',
  borderColor: '#fde68a',
};

const kpiCardRed = {
  ...kpiCardBase,
  backgroundColor: '#fef2f2',
  borderColor: '#fecaca',
};

const kpiLabel = {
  color: '#64748b',
  fontSize: '11px',
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0 0 4px',
};

const kpiValue = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: '800' as const,
  margin: '0 0 4px',
};

const kpiMeta = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0',
};

const subSection = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '20px',
};

const sectionHeading = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '700' as const,
  margin: '0 0 12px',
};

const sectionHeadingUrgent = {
  color: '#b91c1c',
  fontSize: '14px',
  fontWeight: '700' as const,
  margin: '0 0 12px',
};

const metricRow = {
  padding: '6px 0',
  borderBottom: '1px solid #f1f5f9',
};

const metricName = {
  color: '#334155',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0',
};

const metricCount = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0',
};

const metricAmount = {
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0',
};

const invName = {
  color: '#1e293b',
  fontSize: '13px',
  margin: '0',
};

const urgentBadge = {
  backgroundColor: '#fee2e2',
  color: '#b91c1c',
  fontSize: '11px',
  fontWeight: '700' as const,
  padding: '2px 8px',
  borderRadius: '4px',
};

const urgentAmount = {
  color: '#b91c1c',
  fontSize: '13px',
  fontWeight: '700' as const,
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0 8px',
};

const primaryButton = {
  backgroundColor: '#0f172a',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '24px 36px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#64748b',
  fontSize: '13px',
  margin: '0 0 6px',
};

const footerSubtext = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '0',
};
