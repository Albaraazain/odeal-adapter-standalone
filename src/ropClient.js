import axios from 'axios';
import { log } from './logger.js';

const ROP_BASE_URL = process.env.ROP_BASE_URL || 'http://test.ropapi.com/V6/App2App';

function reqBaseFrom({ deviceId, restaurantId }) {
  if (!deviceId || restaurantId == null) {
    throw new Error('Missing ROP credentials (deviceId, restaurantId)');
  }
  return {
    DeviceId: String(deviceId),
    RestaurantId: Number(restaurantId),
  };
}

function makeHttp() {
  const isHttps = /^https:\/\//i.test(ROP_BASE_URL);
  if (process.env.NODE_ENV === 'production' && !isHttps) {
    throw new Error('ROP_BASE_URL must be HTTPS in production');
  }
  if (!isHttps) {
    // Allow http in non-prod, but warn
    log.warn('ROP_BASE_URL is not HTTPS; use TLS in production', { ROP_BASE_URL });
  }
  const instance = axios.create({
    timeout: Number(process.env.ROP_HTTP_TIMEOUT_MS || 5000),
    maxRedirects: 0,
    validateStatus: (s) => s >= 200 && s < 300,
  });
  return instance;
}
const http = makeHttp();

async function getCheckDetail({ deviceId, restaurantId, CheckId, CheckNo = 0, TableNo = '' }) {
  const base = reqBaseFrom({ deviceId, restaurantId });
  const params = {
    ...base,
    CheckId: CheckId || 0,
    CheckNo,
    TableNo,
  };

  const url = `${ROP_BASE_URL}/CheckDetail`;
  // Although the Postman shows GET with body, we pass params in query.
  const t0 = Date.now();
  log.info('ROP CheckDetail → GET', {
    url,
    hasCreds: Boolean(deviceId && restaurantId),
    deviceId,
    restaurantId,
    checkId: params.CheckId,
  });
  const { data } = await http.get(url, { params });
  log.info('ROP CheckDetail ← OK', { ms: Date.now() - t0, checkId: params.CheckId });
  return data;
}

async function postPaymentStatus({
  deviceId,
  restaurantId,
  CheckId,
  Status,
  PaymentType = 1,
  Options,
  Payments,
  Customer,
  Invoice,
}) {
  const base = reqBaseFrom({ deviceId, restaurantId });
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
  const t0 = Date.now();
  log.info('ROP PaymentStatus → POST', {
    url,
    checkId: body.CheckId,
    status: body.Status,
    payments: Array.isArray(body.Payments) ? body.Payments.length : 0,
  });
  const { data } = await http.post(url, body);
  log.info('ROP PaymentStatus ← OK', { ms: Date.now() - t0, checkId: body.CheckId, status: body.Status });
  return data;
}

export {
  getCheckDetail,
  postPaymentStatus
};
