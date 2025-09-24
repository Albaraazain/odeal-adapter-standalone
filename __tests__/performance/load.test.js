import { describe, test, expect } from '@jest/globals';
import axios from 'axios';
import { performance } from 'perf_hooks';

// Performance test configuration
const PERF_CONFIG = {
  baseUrl: process.env.VERCEL_URL || 'http://localhost:3000',
  authKey: process.env.ODEAL_REQUEST_KEY || 'test-key',
  concurrentRequests: 50,
  maxResponseTime: 5000, // 5 seconds
  testDuration: 30000, // 30 seconds
  warmupRequests: 10,
};

const createTestClient = () => {
  return axios.create({
    baseURL: PERF_CONFIG.baseUrl,
    timeout: PERF_CONFIG.maxResponseTime,
    headers: {
      'Content-Type': 'application/json',
      'X-ODEAL-REQUEST-KEY': PERF_CONFIG.authKey,
    },
  });
};

describe('Ödeal Vercel Functions Performance Tests', () => {
  let client;

  beforeAll(() => {
    client = createTestClient();
  });

  describe('Basket Endpoint Performance', () => {
    test('should handle concurrent basket requests', async () => {
      const requests = Array.from({ length: PERF_CONFIG.concurrentRequests }, (_, i) => ({
        referenceCode: `PERF_BASKET_${Date.now()}_${i}`,
      }));

      const startTime = performance.now();

      const responses = await Promise.allSettled(
        requests.map(req => client.get(`/api/app2app/baskets/${req.referenceCode}`))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected');

      console.log(`Basket Load Test Results:`);
      console.log(`- Total requests: ${requests.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Failed: ${failed.length}`);
      console.log(`- Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`- Average time per request: ${(totalTime / requests.length).toFixed(2)}ms`);
      console.log(`- Requests per second: ${(requests.length / (totalTime / 1000)).toFixed(2)}`);

      // Performance assertions
      expect(successful.length).toBeGreaterThan(requests.length * 0.9); // 90% success rate
      expect(totalTime).toBeLessThan(PERF_CONFIG.maxResponseTime * 2); // Reasonable total time
      expect(totalTime / requests.length).toBeLessThan(1000); // Average under 1 second
    });

    test('should maintain response times under load', async () => {
      const iterations = 20;
      const responseTimes = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        const referenceCode = `PERF_RESPONSE_${Date.now()}_${i}`;

        try {
          const response = await client.get(`/api/app2app/baskets/${referenceCode}`);
          const endTime = performance.now();
          responseTimes.push(endTime - startTime);
        } catch (error) {
          console.warn(`Request ${i} failed:`, error.message);
        }
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);
      const minResponseTime = Math.min(...responseTimes);

      console.log(`Response Time Analysis:`);
      console.log(`- Average: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`- Min: ${minResponseTime.toFixed(2)}ms`);
      console.log(`- Max: ${maxResponseTime.toFixed(2)}ms`);
      console.log(`- Sample size: ${responseTimes.length}`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
      expect(maxResponseTime).toBeLessThan(PERF_CONFIG.maxResponseTime); // Max under 5 seconds
      expect(responseTimes.length).toBeGreaterThan(iterations * 0.8); // 80% success rate
    });
  });

  describe('Webhook Endpoint Performance', () => {
    test('should handle concurrent webhook requests', async () => {
      const webhookTypes = ['payment-succeeded', 'payment-failed', 'payment-cancelled'];
      const requests = Array.from({ length: PERF_CONFIG.concurrentRequests }, (_, i) => ({
        type: webhookTypes[i % webhookTypes.length],
        referenceCode: `PERF_WEBHOOK_${Date.now()}_${i}`,
        payload: {
          basketReferenceCode: `PERF_WEBHOOK_${Date.now()}_${i}`,
          paymentId: `pay_test_${Date.now()}_${i}`,
          amount: 100.00,
          currency: 'TRY',
          timestamp: new Date().toISOString(),
          status: webhookTypes[i % webhookTypes.length].split('-')[1],
        },
      }));

      const startTime = performance.now();

      const responses = await Promise.allSettled(
        requests.map(req => client.post(`/api/webhooks/odeal/${req.type}`, req.payload))
      );

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Analyze results
      const successful = responses.filter(r => r.status === 'fulfilled' && r.value.status === 200);
      const failed = responses.filter(r => r.status === 'rejected');

      console.log(`Webhook Load Test Results:`);
      console.log(`- Total requests: ${requests.length}`);
      console.log(`- Successful: ${successful.length}`);
      console.log(`- Failed: ${failed.length}`);
      console.log(`- Total time: ${totalTime.toFixed(2)}ms`);
      console.log(`- Average time per request: ${(totalTime / requests.length).toFixed(2)}ms`);
      console.log(`- Requests per second: ${(requests.length / (totalTime / 1000)).toFixed(2)}`);

      // Performance assertions
      expect(successful.length).toBeGreaterThan(requests.length * 0.9); // 90% success rate
      expect(totalTime).toBeLessThan(PERF_CONFIG.maxResponseTime * 2); // Reasonable total time
    });

    test('should handle idempotency efficiently under load', async () => {
      const iterations = 30;
      const referenceCode = `PERF_IDEMPOTENCY_${Date.now()}`;
      const payload = {
        basketReferenceCode: referenceCode,
        paymentId: `pay_test_${Date.now()}`,
        amount: 100.00,
        currency: 'TRY',
        timestamp: new Date().toISOString(),
        status: 'succeeded',
      };

      const responseTimes = [];
      const duplicateResponses = [];

      // Send first unique request
      const startTime = performance.now();
      const firstResponse = await client.post('/api/webhooks/odeal/payment-succeeded', payload);
      const firstEndTime = performance.now();
      responseTimes.push(firstEndTime - startTime);
      duplicateResponses.push(firstResponse.status === 200 && !firstResponse.data.duplicate);

      // Send duplicate requests
      for (let i = 0; i < iterations; i++) {
        const dupStartTime = performance.now();
        try {
          const response = await client.post('/api/webhooks/odeal/payment-succeeded', payload);
          const dupEndTime = performance.now();
          responseTimes.push(dupEndTime - dupStartTime);
          duplicateResponses.push(response.status === 200 && response.data.duplicate);
        } catch (error) {
          console.warn(`Duplicate request ${i} failed:`, error.message);
        }
      }

      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const uniqueRequests = duplicateResponses.filter(r => !r).length;
      const duplicateRequests = duplicateResponses.filter(r => r).length;

      console.log(`Idempotency Performance:`);
      console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`- Unique requests: ${uniqueRequests}`);
      console.log(`- Duplicate requests: ${duplicateRequests}`);
      console.log(`- Total requests: ${responseTimes.length}`);

      // Performance assertions
      expect(avgResponseTime).toBeLessThan(1000); // Average under 1 second
      expect(uniqueRequests).toBe(1); // Only first request should be unique
      expect(duplicateRequests).toBeGreaterThan(iterations * 0.8); // Most should be duplicates
    });
  });

  describe('Memory Usage Tests', () => {
    test('should maintain reasonable memory usage under load', async () => {
      const startMemory = process.memoryUsage();
      const largeNumberOfRequests = 100;

      // Generate and send many requests
      const requests = Array.from({ length: largeNumberOfRequests }, (_, i) => ({
        referenceCode: `PERF_MEMORY_${Date.now()}_${i}`,
      }));

      await Promise.allSettled(
        requests.map(req => client.get(`/api/app2app/baskets/${req.referenceCode}`))
      );

      const endMemory = process.memoryUsage();

      const memoryIncrease = {
        rss: endMemory.rss - startMemory.rss,
        heapUsed: endMemory.heapUsed - startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - startMemory.heapTotal,
      };

      console.log(`Memory Usage Analysis:`);
      console.log(`- RSS increase: ${(memoryIncrease.rss / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap used increase: ${(memoryIncrease.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`- Heap total increase: ${(memoryIncrease.heapTotal / 1024 / 1024).toFixed(2)}MB`);

      // Memory assertions (should not grow too much)
      expect(memoryIncrease.heapUsed).toBeLessThan(50 * 1024 * 1024); // Less than 50MB increase
      expect(memoryIncrease.rss).toBeLessThan(100 * 1024 * 1024); // Less than 100MB increase
    });
  });

  describe('Endurance Tests', () => {
    test('should handle sustained load over time', async () => {
      const duration = PERF_CONFIG.testDuration;
      const startTime = performance.now();
      const endTime = startTime + duration;
      let requestCount = 0;
      let successfulRequests = 0;
      let failedRequests = 0;
      const responseTimes = [];

      console.log(`Starting endurance test for ${duration / 1000} seconds...`);

      while (performance.now() < endTime) {
        const referenceCode = `PERF_ENDURANCE_${Date.now()}_${requestCount}`;
        const requestStartTime = performance.now();

        try {
          const response = await client.get(`/api/app2app/baskets/${referenceCode}`);
          const requestEndTime = performance.now();
          responseTimes.push(requestEndTime - requestStartTime);
          successfulRequests++;
        } catch (error) {
          failedRequests++;
        }

        requestCount++;

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      const actualDuration = performance.now() - startTime;
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const requestsPerSecond = (requestCount / (actualDuration / 1000));

      console.log(`Endurance Test Results:`);
      console.log(`- Duration: ${(actualDuration / 1000).toFixed(2)}s`);
      console.log(`- Total requests: ${requestCount}`);
      console.log(`- Successful: ${successfulRequests}`);
      console.log(`- Failed: ${failedRequests}`);
      console.log(`- Requests per second: ${requestsPerSecond.toFixed(2)}`);
      console.log(`- Average response time: ${avgResponseTime.toFixed(2)}ms`);

      // Endurance assertions
      expect(successfulRequests / requestCount).toBeGreaterThan(0.9); // 90% success rate
      expect(requestsPerSecond).toBeGreaterThan(10); // At least 10 requests per second
      expect(avgResponseTime).toBeLessThan(2000); // Average under 2 seconds
    });
  });
});