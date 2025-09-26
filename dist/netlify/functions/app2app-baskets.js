import { verifyOdeal, allowMethods } from '../../api/_lib/verify.js';
import { resolveBasket } from '../../src/basketProvider.js';

export async function handler(event, context) {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Extract referenceCode from path parameters
    const pathParts = event.path.split('/');
    const referenceCode = pathParts[pathParts.length - 1];

    // Convert Netlify event to Vercel-like request/response format
    const req = {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : {},
      query: event.queryStringParameters || {},
      query: { referenceCode }
    };

    const res = {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    if (!allowMethods(req, res, ['GET'])) {
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

    // Resolve basket
    const basket = await resolveBasket(referenceCode);
    res.json(basket);

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    };

  } catch (error) {
    console.error('Basket resolution error:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Basket resolution error',
        detail: error.message
      })
    };
  }
}