# Laxigam API Documentation

## Base URL

```
Production: https://api.laxigam.com
Development: http://localhost:8000
```

## Authentication

All API requests require an API key in the header:

```
X-API-Key: your_api_key
```

## Rate Limits

- 100 requests per minute per IP
- 1000 requests per hour per API key

---

## Endpoints

### Health Check

```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "version": "2.0.0",
  "timestamp": "2024-01-01T00:00:00Z",
  "ai_online": {
    "gemini": true,
    "claude": true
  },
  "database": "connected"
}
```

---

### User Management

#### Register User

```http
POST /api/auth/register
```

**Request Body:**
```json
{
  "telegram_id": 123456789,
  "wallet_address": "0x..."
}
```

**Response:**
```json
{
  "success": true,
  "user_id": "uuid",
  "wallet_address": "0x...",
  "trust_score": 50
}
```

#### Get User

```http
GET /api/user/{wallet_address}
```

**Response:**
```json
{
  "user_id": "uuid",
  "telegram_id": 123456789,
  "wallet_address": "0x...",
  "trust_score": 50,
  "kyc_verified": false,
  "real_wallet_balance": 1250.00,
  "game_wallets": {
    "GTA_V": 500.00,
    "Minecraft": 200.00
  }
}
```

---

### Deposits

#### Initiate Deposit

```http
POST /api/deposit/initiate
```

**Request Body:**
```json
{
  "payment_method": "UPI",
  "amount_fiat": 1000,
  "currency": "INR",
  "user_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "payment_id": "pay_xxx",
  "payment_method": "UPI",
  "amount_fiat": 1000,
  "currency": "INR",
  "lxg_amount": 120.48,
  "payment_details": {
    "upi_id": "laxigam@upi",
    "qr_code": "upi://...",
    "instructions": [...]
  },
  "expires_at": "2024-01-01T00:30:00Z"
}
```

#### Payment Callback

```http
POST /api/deposit/callback
```

**Request Body:**
```json
{
  "payment_id": "pay_xxx",
  "status": "completed",
  "transaction_id": "txn_xxx"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Payment confirmed",
  "lxg_credited": 120.48
}
```

---

### Withdrawals

#### Initiate Withdrawal

```http
POST /api/withdraw/initiate
```

**Request Body:**
```json
{
  "amount_lxg": 100,
  "payment_method": "UPI",
  "destination": "user@upi",
  "currency": "INR"
}
```

**Response:**
```json
{
  "success": true,
  "withdrawal_id": "wdr_xxx",
  "amount_lxg": 100,
  "amount_fiat": 830.00,
  "currency": "INR",
  "fee": 2.00,
  "estimated_time": "24-48 hours"
}
```

---

### Transfers

#### Transfer to Game

```http
POST /api/transfer/to-game
```

**Request Body:**
```json
{
  "user_address": "0x...",
  "game_name": "GTA V",
  "amount": 100
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "txn_xxx",
  "amount": 100,
  "game": "GTA V",
  "ai_validation": {
    "approved": true,
    "confidence": 0.95,
    "risk_level": "low"
  }
}
```

#### Transfer to Wallet

```http
POST /api/transfer/to-wallet
```

**Request Body:**
```json
{
  "user_address": "0x...",
  "game_name": "GTA V",
  "amount": 50
}
```

**Response:**
```json
{
  "success": true,
  "transaction_id": "txn_xxx",
  "amount": 50,
  "ai_validation": {
    "approved": true,
    "confidence": 0.92,
    "risk_level": "low"
  }
}
```

---

### Balance & History

#### Get Balance

```http
GET /api/balance/{wallet_address}
```

**Response:**
```json
{
  "wallet_address": "0x...",
  "real_wallet": 1250.00,
  "game_wallets": {
    "GTA_V": 500.00,
    "Minecraft": 200.00
  },
  "total": 1950.00,
  "usd_value": 97.50
}
```

#### Get Transactions

```http
GET /api/transactions/{wallet_address}?limit=50&offset=0
```

**Response:**
```json
{
  "transactions": [
    {
      "id": "txn_xxx",
      "type": "deposit",
      "amount_lxg": 100,
      "amount_fiat": 830,
      "currency": "INR",
      "source": "UPI",
      "destination": "real_wallet",
      "status": "completed",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

---

### AI Validation

#### Validate Transaction

```http
POST /api/ai/validate
```

**Request Body:**
```json
{
  "sender": "0x...",
  "receiver": "0x...",
  "amount": 100,
  "trust_score": 50,
  "tx_type": "deposit_to_game"
}
```

**Response:**
```json
{
  "approved": true,
  "confidence": 0.95,
  "reason": "Transaction matches user profile",
  "risk_level": "low",
  "gemini_response": {...},
  "claude_response": {...}
}
```

---

### PIN Security

#### Generate PIN

```http
POST /api/pin/generate
```

**Request Body:**
```json
{
  "user_address": "0x...",
  "telegram_chat_id": "123456789"
}
```

**Response:**
```json
{
  "success": true,
  "pin_hash": "sha256_hash",
  "expires_in": 600,
  "telegram_sent": true
}
```

#### Verify PIN

```http
POST /api/pin/verify
```

**Request Body:**
```json
{
  "user_address": "0x...",
  "pin": "123456"
}
```

**Response:**
```json
{
  "verified": true
}
```

---

### Exchange Rates

#### Get Exchange Rates

```http
GET /api/exchange-rates
```

**Response:**
```json
{
  "lxg_usd": 0.05,
  "rates": {
    "USD": {"rate": 1.0, "lxg_value": 20},
    "INR": {"rate": 83.0, "lxg_value": 0.24},
    "BRL": {"rate": 5.0, "lxg_value": 4},
    "RUB": {"rate": 92.0, "lxg_value": 0.22},
    "CNY": {"rate": 7.2, "lxg_value": 2.78}
  },
  "last_updated": "2024-01-01T00:00:00Z"
}
```

---

## Webhooks

### Payment Webhooks

Configure webhooks in your payment gateway dashboard:

**Endpoint:** `POST /webhooks/{gateway}`

Supported gateways:
- `/webhooks/razorpay`
- `/webhooks/mercadopago`
- `/webhooks/qiwi`
- `/webhooks/alipay`
- `/webhooks/stripe`

### Telegram Webhook

**Endpoint:** `POST /telegram/webhook`

Handles bot updates and payment confirmations.

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Rate Limited |
| 500 | Internal Server Error |

**Error Response:**
```json
{
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for transaction",
    "details": {}
  }
}
```

---

## SDKs

### JavaScript/TypeScript

```bash
npm install @laxigam/sdk
```

```javascript
import { LaxigamSDK } from '@laxigam/sdk';

const sdk = new LaxigamSDK({
  apiKey: 'your_api_key',
  environment: 'production'
});

// Get balance
const balance = await sdk.getBalance('0x...');

// Deposit
const deposit = await sdk.deposit({
  method: 'UPI',
  amount: 1000,
  currency: 'INR'
});
```

### Python

```bash
pip install laxigam-sdk
```

```python
from laxigam import LaxigamSDK

sdk = LaxigamSDK(api_key='your_api_key')

# Get balance
balance = sdk.get_balance('0x...')

# Transfer to game
sdk.transfer_to_game(
    user_address='0x...',
    game_name='GTA V',
    amount=100
)
```

---

## Support

For API support, contact:
- Email: api-support@laxigam.com
- Telegram: @LaxigamSupport
