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

export interface PasswordResetEmailProps {
  name: string;
  email: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export function PasswordResetEmail({
  name = 'Valued Customer',
  email = 'user@example.com',
  resetUrl = 'http://localhost:3000/auth/reset-password?token=sample-token',
  expiresInMinutes = 30,
}: PasswordResetEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Reset your Brightloop password</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
          </Section>

          <Section style={contentSection}>
            <Heading as="h2" style={greeting}>
              Password Reset Request
            </Heading>

            <Text style={paragraph}>
              Hello <strong>{name}</strong>,
            </Text>

            <Text style={paragraph}>
              We received a request to reset the password for your Brightloop account associated with{' '}
              <span style={codeText}>{email}</span>.
            </Text>

            <Section style={alertBox}>
              <Text style={alertText}>
                ⚠️ This password reset link is strictly valid for <strong>{expiresInMinutes} minutes</strong> from the time it was requested.
              </Text>
            </Section>

            <Section style={buttonContainer}>
              <Button style={primaryButton} href={resetUrl}>
                Reset Your Password →
              </Button>
            </Section>

            <Text style={fallbackText}>
              If the button above does not work, copy and paste this link into your web browser:
            </Text>
            <Text style={urlText}>
              <Link href={resetUrl} style={linkStyle}>
                {resetUrl}
              </Link>
            </Text>

            <Hr style={subDivider} />

            <Text style={securityNote}>
              <strong>Didn't request this change?</strong> You can safely ignore this email. Your password will remain unchanged and your account is secure.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              Automated security notification from Brightloop Software Identity Services.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export default PasswordResetEmail;

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

const codeText = {
  fontFamily: 'monospace',
  backgroundColor: '#f1f5f9',
  padding: '2px 6px',
  borderRadius: '4px',
  color: '#0f172a',
};

const alertBox = {
  backgroundColor: '#fffbeb',
  border: '1px solid #fde68a',
  borderRadius: '8px',
  padding: '14px 18px',
  margin: '20px 0',
};

const alertText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
  lineHeight: '1.5',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '28px 0',
};

const primaryButton = {
  backgroundColor: '#dc2626',
  color: '#ffffff',
  padding: '14px 28px',
  borderRadius: '8px',
  fontSize: '15px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(220, 38, 38, 0.25)',
};

const fallbackText = {
  color: '#64748b',
  fontSize: '13px',
  marginBottom: '6px',
};

const urlText = {
  fontSize: '12px',
  wordBreak: 'break-all' as const,
  marginBottom: '20px',
};

const linkStyle = {
  color: '#2563eb',
  textDecoration: 'underline',
};

const subDivider = {
  borderColor: '#f1f5f9',
  margin: '24px 0 16px',
};

const securityNote = {
  color: '#64748b',
  fontSize: '13px',
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
