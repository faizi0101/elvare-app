const crypto = require('node:crypto');
const express = require('express');
const nodemailer = require('nodemailer');
const { initializeApp } = require('firebase-admin/app');
const { FieldValue, Timestamp, getFirestore } = require('firebase-admin/firestore');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const {
  escapeHtml,
  normalizeEmail,
  validateContact,
  validateOrder
} = require('./validation');

initializeApp();

const db = getFirestore();
const gmailAppPassword = defineSecret('GMAIL_APP_PASSWORD');
const ownerEmail = 'it.me.faizan.khan08@gmail.com';
const siteUrl = 'https://elvare-app.web.app';
const tokenLifetimeMs = 24 * 60 * 60 * 1000;
const retentionAfterApprovalMs = 7 * 24 * 60 * 60 * 1000;
const rateWindowMs = 15 * 60 * 1000;
const rateLimit = 5;

function digest(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function newToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function verificationUrl(kind, token) {
  const fragment = new URLSearchParams({ kind, token });
  return `${siteUrl}/verify.html#${fragment}`;
}

function mailTransport() {
  const password = gmailAppPassword.value().replace(/\s/g, '');
  if (!password) throw new Error('Email sender is not configured.');
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: ownerEmail, pass: password }
  });
}

function pageEmail(title, content, actionText, actionUrl) {
  const safeUrl = escapeHtml(actionUrl);
  return `<!doctype html><html><body style="margin:0;background:#f8f6f1;color:#171717;font-family:Arial,sans-serif">
    <main style="max-width:560px;margin:32px auto;padding:32px;background:#fff">
      <p style="letter-spacing:5px;color:#9f8463">ÉLVARÉ</p>
      <h1 style="font-weight:400">${escapeHtml(title)}</h1>
      ${content}
      <p style="margin:28px 0"><a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#171717;color:#fff;text-decoration:none">${escapeHtml(actionText)}</a></p>
      <p style="color:#81796f;font-size:13px">If you did not make this request, you can ignore this email. This link expires in 24 hours.</p>
    </main></body></html>`;
}

async function sendMail(options) {
  await mailTransport().sendMail({ from: `ÉLVARÉ <${ownerEmail}>`, ...options });
}

async function checkRateLimit(req, email, purpose) {
  const forwardedIp = req.ip || req.socket.remoteAddress || 'unknown';
  const keys = [
    `${purpose}:email:${digest(email)}`,
    `${purpose}:ip:${digest(forwardedIp)}`
  ];
  const now = Date.now();
  for (const key of keys) {
    const ref = db.collection('_requestLimits').doc(digest(key));
    const allowed = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      const data = snapshot.data();
      const start = data?.windowStart?.toMillis?.() || now;
      const count = now - start > rateWindowMs ? 0 : data.count;
      if (count >= rateLimit) return false;
      transaction.set(ref, {
        windowStart: Timestamp.fromMillis(count ? start : now),
        count: count + 1,
        expiresAt: Timestamp.fromMillis(now + rateWindowMs * 2)
      });
      return true;
    });
    if (!allowed) return false;
  }
  return true;
}

function orderLinesHtml(items) {
  return items.map(item =>
    `<tr><td style="padding:8px 0">${escapeHtml(item.name)} × ${item.quantity}</td>` +
    `<td style="padding:8px 0;text-align:right">PKR ${(item.price * item.quantity).toLocaleString('en-US')}</td></tr>`
  ).join('');
}

function orderReference(id) {
  return `ELV-${id.slice(0, 8).toUpperCase()}`;
}

async function createOrder(req, res) {
  if (!normalizeEmail(req.body?.email)) {
    return res.status(400).json({ error: 'Incorrect email address. Please enter a valid email address.' });
  }
  const order = validateOrder(req.body);
  if (!order) return res.status(400).json({ error: 'Please check the order details and try again.' });

  const ref = db.collection('orders').doc(order.requestId);
  const token = newToken();
  const tokenHash = digest(token);
  const expiresAt = Timestamp.fromMillis(Date.now() + tokenLifetimeMs);
  const storedOrder = { ...order };
  delete storedOrder.requestId;

  try {
    if (!await checkRateLimit(req, order.email, 'order')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    }
    const created = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        const existing = snapshot.data();
        if (existing.email !== order.email) return { conflict: true };
        return { existing };
      }
      transaction.create(ref, {
        ...storedOrder,
        status: 'pending',
        confirmationTokenHash: tokenHash,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt
      });
      return { created: true };
    });
    if (created.conflict) return res.status(409).json({ error: 'This order request could not be reused.' });
    if (created.existing) {
      return res.status(200).json({
        success: true,
        status: created.existing.status,
        reference: orderReference(ref.id),
        items: created.existing.items,
        total: created.existing.total
      });
    }

    const url = verificationUrl('order', token);
    const content = `<p>Your demo order <strong>${orderReference(ref.id)}</strong> is pending. Review the items below, then confirm it using the button. The order will not be confirmed unless you approve it.</p>
      <table style="width:100%;border-collapse:collapse">${orderLinesHtml(order.items)}
      <tr><td style="padding:12px 0;border-top:1px solid #ddd"><strong>Total</strong></td><td style="padding:12px 0;border-top:1px solid #ddd;text-align:right"><strong>PKR ${order.total.toLocaleString('en-US')}</strong></td></tr></table>
      <p>Payment method: ${escapeHtml(order.payment === 'cod' ? 'Cash on delivery (demo)' : 'Easypaisa (demo)')}</p>`;
    await sendMail({
      to: order.email,
      replyTo: ownerEmail,
      subject: `Pending ÉLVARÉ demo order ${orderReference(ref.id)} — confirm to approve`,
      html: pageEmail('Your order is pending', content, 'Review and confirm order', url),
      text: `Your ÉLVARÉ demo order ${orderReference(ref.id)} is pending. Confirm it here: ${url}`
    });
    return res.status(201).json({
      success: true,
      status: 'pending',
      reference: orderReference(ref.id),
      items: order.items,
      total: order.total
    });
  } catch (error) {
    await ref.update({ notificationErrorAt: FieldValue.serverTimestamp() }).catch(() => {});
    logger.error('Failed to create a pending order or send its approval email.', error);
    return res.status(503).json({ error: 'We could not send the approval email. Check the email address and try again.' });
  }
}

async function createContactRequest(req, res) {
  if (!normalizeEmail(req.body?.email)) {
    return res.status(400).json({ error: 'Incorrect email address. Please enter a valid email address.' });
  }
  const contact = validateContact(req.body);
  if (!contact) return res.status(400).json({ error: 'Please check the contact form and email address.' });

  const ref = db.collection('contactRequests').doc(contact.requestId);
  const token = newToken();
  const tokenHash = digest(token);
  const expiresAt = Timestamp.fromMillis(Date.now() + tokenLifetimeMs);
  const storedContact = { ...contact };
  delete storedContact.requestId;

  try {
    if (!await checkRateLimit(req, contact.email, 'contact')) {
      return res.status(429).json({ error: 'Too many requests. Please wait a few minutes and try again.' });
    }
    const created = await db.runTransaction(async transaction => {
      const snapshot = await transaction.get(ref);
      if (snapshot.exists) {
        const existing = snapshot.data();
        if (existing.email !== contact.email) return { conflict: true };
        return { existing };
      }
      transaction.create(ref, {
        ...storedContact,
        status: 'pending',
        verificationTokenHash: tokenHash,
        createdAt: FieldValue.serverTimestamp(),
        expiresAt
      });
      return { created: true };
    });
    if (created.conflict) return res.status(409).json({ error: 'This request could not be reused.' });
    if (created.existing) {
      return res.status(200).json({ success: true, status: created.existing.status });
    }

    const url = verificationUrl('contact', token);
    const content = '<p>Click below to verify that you own this email address. Your message will only be delivered to ÉLVARÉ after you confirm.</p>';
    await sendMail({
      to: contact.email,
      replyTo: ownerEmail,
      subject: 'Verify your email to send your ÉLVARÉ message',
      html: pageEmail('Confirm your email address', content, 'Verify email and send message', url),
      text: `Verify your email address before your message is sent: ${url}`
    });
    return res.status(202).json({ success: true, status: 'pending_verification' });
  } catch (error) {
    await ref.update({ notificationErrorAt: FieldValue.serverTimestamp() }).catch(() => {});
    logger.error('Failed to create a contact verification request.', error);
    return res.status(503).json({ error: 'We could not send a verification email. Check the address and try again.' });
  }
}

async function verifyOrder(token, res) {
  const hash = digest(token);
  const matches = await db.collection('orders')
    .where('confirmationTokenHash', '==', hash).limit(1).get();
  if (matches.empty) return res.status(400).json({ error: 'This approval link is invalid or has expired.' });
  const ref = matches.docs[0].ref;
  const result = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const order = snapshot.data();
    if (!order || order.confirmationTokenHash !== hash) return 'invalid';
    if (order.status === 'confirmed') return 'already_confirmed';
    if (order.status !== 'pending') return 'invalid';
    if (order.expiresAt.toMillis() <= Date.now()) {
      transaction.update(ref, { status: 'expired', confirmationTokenHash: null });
      return 'expired';
    }
    transaction.update(ref, {
      status: 'confirmed',
      confirmedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + retentionAfterApprovalMs)
    });
    return 'confirmed';
  });
  if (result === 'invalid' || result === 'expired') {
    return res.status(400).json({ error: 'This approval link is invalid or has expired.' });
  }
  return res.json({
    status: 'confirmed',
    message: result === 'already_confirmed'
      ? 'This demo order has already been confirmed.'
      : 'Your demo order is confirmed. No payment has been taken.'
  });
}

async function verifyContact(token, res) {
  const hash = digest(token);
  const matches = await db.collection('contactRequests')
    .where('verificationTokenHash', '==', hash).limit(1).get();
  if (matches.empty) return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  const ref = matches.docs[0].ref;
  const claim = await db.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const contact = snapshot.data();
    if (!contact || contact.verificationTokenHash !== hash) return 'invalid';
    if (contact.status === 'verified') return 'already_verified';
    if (contact.status === 'verifying') {
      const lockAt = contact.verifyingAt?.toMillis?.() || 0;
      if (Date.now() - lockAt < 2 * 60 * 1000) return 'busy';
    } else if (contact.status !== 'pending') {
      return 'invalid';
    }
    if (contact.expiresAt.toMillis() <= Date.now()) {
      transaction.update(ref, { status: 'expired', verificationTokenHash: null });
      return 'expired';
    }
    transaction.update(ref, { status: 'verifying', verifyingAt: Timestamp.now() });
    return 'claimed';
  });

  if (claim === 'invalid' || claim === 'expired') {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  }
  if (claim === 'busy') {
    return res.status(409).json({ error: 'Your message is being processed. Please wait and check your inbox.' });
  }
  if (claim === 'already_verified') {
    return res.json({ status: 'verified', message: 'This email address is already verified.' });
  }

  const contact = (await ref.get()).data();
  try {
    await sendMail({
      to: ownerEmail,
      replyTo: contact.email,
      subject: `Verified ÉLVARÉ contact message: ${contact.topic}`,
      text: `From: ${contact.name} <${contact.email}>\nTopic: ${contact.topic}\n\n${contact.message}`,
      html: `<h2>Verified contact message</h2><p><strong>From:</strong> ${escapeHtml(contact.name)} &lt;${escapeHtml(contact.email)}&gt;</p><p><strong>Topic:</strong> ${escapeHtml(contact.topic)}</p><p>${escapeHtml(contact.message).replace(/\n/g, '<br>')}</p>`
    });
    await ref.update({
      status: 'verified',
      verifiedAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + retentionAfterApprovalMs),
      verificationTokenHash: null,
      verifyingAt: FieldValue.delete()
    });
    return res.json({
      status: 'verified',
      message: 'Email verified. Your message has been sent to ÉLVARÉ.'
    });
  } catch (error) {
    await ref.update({ status: 'pending', verifyingAt: FieldValue.delete() }).catch(() => {});
    logger.error('Failed to deliver a verified contact message.', error);
    return res.status(503).json({ error: 'We verified your address but could not deliver the message. Please try the link again.' });
  }
}

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '16kb', strict: true }));
app.use((req, _res, next) => {
  if (req.url.startsWith('/api/')) req.url = req.url.slice(4);
  next();
});
app.post('/contact', (req, res) => createContactRequest(req, res));
app.post('/order', (req, res) => createOrder(req, res));
app.post('/verify', async (req, res) => {
  const kind = req.body?.kind;
  const token = req.body?.token;
  if (!['contact', 'order'].includes(kind) || typeof token !== 'string' || !/^[A-Za-z0-9_-]{40,60}$/.test(token)) {
    return res.status(400).json({ error: 'This verification link is invalid or has expired.' });
  }
  try {
    return kind === 'order'
      ? await verifyOrder(token, res)
      : await verifyContact(token, res);
  } catch (error) {
    logger.error('Email verification request failed.', error);
    return res.status(503).json({ error: 'We could not verify this request right now. Please try again.' });
  }
});
app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && 'body' in error) {
    return res.status(400).json({ error: 'The request could not be read.' });
  }
  return res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

exports.api = onRequest({
  region: 'asia-south1',
  maxInstances: 3,
  timeoutSeconds: 60,
  memory: '256MiB',
  cors: [
    'https://elvare-app.web.app',
    'https://elvare-app.firebaseapp.com',
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/
  ],
  secrets: [gmailAppPassword]
}, app);
