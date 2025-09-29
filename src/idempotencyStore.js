const seen = new Map(); // key -> expiresAt
// Expose for test introspection
// eslint-disable-next-line no-undef
if (typeof global !== 'undefined') {
  // Provide a stable reference for tests
  // Note: not part of public API
  global.seen = seen;
}
function getTTL() {
  const v = Number(process.env.IDEMPOTENCY_TTL_MS);
  return Number.isFinite(v) && v > 0 ? v : 10 * 60 * 1000; // 10 minutes default
}

function getMaxKeys() {
  const v = Number(process.env.IDEMPOTENCY_MAX_KEYS);
  return Number.isFinite(v) && v > 0 ? v : 10000;
}

function makeEventKey(type, payload) {
  const ref = payload?.basketReferenceCode || payload?.referenceCode || 'n/a';
  const tx = payload?.transactionId || payload?.createdAt || 'n/a';
  return `${type}:${ref}:${tx}`;
}

function isDuplicate(key) {
  const now = Date.now();
  const exp = seen.get(key);
  if (exp && exp > now) return true;
  if (exp && exp <= now) seen.delete(key);
  return false;
}

function remember(key) {
  const now = Date.now();
  seen.set(key, now + getTTL());
  if (seen.size > getMaxKeys()) {
    // naive eviction: remove oldest entries
    const toRemove = seen.size - getMaxKeys();
    let i = 0;
    for (const k of seen.keys()) {
      seen.delete(k);
      if (++i >= toRemove) break;
    }
  }
}

export {
  makeEventKey,
  isDuplicate,
  remember
};
