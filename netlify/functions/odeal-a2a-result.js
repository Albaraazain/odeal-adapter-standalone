const { verifyOdeal, allowMethods } = require('../../api/_lib/verify.js');
const { extractCheckId } = require('../../src/basketProvider.js');

async function handler(event, context) {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': 'https://ropservice.duckdns.org',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-ODEAL-REQUEST-KEY',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
      },
      body: ''
    };
  }

  try {
    // Extract Ödeal callback parameters from query string
    const queryParams = event.queryStringParameters || {};
    const { basketReferenceCode, reason, result } = queryParams;

    // Log the callback for debugging
    console.log('Ödeal A2A callback received:', {
      basketReferenceCode,
      reason,
      result,
      allParams: queryParams
    });

    // Validate required parameters
    if (!basketReferenceCode) {
      console.error('Missing basketReferenceCode in Ödeal callback');
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://ropservice.duckdns.org'
        },
        body: JSON.stringify({
          error: 'Missing basketReferenceCode',
          detail: 'basketReferenceCode parameter is required in callback'
        })
      };
    }

    // Parse result as boolean (from URL parameter)
    const paymentSuccessful = result === 'true' || result === true;

    // Extract checkId from basketReferenceCode
    const checkId = extractCheckId(basketReferenceCode);

    // Prepare response for deep link redirect back to Flutter app
    const responseData = {
      basketReferenceCode,
      checkId,
      paymentSuccessful,
      reason: reason || null,
      timestamp: new Date().toISOString()
    };

    // Return HTML page that will redirect back to the Flutter app via deep link
    const redirectHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>Ödeal Payment Result</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 400px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { color: #4CAF50; }
        .error { color: #f44336; }
        .info { color: #2196F3; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Ödeal Payment ${paymentSuccessful ? 'Successful' : 'Failed'}</h2>
        <p class="${paymentSuccessful ? 'success' : 'error'}">
            ${paymentSuccessful ? '✅ Payment completed successfully!' : '❌ Payment failed or was cancelled.'}
        </p>
        ${reason ? `<p>Reason: ${reason}</p>` : ''}
        <p class="info">Redirecting back to app...</p>

        <script>
            // Data to pass back to Flutter app
            const paymentData = ${JSON.stringify(responseData)};

            // Try to redirect back to Flutter app
            setTimeout(() => {
                // Construct deep link back to Flutter app with payment result
                const deepLinkUrl = "rop://payment-result?" +
                    "basketReferenceCode=" + encodeURIComponent("${basketReferenceCode}") +
                    "&result=" + encodeURIComponent("${paymentSuccessful}") +
                    "&reason=" + encodeURIComponent("${reason || ''}") +
                    "&checkId=" + encodeURIComponent("${checkId || ''}");

                console.log("Attempting to redirect to:", deepLinkUrl);

                // Try to redirect to Flutter app
                window.location.href = deepLinkUrl;

                // Fallback: Show manual instructions after a delay
                setTimeout(() => {
                    document.body.innerHTML +=
                        '<p style="margin-top: 30px; color: #666;">' +
                        'If the app did not open automatically, please return to the ROP app manually.' +
                        '</p>';
                }, 3000);

            }, 1500);
        </script>
    </div>
</body>
</html>`;

    // Return HTML response that will handle the redirect
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': 'https://ropservice.duckdns.org'
      },
      body: redirectHtml
    };

  } catch (error) {
    console.error('Ödeal A2A callback error:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'https://ropservice.duckdns.org'
      },
      body: JSON.stringify({
        error: 'Callback processing error',
        detail: error.message
      })
    };
  }
}

module.exports = { handler };