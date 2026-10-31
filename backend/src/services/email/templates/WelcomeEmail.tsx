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
  Link,
} from '@react-email/components';

export interface WelcomeEmailProps {
  name: string;
  email: string;
  companyName?: string | null;
  portalUrl: string;
}

export function WelcomeEmail({
  name = 'Valued Customer',
  email = 'customer@example.com',
  companyName,
  portalUrl = 'http://localhost:3000/portal',
}: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Welcome to Brightloop Subscription Management</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading as="h2" style={greeting}>
              Welcome aboard, {name}! 🎉
            </Heading>

            <Text style={paragraph}>
              Thank you for creating an account with Brightloop Software. Your subscription management portal is now ready to use.
            </Text>

            {companyName && (
              <Text style={companyTag}>
                <strong>Company:</strong> {companyName}
              </Text>
            )}

            <Section style={cardBox}>
              <Text style={cardTitle}>Your Account Credentials</Text>
              <Text style={cardText}>
                <strong>Registered Email:</strong> {email}
              </Text>
              <Text style={cardText}>
                <strong>Account Type:</strong> Customer Portal
              </Text>
            </Section>

            <Text style={paragraph}>
              From your customer portal, you can easily:
            </Text>

            <ul style={featureList}>
              <li style={listItem}>Browse available software plans and add-on products</li>
              <li style={listItem}>View and manage your active subscriptions</li>
              <li style={listItem}>Download past invoices and track billing history</li>
              <li style={listItem}>Make secure online payments via Card, NetBanking, and UPI</li>
            </ul>

            <Section style={buttonContainer}>
              <Button style={primaryButton} href={portalUrl}>
                Access Customer Portal →
              </Button>
            </Section>

            <Text style={noteText}>
              Need help? Feel free to reply directly to this email or reach out to our customer support team anytime.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              You received this email because you signed up for Brightloop Software Subscription Services.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default WelcomeEmail;

// Styles
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
  marginBottom: '8px',
};

const headerTitle = {
  color: '#ffffff',
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '6px 0 0',
  letterSpacing: '-0.02em',
};

const contentSection = {
  padding: '36px 36px 24px',
};

const greeting = {
  color: '#0f172a',
  fontSize: '22px',
  fontWeight: '700' as const,
  marginBottom: '16px',
};

const paragraph = {
  color: '#334155',
  fontSize: '15px',
  lineHeight: '1.6',
  marginBottom: '16px',
};

const companyTag = {
  backgroundColor: '#f1f5f9',
  padding: '8px 14px',
  borderRadius: '6px',
  color: '#475569',
  fontSize: '14px',
  marginBottom: '20px',
};

const cardBox = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '16px 20px',
  marginBottom: '24px',
};

const cardTitle = {
  color: '#0f172a',
  fontSize: '14px',
  fontWeight: '700' as const,
  margin: '0 0 8px',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
};

const cardText = {
  color: '#475569',
  fontSize: '14px',
  margin: '4px 0',
};

const featureList = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '1.8',
  paddingLeft: '20px',
  marginBottom: '28px',
};

const listItem = {
  marginBottom: '6px',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
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
  fontSize: '13px',
  lineHeight: '1.5',
  marginTop: '20px',
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
