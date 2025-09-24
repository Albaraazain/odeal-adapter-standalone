import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { makeEventKey, isDuplicate, remember } from '../../src/idempotencyStore.js';

describe('IdempotencyStore', () => {
  let originalEnv;
  let mockNow;

  beforeEach(() => {
    originalEnv = { ...process.env };
    mockNow = Date.now();

    // Mock Date.now() for consistent testing
    global.Date.now = jest.fn(() => mockNow);

    // Clear the idempotency store
    if (global.seen) {
      global.seen.clear();
    }
  });

  afterEach(() => {
    process.env = originalEnv;
    global.Date.now = Date.now;
  });

  describe('makeEventKey', () => {
    test('should create key with payment-succeeded type', () => {
      const payload = {
        basketReferenceCode: 'REF_001',
        transactionId: 'TXN_001'
      };
      const key = makeEventKey('payment-succeeded', payload);
      expect(key).toBe('payment-succeeded:REF_001:TXN_001');
    });

    test('should create key with payment-failed type', () => {
      const payload = {
        referenceCode: 'REF_002',
        createdAt: '2023-01-01T00:00:00Z'
      };
      const key = makeEventKey('payment-failed', payload);
      expect(key).toBe('payment-failed:REF_002:2023-01-01T00:00:00Z');
    });

    test('should handle missing reference code', () => {
      const payload = {
        transactionId: 'TXN_001'
      };
      const key = makeEventKey('payment-succeeded', payload);
      expect(key).toBe('payment-succeeded:n/a:TXN_001');
    });

    test('should handle missing transaction info', () => {
      const payload = {
        basketReferenceCode: 'REF_001'
      };
      const key = makeEventKey('payment-succeeded', payload);
      expect(key).toBe('payment-succeeded:REF_001:n/a');
    });

    test('should handle empty payload', () => {
      const key = makeEventKey('payment-succeeded', {});
      expect(key).toBe('payment-succeeded:n/a:n/a');
    });

    test('should handle null/undefined payload', () => {
      const key = makeEventKey('payment-succeeded', null);
      expect(key).toBe('payment-succeeded:n/a:n/a');
    });
  });

  describe('isDuplicate', () => {
    test('should return false for new key', () => {
      const key = 'test:key:001';
      expect(isDuplicate(key)).toBe(false);
    });

    test('should return true for existing unexpired key', () => {
      const key = 'test:key:001';
      remember(key);
      expect(isDuplicate(key)).toBe(true);
    });

    test('should return false for expired key', () => {
      const key = 'test:key:001';
      remember(key);

      // Simulate time passing beyond TTL
      mockNow += 11 * 60 * 1000; // 11 minutes

      expect(isDuplicate(key)).toBe(false);
    });

    test('should clean up expired keys', () => {
      const key = 'test:key:001';
      remember(key);

      // Simulate time passing beyond TTL
      mockNow += 11 * 60 * 1000; // 11 minutes

      // First call should clean up and return false
      expect(isDuplicate(key)).toBe(false);

      // Second call should still return false (key should be cleaned up)
      expect(isDuplicate(key)).toBe(false);
    });
  });

  describe('remember', () => {
    test('should store key with expiration time', () => {
      const key = 'test:key:001';
      remember(key);

      expect(global.seen.has(key)).toBe(true);
      const expiration = global.seen.get(key);
      expect(expiration).toBe(mockNow + 600000); // 10 minutes from mockNow
    });

    test('should use custom TTL from environment', () => {
      process.env.IDEMPOTENCY_TTL_MS = '30000'; // 30 seconds

      const key = 'test:key:001';
      remember(key);

      expect(global.seen.get(key)).toBe(mockNow + 30000);
    });

    test('should use default TTL when not set', () => {
      delete process.env.IDEMPOTENCY_TTL_MS;

      const key = 'test:key:001';
      remember(key);

      expect(global.seen.get(key)).toBe(mockNow + 600000); // 10 minutes default
    });

    test('should handle max keys limit', () => {
      process.env.IDEMPOTENCY_MAX_KEYS = '3';

      // Store 3 keys
      remember('key1');
      remember('key2');
      remember('key3');

      expect(global.seen.size).toBe(3);

      // Add 4th key - should evict oldest
      remember('key4');

      expect(global.seen.size).toBe(3);
      expect(global.seen.has('key1')).toBe(false); // Should be evicted
      expect(global.seen.has('key4')).toBe(true); // Should be present
    });

    test('should use default max keys when not set', () => {
      delete process.env.IDEMPOTENCY_MAX_KEYS;

      // Store many keys
      for (let i = 0; i < 100; i++) {
        remember(`key${i}`);
      }

      expect(global.seen.size).toBeLessThanOrEqual(10000);
    });

    test('should update expiration time for existing key', () => {
      const key = 'test:key:001';
      remember(key);

      const firstExpiration = global.seen.get(key);

      // Simulate time passing
      mockNow += 5000; // 5 seconds

      remember(key);

      const secondExpiration = global.seen.get(key);
      expect(secondExpiration).toBeGreaterThan(firstExpiration);
    });
  });

  describe('Integration behavior', () => {
    test('should work together for duplicate detection', () => {
      const key = 'test:payment:001';

      // First call should not be duplicate
      expect(isDuplicate(key)).toBe(false);

      // Remember the key
      remember(key);

      // Second call should be duplicate
      expect(isDuplicate(key)).toBe(true);
    });

    test('should handle multiple keys independently', () => {
      const key1 = 'test:payment:001';
      const key2 = 'test:payment:002';

      remember(key1);

      expect(isDuplicate(key1)).toBe(true);
      expect(isDuplicate(key2)).toBe(false);

      remember(key2);

      expect(isDuplicate(key1)).toBe(true);
      expect(isDuplicate(key2)).toBe(true);
    });

    test('should handle different event types with same reference', () => {
      const key1 = 'payment-succeeded:REF_001:TXN_001';
      const key2 = 'payment-failed:REF_001:TXN_001';

      remember(key1);

      expect(isDuplicate(key1)).toBe(true);
      expect(isDuplicate(key2)).toBe(false);

      remember(key2);

      expect(isDuplicate(key1)).toBe(true);
      expect(isDuplicate(key2)).toBe(true);
    });
  });

  describe('Memory management', () => {
    test('should not grow indefinitely', () => {
      // Store many keys
      for (let i = 0; i < 20000; i++) {
        remember(`key${i}`);
      }

      expect(global.seen.size).toBeLessThanOrEqual(10000);
    });

    test('should evict oldest keys first', () => {
      process.env.IDEMPOTENCY_MAX_KEYS = '3';

      // Store keys with time gaps
      remember('key1');
      mockNow += 1000;
      remember('key2');
      mockNow += 1000;
      remember('key3');

      expect(global.seen.has('key1')).toBe(true);
      expect(global.seen.has('key2')).toBe(true);
      expect(global.seen.has('key3')).toBe(true);

      // Add key4 - should evict key1 (oldest)
      remember('key4');

      expect(global.seen.has('key1')).toBe(false);
      expect(global.seen.has('key2')).toBe(true);
      expect(global.seen.has('key3')).toBe(true);
      expect(global.seen.has('key4')).toBe(true);
    });
  });
});