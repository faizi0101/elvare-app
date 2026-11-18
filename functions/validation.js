const PRODUCTS = Object.freeze({
  1: { name: 'Atelier Leather Tote', category: 'Bags', price: 38900, photo: '1548036328-c9fa89d128fa' },
  2: { name: 'Ivory Structured Bag', category: 'Bags', price: 42000, photo: '1584917865442-de89df76afd3' },
  3: { name: 'Saffron Leather Wallet', category: 'Bags', price: 12500, photo: '1553062407-98eeb64c6a62' },
  4: { name: 'Meridian Automatic', category: 'Watches', price: 48500, photo: '1523275335684-37898b6baf30' },
  5: { name: 'Noir Chronograph', category: 'Watches', price: 62000, photo: '1524592094714-0f0654e20314' },
  6: { name: 'Solace Tortoise Frames', category: 'Sunglasses', price: 14900, photo: '1572635196237-14b3f281503f' },
  7: { name: 'Aurum Aviators', category: 'Sunglasses', price: 16500, photo: '1511499767150-a48a237f0083' },
  8: { name: 'Serene Signet Ring', category: 'Jewelry', price: 18500, photo: '1605100804763-247f67b3557e' },
  9: { name: 'Gilded Chain Necklace', category: 'Jewelry', price: 24900, photo: '1599643478518-a784e5dc4c8f' },
  10: { name: 'No. 01 Eau de Parfum', category: 'Fragrances', price: 16800, photo: '1547887538-e3a2f32cb1cc' },
  11: { name: 'Velvet Oud Concentrate', category: 'Fragrances', price: 21500, photo: '1594035910387-fea47794261f' },
  12: { name: 'Carré Cashmere Scarf', category: 'Lifestyle', price: 13900, photo: '1520903920243-00d872a2d1c9' },
  13: { name: 'Obsidian Desk Object', category: 'Lifestyle', price: 9800, photo: '1494438639946-1ebd1d20bf85' }
});

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const REGIONS = new Set([
  'Sindh',
  'Punjab',
  'Khyber Pakhtunkhwa',
  'Balochistan',
  'Islamabad Capital Territory',
  'Gilgit-Baltistan',
  'Azad Jammu and Kashmir'
]);
const TOPICS = new Set([
  'Order enquiry',
  'Product information',
  'Returns and care',
  'Press or collaboration',
  'Something else'
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function text(value, min, max) {
  return typeof value === 'string' && value.trim().length >= min && value.trim().length <= max
    ? value.trim()
    : null;
}

function normalizeEmail(value) {
  if (typeof value !== 'string' || value.length > 254) return null;
  const email = value.trim().toLowerCase();
  return EMAIL_PATTERN.test(email) ? email : null;
}

function validateRequestId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function validateContact(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const name = text(body.name, 2, 100);
  const email = normalizeEmail(body.email);
  const topic = text(body.topic, 1, 60);
  const message = text(body.message, 10, 3000);
  const requestId = body.requestId;
  if (!name || !email || !TOPICS.has(topic) || !message || !validateRequestId(requestId)) return null;
  return { name, email, topic, message, requestId };
}

function validateOrder(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const name = text(body.name, 2, 100);
  const email = normalizeEmail(body.email);
  const phone = text(body.phone, 8, 24);
  const digits = phone ? phone.replace(/\D/g, '') : '';
  const address = text(body.address, 5, 250);
  const city = text(body.city, 2, 100);
  const region = text(body.region, 1, 60);
  const postalCode = body.postalCode === '' || body.postalCode == null
    ? ''
    : text(body.postalCode, 3, 12);
  const note = body.note === '' || body.note == null ? '' : text(body.note, 0, 300);
  const payment = body.payment;
  const requestId = body.requestId;
  if (
    !name || !email || !phone || digits.length < 8 || digits.length > 15 ||
    !address || !city || !REGIONS.has(region) ||
    (body.postalCode && !postalCode) || (body.note && note === null) ||
    !['cod', 'easypaisa'].includes(payment) || !validateRequestId(requestId) ||
    !Array.isArray(body.items) || body.items.length < 1 || body.items.length > 13
  ) return null;

  const seen = new Set();
  const items = [];
  for (const item of body.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return null;
    const id = Number(item.id);
    const product = PRODUCTS[id];
    if (
      !product || seen.has(id) || !Number.isInteger(item.quantity) ||
      item.quantity < 1 || item.quantity > 10
    ) return null;
    seen.add(id);
    items.push({ id, ...product, quantity: item.quantity });
  }
  if (items.reduce((sum, item) => sum + item.quantity, 0) > 20) return null;

  return {
    name,
    email,
    phone,
    address,
    city,
    region,
    postalCode: postalCode || '',
    note: note || '',
    payment,
    requestId,
    items,
    total: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  };
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

module.exports = {
  PRODUCTS,
  escapeHtml,
  normalizeEmail,
  validateContact,
  validateOrder,
  validateRequestId
};
