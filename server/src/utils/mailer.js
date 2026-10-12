// server/src/utils/mailer.js
/**
 * Sends email from the Microsoft 365 mailbox MS_SMTP_USER (support@themotordesk.com) using
 * Microsoft Graph with the app's client credentials (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET).
 *
 * Azure setup (one time): App registration → API permissions → Microsoft Graph → Application
 * permission "Mail.Send" → Grant admin consent. (Optionally limit the app to the support mailbox
 * with an Exchange "Application Access Policy".)
 */
import { env, isMailConfigured } from '../config/env.js';

const TIMEOUT_MS = 20_000;
let token = { value: null, expiresAt: 0 };

export class MailError extends Error {
  constructor(message, { status, retryable = true } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable; // false = config/permission problem, retrying won't help until fixed
  }
}

async function accessToken() {
  if (token.value && Date.now() < token.expiresAt - 60_000) return token.value;
  const res = await fetch(`${env.MS_LOGIN_URL}/${encodeURIComponent(env.MS_TENANT_ID)}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.MS_CLIENT_ID,
      client_secret: env.MS_CLIENT_SECRET,
      scope: `${env.MS_GRAPH_URL}/.default`,
      grant_type: 'client_credentials',
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new MailError(`Microsoft sign-in failed: ${body.error_description?.split('\r\n')[0] || body.error || res.status}`, {
      status: res.status, retryable: res.status >= 500,
    });
  }
  token = { value: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 };
  return token.value;
}

/**
 * @param {{ to: string, subject: string, html: string, attachments?: { filename: string, contentType: string, content: Buffer }[] }} mail
 */
export async function sendMail({ to, subject, html, attachments = [] }) {
  if (!isMailConfigured) throw new MailError('Email is not configured (MS_TENANT_ID / MS_CLIENT_ID / MS_CLIENT_SECRET / MS_SMTP_USER)', { retryable: false });

  const send = async () => fetch(`${env.MS_GRAPH_URL}/v1.0/users/${encodeURIComponent(env.MS_SMTP_USER)}/sendMail`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        subject,
        body: { contentType: 'HTML', content: html },
        toRecipients: [{ emailAddress: { address: to } }],
        attachments: attachments.map((a) => ({
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: a.filename,
          contentType: a.contentType,
          contentBytes: a.content.toString('base64'),
        })),
      },
      saveToSentItems: true,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  let res = await send();
  if (res.status === 401) { token = { value: null, expiresAt: 0 }; res = await send(); } // token revoked → once more
  if (res.status !== 202) {
    const body = await res.json().catch(() => ({}));
    const msg = body.error?.message || `HTTP ${res.status}`;
    const hint = res.status === 403 ? ' — give the Azure app the Microsoft Graph "Mail.Send" application permission (admin consent)' : '';
    throw new MailError(`Email not sent: ${msg}${hint}`, { status: res.status, retryable: res.status === 429 || res.status >= 500 });
  }
  return { sent: true };
}