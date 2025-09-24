import { verifyOdeal, allowMethods } from '../../api/_lib/verify.js';
import { handleWebhook } from '../../api/_lib/bridge.js';

export async function handler(event, context) {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Convert Netlify event to Vercel-like request/response format
    const req = {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : {},
      query: event.queryStringParameters || {}
    };

    const res = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      json: (data) => {
        res.body = JSON.stringify(data);
        return res;
      },
      status: (code) => {
        res.statusCode = code;
        return res;
      }
    };

    // Verify method and authentication
    if (!allowMethods(req, res, ['POST'])) {
      return {
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body
      };
    }

    if (!verifyOdeal(req, res)) {
      return {
        statusCode: res.statusCode,
        headers: res.headers,
        body: res.body
      };
    }

    // Handle webhook
    await handleWebhook('payment-succeeded', req, res);

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    };

  } catch (error) {
    console.error('Webhook error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Webhook error',
        detail: error.message
      })
    };
  }
}