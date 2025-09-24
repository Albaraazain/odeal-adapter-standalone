const seen = new Map(); // key -> expiresAt
const TTL_MS = Number(process.env.IDEMPOTENCY_TTL_MS || 10 * 60 * 1000); // 10 minutes default
const MAX_KEYS = Number(process.env.IDEMPOTENCY_MAX_KEYS || 10000);

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
  seen.set(key, now + TTL_MS);
  if (seen.size > MAX_KEYS) {
    // naive eviction: remove oldest entries
    const toRemove = seen.size - MAX_KEYS;
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
