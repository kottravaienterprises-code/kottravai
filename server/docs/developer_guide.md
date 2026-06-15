# Kottravai Developer Guide
## Enterprise API & Webhook Integration

### 1. Authentication
All external API requests require API Key Authentication and HMAC-SHA256 Payload Signing.

**Headers Required:**
* `x-api-key`: Your consumer API Key Hash.
* `x-timestamp`: Epoch timestamp in milliseconds.
* `x-signature`: HMAC-SHA256 signature.

**Signature Generation (Node.js Example):**
```javascript
const crypto = require('crypto');
const signature = crypto.createHmac('sha256', HMAC_SECRET)
                        .update(timestamp + '.' + JSON.stringify(payload))
                        .digest('hex');
```

### 2. Rate Limiting
Your API key has an assigned `rate_limit_per_min`. If exceeded, the API will respond with `429 Too Many Requests`.

### 3. Endpoints
#### `GET /api/v1/revenue/forecast`
Fetches the latest AI-generated revenue forecast snapshot.
* **Authentication**: Required
* **Idempotency**: N/A

#### `POST /api/v1/events`
Publishes an event to the Kottravai Event Bus.
* **Payload Schema**:
```json
{
  "eventType": "DEAL_WON",
  "tenantId": "string",
  "payload": {}
}
```

### 4. Webhook Subscriptions
When subscribing to Webhooks, Kottravai will send `POST` requests to your endpoint.
* **Verification**: Kottravai sends `x-kottravai-signature` and `x-kottravai-timestamp`. Compute the HMAC-SHA256 of the timestamp and raw payload body using your Webhook Secret to verify authenticity.
* **Retries**: Kottravai uses exponential backoff (2^retry * 1000ms) for up to 3 retries on non-200 responses.
