# Ifthenpay SDK

Single-file helper for generating Ifthenpay payment requests from a browser page or a Node.js application.

The package has no external dependencies and requires no build step. In a browser, add `ifthenpay.js` with a `<script>` tag and use the global `Ifthenpay` object. In Node.js, install via npm and `require` it.

## Installation

```bash
npm install @ifthenpay/sdk-js
```

Or add it directly in a browser with a `<script>` tag:

```html
<script src="./ifthenpay.js"></script>
```

## What It Does

The file exposes `Ifthenpay.createClient(config)`. The client contains helpers for creating payment requests with the Ifthenpay API:

- MB WAY payment requests
- Multibanco references (dynamic or offline, detected automatically from account config)
- Payshop references
- PIX payments
- Credit Card payments
- Cofidis payments
- Pay by Link payments

It also includes basic field validation before sending requests, using the same key formats and common value formats expected by Ifthenpay.

## What It Does Not Do

This helper intentionally does not include webhook registration, webhook validation, payment lookup, status checks, backend-only flows, or external dependencies.

## Important Security Note

Because this can run directly in the browser, the `authToken` configured in JavaScript is visible to users in the page source and browser devtools. Use this approach only when that tradeoff is acceptable for your integration. If you need to keep it private, call Ifthenpay from your own backend instead.

## Quick Start

### Browser

```html
<script src="./ifthenpay.js"></script>
<script>
  async function createPayment() {
    const client = Ifthenpay.createClient({
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
const { createClient } = require('@ifthenpay/sdk-js');

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

## API Overview

Create a client once with your auth token and any URL defaults you need:

```js
const client = Ifthenpay.createClient({
  authToken: 'your-auth-token',
  language: 'pt'
});
```

Then call the payment method you want:

```js
const payment = await client.mbway.createPayment({
  orderId: 'order-1',
  amount: '10.99',
  mobileNumber: '351#912345678'
});
```

Payment keys are fetched automatically from the Ifthenpay API using the `authToken`. URL options can be set on the client or overridden per request.

## Supported Payment Methods

- MB WAY: `client.mbway.createPayment(...)`
- Multibanco: `client.multibanco.createPayment(...)` (dynamic or offline, auto-detected from account config)
- Payshop: `client.payshop.createPayment(...)`
- PIX: `client.pix.createPayment(...)`
- Credit Card: `client.creditCard.createPayment(...)`
- Cofidis: `client.cofidis.createPayment(...)`
- Pay by Link: `client.payByLink.createPayment(...)`

Webhook registration, webhook validation, payment lookup, and status checks are intentionally not included.

## Configuration

```js
const client = Ifthenpay.createClient({
  authToken: 'your-auth-token',
  creditCardSuccessUrl: 'https://example.com/success',
  creditCardErrorUrl: 'https://example.com/error',
  creditCardCancelUrl: 'https://example.com/cancel',
  cofidisReturnUrl: 'https://example.com/cofidis-return',
  payByLinkSuccessUrl: 'https://example.com/success',
  payByLinkErrorUrl: 'https://example.com/error',
  payByLinkCancelUrl: 'https://example.com/cancel',
  payByLinkBtnCloseUrl: 'https://example.com',
  payByLinkBtnCloseLabel: 'Back to store',
  payByLinkOtp: true,
  language: 'pt'
});
```

Payment method keys, entity/subentity for Multibanco offline, expiry days, and description are all resolved automatically by calling the Ifthenpay API with `authToken` before each payment request. The only values you configure directly are `authToken`, redirect URLs, and behaviour options.

## Payment Examples

### MB WAY

```js
const payment = await client.mbway.createPayment({
  orderId: 'order-1',
  amount: '10.99',
  mobileNumber: '351#912345678',
  email: 'buyer@example.com'
});
```

### Multibanco

The payment method is auto-detected from your account configuration. If the account key matches a dynamic key format, the reference is generated via the API. Otherwise, the entity/reference is computed locally without an API call.

```js
const payment = await client.multibanco.createPayment({
  orderId: 'order-2',
  amount: '10.99'
});
```

### Pay by Link

```js
const payment = await client.payByLink.createPayment({
  orderId: 'order-4',
  amount: '10.99',
  otp: true,
  successUrl: 'https://example.com/success'
});
```

## Responses

Payment creation methods return plain objects. Depending on the method, the response may include:

```js
{
  amount: '10.99',
  orderId: 'order-1',
  transactionId: 'request-or-pin-code',
  entity: '12345',
  reference: '123456789',
  paymentUrl: 'https://...',
  qrCodeValue: '...',
  mobileNumber: '351#912345678',
  status: 'pending',
  createdAt: '2026-05-13T15:00:00.000Z',
  expiresAt: '2026-05-14T22:59:00.000Z'
}
```

## Errors

The helper throws:

- `Ifthenpay.ValidationError` when input validation fails before a request is sent.
- `Ifthenpay.ApiError` when the Ifthenpay API responds with an error or an unexpected payload.

```js
try {
  const payment = await client.mbway.createPayment({
    orderId: 'order-1',
    amount: '10.99',
    mobileNumber: '351#912345678'
  });
  console.log(payment);
} catch (error) {
  console.error(error.name, error.message, error.details);
}
```

## Local Example

Open `examples/index.html` in a browser, enter your auth token, open a payment method accordion, fill in the values, and click the generate button. The response appears in the output panel on the right side of the page.
