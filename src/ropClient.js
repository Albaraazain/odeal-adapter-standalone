import axios from 'axios';

const ROP_BASE_URL = process.env.ROP_BASE_URL || 'http://test.ropapi.com/V6/App2App';
const DEVICE_ID = process.env.DEVICE_ID;
const RESTAURANT_ID = process.env.RESTAURANT_ID;
const DEVICE_KEY = process.env.DEVICE_KEY;

function reqBase() {
  if (!DEVICE_ID || !RESTAURANT_ID || !DEVICE_KEY) {
    throw new Error('Missing ROP credentials (DEVICE_ID, RESTAURANT_ID, DEVICE_KEY)');
  }
  return {
    DeviceId: DEVICE_ID,
    RestaurantId: Number(RESTAURANT_ID),
    DeviceKey: DEVICE_KEY,
  };
}

function makeHttp() {
  const isHttps = /^https:\/\//i.test(ROP_BASE_URL);
  if (process.env.NODE_ENV === 'production' && !isHttps) {
    throw new Error('ROP_BASE_URL must be HTTPS in production');
  }
  if (!isHttps) {
    // Allow http in non-prod, but warn
    // eslint-disable-next-line no-console
    console.warn('[WARN] ROP_BASE_URL is not HTTPS; use TLS in production');
  }
  const instance = axios.create({
    timeout: Number(process.env.ROP_HTTP_TIMEOUT_MS || 5000),
    maxRedirects: 0,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return instance;
}
const http = makeHttp();

async function getCheckDetail({ CheckId, CheckNo = 0, TableNo = '' }) {
  const base = reqBase();
  const params = {
    ...base,
    CheckId: CheckId || 0,
    CheckNo,
    TableNo,
  };

  const url = `${ROP_BASE_URL}/CheckDetail`;
  // Although the Postman shows GET with body, we pass params in query.
  const { data } = await http.get(url, { params });
  return data;
}

async function postPaymentStatus({
  CheckId,
  Status,
  PaymentType = 1,
  Options,
  Payments,
  Customer,
  Invoice,
}) {
  const base = reqBase();
  const url = `${ROP_BASE_URL}/PaymentStatus`;
  const body = {
    ...base,
    CheckId: Number(CheckId) || 0,
    Status: Number(Status),
    PaymentType: Number(PaymentType),
    Options: Options || { TipAmount: 0 },
    Payments: Payments || [],
    Customer: Customer || undefined,
    Invoice: Invoice || undefined,
  };
  const { data } = await http.post(url, body);
  return data;
}

export {
  getCheckDetail,
  postPaymentStatus
};
