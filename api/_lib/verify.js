function verifyOdeal(req, res) {
  const expected = process.env.ODEAL_REQUEST_KEY;
  // Try different header formats for Netlify/Vercel compatibility
  const got = req.headers['x-odeal-request-key'] ||
              req.headers['X-ODEAL-REQUEST-KEY'] ||
              req.headers['X-Odeal-Request-Key'];

  if (!expected || !got || got !== expected) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

function allowMethods(req, res, methods) {
  if (!methods.includes(req.method)) {
    res.setHeader('Allow', methods.join(', '));
    res.status(405).end();
    return false;
  }
  return true;
}

module.exports = {
  verifyOdeal,
  allowMethods
};

