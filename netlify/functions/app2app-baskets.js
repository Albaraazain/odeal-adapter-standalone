const { verifyOdeal, allowMethods } = require('../../api/_lib/verify.js');
const { resolveBasket } = require('../../src/basketProvider.js');

async function handler(event, context) {
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
    let referenceCode = pathParts[pathParts.length - 1];

    // Handle directcharge fallback format by reconstructing the full reference
    if (referenceCode === 'directcharge' && event.queryStringParameters) {
      const queryStr = Object.entries(event.queryStringParameters)
        .map(([key, value]) => `${key}=${value}`)
        .join('&');
      if (queryStr) {
        referenceCode = `directcharge?${queryStr}`;
        console.log('Reconstructed directcharge referenceCode:', referenceCode);
      }
    }

    // Validate referenceCode format
    if (!referenceCode || referenceCode.trim() === '' || referenceCode === 'baskets') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Invalid reference code',
          detail: 'Reference code must be in format ROP_123, CHECK_123, UUID, or directcharge fallback format'
        })
      };
    }

    // Convert Netlify event to Vercel-like request/response format
    // Properly merge query parameters with extracted referenceCode
    const queryParams = event.queryStringParameters || {};
    const req = {
      method: event.httpMethod,
      headers: event.headers,
      body: event.body ? (function() {
        try {
          return JSON.parse(event.body);
        } catch (parseError) {
          console.warn('Failed to parse request body:', parseError.message);
          return {};
        }
      })() : {},
      query: { ...queryParams, referenceCode }
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

    // Log the referenceCode for debugging
    console.log('Processing basket request for referenceCode:', referenceCode);

    // Resolve basket
    const basket = await resolveBasket(referenceCode);

    // Validate basket result
    if (!basket) {
      console.warn('Basket resolution returned null/undefined for referenceCode:', referenceCode);
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Basket not found',
          detail: `No basket found for reference code: ${referenceCode}`,
          referenceCode: referenceCode
        })
      };
    }

    console.log('Successfully resolved basket for referenceCode:', referenceCode);
    res.json(basket);

    return {
      statusCode: res.statusCode,
      headers: res.headers,
      body: res.body
    };

  } catch (error) {
    console.error('Basket resolution error for referenceCode:', referenceCode, 'Error:', error);

    // Handle specific error types
    if (error.message && error.message.includes('not found')) {
      return {
        statusCode: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
          error: 'Basket not found',
          detail: error.message,
          referenceCode: referenceCode
        })
      };
    }

    // Generic server error
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Basket resolution error',
        detail: error.message,
        referenceCode: referenceCode
      })
    };
  }
}

module.exports = { handler };