import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY || '';

export const resend = apiKey ? new Resend(apiKey) : null;

export const EMAIL_FROM =
  process.env.EMAIL_FROM || 'Brightloop Software <onboarding@resend.dev>';

export const APP_URL =
  process.env.APP_URL || 'http://localhost:3000';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * Core email delivery dispatcher using Resend.
 * Gracefully logs in development mode if RESEND_API_KEY is not configured,
 * ensuring no unhandled crashes occur during development or testing.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const from = options.from || EMAIL_FROM;
  const to = Array.isArray(options.to) ? options.to : [options.to];

  if (!resend) {
    console.log('\n======================================================');
    console.log('📧 [DEV EMAIL DISPATCHER] RESEND_API_KEY not configured');
    console.log(`From:    ${from}`);
    console.log(`To:      ${to.join(', ')}`);
    console.log(`Subject: ${options.subject}`);
    console.log('------------------------------------------------------');
    console.log(`HTML Body Preview (First 300 chars):`);
    console.log(options.html.slice(0, 300).replace(/<[^>]*>/g, ' ').trim() + '...');
    console.log('======================================================\n');

    return {
      success: true,
      id: `dev-mock-${Date.now()}`,
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject: options.subject,
      html: options.html,
      replyTo: options.replyTo,
    });

    if (error) {
      console.error('[Resend Error]:', error);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err: any) {
    console.error('[Resend Exception]:', err);
    return {
      success: false,
      error: err.message || 'Unknown email delivery failure',
    };
  }
}
