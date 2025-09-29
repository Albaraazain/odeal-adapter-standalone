Ödeal App-to-App Adapter (Local JS)
===================================

Purpose
- Exposes the inbound endpoints Ödeal needs during App‑to‑App (A2A):
  - GET `/app2app/baskets/:referenceCode` – Ödeal fetches your basket JSON.
  - POST `/webhooks/odeal/payment-succeeded`
  - POST `/webhooks/odeal/payment-failed`
  - POST `/webhooks/odeal/payment-cancelled`
- Verifies the shared header `X-ODEAL-REQUEST-KEY`.
- Optionally bridges results to your existing ROP `PaymentStatus` endpoint.

Quick Start
1) Create an `.env` file (see `.env.example`).
2) Install and run:

```
cd odeal_adapter
npm install
npm start
```

Deploy to Vercel (recommended for public URLs)
1) Install CLI and log in:
```
npm i -g vercel
vercel login
```
2) Create/deploy from the adapter folder:
```
vercel --cwd odeal_adapter   # first deploy (choose scope, project name)
```
3) Add environment variables (repeat for preview/prod):
```
vercel env add ODEAL_REQUEST_KEY
vercel env add BASKET_PROVIDER
vercel env add ROP_BASE_URL
vercel env add DEVICE_ID
vercel env add RESTAURANT_ID
vercel env add DEVICE_KEY
vercel env add ROUTE_ROP_AUTOSYNC
```
4) Redeploy picking up env:
```
vercel --cwd odeal_adapter --prod
```

Vercel endpoints (base example: https://YOUR-PROJECT.vercel.app)
- Basket: `GET /api/app2app/baskets/{referenceCode}`
- Webhooks:
  - `POST /api/webhooks/odeal/payment-succeeded`
  - `POST /api/webhooks/odeal/payment-failed`
  - `POST /api/webhooks/odeal/payment-cancelled`

Environment Variables
- `PORT` (default: 8787)
- `ODEAL_REQUEST_KEY` (required) – must match the value configured in Ödeal.
- `BASKET_PROVIDER` (optional: `mock` | `rop`, default `mock`)
- `BASKET_DEFAULT_TOTAL` (optional, default `100.00`) – used by `mock` provider.

Employee Info (employeeInfo)
- `ODEAL_EMPLOYEE_REF` – maps to `employeeInfo.employeeReferenceCode` (required in production)
- `ODEAL_EMPLOYEE_NAME` – maps to `employeeInfo.name` (optional)
- `ODEAL_EMPLOYEE_SURNAME` – maps to `employeeInfo.surname` (optional)
- `ODEAL_EMPLOYEE_GSM_NUMBER` – maps to `employeeInfo.gsmNumber` (optional)
- `ODEAL_EMPLOYEE_IDENTITY_NUMBER` – maps to `employeeInfo.identityNumber` (optional)
- `ODEAL_EMPLOYEE_MAIL_ADDRESS` – maps to `employeeInfo.mailAddress` (optional)
- `ODEAL_REQUIRE_EMPLOYEE` – default `true`; when `true`, baskets must include `employeeReferenceCode`. In mock mode, the adapter will fall back to a permissive payload if not set.

When using provider = rop, set:
- `ROP_BASE_URL` (default `http://test.ropapi.com/V6/App2App`)
- `DEVICE_ID` – your device serial (e.g., from `ro.epay.serial`)
- `RESTAURANT_ID` – your license number (integer)
- `DEVICE_KEY` – your device key from ROP

Optional ROP PaymentStatus bridge
- `ROUTE_ROP_AUTOSYNC` (optional: `true` | `false`, default `false`)
- On success/fail/cancel webhooks, the adapter will parse `basketReferenceCode` to infer `CheckId` (expects trailing digits or formats like `ROP_<CheckId>`), then POST to ROP `PaymentStatus`:
  - success → `Status=1`
  - failed  → `Status=-1`
  - cancelled → `Status=0`

Endpoint Shapes
GET /app2app/baskets/:referenceCode
- Headers: `X-ODEAL-REQUEST-KEY: <uuid>`
- Returns Ödeal basket JSON.

Customer in basket
- If customer env vars are set, adapter adds a `customer` object (doc-shaped) to the basket:
```
customer: {
  referenceCode: "CUST001",
  type: "PERSON",              // or "COMPANY"
  title: "End Consumer",       // or company title / full name
  name: "Ali",                 // optional
  surname: "Veli",             // optional
  taxOffice: "Istanbul",       // optional
  taxNumber: "1234567890",     // optional (VKN)
  identityNumber: "12345678901", // optional (TCKN)
  gsmNumber: "905551112233",   // optional
  email: "ali.veli@example.com", // optional
  city: "Istanbul",            // optional
  town: "Besiktas",            // optional
  address: "Barbaros Bulvari No:1" // optional
}
```
Environment keys are listed in `.env.example`.

Employee Info shape (embedded in basket)
```
employeeInfo: {
  employeeReferenceCode: "EMP001",   // required in production
  name: "Ahmet",                      // optional
  surname: "Yilmaz",                  // optional
  gsmNumber: "905551112233",          // optional
  identityNumber: "12345678901",      // optional
  mailAddress: "ahmet.yilmaz@example.com" // optional
}
```

POST /webhooks/odeal/payment-succeeded|failed|cancelled (or `/api/...` on Vercel)
- Headers: `X-ODEAL-REQUEST-KEY: <uuid>`
- Body: forwards whatever Ödeal sends; idempotent by `(eventType, basketReferenceCode, transactionId)`.

Sample cURL
```
# Basket fetch
curl -s "http://localhost:8787/app2app/baskets/ROP_3215799" \
  -H "X-ODEAL-REQUEST-KEY: $ODEAL_REQUEST_KEY" | jq .

# Webhook - success
curl -s -X POST "http://localhost:8787/webhooks/odeal/payment-succeeded" \
  -H "Content-Type: application/json" \
  -H "X-ODEAL-REQUEST-KEY: $ODEAL_REQUEST_KEY" \
  -d '{
        "basketReferenceCode":"ROP_3215799",
        "amount": 37.40,
        "transactionId": "odeal_tx_abc",
        "paymentType": "CREDITCARD",
        "createdAt": "2025-09-20T12:34:56Z"
      }'
```

Notes
- This service is for local/dev integration and can be deployed anywhere Ödeal can reach (public URL or via tunnel).
- If you already have Supabase, you can migrate this logic into Edge Functions later; the shapes remain identical.
