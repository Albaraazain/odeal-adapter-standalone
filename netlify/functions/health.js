// Health check doesn't need verification

async function handler(event, context) {
  try {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: JSON.stringify({
        ok: true,
        ts: new Date().toISOString(),
        platform: 'netlify'
      })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'Health check failed',
        detail: error.message
      })
    };
  }
}

module.exports = { handler };