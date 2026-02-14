const crypto = require('node:crypto');

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
}

function sanitizeIdentifier(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

function uniqueId(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}${crypto.randomBytes(3).toString('hex')}`;
}

function toBase64Utf8(text) {
  return Buffer.from(String(text), 'utf8').toString('base64');
}

module.exports = {
  slugify,
  sanitizeIdentifier,
  uniqueId,
  toBase64Utf8,
};
