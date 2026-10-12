// server/src/onboarding/signupInvoice.js
/**
 * Payment invoice for a plan bought on the Pricing page (VendorSignupPayment).
 *
 * Rules
 *  - Only for payments Razorpay shows as CAPTURED (checked on the server right before sending).
 *    Failed / cancelled payments never reach the database, so they never get an invoice.
 *  - Sent to the exact email typed in the payment form.
 *  - One email per payment: the row is "claimed" (PENDING/FAILED → SENDING) in a single update,
 *    so the browser verify, the Razorpay webhook and the retry job can't send it twice.
 *  - Failures are logged + saved (invoiceLastError) and retried with back-off by the background job.
 */
import PDFDocument from 'pdfkit';
import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { razorpay } from '../config/razorpay.js';
import { MailError, sendMail } from '../utils/mailer.js';

const MAX_ATTEMPTS = 6;
const BACKOFF_MIN = [1, 5, 15, 60, 180, 720]; // minutes before try 2, 3, 4…
const STALE_SENDING_MS = 10 * 60 * 1000;     // a "SENDING" row older than this is assumed crashed → retried

const company = () => ({
  name: env.COMPANY_NAME,
  address: env.COMPANY_ADDRESS,
  gstin: env.COMPANY_GSTIN,
  email: env.COMPANY_EMAIL || env.MS_SMTP_USER,
  website: env.COMPANY_WEBSITE,
});

const rs = (n) => `Rs. ${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const inr = (n) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateIN = (d) => new Date(d).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeIN = (d) => new Date(d).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ─────────────── Invoice number ───────────────

/** Indian financial year label for a date, e.g. 2026-27 */
function financialYear(d = new Date()) {
  const ist = new Date(d.getTime() + 5.5 * 3600 * 1000);
  const y = ist.getUTCFullYear();
  const start = ist.getUTCMonth() >= 3 ? y : y - 1;
  return `${start}-${String(start + 1).slice(-2)}`;
}

/** Next invoice number from a Postgres sequence (unique even with payments arriving at the same moment) */
let sequenceChecked = false;

/**
 * Makes sure the invoice-number sequence exists (it's created by the migration, but `prisma db push`
 * skips it) and that it continues AFTER the highest number already printed on an invoice — so a
 * number is never reused, even if the sequence had to be created late. Runs once per server start.
 */
async function ensureInvoiceSequence(db) {
  if (sequenceChecked) return;
  await db.$executeRawUnsafe('CREATE SEQUENCE IF NOT EXISTS "platform_invoice_seq" START 1');
  const [{ used }] = await db.$queryRaw`
    SELECT COALESCE(MAX(NULLIF(substring("invoiceNumber" from '([0-9]+)$'), '')::int), 0) AS used
    FROM "VendorSignupPayment" WHERE "invoiceNumber" IS NOT NULL`;
  const [{ last, called }] = await db.$queryRaw`SELECT last_value::int AS last, is_called AS called FROM "platform_invoice_seq"`;
  const nextFromSeq = called ? last + 1 : last;
  if (Number(used) >= nextFromSeq) await db.$queryRaw`SELECT setval('platform_invoice_seq', ${Number(used)}::bigint, true)`;
  sequenceChecked = true;
}

/** Next invoice number from a Postgres sequence (unique even with payments arriving at the same moment) */
export async function nextInvoiceNumber(db = prisma) {
  await ensureInvoiceSequence(db);
  const [{ n }] = await db.$queryRaw`SELECT nextval('platform_invoice_seq')::int AS n`;
  return `MDS/${financialYear()}/${String(n).padStart(6, '0')}`;
}

// ─────────────── Amounts (plan prices are GST-inclusive) ───────────────

function amounts(signup) {
  const total = signup.amount / 100;
  const c = company();
  if (!c.gstin || !env.PLAN_GST_RATE) return { total, taxable: total, taxes: [], gstApplied: false };
  const rate = env.PLAN_GST_RATE;
  const taxable = Math.round((total / (1 + rate / 100)) * 100) / 100;
  const tax = Math.round((total - taxable) * 100) / 100;
  // Inter-state only when the buyer's GSTIN shows a different state than ours
  const interState = signup.gstin && signup.gstin.slice(0, 2) !== c.gstin.slice(0, 2);
  const taxes = interState
    ? [{ label: `IGST @ ${rate}%`, amount: tax }]
    : [{ label: `CGST @ ${rate / 2}%`, amount: Math.round((tax / 2) * 100) / 100 },
      { label: `SGST @ ${rate / 2}%`, amount: Math.round((tax - Math.round((tax / 2) * 100) / 100) * 100) / 100 }];
  return { total, taxable, taxes, gstApplied: true };
}

// ─────────────── PDF ───────────────

export function buildSignupInvoicePdf(signup, payment) {
  return new Promise((resolve, reject) => {
    const c = company();
    const a = amounts(signup);
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `Invoice ${signup.invoiceNumber}`, Author: c.name } });
    const chunks = [];
    doc.on('data', (x) => chunks.push(x));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const L = 48, R = 547, W = R - L;
    const navy = '#0B1F4B', amber = '#F5B301', grey = '#64748B', line = '#E2E8F0';

    // Header band
    doc.rect(0, 0, 595, 110).fill(navy);
    doc.rect(0, 110, 595, 4).fill(amber);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text(c.name, L, 34);
    doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1')
      .text([c.address, c.email, c.website].filter(Boolean).join('  ·  '), L, 62, { width: 330 })
      .text(c.gstin ? `GSTIN: ${c.gstin}` : '', L, 88);
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(16).text(a.gstApplied ? 'TAX INVOICE' : 'INVOICE', 330, 34, { width: R - 330, align: 'right' });
    doc.font('Helvetica').fontSize(9).fillColor('#CBD5E1')
      .text(`Invoice no: ${signup.invoiceNumber}`, 330, 58, { width: R - 330, align: 'right' })
      .text(`Invoice date: ${dateIN(signup.paidAt)}`, 330, 72, { width: R - 330, align: 'right' });

    // PAID stamp
    doc.roundedRect(R - 70, 88, 70, 18, 4).fill('#16A34A');
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9).text('PAID', R - 70, 93, { width: 70, align: 'center' });

    // Billed to / payment summary
    let y = 140;
    doc.fillColor(grey).font('Helvetica-Bold').fontSize(8).text('BILLED TO', L, y);
    doc.text('PAYMENT', 330, y);
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(11).text(signup.shopName, L, y + 14, { width: 260 });
    doc.font('Helvetica').fontSize(9).fillColor('#334155')
      .text(signup.ownerName, L, doc.y + 2, { width: 260 })
      .text(signup.email, { width: 260 })
      .text(`+91 ${signup.phone}`, { width: 260 })
      .text(signup.address, { width: 260 });
    if (signup.gstin) doc.text(`GSTIN: ${signup.gstin}`, { width: 260 });
    const leftEnd = doc.y;

    const pay = [
      ['Status', 'Paid (captured)'],
      ['Amount', `${rs(a.total)} (INR)`],
      ['Paid on', dateTimeIN(signup.paidAt)],
      ['Method', payment?.method ? `Razorpay · ${String(payment.method).toUpperCase()}` : 'Razorpay'],
      ['Payment ID', signup.razorpayPaymentId],
      ['Order ID', signup.razorpayOrderId],
    ];
    let py = y + 14;
    for (const [k, v] of pay) {
      doc.fillColor(grey).font('Helvetica').fontSize(9).text(k, 330, py, { width: 70 });
      doc.fillColor('#0F172A').font(k === 'Status' ? 'Helvetica-Bold' : 'Helvetica').text(v, 400, py, { width: R - 400 });
      py = doc.y + 3;
    }
    y = Math.max(leftEnd, py) + 24;

    // Items table
    doc.rect(L, y, W, 22).fill('#F1F5F9');
    doc.fillColor(grey).font('Helvetica-Bold').fontSize(8)
      .text('DESCRIPTION', L + 10, y + 7)
      .text('PERIOD', 300, y + 7)
      .text('QTY', 400, y + 7, { width: 30, align: 'right' })
      .text('AMOUNT', 440, y + 7, { width: R - 450, align: 'right' });
    y += 30;
    doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(10).text(`${signup.plan.name} plan`, L + 10, y, { width: 240 });
    doc.font('Helvetica').fontSize(8.5).fillColor(grey)
      .text(`MotorDesk shop subscription · up to ${signup.plan.maxSkus.toLocaleString('en-IN')} SKUs`, L + 10, doc.y + 2, { width: 240 })
      .text('SAC 998314 (IT services)', L + 10, doc.y + 1, { width: 240 });
    const rowEnd = doc.y;
    doc.fillColor('#0F172A').fontSize(9.5)
      .text(`${signup.plan.durationDays} days from shop activation`, 300, y, { width: 95 })
      .text('1', 400, y, { width: 30, align: 'right' })
      .text(rs(a.taxable), 440, y, { width: R - 450, align: 'right' });
    y = Math.max(rowEnd, doc.y) + 12;
    doc.moveTo(L, y).lineTo(R, y).strokeColor(line).lineWidth(1).stroke();

    // Totals
    y += 12;
    const totalRow = (label, value, bold = false) => {
      doc.fillColor(bold ? '#0F172A' : '#334155').font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9.5)
        .text(label, 330, y, { width: 110 })
        .text(value, 440, y, { width: R - 450, align: 'right' });
      y += bold ? 20 : 16;
    };
    totalRow(a.gstApplied ? 'Taxable value' : 'Subtotal', rs(a.taxable));
    for (const t of a.taxes) totalRow(t.label, rs(t.amount));
    if (!a.gstApplied) totalRow('Tax', 'Not applicable');
    doc.moveTo(330, y).lineTo(R, y).strokeColor(line).stroke(); y += 8;
    totalRow('Total paid (INR)', rs(a.total), true);

    // Notes
    y += 18;
    doc.roundedRect(L, y, W, 58, 6).fill('#FFF8E1');
    doc.fillColor('#7A5A00').font('Helvetica-Bold').fontSize(9).text('Next step', L + 12, y + 10);
    doc.font('Helvetica').fontSize(8.5)
      .text('Finish creating your shop account on MotorDesk with this email. Your plan starts when your shop account is created. Keep this invoice for your records.', L + 12, y + 24, { width: W - 24 });

    // Footer — pinned to the bottom of THIS page (drop the bottom margin first, otherwise
    // PDFKit thinks the text doesn't fit and starts a second, almost empty page)
    doc.page.margins.bottom = 0;
    doc.fillColor(grey).font('Helvetica').fontSize(8)
      .text(`This is a computer-generated invoice and needs no signature.  Questions? ${c.email}`, L, 800, { width: W, align: 'center', lineBreak: false });
    doc.end();
  });
}

// ─────────────── Email ───────────────

function emailHtml(signup, registerUrl) {
  const c = company();
  const a = amounts(signup);
  const row = (k, v) => `<tr><td style="padding:6px 0;color:#64748b;width:140px">${esc(k)}</td><td style="padding:6px 0;color:#0f172a;font-weight:600">${esc(v)}</td></tr>`;
  return `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Segoe UI,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 12px"><tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
    <tr><td style="background:#0b1f4b;padding:22px 28px;border-bottom:4px solid #f5b301">
      <div style="color:#ffffff;font-size:22px;font-weight:700">${esc(c.name)}</div>
      <div style="color:#cbd5e1;font-size:12px;margin-top:2px">Spare parts shop software &amp; marketplace</div>
    </td></tr>
    <tr><td style="padding:28px">
      <p style="margin:0 0 6px;font-size:13px;color:#16a34a;font-weight:700">✔ PAYMENT SUCCESSFUL</p>
      <h1 style="margin:0 0 12px;font-size:20px;color:#0f172a">Thank you, ${esc(signup.ownerName)}!</h1>
      <p style="margin:0 0 18px;font-size:14px;color:#334155;line-height:1.55">
        We've received your payment of <b>${esc(inr(a.total))}</b> for the <b>${esc(signup.plan.name)}</b> plan for
        <b>${esc(signup.shopName)}</b>. Your invoice <b>${esc(signup.invoiceNumber)}</b> is attached as a PDF.
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;margin-bottom:20px">
        ${row('Plan', signup.plan.name)}
        ${row('Validity', `${signup.plan.durationDays} days from shop activation`)}
        ${row('Includes', `Up to ${signup.plan.maxSkus.toLocaleString('en-IN')} SKUs, POS billing, online orders`)}
        ${row('Amount paid', `${inr(a.total)} (INR)${a.gstApplied ? ' incl. GST' : ''}`)}
       
      </table>
      ${signup.usedAt ? '' : `<p style="margin:0 0 14px;font-size:14px;color:#334155">Next, finish creating your shop account — your details are already filled in:</p>
      <p style="margin:0 0 22px"><a href="${esc(registerUrl)}" style="display:inline-block;background:#2563eb;color:#ffffff;text-decoration:none;font-weight:600;padding:11px 20px;border-radius:8px">Create my shop account</a></p>`}
      <p style="margin:0;font-size:12px;color:#64748b">Questions about this payment? Just reply to this email or write to ${esc(c.email)}.</p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:14px 28px;font-size:11px;color:#94a3b8">${esc(c.name)}${c.address ? ` · ${esc(c.address)}` : ''}${c.gstin ? ` · GSTIN ${esc(c.gstin)}` : ''}</td></tr>
  </table></td></tr></table></body></html>`;
}

// ─────────────── Sending (claim → verify payment → PDF → email) ───────────────

const nextTry = (attempts) => new Date(Date.now() + BACKOFF_MIN[Math.min(attempts, BACKOFF_MIN.length - 1)] * 60_000);

/** Is the payment really captured at Razorpay, for this order and amount? */
async function capturedPayment(signup) {
  const p = await razorpay.payments.fetch(signup.razorpayPaymentId);
  if (p.order_id !== signup.razorpayOrderId || Number(p.amount) !== signup.amount) {
    return { ok: false, final: true, reason: `Payment does not match this order (order ${p.order_id}, amount ${p.amount})` };
  }
  if (p.status === 'captured') return { ok: true, payment: p };
  if (p.status === 'authorized') return { ok: false, final: false, reason: 'Payment authorised but not captured yet' };
  return { ok: false, final: true, reason: `Payment status is "${p.status}" — no invoice for unsuccessful payments` };
}

/**
 * Sends the invoice email for one paid sign-up. Safe to call many times / from many places:
 * only one caller wins the claim, and a SENT invoice is never sent again.
 */
export async function sendSignupInvoice(signupId) {
  const now = new Date();
  const claim = await prisma.vendorSignupPayment.updateMany({
    where: {
      id: signupId,
      invoiceAttempts: { lt: MAX_ATTEMPTS },
      OR: [
        // due now (respects the back-off, so repeated triggers can't hammer Microsoft / Razorpay)
        { invoiceStatus: { in: ['PENDING', 'FAILED'] }, invoiceNextTryAt: { lte: now } },
        // a send that crashed half-way (server restart) — picked up again after a while
        { invoiceStatus: 'SENDING', invoiceNextTryAt: { lt: new Date(now.getTime() - STALE_SENDING_MS) } },
      ],
    },
    data: { invoiceStatus: 'SENDING', invoiceNextTryAt: now },
  });
  if (claim.count !== 1) return { sent: false, reason: 'already sent, in progress, or out of attempts' };

  let signup = await prisma.vendorSignupPayment.findUnique({ where: { id: signupId }, include: { plan: true } });
  const fail = async (err, { final = false, countAttempt = true } = {}) => {
    const attempts = signup.invoiceAttempts + (countAttempt ? 1 : 0);
    const giveUp = final || attempts >= MAX_ATTEMPTS;
    const wait = countAttempt ? attempts - 1 : attempts; // back-off step
    await prisma.vendorSignupPayment.update({
      where: { id: signupId },
      data: {
        invoiceStatus: countAttempt ? 'FAILED' : 'PENDING',
        invoiceAttempts: attempts,
        invoiceLastError: String(err.message ?? err).slice(0, 500),
        invoiceNextTryAt: giveUp ? null : nextTry(wait),
      },
    });
    console.error(`✉️  Invoice ${signup.invoiceNumber ?? '(not numbered yet)'} → ${signup.email} not sent (try ${attempts}/${MAX_ATTEMPTS}${giveUp ? ', giving up' : ''}): ${err.message ?? err}`);
    return { sent: false, reason: err.message ?? String(err) };
  };

  try {
    // 1. Never email an invoice unless Razorpay says the money is captured
    const check = await capturedPayment(signup);
    if (!check.ok) return await fail(new Error(check.reason), { final: check.final, countAttempt: check.final });

    // Invoice number only now — numbers are never used up by payments that don't get an invoice
    if (!signup.invoiceNumber) {
      signup = await prisma.vendorSignupPayment.update({ where: { id: signupId }, data: { invoiceNumber: await nextInvoiceNumber() }, include: { plan: true } });
    }

    // 2. PDF + email to the exact address from the payment form
    const pdf = await buildSignupInvoicePdf(signup, check.payment);
    const registerUrl = `${env.CLIENT_URL.split(',')[0].trim().replace(/\/+$/, '')}/register?signup=${signup.id}`;
    await sendMail({
      to: signup.email,
      subject: `Payment received — ${signup.plan.name} plan · Invoice ${signup.invoiceNumber}`,
      html: emailHtml(signup, registerUrl),
      attachments: [{ filename: `MotorDesk-Invoice-${signup.invoiceNumber.replace(/\//g, '-')}.pdf`, contentType: 'application/pdf', content: pdf }],
    });

    await prisma.vendorSignupPayment.update({
      where: { id: signupId },
      data: { invoiceStatus: 'SENT', invoiceSentAt: new Date(), invoiceAttempts: signup.invoiceAttempts + 1, invoiceLastError: null, invoiceNextTryAt: null },
    });
    console.log(`✉️  Invoice ${signup.invoiceNumber} sent to ${signup.email}`);
    return { sent: true };
  } catch (err) {
    // Network / Microsoft / config errors → counted and retried later with back-off (config fixes in .env / Azure get picked up)
    if (err instanceof MailError && !err.retryable) err.message += ' (check the MS_* settings and the Azure app permission)';
    return fail(err);
  }
}

/** Fire-and-forget after a payment is saved — never blocks or breaks the payment response */
export function queueSignupInvoice(signupId) {
  setImmediate(() => { sendSignupInvoice(signupId).catch((e) => console.error('Invoice email job crashed:', e)); });
}

/** Background job (every few minutes): retry due invoices, including ones stuck in SENDING */
export async function retryDueSignupInvoices() {
  const due = await prisma.vendorSignupPayment.findMany({
    where: {
      invoiceAttempts: { lt: MAX_ATTEMPTS },
      invoiceNextTryAt: { lte: new Date() },
      invoiceStatus: { in: ['PENDING', 'FAILED', 'SENDING'] },
    },
    select: { id: true },
    take: 20,
  });
  let sent = 0;
  for (const { id } of due) if ((await sendSignupInvoice(id)).sent) sent += 1;
  return { due: due.length, sent };
}