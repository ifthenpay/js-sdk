# Javascript SDK

Single-file helper for generating ifthenpay payment requests from a browser page or a Node.js application.

The package has no external dependencies and requires no build step. In a browser, add `ifthenpay-js-sdk.js` with a `<script>` tag and use the global `ifthenpay` object. In Node.js, install via npm and `require` it.

## Installation

The simplest option is to download `ifthenpay-js-sdk.js` directly and include it in your project — no npm, no build step, no pull request needed.

```html
<script src="./ifthenpay-js-sdk.js"></script>
```

Or install via npm:

```bash
npm install @ifthenpay/js-sdk
```

## What It Does

The file exposes `ifthenpay.createClient(config)`. The client contains helpers for creating payment requests with the ifthenpay API:

- MB WAY payment requests and status checks
- Multibanco references (dynamic or offline, detected automatically from account config)
- Payshop references
- PIX payments
- Credit Card payments
- Cofidis payments
- Pay by Link payments

It also includes basic field validation before sending requests, using the same key formats and common value formats expected by ifthenpay.

## What It Does Not Do

This helper intentionally does not include webhook registration, webhook validation, payment lookup, backend-only flows, or external dependencies. Status checks are only available for MB WAY.

## Important Security Note

Because this can run directly in the browser, the `authToken` configured in JavaScript is visible to users in the page source and browser devtools. Use this approach only when that tradeoff is acceptable for your integration. If you need to keep it private, call ifthenpay from your own backend instead.

## Getting Your Auth Token

1. Log in to the [ifthenpay backoffice](https://backoffice.ifthenpay.com).
2. Go to **Management > Integrations**.
3. Click **New Credential**, select **ifthenpay connect** as the platform, and confirm.
4. On the same row as the new credential, click the **settings button** and complete the configuration process.
5. Copy the **API Token** shown on that row and paste it as `authToken` in your project.

## Quick Start

### Browser

```html
<script src="./ifthenpay-js-sdk.js"></script>
<script>
  async function createPayment() {
    const client = ifthenpay.createClient({
      authToken: 'your-auth-token'
    });

    const payment = await client.mbway.createPayment({
      orderId: 'order-1',
      amount: '10.99',
      mobileNumber: '351#912345678',
      email: 'buyer@example.com'
    });

    console.log(payment.transactionId);
  }

  createPayment();
</script>
```

### Node.js

```js
const { createClient } = require('@ifthenpay/js-sdk');

const client = createClient({
  authToken: 'your-auth-token'
});

const payment = await client.mbway.createPayment({
  orderId: 'order-1',
  amount: '10.99',
  mobileNumber: '351#912345678',
  email: 'buyer@example.com'
});

console.log(payment.transactionId);
```

## API Reference

### `ifthenpay.createClient(options)`

Creates and returns a client instance. Call this once and reuse it across requests.

| Option | Type | Required | Description |
|---|---|---|---|
| `authToken` | `string` | **Required** | Your ifthenpay API token. |
| `language` | `'pt' \| 'en' \| 'es' \| 'fr'` | Optional | Default language for payment pages. Per-request `language` takes priority; falls back to the value returned by the API if not set. |
| `creditCardSuccessUrl` | `string` | Optional | Default redirect URL after a successful Credit Card payment. Can be overridden per request. |
| `creditCardErrorUrl` | `string` | Optional | Default redirect URL after a failed Credit Card payment. Can be overridden per request. |
| `creditCardCancelUrl` | `string` | Optional | Default redirect URL when a Credit Card payment is cancelled. Can be overridden per request. |
| `cofidisReturnUrl` | `string` | Optional* | Default return URL for Cofidis payments. *Required either here or per request. Can be overridden per request. |
| `payByLinkSuccessUrl` | `string` | Optional | Default redirect URL after a successful Pay by Link payment. A `[TRANSACTIONID]` placeholder is appended automatically. Can be overridden per request. |
| `payByLinkErrorUrl` | `string` | Optional | Default redirect URL after a failed Pay by Link payment. Can be overridden per request. |
| `payByLinkCancelUrl` | `string` | Optional | Default redirect URL when a Pay by Link payment is cancelled. Can be overridden per request. |
| `payByLinkBtnCloseUrl` | `string` | Optional | Default URL for the close button shown in the Pay by Link payment page. Can be overridden per request. |
| `payByLinkBtnCloseLabel` | `string` | Optional | Default label for the close button shown in the Pay by Link payment page (max 50 chars). Can be overridden per request. |
| `payByLinkOtp` | `boolean` | Optional | Default one-time-payment (OTP) setting for Pay by Link. Can be overridden per request. |

---

### `client.mbway.createPayment(request)`

Initiates an MB WAY payment request.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. String must be a positive decimal with two decimal places and `.` as separator (e.g. `'10.99'`). Numbers are formatted automatically. Max 10 chars. |
| `mobileNumber` | `string` | **Required** | Buyer's phone number in `countryCode#phoneNumber` format (e.g. `'351#912345678'`). |
| `email` | `string` | Optional | Buyer's email address (max 100 chars). |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-1',
  transactionId: 'abc123',   // use this to call getStatus
  mobileNumber: '351#912345678',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z',
  expiresAt: '2026-05-13T15:04:00.000Z'  // 4 minutes from creation
}
```

---

### `client.mbway.getStatus(request)`

Checks the current status of an MB WAY payment.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `transactionId` | `string` | **Required** | The `transactionId` returned by `createPayment`. |

**Returns:**

```js
{
  transactionId: 'abc123',
  status: '000',       // status code from the ifthenpay API
  message: 'Success',
  createdAt: '2026-05-13T15:00:00.000Z',
  updatedAt: '2026-05-13T15:01:00.000Z'
}
```

---

### `client.multibanco.createPayment(request)`

Generates a Multibanco payment reference. The method is auto-detected from your account configuration: if the account key matches the dynamic key format (`XXX-000000`), the reference is generated via the API; otherwise the entity/reference is computed locally without an API call.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars for dynamic; shorter for offline, depending on sub-entity length). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-2',
  entity: '12345',
  reference: '123456789',
  transactionId: 'abc123',   // only present for dynamic references
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z',
  expiresAt: '2026-05-20T22:59:00.000Z'  // only present when expiry is configured in the backoffice
}
```

---

### `client.payshop.createPayment(request)`

Generates a Payshop payment reference.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-3',
  transactionId: 'abc123',
  reference: '1234567',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z',
  expiresAt: '2026-05-20T22:59:00.000Z'  // only present when expiry is configured in the backoffice
}
```

---

### `client.creditCard.createPayment(request)`

Initiates a Credit Card payment.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |
| `successUrl` | `string` | Optional | Redirect URL after successful payment (valid URL, max 200 chars). Falls back to `creditCardSuccessUrl` set on the client. |
| `errorUrl` | `string` | Optional | Redirect URL after a failed payment (valid URL, max 200 chars). Falls back to `creditCardErrorUrl` set on the client. |
| `cancelUrl` | `string` | Optional | Redirect URL when the payment is cancelled (valid URL, max 200 chars). Falls back to `creditCardCancelUrl` set on the client. |
| `language` | `'pt' \| 'en' \| 'es' \| 'fr'` | Optional | Language for the payment page. Falls back to client `language`, then the value returned by the API. |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-5',
  transactionId: 'abc123',
  paymentUrl: 'https://...',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z'
}
```

---

### `client.cofidis.createPayment(request)`

Initiates a Cofidis payment.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |
| `returnUrl` | `string` | **Required*** | Return URL after payment (valid URL, max 200 chars). *Can be set as `cofidisReturnUrl` on the client instead. |
| `customerData` | `object` | Optional | Object with optional buyer details (see below). |

**`customerData` fields** (all optional):

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Customer's full name (max 100 chars). |
| `vat` | `string` | Customer's VAT number (max 20 chars). |
| `email` | `string` | Customer's email address (max 100 chars). |
| `phone` | `string` | Customer's phone number (max 15 chars). |
| `billingAddress` | `string` | Billing street address (max 150 chars). |
| `billingZipCode` | `string` | Billing ZIP / postal code (max 20 chars). |
| `billingCity` | `string` | Billing city (max 50 chars). |
| `deliveryAddress` | `string` | Delivery street address (max 150 chars). |
| `deliveryZipCode` | `string` | Delivery ZIP / postal code (max 20 chars). |
| `deliveryCity` | `string` | Delivery city (max 50 chars). |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-6',
  transactionId: 'abc123',
  paymentUrl: 'https://...',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z'
}
```

---

### `client.pix.createPayment(request)`

Initiates a PIX payment.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |
| `cpf` | `string` | **Required** | Buyer's CPF in `111.111.111-11` format. |
| `name` | `string` | **Required** | Buyer's full name (max 150 chars). |
| `email` | `string` | **Required** | Buyer's email address (max 100 chars). |
| `mobileNumber` | `string` | **Required** | Buyer's phone number in `countryCode#phoneNumber` format (e.g. `'55#11912345678'`). |
| `redirectUrl` | `string` | **Required** | URL to redirect the buyer to after payment (valid URL, max 200 chars). |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-4',
  transactionId: 'abc123',
  paymentUrl: 'https://...',
  qrCodeValue: '00020126...',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z'
}
```

---

### `client.payByLink.createPayment(request)`

Generates a Pay by Link payment page.

| Parameter | Type | Required | Description |
|---|---|---|---|
| `orderId` | `string` | **Required** | Your order identifier (max 15 chars). |
| `amount` | `string \| number` | **Required** | Amount to charge. Same format rules as MB WAY. |
| `successUrl` | `string` | Optional | Redirect URL after successful payment (valid URL, max 2000 chars). A `tid=[TRANSACTIONID]` query parameter is appended automatically. Falls back to `payByLinkSuccessUrl` set on the client. |
| `errorUrl` | `string` | Optional | Redirect URL after a failed payment (valid URL, max 2000 chars). Falls back to `payByLinkErrorUrl` set on the client. |
| `cancelUrl` | `string` | Optional | Redirect URL when the payment is cancelled (valid URL, max 2000 chars). Falls back to `payByLinkCancelUrl` set on the client. |
| `closeButtonUrl` | `string` | Optional | URL for the close button on the payment page (valid URL, max 2000 chars). Falls back to `payByLinkBtnCloseUrl` set on the client. |
| `closeButtonLabel` | `string` | Optional | Label for the close button on the payment page (max 50 chars). Falls back to `payByLinkBtnCloseLabel` set on the client. |
| `otp` | `boolean` | Optional | Whether to generate a one-time payment link. Falls back to `payByLinkOtp` set on the client. |
| `language` | `'pt' \| 'en' \| 'es' \| 'fr'` | Optional | Language for the payment page. Falls back to client `language`, then the value returned by the API. |

**Returns:**

```js
{
  amount: '10.99',
  orderId: 'order-7',
  pinCode: 'PIN123',
  paymentUrl: 'https://...',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z',
  expiresAt: '2026-05-20T22:59:00.000Z'  // only present when expiry is configured in the backoffice
}
```

---

## Responses

All payment creation methods return plain objects. Fields present in the response depend on the payment method:

| Field | Type | Methods |
|---|---|---|
| `amount` | `string` | All |
| `orderId` | `string` | All |
| `status` | `'pending'` | All |
| `createdAt` | `string` (ISO 8601) | All |
| `transactionId` | `string` | MB WAY, Multibanco (dynamic), Payshop, PIX, Credit Card, Cofidis |
| `pinCode` | `string` | Pay by Link |
| `entity` | `string` | Multibanco |
| `reference` | `string` | Multibanco, Payshop |
| `paymentUrl` | `string` | PIX, Credit Card, Cofidis, Pay by Link |
| `qrCodeValue` | `string` | PIX |
| `mobileNumber` | `string` | MB WAY |
| `expiresAt` | `string` (ISO 8601) | MB WAY, Multibanco (when configured), Payshop (when configured), Pay by Link (when configured) |

## Errors

The helper throws:

- `ifthenpay.ValidationError` when input validation fails before a request is sent.
- `ifthenpay.ApiError` when the ifthenpay API responds with an error or an unexpected payload.

Configuration errors (missing `authToken`, payment method not enabled in the backoffice) include `code: 'not_configured'` in `error.details`:

```js
try {
  const payment = await client.mbway.createPayment({
    orderId: 'order-1',
    amount: '10.99',
    mobileNumber: '351#912345678'
  });
  console.log(payment);
} catch (error) {
  if (error.details?.code === 'not_configured') {
    console.error('Configuration error:', error.message, error.details.message);
  } else {
    console.error(error.name, error.message, error.details);
  }
}
```

## Local Example

Open `examples/index.html` in a browser, enter your auth token, open a payment method accordion, fill in the values, and click the generate button. The response appears in the output panel on the right side of the page.
