# ROP API Calls Used by Ödeal Adapter

Scope: Documents every outbound call the adapter makes to the Restaurant Operations Platform (ROP) from the Node adapter in `odeal_adapter/src`. Sources: `odeal_adapter/src/ropClient.js`, `odeal_adapter/src/basketProvider.js`, `odeal_adapter/src/server.js`.

## Base Configuration

- Base URL: `ROP_BASE_URL` (env). Default: `http://test.ropapi.com/V6/App2App` (`odeal_adapter/src/ropClient.js:4`).
- TLS: In `NODE_ENV=production`, non-HTTPS base is rejected (throws). Dev warns on HTTP (`odeal_adapter/src/ropClient.js:21`).
- Timeout: `ROP_HTTP_TIMEOUT_MS` (env). Default 5000 ms (`odeal_adapter/src/ropClient.js:29-33`).
- HTTP headers set by adapter: none custom; Axios default headers are used. Content type for POST is JSON.

## Authentication / Credentials

ROP expects device credentials inside the request (query for GET; JSON body for POST). No OAuth/bearer headers are used.

- DeviceId and RestaurantId are extracted from the Ödeal reference code using the composite format `DeviceId_RestaurantId_CheckId`.
- DeviceKey is NOT used by the adapter for Ödeal requests.

Credentials are validated per-call (`odeal_adapter/src/ropClient.js`).

## Reference / CheckId Resolution

Most ROP calls require a numeric `CheckId`. The adapter now expects a composite Ödeal reference code and parses values as follows:

```
DeviceId_RestaurantId_CheckId
```

If the reference is not composite, the adapter falls back to a mock basket and does not call ROP.

Values origin summary:

- `DeviceId` | `RestaurantId` → parsed from composite reference
- `DeviceKey` → not used
- `CheckId` → parsed from composite reference
- `PaymentType`, `Options`, `Payments`, `Customer`, `Invoice` → supplied by caller of `postPaymentStatus` (adapter’s webhook bridge provides minimal set)

## Endpoint 1: GET `${ROP_BASE_URL}/CheckDetail`

- Method: GET (`odeal_adapter/src/ropClient.js:47,57`)
- URL pattern: `/V6/App2App/CheckDetail`
- HTTP headers: none custom (Axios default). No auth headers are used; credentials are in query.

Query parameters (exact keys as sent):

- `DeviceId` (string) – required
- `RestaurantId` (number) – required
- `CheckId` (number) – required by adapter usage; adapter passes `0` only if caller didn’t provide (not used in normal flow)
- `CheckNo` (number) – optional (default 0)
- `TableNo` (string) – optional (default empty)

Request example:

```
GET {ROP_BASE_URL}/CheckDetail?DeviceId=ABC002&RestaurantId=1566000740&CheckId=3215799&CheckNo=0&TableNo=
```

Response schema (fields consumed by adapter):

- Either `Details` (array) or `Lines` (array) or `items` (array)
  - For each line object, adapter reads these alternative keys:
    - Name: `Name` | `name` | `ItemName`
    - Quantity: `Quantity` | `qty` | `Qty`
    - Line total (gross): `Total` | `Gross` | `Price`
    - SKU/Code: `Code` | `Sku` | `ItemCode`
    - Unit code: `Unit` | `unit` | `UnitCode` | `unitCode`

Notes:

- If no line items are present, the adapter falls back to a mock basket (no further ROP calls). (`odeal_adapter/src/basketProvider.js:133-190`)
- Any additional fields returned by ROP are ignored by the adapter.

## Endpoint 2: POST `${ROP_BASE_URL}/PaymentStatus`

- Method: POST (`odeal_adapter/src/ropClient.js:72,90`)
- URL pattern: `/V6/App2App/PaymentStatus`
- HTTP headers: `Content-Type: application/json` (Axios default). No custom auth headers.

JSON body (exact keys as sent):

- `DeviceId` (string) – required
- `RestaurantId` (number) – required
- `CheckId` (number) – required
- `Status` (number) – required
- `PaymentType` (number) – optional; default `1`
- `Options` (object) – optional; default `{ "TipAmount": 0 }`
- `Payments` (array) – optional; default `[]`
- `Customer` (object) – optional; omitted if not provided
- `Invoice` (object) – optional; omitted if not provided

Request example (as sent by the adapter’s webhook bridge):

```json
POST {ROP_BASE_URL}/PaymentStatus
{
  "DeviceId": "ABC002",
  "RestaurantId": 1566000740,
  "CheckId": 3215799,
  "Status": 1,
  "PaymentType": 1,
  "Options": { "TipAmount": 0 },
  "Payments": []
}
```

Response schema:

- The adapter does not read any fields from the response; payload is logged and discarded. Treat as opaque JSON.

### Status mapping (Ödeal → ROP)

When `ROUTE_ROP_AUTOSYNC=true`, the adapter bridges Ödeal webhooks to ROP `PaymentStatus` (`odeal_adapter/src/server.js:232-259, 314-331`). Mapping:

- `/webhooks/odeal/payment-succeeded` → `Status: 1`
- `/webhooks/odeal/payment-cancelled` → `Status: 0`
- `/webhooks/odeal/payment-failed` → `Status: -1`

`DeviceId`, `RestaurantId`, and `CheckId` are parsed from the composite reference in the webhook body (`basketReferenceCode`/`referenceCode`).

## Non‑ROP endpoints that feed ROP calls (context)

While not ROP calls, the following adapter endpoints populate data that ROP calls depend on:

- `POST /app2app/refs` – Legacy UUID → CheckId mapping (for older flows). Not used by composite reference flow.
- `GET /app2app/baskets/:referenceCode` – Resolves a basket. In `BASKET_PROVIDER=rop` mode with composite reference, this triggers `GET CheckDetail` to ROP using the parsed credentials.

## Error Handling & Timeouts

- HTTP non‑2xx are treated as errors (Axios `validateStatus`).
- `GET CheckDetail` errors cause fallback to mock basket.
- `POST PaymentStatus` errors during webhook bridging are logged as warnings; the adapter continues. (`odeal_adapter/src/server.js:251-259`)
- Default timeout is 5000 ms; override with `ROP_HTTP_TIMEOUT_MS`.

## Checklist (Zero Ambiguity Summary)

- Methods/URLs: GET `/CheckDetail`, POST `/PaymentStatus`
- HTTP headers sent to ROP: none custom; JSON for POST
- Credentials transport: in query/body (`DeviceId`, `RestaurantId`)
- Request schemas: as enumerated above (exact keys)
- Response usage: only `Details|Lines|items` arrays and listed line fields are read from `CheckDetail`; `PaymentStatus` response is ignored
- Auth values origin: all three from env; `CheckId` from parsed reference or refMap
- Production TLS requirement enforced; 5s default timeout
