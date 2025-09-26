import { jest } from '@jest/globals';
import { AuthTestClient } from './authTestClient.js';

/**
 * Authentication Test Scenarios for Ödeal Vercel Functions
 * Provides comprehensive authentication scenarios and test cases
 */
export class AuthScenarios {
  constructor(client = null) {
    this.client = client || new AuthTestClient();
    this.results = [];
  }

  /**
   * Run all authentication test scenarios
   */
  async runAllScenarios(endpoint) {
    const scenarios = [
      'validAuthentication',
      'missingAuthentication',
      'invalidAuthentication',
      'malformedAuthentication',
      'expiredAuthentication',
      'caseSensitivity',
      'whitespaceHandling',
      'specialCharacters',
      'unicodeCharacters',
      'emptyKey',
      'extremelyLongKey',
      'sqlInjection',
      'xssInjection',
      'commandInjection',
      'pathTraversal',
      'headerSpoofing',
      'methodTampering',
      'contentTypeTampering',
      'multipleAuthHeaders',
      'corsPreflight',
      'optionsMethod'
    ];

    const results = {};

    for (const scenario of scenarios) {
      try {
        results[scenario] = await this[scenario](endpoint);
      } catch (error) {
        results[scenario] = {
          error: error.message,
          stack: error.stack
        };
      }
    }

    return results;
  }

  /**
   * Test valid authentication scenarios
   */
  async validAuthentication(endpoint) {
    const scenarios = [
      { name: 'Default valid key', key: 'test-key-123' },
      { name: 'UUID format key', key: '550e8400-e29b-41d4-a716-446655440000' },
      { name: 'Alphanumeric key', key: 'AbCdEf123456' },
      { name: 'Complex key', key: 't3st-k3y-w1th-sp3c1al-chars!@#$%^&*()' },
      { name: 'Short valid key', key: 'short123' }
    ];

    const results = {};

    for (const scenario of scenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          successful: response.status === 200,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test missing authentication scenarios
   */
  async missingAuthentication(endpoint) {
    const scenarios = [
      { name: 'No auth header', headers: {} },
      { name: 'Empty auth header', headers: { 'X-ODEAL-REQUEST-KEY': '' } },
      { name: 'Null auth header', headers: { 'X-ODEAL-REQUEST-KEY': null } },
      { name: 'Undefined auth header', headers: { 'X-ODEAL-REQUEST-KEY': undefined } }
    ];

    const results = {};

    for (const scenario of scenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: null,
          customHeaders: scenario.headers
        });

        results[scenario.name] = {
          status: response.status,
          expected401: response.status === 401,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401: error.response?.status === 401,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test invalid authentication scenarios
   */
  async invalidAuthentication(endpoint) {
    const scenarios = [
      { name: 'Completely wrong key', key: 'wrong-key-123' },
      { name: 'Off by one character', key: 'test-key-124' },
      { name: 'Case variation', key: 'TEST-KEY-123' },
      { name: 'Reversed key', key: '321-yek-tset' },
      { name: 'Substring', key: 'test-key' },
      { name: 'Superset', key: 'test-key-123-extra' },
      { name: 'Random key', key: Math.random().toString(36).substring(2, 15) }
    ];

    const results = {};

    for (const scenario of scenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401: response.status === 401,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401: error.response?.status === 401,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test malformed authentication scenarios
   */
  async malformedAuthentication(endpoint) {
    const malformedKeys = [
      { name: 'Newline injection', key: 'test-key-123\n' },
      { name: 'Carriage return injection', key: 'test-key-123\r' },
      { name: 'Tab injection', key: 'test-key-123\t' },
      { name: 'Null byte injection', key: 'test-key-123\x00' },
      { name: 'Backspace injection', key: 'test-key-123\x08' },
      { name: 'Vertical tab injection', key: 'test-key-123\x0b' },
      { name: 'Form feed injection', key: 'test-key-123\x0c' },
      { name: 'Multiple newlines', key: 'test-key-123\n\n\n' },
      { name: 'Mixed control characters', key: 'test-key-123\r\n\t\x00' }
    ];

    const results = {};

    for (const scenario of malformedKeys) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected400or401: response.status === 400 || response.status === 401,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected400or401: error.response?.status === 400 || error.response?.status === 401,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test expired authentication scenarios
   */
  async expiredAuthentication(endpoint) {
    const expiredScenarios = [
      { name: 'Expired token format', key: 'expired_20230101_test-key-123' },
      { name: 'Timestamp expired', key: '1640995200_test-key-123' }, // 2022-01-01
      { name: 'JWT expired format', key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiZXhwIjoxNjQwOTk1MjAwfQ.invalid' },
      { name: 'Expired session format', key: 'session_expired_test-key-123' },
      { name: 'Old version format', key: 'v1_test-key-123' }
    ];

    const results = {};

    for (const scenario of expiredScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401or403: response.status === 401 || response.status === 403,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401or403: error.response?.status === 401 || error.response?.status === 403,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test case sensitivity scenarios
   */
  async caseSensitivity(endpoint) {
    const caseVariations = [
      { name: 'All uppercase', key: 'TEST-KEY-123' },
      { name: 'All lowercase', key: 'test-key-123' },
      { name: 'Mixed case', key: 'Test-Key-123' },
      { name: 'Camel case', key: 'testKey123' },
      { name: 'Title case', key: 'Test Key 123' }
    ];

    const results = {};

    for (const scenario of caseVariations) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test whitespace handling scenarios
   */
  async whitespaceHandling(endpoint) {
    const whitespaceVariations = [
      { name: 'Leading space', key: ' test-key-123' },
      { name: 'Trailing space', key: 'test-key-123 ' },
      { name: 'Multiple spaces', key: '  test  key  123  ' },
      { name: 'Tab character', key: 'test-key-123\t' },
      { name: 'Multiple tabs', key: 'test\tkey\t123' },
      { name: 'Newline character', key: 'test-key-123\n' },
      { name: 'Carriage return', key: 'test-key-123\r' },
      { name: 'Mixed whitespace', key: ' test-key-123 \t\n' }
    ];

    const results = {};

    for (const scenario of whitespaceVariations) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test special characters scenarios
   */
  async specialCharacters(endpoint) {
    const specialCharKeys = [
      { name: 'Exclamation mark', key: 'test-key-123!' },
      { name: 'Question mark', key: 'test-key-123?' },
      { name: 'Dot', key: 'test.key.123' },
      { name: 'Underscore', key: 'test_key_123' },
      { name: 'Hyphen', key: 'test-key-123' },
      { name: 'At symbol', key: 'test-key-123@' },
      { name: 'Hash symbol', key: 'test-key-123#' },
      { name: 'Dollar sign', key: 'test-key-123$' },
      { name: 'Percent sign', key: 'test-key-123%' },
      { name: 'Ampersand', key: 'test-key-123&' },
      { name: 'Asterisk', key: 'test-key-123*' },
      { name: 'Parentheses', key: 'test-key-123()' },
      { name: 'Brackets', key: 'test-key-123[]' },
      { name: 'Braces', key: 'test-key-123{}' },
      { name: 'Mixed special chars', key: 't3st-k3y-123!@#$%^&*()' }
    ];

    const results = {};

    for (const scenario of specialCharKeys) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test Unicode characters scenarios
   */
  async unicodeCharacters(endpoint) {
    const unicodeKeys = [
      { name: 'Accented characters', key: 'tést-kéy-123' },
      { name: 'Chinese characters', key: '测试密钥123' },
      { name: 'Japanese characters', key: 'テストキー123' },
      { name: 'Korean characters', key: '테스트키123' },
      { name: 'Arabic characters', key: 'مفتاح_اختبار123' },
      { name: 'Russian characters', key: 'тестовый-ключ123' },
      { name: 'Emoji characters', key: 'test-key-123🔑' },
      { name: 'Mixed Unicode', key: 'tëst-kéy-测试123🔑' }
    ];

    const results = {};

    for (const scenario of unicodeKeys) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test empty key scenarios
   */
  async emptyKey(endpoint) {
    const emptyKeyScenarios = [
      { name: 'Empty string', key: '' },
      { name: 'Zero-length string', key: '' },
      { name: 'Null value', key: null },
      { name: 'Undefined value', key: undefined }
    ];

    const results = {};

    for (const scenario of emptyKeyScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401: response.status === 401,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401: error.response?.status === 401,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test extremely long key scenarios
   */
  async extremelyLongKey(endpoint) {
    const longKeyScenarios = [
      { name: '1000 character key', key: 'a'.repeat(1000) },
      { name: '5000 character key', key: 'b'.repeat(5000) },
      { name: '10000 character key', key: 'c'.repeat(10000) },
      { name: '50000 character key', key: 'd'.repeat(50000) },
      { name: '100000 character key', key: 'e'.repeat(100000) }
    ];

    const results = {};

    for (const scenario of longKeyScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test SQL injection scenarios
   */
  async sqlInjection(endpoint) {
    const sqlInjectionPayloads = [
      { name: 'Basic SQL injection', key: "test-key-123' OR '1'='1" },
      { name: 'Union based SQL injection', key: "test-key-123' UNION SELECT * FROM users--" },
      { name: 'Comment based SQL injection', key: "test-key-123'--" },
      { name: 'Boolean based SQL injection', key: "test-key-123' AND 1=1--" },
      { name: 'Time based SQL injection', key: "test-key-123' AND SLEEP(5)--" },
      { name: 'Error based SQL injection', key: "test-key-123' AND EXTRACTVALUE(1, CONCAT(0x5c, (SELECT VERSION())))--" },
      { name: 'Stacked queries SQL injection', key: "test-key-123'; DROP TABLE users--" },
      { name: 'Blind SQL injection', key: "test-key-123' AND (SELECT COUNT(*) FROM users) > 0--" }
    ];

    const results = {};

    for (const scenario of sqlInjectionPayloads) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401or500: response.status === 401 || response.status === 500,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401or500: error.response?.status === 401 || error.response?.status === 500,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test XSS injection scenarios
   */
  async xssInjection(endpoint) {
    const xssPayloads = [
      { name: 'Basic XSS', key: '<script>alert("XSS")</script>' },
      { name: 'Image XSS', key: '<img src="x" onerror="alert("XSS")">' },
      { name: 'SVG XSS', key: '<svg onload="alert("XSS")">' },
      { name: 'JavaScript XSS', key: 'javascript:alert("XSS")' },
      { name: 'Data URI XSS', key: 'data:text/html,<script>alert("XSS")</script>' },
      { name: 'Encoded XSS', key: '%3Cscript%3Ealert(%22XSS%22)%3C%2Fscript%3E' },
      { name: 'Double quote XSS', key: '"><script>alert("XSS")</script>' },
      { name: 'Single quote XSS', key: "'><script>alert('XSS')</script>" },
      { name: 'HTML entity XSS', key: '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;' }
    ];

    const results = {};

    for (const scenario of xssPayloads) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401or400: response.status === 401 || response.status === 400,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401or400: error.response?.status === 401 || error.response?.status === 400,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test command injection scenarios
   */
  async commandInjection(endpoint) {
    const commandInjectionPayloads = [
      { name: 'Basic command injection', key: 'test-key-123; ls -la' },
      { name: 'Pipe command injection', key: 'test-key-123 | whoami' },
      { name: 'And command injection', key: 'test-key-123 && pwd' },
      { name: 'Or command injection', key: 'test-key-123 || echo "injected"' },
      { name: 'Backtick command injection', key: 'test-key-123`uname -a`' },
      { name: 'Newline command injection', key: 'test-key-123\ncat /etc/passwd' },
      { name: 'Semicolon command injection', key: 'test-key-123; rm -rf /' },
      { name: 'Dollar sign command injection', key: 'test-key-123$(echo "injected")' }
    ];

    const results = {};

    for (const scenario of commandInjectionPayloads) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401or500: response.status === 401 || response.status === 500,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401or500: error.response?.status === 401 || error.response?.status === 500,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test path traversal scenarios
   */
  async pathTraversal(endpoint) {
    const pathTraversalPayloads = [
      { name: 'Basic path traversal', key: 'test-key-123/../../etc/passwd' },
      { name: 'URL encoded path traversal', key: 'test-key-123%2f..%2f..%2fetc%2fpasswd' },
      { name: 'Double URL encoded path traversal', key: 'test-key-123%252f..%252f..%252fetc%252fpasswd' },
      { name: 'Windows path traversal', key: 'test-key-123..\\..\\windows\\system32\\config\\sam' },
      { name: 'Mixed path traversal', key: 'test-key-123/../etc/./passwd' },
      { name: 'Long path traversal', key: 'test-key-123/../../../../../../../../../../etc/passwd' },
      { name: 'Null byte path traversal', key: 'test-key-123/../../etc/passwd\x00' },
      { name: 'Multiple path traversal', key: 'test-key-123../../etc/passwd../../etc/shadow' }
    ];

    const results = {};

    for (const scenario of pathTraversalPayloads) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: scenario.key
        });

        results[scenario.name] = {
          status: response.status,
          expected401or400: response.status === 401 || response.status === 400,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          expected401or400: error.response?.status === 401 || error.response?.status === 400,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test header spoofing scenarios
   */
  async headerSpoofing(endpoint) {
    const headerSpoofingScenarios = [
      { name: 'Host header spoofing', headers: { 'Host': 'malicious.com' } },
      { name: 'X-Forwarded-For spoofing', headers: { 'X-Forwarded-For': '127.0.0.1' } },
      { name: 'X-Real-IP spoofing', headers: { 'X-Real-IP': '192.168.1.1' } },
      { name: 'User-Agent spoofing', headers: { 'User-Agent': 'Googlebot/2.1' } },
      { name: 'Referer spoofing', headers: { 'Referer': 'https://malicious.com' } },
      { name: 'Cookie injection', headers: { 'Cookie': 'session=malicious; admin=true' } },
      { name: 'Authorization injection', headers: { 'Authorization': 'Bearer fake-token' } },
      { name: 'Multiple auth headers', headers: { 'X-ODEAL-REQUEST-KEY': 'test-key-123', 'Authorization': 'Bearer fake-token' } }
    ];

    const results = {};

    for (const scenario of headerSpoofingScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'test-key-123',
          customHeaders: scenario.headers
        });

        results[scenario.name] = {
          status: response.status,
          successful: response.status === 200,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test method tampering scenarios
   */
  async methodTampering(endpoint) {
    const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS', 'TRACE', 'CONNECT'];
    const results = {};

    for (const method of methods) {
      try {
        const response = await this.client.createAuthenticatedRequest(method, endpoint, null, {
          key: 'test-key-123'
        });

        results[method] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[method] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test content type tampering scenarios
   */
  async contentTypeTampering(endpoint) {
    const contentTypes = [
      { name: 'application/xml', contentType: 'application/xml' },
      { name: 'text/html', contentType: 'text/html' },
      { name: 'text/plain', contentType: 'text/plain' },
      { name: 'application/x-www-form-urlencoded', contentType: 'application/x-www-form-urlencoded' },
      { name: 'multipart/form-data', contentType: 'multipart/form-data' },
      { name: 'application/octet-stream', contentType: 'application/octet-stream' },
      { name: 'Missing content type', contentType: null },
      { name: 'Invalid content type', contentType: 'invalid/content-type' },
      { name: 'Empty content type', contentType: '' }
    ];

    const results = {};

    for (const scenario of contentTypes) {
      try {
        const response = await this.client.createAuthenticatedRequest('POST', endpoint, { test: 'data' }, {
          key: 'test-key-123',
          customHeaders: scenario.contentType ? { 'Content-Type': scenario.contentType } : {}
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test multiple authentication headers scenarios
   */
  async multipleAuthHeaders(endpoint) {
    const multiAuthScenarios = [
      { name: 'Duplicate auth headers', headers: { 'X-ODEAL-REQUEST-KEY': ['test-key-123', 'test-key-123'] } },
      { name: 'Different auth headers', headers: { 'X-ODEAL-REQUEST-KEY': ['test-key-123', 'wrong-key-123'] } },
      { name: 'Empty and valid auth headers', headers: { 'X-ODEAL-REQUEST-KEY': ['', 'test-key-123'] } },
      { name: 'Multiple auth methods', headers: { 'X-ODEAL-REQUEST-KEY': 'test-key-123', 'Authorization': 'Bearer token' } },
      { name: 'Three auth headers', headers: { 'X-ODEAL-REQUEST-KEY': ['test-key-123', 'test-key-123', 'test-key-123'] } }
    ];

    const results = {};

    for (const scenario of multiAuthScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest('GET', endpoint, null, {
          key: 'test-key-123',
          customHeaders: scenario.headers
        });

        results[scenario.name] = {
          status: response.status,
          successful: response.status === 200,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          successful: false,
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test CORS preflight scenarios
   */
  async corsPreflight(endpoint) {
    const corsScenarios = [
      { name: 'Standard CORS preflight', method: 'OPTIONS', headers: { 'Origin': 'http://localhost:3000', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-ODEAL-REQUEST-KEY' } },
      { name: 'Different origin preflight', method: 'OPTIONS', headers: { 'Origin': 'http://malicious.com', 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-ODEAL-REQUEST-KEY' } },
      { name: 'Missing headers preflight', method: 'OPTIONS', headers: { 'Origin': 'http://localhost:3000' } },
      { name: 'Invalid method preflight', method: 'OPTIONS', headers: { 'Origin': 'http://localhost:3000', 'Access-Control-Request-Method': 'INVALID', 'Access-Control-Request-Headers': 'X-ODEAL-REQUEST-KEY' } },
      { name: 'No origin preflight', method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'GET', 'Access-Control-Request-Headers': 'X-ODEAL-REQUEST-KEY' } }
    ];

    const results = {};

    for (const scenario of corsScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest(scenario.method, endpoint, null, {
          key: 'test-key-123',
          customHeaders: scenario.headers
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Test OPTIONS method scenarios
   */
  async optionsMethod(endpoint) {
    const optionsScenarios = [
      { name: 'OPTIONS without auth', method: 'OPTIONS', auth: false },
      { name: 'OPTIONS with auth', method: 'OPTIONS', auth: true },
      { name: 'OPTIONS with custom headers', method: 'OPTIONS', auth: false, headers: { 'X-Custom-Header': 'value' } },
      { name: 'OPTIONS with body', method: 'OPTIONS', auth: false, body: { test: 'data' } }
    ];

    const results = {};

    for (const scenario of optionsScenarios) {
      try {
        const response = await this.client.createAuthenticatedRequest(scenario.method, endpoint, scenario.body, {
          key: scenario.auth ? 'test-key-123' : null,
          customHeaders: scenario.headers || {}
        });

        results[scenario.name] = {
          status: response.status,
          responseTime: response.config?.metadata?.duration || 0,
          data: response.data
        };
      } catch (error) {
        results[scenario.name] = {
          status: error.response?.status || 'error',
          error: error.message
        };
      }
    }

    return results;
  }

  /**
   * Generate comprehensive test report
   */
  generateReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: Object.keys(results).length,
      passedTests: 0,
      failedTests: 0,
      vulnerableTests: 0,
      scenarios: {},
      recommendations: [],
      securityScore: 0
    };

    for (const [scenarioName, scenarioResults] of Object.entries(results)) {
      const scenarioReport = {
        name: scenarioName,
        totalSubtests: Object.keys(scenarioResults).length,
        passedSubtests: 0,
        failedSubtests: 0,
        vulnerableSubtests: 0,
        details: scenarioResults
      };

      // Analyze each subtest
      for (const [subtestName, subtestResult] of Object.entries(scenarioResults)) {
        if (subtestResult.successful === true) {
          scenarioReport.passedSubtests++;
        } else if (subtestResult.successful === false) {
          scenarioReport.failedSubtests++;
        }

        // Check for potential vulnerabilities
        if (this.isPotentiallyVulnerable(subtestResult)) {
          scenarioReport.vulnerableSubtests++;
        }
      }

      report.scenarios[scenarioName] = scenarioReport;
      report.passedTests += scenarioReport.passedSubtests;
      report.failedTests += scenarioReport.failedSubtests;
      report.vulnerableTests += scenarioReport.vulnerableSubtests;
    }

    // Calculate security score
    const totalTests = report.passedTests + report.failedTests + report.vulnerableTests;
    report.securityScore = totalTests > 0 ? Math.round((report.passedTests / totalTests) * 100) : 0;

    // Generate recommendations
    report.recommendations = this.generateRecommendations(results);

    return report;
  }

  /**
   * Check if a test result indicates potential vulnerability
   */
  isPotentiallyVulnerable(result) {
    // Check if injection attacks were successful
    if (result.successful === true && (
      result.key?.includes('<script>') ||
      result.key?.includes('SELECT') ||
      result.key?.includes('UNION') ||
      result.key?.includes('DROP') ||
      result.key?.includes('../') ||
      result.key?.includes('..\\')
    )) {
      return true;
    }

    // Check if malformed input was accepted
    if (result.successful === true && (
      result.key?.includes('\x00') ||
      result.key?.includes('\n') ||
      result.key?.includes('\r') ||
      result.key?.includes('\t')
    )) {
      return true;
    }

    // Check if unexpected status codes were returned
    if (result.status && result.status >= 500) {
      return true;
    }

    return false;
  }

  /**
   * Generate security recommendations based on test results
   */
  generateRecommendations(results) {
    const recommendations = [];

    // Analyze authentication results
    const authResults = results.validAuthentication;
    if (authResults) {
      const failedValidations = Object.values(authResults).filter(r => r.successful === false);
      if (failedValidations.length > 0) {
        recommendations.push({
          priority: 'high',
          category: 'Authentication',
          issue: 'Valid authentication failures detected',
          recommendation: 'Review authentication validation logic and ensure all valid key formats are accepted'
        });
      }
    }

    // Analyze injection results
    const injectionResults = [
      ...Object.values(results.sqlInjection || {}),
      ...Object.values(results.xssInjection || {}),
      ...Object.values(results.commandInjection || {}),
      ...Object.values(results.pathTraversal || {})
    ];

    const successfulInjections = injectionResults.filter(r => r.successful === true);
    if (successfulInjections.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'Injection Attacks',
        issue: 'Potential injection vulnerabilities detected',
        recommendation: 'Implement proper input validation and parameterized queries to prevent injection attacks'
      });
    }

    // Analyze malformed input results
    const malformedResults = Object.values(results.malformedAuthentication || {});
    const acceptedMalformed = malformedResults.filter(r => r.successful === true);
    if (acceptedMalformed.length > 0) {
      recommendations.push({
        priority: 'high',
        category: 'Input Validation',
        issue: 'Malformed input accepted',
        recommendation: 'Implement strict input validation and reject malformed authentication keys'
      });
    }

    // Analyze missing authentication results
    const missingResults = Object.values(results.missingAuthentication || {});
    const acceptedMissing = missingResults.filter(r => r.expected401 === false);
    if (acceptedMissing.length > 0) {
      recommendations.push({
        priority: 'critical',
        category: 'Authentication',
        issue: 'Missing authentication not properly rejected',
        recommendation: 'Ensure all endpoints require valid authentication and reject requests without proper authentication'
      });
    }

    // Add general recommendations
    recommendations.push({
      priority: 'medium',
      category: 'Security',
      issue: 'Security testing coverage',
      recommendation: 'Implement regular security testing and consider using automated security scanning tools'
    });

    recommendations.push({
      priority: 'medium',
      category: 'Monitoring',
      issue: 'Security monitoring',
      recommendation: 'Implement comprehensive logging and monitoring for authentication attempts and security events'
    });

    return recommendations;
  }
}

/**
 * Factory function to create authentication scenarios
 */
export function createAuthScenarios(client = null) {
  return new AuthScenarios(client);
}

export default AuthScenarios;