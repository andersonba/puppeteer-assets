const { set, find } = require('lodash');

function sanitizeUrl(url) {
  if (!/^(?:f|ht)tps?:\/\//.test(url)) return `https://${url}`;
  return url;
}

function incr(obj, key, val = 1) {
  set(obj, key, val + (obj[key] || 0));
}

function detectMimeType(rawMimeType, mimeTypes, mimeTypePatterns) {
  return find(mimeTypes, (mimeType) => {
    const patterns = mimeTypePatterns[mimeType] || [mimeType];
    return find(patterns, (pattern) => new RegExp(pattern).test(rawMimeType));
  });
}

module.exports = {
  detectMimeType,
  sanitizeUrl,
  incr,
};
