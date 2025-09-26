// Simple in-memory reference -> checkId map with TTL
// Not persistent across restarts. Intended as a bridge for UUID references.

const DEFAULT_TTL_MS = Number(process.env.REF_MAP_TTL_MS || 15 * 60 * 1000); // 15 minutes

class RefMap {
  constructor() {
    this.store = new Map(); // key -> { checkId, expiresAt }
  }

  set(key, checkId, ttlMs = DEFAULT_TTL_MS) {
    const expiresAt = Date.now() + Math.max(1000, ttlMs);
    this.store.set(String(key), { checkId: Number(checkId), expiresAt });
  }

  get(key) {
    const entry = this.store.get(String(key));
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(String(key));
      return undefined;
    }
    return entry.checkId;
  }

  has(key) {
    return this.get(key) != null;
  }
}

export const refMap = new RefMap();

