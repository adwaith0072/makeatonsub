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

export interface OverdueReminderEmailProps {
  customerName: string;
  invoiceNumber: string;
  dueDate: string;
  daysOverdue: number;
  grandTotal: number;
  amountPaid: number;
  balanceDue: number;
  paymentUrl: string;
}

export function OverdueReminderEmail({
  customerName = 'Valued Customer',
  invoiceNumber = 'INV-001234',
  dueDate = 'Oct 15, 2026',
  daysOverdue = 16,
  grandTotal = 11210,
  amountPaid = 0,
  balanceDue = 11210,
  paymentUrl = 'http://localhost:3000/portal/invoices',
}: OverdueReminderEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>URGENT: Invoice {invoiceNumber} is {daysOverdue} days overdue</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
          </Section>

          <Section style={contentSection}>
            <div style={alertIconContainer}>
              <span style={alertIcon}>⚠️</span>
            </div>

            <Heading as="h2" style={alertHeading}>
              Payment Reminder: Invoice Overdue
            </Heading>

            <Text style={paragraph}>
              Dear <strong>{customerName}</strong>,
            </Text>

            <Text style={paragraph}>
              This is a reminder that payment for invoice <strong>{invoiceNumber}</strong> was due on{' '}
              <strong>{dueDate}</strong> and is currently{' '}
              <span style={overduePill}>{daysOverdue} days past due</span>.
            </Text>

            {/* Overdue Card */}
            <Section style={overdueCard}>
              <Row style={cardRow}>
                <Column><Text style={cardLabel}>Invoice Number:</Text></Column>
                <Column style={{ textAlign: 'right' }}><Text style={cardValueMono}>{invoiceNumber}</Text></Column>
              </Row>
              <Row style={cardRow}>
                <Column><Text style={cardLabel}>Original Due Date:</Text></Column>
                <Column style={{ textAlign: 'right' }}><Text style={cardValue}>{dueDate}</Text></Column>
              </Row>
              <Row style={cardRow}>
                <Column><Text style={cardLabel}>Total Invoiced:</Text></Column>
                <Column style={{ textAlign: 'right' }}><Text style={cardValue}>{formatCurrency(grandTotal)}</Text></Column>
              </Row>
              {amountPaid > 0 && (
                <Row style={cardRow}>
                  <Column><Text style={cardLabel}>Already Paid:</Text></Column>
                  <Column style={{ textAlign: 'right' }}><Text style={cardValue}>{formatCurrency(amountPaid)}</Text></Column>
                </Row>
              )}
              <Row style={totalRow}>
                <Column><Text style={totalLabel}>Outstanding Balance:</Text></Column>
                <Column style={{ textAlign: 'right' }}><Text style={totalValue}>{formatCurrency(balanceDue)}</Text></Column>
              </Row>
            </Section>

            <Text style={paragraph}>
              To avoid any disruption or suspension of your active subscription services, please settle this outstanding balance at your earliest convenience.
            </Text>

            <Section style={buttonContainer}>
              <Button style={primaryButton} href={paymentUrl}>
                Pay {formatCurrency(balanceDue)} Now →
              </Button>
            </Section>

            <Text style={footnoteText}>
              <strong>Already sent payment?</strong> If you have already initiated this transfer within the last 24–48 hours, please disregard this notice while our banking system reconciles the transaction. If you have questions, reply directly to this email.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              Automated receivables collection reminder from Brightloop Software Finance.
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
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

export default OverdueReminderEmail;

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
  maxWidth: '580px',
  margin: '0 auto',
  overflow: 'hidden',
  border: '1px solid #fee2e2',
};

const header = {
  backgroundColor: '#0f172a',
  padding: '24px 36px',
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
  fontSize: '18px',
  fontWeight: '700' as const,
  margin: '4px 0 0',
};

const contentSection = {
  padding: '36px 36px 28px',
};

const alertIconContainer = {
  width: '56px',
  height: '56px',
  borderRadius: '50%',
  backgroundColor: '#fee2e2',
  margin: '0 auto 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const alertIcon = {
  fontSize: '24px',
  lineHeight: '56px',
  display: 'inline-block',
};

const alertHeading = {
  color: '#991b1b',
  fontSize: '22px',
  fontWeight: '800' as const,
  textAlign: 'center' as const,
  margin: '0 0 20px',
};

const paragraph = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '1.6',
  marginBottom: '16px',
};

const overduePill = {
  backgroundColor: '#fee2e2',
  color: '#b91c1c',
  fontWeight: '700' as const,
  padding: '2px 8px',
  borderRadius: '4px',
};

const overdueCard = {
  backgroundColor: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: '10px',
  padding: '18px 22px',
  margin: '20px 0 24px',
};

const cardRow = {
  padding: '6px 0',
};

const cardLabel = {
  color: '#7f1d1d',
  fontSize: '13px',
  margin: '0',
};

const cardValue = {
  color: '#1e293b',
  fontSize: '13px',
  fontWeight: '500' as const,
  margin: '0',
};

const cardValueMono = {
  color: '#0f172a',
  fontFamily: 'monospace',
  fontSize: '13px',
  fontWeight: '700' as const,
  margin: '0',
};

const totalRow = {
  borderTop: '1px solid #fecaca',
  paddingTop: '10px',
  marginTop: '8px',
};

const totalLabel = {
  color: '#991b1b',
  fontSize: '15px',
  fontWeight: '800' as const,
  margin: '0',
};

const totalValue = {
  color: '#b91c1c',
  fontSize: '20px',
  fontWeight: '800' as const,
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const primaryButton = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  padding: '14px 32px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '700' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.3)',
};

const footnoteText = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.5',
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
