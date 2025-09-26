import { v4 as uuidv4 } from 'uuid';

/**
 * Test Data Factories for Ödeal Vercel Functions Testing
 * Provides factory functions for creating realistic test data
 */

/**
 * Factory for creating basket test data
 */
export class BasketFactory {
  static createBasket(overrides = {}) {
    const referenceCode = overrides.referenceCode || this.generateReferenceCode();

    return {
      referenceCode,
      basketPrice: {
        grossPrice: overrides.total || 100.00,
        netPrice: overrides.netTotal || 90.00,
        discount: overrides.discount || 0,
        vat: overrides.vat || 10.00
      },
      products: this.createProducts(overrides.products || []),
      customerInfo: overrides.customerInfo || {},
      employeeInfo: overrides.employeeInfo || {},
      receiptInfo: overrides.receiptInfo || {},
      customInfo: overrides.customInfo || null,
      paymentOptions: overrides.paymentOptions || [
        {
          type: 'CREDITCARD',
          amount: overrides.total || 100.00,
          cardType: 'VISA',
          lastFour: '1234'
        }
      ],
      ...overrides
    };
  }

  static createProducts(products = []) {
    if (products.length > 0) {
      return products;
    }

    return [
      {
        referenceCode: 'TEST-001',
        name: 'Test Product',
        quantity: 1,
        unitCode: 'ADET',
        price: {
          grossPrice: 100.00,
          netPrice: 90.00,
          vatRatio: 0.10,
          sctRatio: 0
        },
        category: 'FOOD',
        modifiers: []
      }
    ];
  }

  static createLargeBasket(itemCount = 50) {
    const products = Array.from({ length: itemCount }, (_, index) => ({
      referenceCode: `ITEM-${String(index + 1).padStart(3, '0')}`,
      name: `Product ${index + 1}`,
      quantity: Math.floor(Math.random() * 5) + 1,
      unitCode: 'ADET',
      price: {
        grossPrice: Math.floor(Math.random() * 200) + 10,
        netPrice: Math.floor(Math.random() * 180) + 9,
        vatRatio: 0.10,
        sctRatio: 0
      },
      category: ['FOOD', 'DRINK', 'DESSERT', 'APPETIZER'][Math.floor(Math.random() * 4)],
      modifiers: []
    }));

    const total = products.reduce((sum, product) =>
      sum + (product.price.grossPrice * product.quantity), 0
    );

    return this.createBasket({
      referenceCode: this.generateReferenceCode('LARGE'),
      products,
      paymentOptions: [{ type: 'CREDITCARD', amount: total }]
    });
  }

  static createEmptyBasket() {
    return this.createBasket({
      referenceCode: this.generateReferenceCode('EMPTY'),
      products: [],
      basketPrice: { grossPrice: 0, netPrice: 0, discount: 0, vat: 0 },
      paymentOptions: []
    });
  }

  static createBasketWithSpecialCharacters() {
    return this.createBasket({
      referenceCode: 'TEST_émojis_🎉_special_chars_123',
      products: [
        {
          referenceCode: 'CAFÉ-001',
          name: 'Café au Lait',
          quantity: 2,
          unitCode: 'ADET',
          price: { grossPrice: 25.50, vatRatio: 0.10, sctRatio: 0 }
        }
      ]
    });
  }

  static generateReferenceCode(prefix = 'TEST') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5);
    return `${prefix}_${timestamp}_${random}`;
  }
}

/**
 * Factory for creating webhook test data
 */
export class WebhookFactory {
  static createWebhookPayload(type, referenceCode, overrides = {}) {
    const basePayload = {
      basketReferenceCode: referenceCode,
      paymentId: `pay_${uuidv4()}`,
      amount: overrides.amount || 100.00,
      currency: overrides.currency || 'TRY',
      timestamp: overrides.timestamp || new Date().toISOString(),
      merchantId: overrides.merchantId || 'MERCHANT_001',
      terminalId: overrides.terminalId || 'TERM_001',
      ...overrides
    };

    switch (type) {
      case 'payment-succeeded':
        return {
          ...basePayload,
          status: 'succeeded',
          transactionId: `txn_${uuidv4()}`,
          authCode: 'AUTH123',
          rrn: 'RRN123456789',
          cardType: 'VISA',
          lastFour: '1234'
        };

      case 'payment-failed':
        return {
          ...basePayload,
          status: 'failed',
          errorCode: overrides.errorCode || 'card_declined',
          errorMessage: overrides.errorMessage || 'Card was declined',
          failureReason: overrides.failureReason || 'Do not honor'
        };

      case 'payment-cancelled':
        return {
          ...basePayload,
          status: 'cancelled',
          reason: overrides.reason || 'user_cancelled',
          cancellationTime: new Date().toISOString()
        };

      default:
        return basePayload;
    }
  }

  static createSuccessWebhook(referenceCode, overrides = {}) {
    return this.createWebhookPayload('payment-succeeded', referenceCode, overrides);
  }

  static createFailedWebhook(referenceCode, overrides = {}) {
    return this.createWebhookPayload('payment-failed', referenceCode, overrides);
  }

  static createCancelledWebhook(referenceCode, overrides = {}) {
    return this.createWebhookPayload('payment-cancelled', referenceCode, overrides);
  }

  static createInvalidWebhook(overrides = {}) {
    return {
      // Missing required fields
      paymentId: 'pay_123',
      ...overrides
    };
  }

  static createMalformedWebhook() {
    return 'invalid json string';
  }

  static createDuplicateWebhook(originalPayload) {
    return {
      ...originalPayload,
      paymentId: originalPayload.paymentId,
      timestamp: originalPayload.timestamp
    };
  }
}

/**
 * Factory for creating ROP API test data
 */
export class RopFactory {
  static createCheckDetailResponse(overrides = {}) {
    return {
      CheckId: overrides.checkId || 1234567,
      CheckNo: overrides.checkNo || 1,
      TableNo: overrides.tableNo || 'A1',
      Status: overrides.status || 1,
      Details: overrides.details || [
        {
          Name: 'Test Product',
          Quantity: 1,
          Total: 100.00,
          Code: 'TEST-001',
          Price: 100.00,
          Category: 'FOOD',
          VatRate: 0.10
        }
      ],
      ...overrides
    };
  }

  static createEmptyCheckResponse(checkId = 1234567) {
    return this.createCheckDetailResponse({
      checkId,
      Details: []
    });
  }

  static createLargeCheckResponse(itemCount = 100) {
    const details = Array.from({ length: itemCount }, (_, index) => ({
      Name: `Product ${index + 1}`,
      Quantity: Math.floor(Math.random() * 5) + 1,
      Total: Math.floor(Math.random() * 200) + 10,
      Code: `ITEM-${String(index + 1).padStart(3, '0')}`,
      Price: Math.floor(Math.random() * 200) + 10,
      Category: ['FOOD', 'DRINK', 'DESSERT', 'APPETIZER'][Math.floor(Math.random() * 4)],
      VatRate: 0.10
    }));

    return this.createCheckDetailResponse({
      details
    });
  }

  static createPaymentStatusResponse(overrides = {}) {
    return {
      success: overrides.success !== false,
      CheckId: overrides.checkId || 1234567,
      Status: overrides.status || 1,
      Message: overrides.message || 'Payment processed successfully',
      PaymentId: overrides.paymentId || `pay_${uuidv4()}`,
      ...overrides
    };
  }

  static createFailedPaymentStatusResponse(overrides = {}) {
    return this.createPaymentStatusResponse({
      success: false,
      status: 0,
      message: overrides.message || 'Payment failed',
      errorCode: overrides.errorCode || 'PAYMENT_FAILED',
      ...overrides
    });
  }
}

/**
 * Factory for creating error scenarios
 */
export class ErrorFactory {
  static createNetworkError() {
    const error = new Error('Network error');
    error.code = 'NETWORK_ERROR';
    error.status = null;
    return error;
  }

  static createTimeoutError() {
    const error = new Error('Request timeout');
    error.code = 'ECONNABORTED';
    error.status = null;
    return error;
  }

  static createAuthError() {
    const error = new Error('Unauthorized');
    error.code = 'AUTH_ERROR';
    error.status = 401;
    error.response = {
      status: 401,
      data: { error: 'Unauthorized' }
    };
    return error;
  }

  static createValidationError(message = 'Validation error') {
    const error = new Error(message);
    error.code = 'VALIDATION_ERROR';
    error.status = 400;
    error.response = {
      status: 400,
      data: { error: message }
    };
    return error;
  }

  static createServerError() {
    const error = new Error('Internal server error');
    error.code = 'SERVER_ERROR';
    error.status = 500;
    error.response = {
      status: 500,
      data: { error: 'Internal server error' }
    };
    return error;
  }

  static createRateLimitError() {
    const error = new Error('Rate limit exceeded');
    error.code = 'RATE_LIMIT_ERROR';
    error.status = 429;
    error.response = {
      status: 429,
      data: { error: 'Rate limit exceeded' }
    };
    return error;
  }
}

/**
 * Factory for creating performance test data
 */
export class PerformanceFactory {
  static createConcurrentRequests(count = 100) {
    return Array.from({ length: count }, (_, index) => ({
      referenceCode: `CONCURRENT_${Date.now()}_${index}`,
      requestTime: Date.now(),
      expectedDuration: Math.random() * 1000 + 100 // 100-1100ms
    }));
  }

  static createLoadTestData(scenarios = 10, requestsPerScenario = 100) {
    const scenarioTypes = ['SUCCESS', 'EMPTY_BASKET', 'NOT_FOUND', 'NETWORK_ERROR'];

    return scenarioTypes.map(scenario => ({
      scenario,
      requests: Array.from({ length: requestsPerScenario }, (_, index) => ({
        referenceCode: `${scenario}_${Date.now()}_${index}`,
        requestTime: Date.now(),
        expectedDuration: this.getExpectedDuration(scenario)
      }))
    }));
  }

  static getExpectedDuration(scenario) {
    switch (scenario) {
      case 'SUCCESS': return Math.random() * 500 + 50;     // 50-550ms
      case 'EMPTY_BASKET': return Math.random() * 200 + 20; // 20-220ms
      case 'NOT_FOUND': return Math.random() * 300 + 30;    // 30-330ms
      case 'NETWORK_ERROR': return Math.random() * 5000 + 1000; // 1000-6000ms
      default: return Math.random() * 1000 + 100;           // 100-1100ms
    }
  }
}

/**
 * Factory for creating integration test data
 */
export class IntegrationFactory {
  static createCompleteFlow(referenceCode = null) {
    const refCode = referenceCode || `INTEGRATION_${Date.now()}`;

    return {
      basket: BasketFactory.createBasket({ referenceCode: refCode }),
      webhookSuccess: WebhookFactory.createSuccessWebhook(refCode),
      webhookFailed: WebhookFactory.createFailedWebhook(refCode),
      webhookCancelled: WebhookFactory.createCancelledWebhook(refCode),
      expectedSteps: [
        'create_basket',
        'process_payment_success',
        'handle_webhook',
        'verify_idempotency'
      ]
    };
  }

  static createEndToEndTestData() {
    const referenceCodes = Array.from({ length: 5 }, () =>
      `E2E_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`
    );

    return referenceCodes.map(code => this.createCompleteFlow(code));
  }

  static createEdgeCaseScenarios() {
    return [
      {
        name: 'Special Characters',
        data: BasketFactory.createBasketWithSpecialCharacters()
      },
      {
        name: 'Empty Basket',
        data: BasketFactory.createEmptyBasket()
      },
      {
        name: 'Large Basket',
        data: BasketFactory.createLargeBasket(100)
      },
      {
        name: 'Invalid Webhook',
        data: WebhookFactory.createInvalidWebhook()
      },
      {
        name: 'Malformed Webhook',
        data: WebhookFactory.createMalformedWebhook()
      }
    ];
  }
}

export default {
  BasketFactory,
  WebhookFactory,
  RopFactory,
  ErrorFactory,
  PerformanceFactory,
  IntegrationFactory
};