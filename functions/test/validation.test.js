const test = require('node:test');
const assert = require('node:assert/strict');
const {
  escapeHtml,
  normalizeEmail,
  validateContact,
  validateOrder
} = require('../validation');

const requestId = 'c0a80123-4567-489a-8abc-0123456789ab';

test('normalizes valid email and rejects malformed addresses', () => {
  assert.equal(normalizeEmail('  Buyer.Name@gmail.com '), 'buyer.name@gmail.com');
  assert.equal(normalizeEmail('not-an-email'), null);
  assert.equal(normalizeEmail('buyer@example'), null);
});

test('validates contact fields and requires a recognized topic', () => {
  const valid = {
    requestId,
    name: 'A customer',
    email: 'customer@example.com',
    topic: 'Order enquiry',
    message: 'Please tell me about my order.'
  };
  assert.equal(validateContact(valid).email, 'customer@example.com');
  assert.equal(validateContact({ ...valid, email: 'fake' }), null);
  assert.equal(validateContact({ ...valid, topic: 'Unknown topic' }), null);
});

test('uses server catalog prices and rejects manipulated order lines', () => {
  const order = {
    requestId,
    name: 'A customer',
    email: 'customer@example.com',
    phone: '+92 300 1234567',
    address: '12 Main Street',
    city: 'Karachi',
    region: 'Sindh',
    postalCode: '75500',
    note: '',
    payment: 'cod',
    items: [{ id: 1, quantity: 2 }]
  };
  const validated = validateOrder(order);
  assert.equal(validated.total, 77800);
  assert.equal(validated.items[0].price, 38900);
  assert.equal(validateOrder({ ...order, items: [{ id: 1, quantity: 2, price: 1 }] }).total, 77800);
  assert.equal(validateOrder({ ...order, items: [{ id: 999, quantity: 1 }] }), null);
  assert.equal(validateOrder({ ...order, items: [{ id: 1, quantity: 0 }] }), null);
  assert.equal(validateOrder({ ...order, region: 'Not a province' }), null);
});

test('escapes untrusted email content before rendering HTML', () => {
  assert.equal(escapeHtml(`<script a="b">&'`), '&lt;script a=&quot;b&quot;&gt;&amp;&#39;');
});
