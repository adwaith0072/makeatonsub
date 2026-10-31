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

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  lineTotal: number;
}

export interface InvoiceGeneratedEmailProps {
  customerName: string;
  customerEmail: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  billingPeriod: string;
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  amountPaid?: number;
  lines: InvoiceLineItem[];
  paymentUrl: string;
}

export function InvoiceGeneratedEmail({
  customerName = 'Valued Customer',
  customerEmail = 'billing@customer.com',
  invoiceNumber = 'INV-001234',
  invoiceDate = 'Oct 31, 2026',
  dueDate = 'Nov 15, 2026',
  billingPeriod = 'Oct 1, 2026 – Oct 31, 2026',
  subtotal = 10000,
  discountTotal = 500,
  taxTotal = 1710,
  grandTotal = 11210,
  amountPaid = 0,
  lines = [
    {
      description: 'Brightloop Software Pro Subscription',
      quantity: 1,
      unitPrice: 10000,
      taxAmount: 1710,
      lineTotal: 11210,
    },
  ],
  paymentUrl = 'http://localhost:3000/portal/invoices',
}: InvoiceGeneratedEmailProps) {
  const balanceDue = Math.max(0, grandTotal - (amountPaid || 0));

  return (
    <Html>
      <Head />
      <Preview>Invoice {invoiceNumber} from Brightloop Software ({formatCurrency(grandTotal)})</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
          </Section>

          <Section style={contentSection}>
            <Row>
              <Column>
                <Heading as="h2" style={invoiceTitle}>
                  Invoice {invoiceNumber}
                </Heading>
                <Text style={billedToLabel}>Billed To:</Text>
                <Text style={customerInfo}>
                  <strong>{customerName}</strong>
                  <br />
                  {customerEmail}
                </Text>
              </Column>
              <Column style={{ textAlign: 'right' }}>
                <div style={statusBadge}>CONFIRMED</div>
                <Text style={metaText}>
                  <strong>Invoice Date:</strong> {invoiceDate}
                </Text>
                <Text style={metaText}>
                  <strong>Due Date:</strong> {dueDate}
                </Text>
                <Text style={metaText}>
                  <strong>Period:</strong> {billingPeriod}
                </Text>
              </Column>
            </Row>

            <Hr style={subDivider} />

            {/* Line items table */}
            <Section style={tableHeader}>
              <Row>
                <Column style={{ width: '50%' }}>
                  <Text style={thText}>Description</Text>
                </Column>
                <Column style={{ width: '15%', textAlign: 'center' }}>
                  <Text style={thText}>Qty</Text>
                </Column>
                <Column style={{ width: '15%', textAlign: 'right' }}>
                  <Text style={thText}>Unit Price</Text>
                </Column>
                <Column style={{ width: '20%', textAlign: 'right' }}>
                  <Text style={thText}>Total</Text>
                </Column>
              </Row>
            </Section>

            {lines.map((line, index) => (
              <Section key={index} style={tableRow}>
                <Row>
                  <Column style={{ width: '50%' }}>
                    <Text style={tdText}>{line.description}</Text>
                  </Column>
                  <Column style={{ width: '15%', textAlign: 'center' }}>
                    <Text style={tdText}>{line.quantity}</Text>
                  </Column>
                  <Column style={{ width: '15%', textAlign: 'right' }}>
                    <Text style={tdText}>{formatCurrency(line.unitPrice)}</Text>
                  </Column>
                  <Column style={{ width: '20%', textAlign: 'right' }}>
                    <Text style={tdTextBold}>{formatCurrency(line.lineTotal)}</Text>
                  </Column>
                </Row>
              </Section>
            ))}

            <Hr style={subDivider} />

            {/* Summary Totals */}
            <Section style={summarySection}>
              <Row>
                <Column style={{ width: '60%' }} />
                <Column style={{ width: '40%' }}>
                  <Row style={summaryRow}>
                    <Column><Text style={summaryLabel}>Subtotal:</Text></Column>
                    <Column style={{ textAlign: 'right' }}><Text style={summaryValue}>{formatCurrency(subtotal)}</Text></Column>
                  </Row>
                  {discountTotal > 0 && (
                    <Row style={summaryRow}>
                      <Column><Text style={summaryLabel}>Discount:</Text></Column>
                      <Column style={{ textAlign: 'right' }}><Text style={discountValue}>- {formatCurrency(discountTotal)}</Text></Column>
                    </Row>
                  )}
                  {taxTotal > 0 && (
                    <Row style={summaryRow}>
                      <Column><Text style={summaryLabel}>Taxes:</Text></Column>
                      <Column style={{ textAlign: 'right' }}><Text style={summaryValue}>+ {formatCurrency(taxTotal)}</Text></Column>
                    </Row>
                  )}
                  <Row style={grandTotalRow}>
                    <Column><Text style={grandTotalLabel}>Grand Total:</Text></Column>
                    <Column style={{ textAlign: 'right' }}><Text style={grandTotalValue}>{formatCurrency(grandTotal)}</Text></Column>
                  </Row>
                  <Row style={balanceRow}>
                    <Column><Text style={balanceLabel}>Balance Due:</Text></Column>
                    <Column style={{ textAlign: 'right' }}><Text style={balanceValue}>{formatCurrency(balanceDue)}</Text></Column>
                  </Row>
                </Column>
              </Row>
            </Section>

            {/* CTA Button */}
            <Section style={buttonContainer}>
              <Button style={primaryButton} href={paymentUrl}>
                View & Pay Invoice Online →
              </Button>
            </Section>

            <Text style={noteText}>
              Payment terms apply as agreed. Please ensure settlement on or before <strong>{dueDate}</strong> to maintain uninterrupted subscription service.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              Automated invoice billing notification from Brightloop Software.
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

export default InvoiceGeneratedEmail;

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
  padding: '32px 36px',
};

const invoiceTitle = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: '800' as const,
  margin: '0 0 12px',
};

const billedToLabel = {
  color: '#64748b',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  fontWeight: '600' as const,
  margin: '0 0 4px',
};

const customerInfo = {
  color: '#1e293b',
  fontSize: '14px',
  lineHeight: '1.4',
  margin: '0',
};

const statusBadge = {
  display: 'inline-block',
  backgroundColor: '#dbeafe',
  color: '#1d4ed8',
  fontSize: '11px',
  fontWeight: '700' as const,
  padding: '3px 10px',
  borderRadius: '9999px',
  marginBottom: '8px',
};

const metaText = {
  color: '#475569',
  fontSize: '13px',
  margin: '3px 0',
};

const subDivider = {
  borderColor: '#f1f5f9',
  margin: '20px 0',
};

const tableHeader = {
  backgroundColor: '#f8fafc',
  borderRadius: '6px',
  padding: '8px 12px',
  marginBottom: '8px',
};

const thText = {
  color: '#64748b',
  fontSize: '11px',
  fontWeight: '700' as const,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  margin: '0',
};

const tableRow = {
  padding: '10px 12px',
  borderBottom: '1px solid #f1f5f9',
};

const tdText = {
  color: '#334155',
  fontSize: '13px',
  margin: '0',
};

const tdTextBold = {
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0',
};

const summarySection = {
  marginTop: '16px',
};

const summaryRow = {
  marginBottom: '4px',
};

const summaryLabel = {
  color: '#64748b',
  fontSize: '13px',
  margin: '0',
};

const summaryValue = {
  color: '#334155',
  fontSize: '13px',
  margin: '0',
};

const discountValue = {
  color: '#16a34a',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0',
};

const grandTotalRow = {
  borderTop: '1px solid #e2e8f0',
  paddingTop: '8px',
  marginTop: '8px',
};

const grandTotalLabel = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '700' as const,
  margin: '0',
};

const grandTotalValue = {
  color: '#0f172a',
  fontSize: '16px',
  fontWeight: '800' as const,
  margin: '0',
};

const balanceRow = {
  marginTop: '6px',
};

const balanceLabel = {
  color: '#dc2626',
  fontSize: '14px',
  fontWeight: '700' as const,
  margin: '0',
};

const balanceValue = {
  color: '#dc2626',
  fontSize: '16px',
  fontWeight: '800' as const,
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0 16px',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
};

const noteText = {
  color: '#64748b',
  fontSize: '12px',
  lineHeight: '1.5',
  textAlign: 'center' as const,
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
