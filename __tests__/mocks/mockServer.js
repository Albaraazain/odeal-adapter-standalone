import { createServer } from 'http';
import { parse } from 'url';

/**
 * Mock Server for Testing External API Calls
 * Simulates ROP API and external services for testing
 */

class MockServer {
  constructor(port = 0) {
    this.port = port;
    this.server = null;
    this.endpoints = new Map();
    this.requestLog = [];
    this.responseTemplates = new Map();
    this.scenarios = new Map();
    this.isRunning = false;
  }

  /**
   * Start the mock server
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = createServer(async (req, res) => {
        try {
          await this.handleRequest(req, res);
        } catch (error) {
          this.logRequest(req, 500, error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
        }
      });

      this.server.listen(this.port, () => {
        this.port = this.server.address().port;
        this.isRunning = true;
        console.log(`Mock server running on port ${this.port}`);
        resolve();
      });

      this.server.on('error', reject);
    });
  }

  /**
   * Stop the mock server
   */
  async stop() {
    if (!this.isRunning) return;

    return new Promise((resolve) => {
      this.server.close(() => {
        this.isRunning = false;
        console.log('Mock server stopped');
        resolve();
      });
    });
  }

  /**
   * Handle incoming requests
   */
  async handleRequest(req, res) {
    const { method, url, headers } = req;
    const parsedUrl = parse(url, true);
    const pathname = parsedUrl.pathname;
    const query = parsedUrl.query;

    // Log the request
    this.logRequest(req, 200);

    // Check for scenario-based responses
    const scenario = this.scenarios.get(pathname);
    if (scenario) {
      return this.handleScenario(req, res, scenario, query);
    }

    // Check for registered endpoints
    const endpoint = this.endpoints.get(pathname);
    if (endpoint) {
      return this.handleEndpoint(req, res, endpoint, query);
    }

    // Default 404 response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }

  /**
   * Handle scenario-based responses
   */
  async handleScenario(req, res, scenario, query) {
    const { method, headers } = req;

    // Simulate network delay
    if (scenario.delay) {
      await this.delay(scenario.delay);
    }

    // Check for scenario-specific conditions
    if (scenario.conditions) {
      for (const condition of scenario.conditions) {
        if (this.evaluateCondition(condition, { method, headers, query })) {
          return this.sendResponse(res, condition.response, condition.status || 200);
        }
      }
    }

    // Default scenario response
    return this.sendResponse(res, scenario.response, scenario.status || 200);
  }

  /**
   * Handle endpoint-based responses
   */
  async handleEndpoint(req, res, endpoint, query) {
    const { method } = req;

    // Check if method is allowed
    if (endpoint.methods && !endpoint.methods.includes(method)) {
      res.writeHead(405, { 'Allow': endpoint.methods.join(', ') });
      res.end();
      return;
    }

    // Simulate network delay
    if (endpoint.delay) {
      await this.delay(endpoint.delay);
    }

    // Get response template
    let response = endpoint.response;
    if (typeof response === 'function') {
      response = response({ method, query, headers: req.headers });
    }

    return this.sendResponse(res, response, endpoint.status || 200);
  }

  /**
   * Evaluate scenario conditions
   */
  evaluateCondition(condition, context) {
    if (condition.method && condition.method !== context.method) {
      return false;
    }

    if (condition.headers) {
      for (const [key, value] of Object.entries(condition.headers)) {
        if (context.headers[key.toLowerCase()] !== value) {
          return false;
        }
      }
    }

    if (condition.query) {
      for (const [key, value] of Object.entries(condition.query)) {
        if (context.query[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Send HTTP response
   */
  sendResponse(res, data, status = 200, headers = {}) {
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Mock-Server': 'Ödeal-Test-Server',
      ...headers
    };

    res.writeHead(status, defaultHeaders);
    res.end(JSON.stringify(data));
  }

  /**
   * Register an endpoint
   */
  registerEndpoint(path, config) {
    this.endpoints.set(path, {
      methods: ['GET', 'POST'],
      response: {},
      status: 200,
      ...config
    });
  }

  /**
   * Register a scenario
   */
  registerScenario(path, config) {
    this.scenarios.set(path, {
      response: {},
      status: 200,
      conditions: [],
      ...config
    });
  }

  /**
   * Setup default ROP API endpoints
   */
  setupROPEndpoints() {
    // CheckDetail endpoint
    this.registerEndpoint('/V6/App2App/CheckDetail', {
      methods: ['GET'],
      response: ({ query }) => {
        const checkId = query.CheckId;

        if (!checkId) {
          return { error: 'CheckId is required' };
        }

        // Return different responses based on CheckId
        if (checkId === '0') {
          return { CheckId: 0, Details: [], Error: 'Check not found' };
        }

        if (checkId === '999999') {
          throw new Error('Database connection failed');
        }

        // Default success response
        return {
          CheckId: parseInt(checkId),
          CheckNo: 1,
          TableNo: 'A1',
          Status: 1,
          Details: [
            {
              Name: 'Test Product',
              Quantity: 1,
              Total: 100.00,
              Code: 'TEST-001',
              Price: 100.00,
              Category: 'FOOD',
              VatRate: 0.10
            }
          ]
        };
      }
    });

    // PaymentStatus endpoint
    this.registerEndpoint('/V6/App2App/PaymentStatus', {
      methods: ['POST'],
      response: ({ method, body }) => {
        // Simulate different responses based on status
        if (body.Status === 0) {
          return {
            success: false,
            CheckId: body.CheckId,
            Status: 0,
            Message: 'Payment failed'
          };
        }

        return {
          success: true,
          CheckId: body.CheckId,
          Status: body.Status,
          Message: 'Payment processed successfully',
          PaymentId: `pay_${Date.now()}`
        };
      }
    });
  }

  /**
   * Setup error scenarios
   */
  setupErrorScenarios() {
    // Network timeout scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      delay: 5000, // 5 second delay
      response: { error: 'Request timeout' },
      status: 408
    });

    // Authentication failure scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      conditions: [
        {
          headers: { authorization: 'invalid' },
          response: { error: 'Unauthorized' },
          status: 401
        }
      ],
      response: { CheckId: 1234567, Details: [] }
    });

    // Rate limiting scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      conditions: [
        {
          response: { error: 'Rate limit exceeded' },
          status: 429
        }
      ]
    });

    // Server error scenario
    this.registerScenario('/V6/App2App/PaymentStatus', {
      conditions: [
        {
          query: { simulate_error: 'server' },
          response: { error: 'Internal server error' },
          status: 500
        }
      ]
    });
  }

  /**
   * Setup performance test scenarios
   */
  setupPerformanceScenarios() {
    // Fast response scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      conditions: [
        {
          query: { perf_test: 'fast' },
          delay: 10,
          response: { CheckId: 1234567, Details: [] }
        }
      ]
    });

    // Slow response scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      conditions: [
        {
          query: { perf_test: 'slow' },
          delay: 2000,
          response: { CheckId: 1234567, Details: [] }
        }
      ]
    });

    // Large payload scenario
    this.registerScenario('/V6/App2App/CheckDetail', {
      conditions: [
        {
          query: { perf_test: 'large' },
          response: this.generateLargeResponse()
        }
      ]
    });
  }

  /**
   * Generate large response for performance testing
   */
  generateLargeResponse() {
    const details = Array.from({ length: 1000 }, (_, index) => ({
      Name: `Product ${index + 1}`,
      Quantity: Math.floor(Math.random() * 5) + 1,
      Total: Math.floor(Math.random() * 200) + 10,
      Code: `ITEM-${String(index + 1).padStart(3, '0')}`,
      Price: Math.floor(Math.random() * 200) + 10,
      Category: 'FOOD',
      VatRate: 0.10
    }));

    return {
      CheckId: 1234567,
      Details: details
    };
  }

  /**
   * Log requests for debugging
   */
  logRequest(req, status, error = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      headers: req.headers,
      status,
      error: error ? error.message : null
    };

    this.requestLog.push(logEntry);

    // Keep only last 1000 requests
    if (this.requestLog.length > 1000) {
      this.requestLog = this.requestLog.slice(-1000);
    }
  }

  /**
   * Get request log
   */
  getRequestLog(filter = {}) {
    let log = [...this.requestLog];

    if (filter.method) {
      log = log.filter(entry => entry.method === filter.method);
    }

    if (filter.status) {
      log = log.filter(entry => entry.status === filter.status);
    }

    if (filter.since) {
      log = log.filter(entry => entry.timestamp >= filter.since);
    }

    return log;
  }

  /**
   * Clear request log
   */
  clearRequestLog() {
    this.requestLog = [];
  }

  /**
   * Get server URL
   */
  getUrl() {
    return `http://localhost:${this.port}`;
  }

  /**
   * Reset server state
   */
  reset() {
    this.endpoints.clear();
    this.scenarios.clear();
    this.clearRequestLog();
  }

  /**
   * Utility function to create delays
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check endpoint
   */
  setupHealthCheck() {
    this.registerEndpoint('/health', {
      methods: ['GET'],
      response: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        requests: this.requestLog.length
      }
    });
  }

  /**
   * Setup all default scenarios
   */
  setupDefaults() {
    this.setupROPEndpoints();
    this.setupErrorScenarios();
    this.setupPerformanceScenarios();
    this.setupHealthCheck();
  }
}

/**
 * Create and configure a mock server instance
 */
export async function createMockServer(config = {}) {
  const server = new MockServer(config.port);

  if (config.setupDefaults !== false) {
    server.setupDefaults();
  }

  await server.start();

  return server;
}

/**
 * Create a mock server with specific scenarios
 */
export async function createScenarioMockServer(scenarios = {}) {
  const server = new MockServer();

  // Setup custom scenarios
  Object.entries(scenarios).forEach(([path, config]) => {
    server.registerScenario(path, config);
  });

  await server.start();

  return server;
}

export default MockServer;