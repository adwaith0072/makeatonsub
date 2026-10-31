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

export interface StaffNotificationItem {
  label: string;
  value: string;
}

export interface StaffNotificationEmailProps {
  title: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'yellow' | 'red';
  message: string;
  details?: StaffNotificationItem[];
  actionUrl?: string;
  actionLabel?: string;
}

export function StaffNotificationEmail({
  title = 'Operational Alert',
  badge = 'STAFF NOTICE',
  badgeColor = 'blue',
  message = 'An operational event occurred in Brightloop Subscription Management.',
  details = [
    { label: 'Event Type', value: 'Customer Account Created' },
    { label: 'Customer', value: 'Nexus Technologies' },
    { label: 'Timestamp', value: 'Oct 31, 2026, 11:30 AM' },
  ],
  actionUrl = 'http://localhost:3000',
  actionLabel = 'View in Admin Console →',
}: StaffNotificationEmailProps) {
  const badgeStyle = getBadgeStyle(badgeColor);

  return (
    <Html>
      <Head />
      <Preview>[Brightloop Staff] {title}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header Banner */}
          <Section style={header}>
            <div style={brandBadge}>B</div>
            <Heading style={headerTitle}>Brightloop Software</Heading>
            <Text style={headerSubtitle}>Internal Operations Notification</Text>
          </Section>

          <Section style={contentSection}>
            <div style={badgeStyle}>{badge}</div>

            <Heading as="h2" style={notificationHeading}>
              {title}
            </Heading>

            <Text style={messageText}>{message}</Text>

            {details && details.length > 0 && (
              <Section style={detailsCard}>
                {details.map((item, idx) => (
                  <Row key={idx} style={detailRow}>
                    <Column style={{ width: '40%' }}>
                      <Text style={detailLabel}>{item.label}:</Text>
                    </Column>
                    <Column style={{ width: '60%', textAlign: 'right' }}>
                      <Text style={detailValue}>{item.value}</Text>
                    </Column>
                  </Row>
                ))}
              </Section>
            )}

            {actionUrl && (
              <Section style={buttonContainer}>
                <Button style={primaryButton} href={actionUrl}>
                  {actionLabel}
                </Button>
              </Section>
            )}

            <Text style={disclaimerText}>
              This is an internal operational notification intended solely for authorized Brightloop staff members and administrators.
            </Text>
          </Section>

          <Hr style={divider} />

          <Section style={footer}>
            <Text style={footerText}>
              © {new Date().getFullYear()} Brightloop Software Inc. All rights reserved.
            </Text>
            <Text style={footerSubtext}>
              Brightloop Staff Alert Dispatcher.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

function getBadgeStyle(color: 'blue' | 'green' | 'yellow' | 'red') {
  const base = {
    display: 'inline-block',
    fontSize: '11px',
    fontWeight: '700' as const,
    padding: '3px 10px',
    borderRadius: '9999px',
    marginBottom: '12px',
    letterSpacing: '0.05em',
  };

  switch (color) {
    case 'green':
      return { ...base, backgroundColor: '#dcfce7', color: '#15803d' };
    case 'yellow':
      return { ...base, backgroundColor: '#fef3c7', color: '#b45309' };
    case 'red':
      return { ...base, backgroundColor: '#fee2e2', color: '#b91c1c' };
    case 'blue':
    default:
      return { ...base, backgroundColor: '#dbeafe', color: '#1d4ed8' };
  }
}

export default StaffNotificationEmail;

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

const headerSubtitle = {
  color: '#94a3b8',
  fontSize: '12px',
  margin: '2px 0 0',
};

const contentSection = {
  padding: '32px 36px 24px',
};

const notificationHeading = {
  color: '#0f172a',
  fontSize: '20px',
  fontWeight: '700' as const,
  margin: '0 0 12px',
};

const messageText = {
  color: '#334155',
  fontSize: '14px',
  lineHeight: '1.6',
  margin: '0 0 20px',
};

const detailsCard = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  padding: '14px 18px',
  marginBottom: '24px',
};

const detailRow = {
  padding: '6px 0',
  borderBottom: '1px solid #f1f5f9',
};

const detailLabel = {
  color: '#64748b',
  fontSize: '13px',
  margin: '0',
};

const detailValue = {
  color: '#0f172a',
  fontSize: '13px',
  fontWeight: '600' as const,
  margin: '0',
};

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '24px 0 20px',
};

const primaryButton = {
  backgroundColor: '#2563eb',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: '600' as const,
  textDecoration: 'none',
  display: 'inline-block',
  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
};

const disclaimerText = {
  color: '#94a3b8',
  fontSize: '12px',
  lineHeight: '1.4',
  margin: '0',
  textAlign: 'center' as const,
};

const divider = {
  borderColor: '#e2e8f0',
  margin: '0',
};

const footer = {
  backgroundColor: '#f8fafc',
  padding: '20px 36px',
  textAlign: 'center' as const,
};

const footerText = {
  color: '#64748b',
  fontSize: '12px',
  margin: '0 0 4px',
};

const footerSubtext = {
  color: '#94a3b8',
  fontSize: '11px',
  margin: '0',
};
