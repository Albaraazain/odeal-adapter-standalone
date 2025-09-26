// Simple logger with levels and masking helpers
// Usage: import { log } from './logger.js'; log.debug('msg', ctx)

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const LOG_LEVEL = (process.env.ODEAL_LOG_LEVEL || 'debug').toLowerCase();
const THRESHOLD = LEVELS[LOG_LEVEL] ?? LEVELS.debug;

function ts() {
  return new Date().toISOString();
}

function redact(value, { keep = 4 } = {}) {
  if (value == null) return '';
  const s = String(value);
  if (s.length <= keep) return '***';
  return `${s.substring(0, keep)}***`;
}

function baseLine(level, msg, ctx) {
  // Avoid logging huge objects; shallow copy and drop known sensitive keys
  const safeCtx = {};
  if (ctx && typeof ctx === 'object') {
    for (const [k, v] of Object.entries(ctx)) {
      if (/key|secret|token|authorization|password/i.test(k)) {
        safeCtx[k] = '[REDACTED]';
      } else if (k === 'headers' && v && typeof v === 'object') {
        const h = { ...v };
        if (h['x-odeal-request-key']) h['x-odeal-request-key'] = '[PRESENT]';
        if (h['authorization']) h['authorization'] = '[REDACTED]';
        safeCtx[k] = h;
      } else {
        safeCtx[k] = v;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.log(`[${ts()}] [${level.toUpperCase()}] ${msg}${Object.keys(safeCtx).length ? ' ' + JSON.stringify(safeCtx) : ''}`);
}

export const log = {
  error(msg, ctx) {
    if (THRESHOLD >= LEVELS.error) baseLine('error', msg, ctx);
  },
  warn(msg, ctx) {
    if (THRESHOLD >= LEVELS.warn) baseLine('warn', msg, ctx);
  },
  info(msg, ctx) {
    if (THRESHOLD >= LEVELS.info) baseLine('info', msg, ctx);
  },
  debug(msg, ctx) {
    if (THRESHOLD >= LEVELS.debug) baseLine('debug', msg, ctx);
  },
  redact,
};

