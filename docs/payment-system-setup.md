# Payment System Setup Guide

This guide covers setting up the DAET-CONNECT Payment System for development and production.

## Prerequisites

- Node.js 18+
- npm 9+
- Supabase project
- PayMongo account

## Installation

### 1. Install Dependencies

```bash
npm install pdfkit qrcode
npm install --save-dev @types/pdfkit
```

### 2. Environment Variables

Create `.env.local` file with the following variables:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PayMongo
PAYMONGO_SECRET_KEY=sk_test_xxxxxxxx  # Test key for development
PAYMONGO_WEBHOOK_SECRET=whsec_test_xxxx

# Environment
PAYMENT_TEST_MODE=true  # Set to false for production
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# Email (optional, for Phase 6)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

For production, use:
```bash
PAYMONGO_SECRET_KEY=sk_live_xxxxxxxx
PAYMONGO_WEBHOOK_SECRET=whsec_live_xxxx
PAYMENT_TEST_MODE=false
NEXT_PUBLIC_BASE_URL=https://daet-connect.ph
```

## PayMongo Test Account Setup

### Step 1: Create PayMongo Account

1. Visit [PayMongo Dashboard](https://dashboard.paymongo.com)
2. Sign up for a developer account
3. Complete email verification

### Step 2: Get API Keys

1. Go to **Dashboard** → **Developers** → **API Keys**
2. Copy **Secret Test Key** (sk_test_...)
3. Copy **Public Test Key** (pk_test_...)
4. Set these in your `.env.local`:
   ```bash
   PAYMONGO_SECRET_KEY=sk_test_...
   ```

### Step 3: Get Webhook Secret

1. Go to **Dashboard** → **Developers** → **Webhooks**
2. Create a new webhook endpoint:
   - **URL:** `https://your-domain/api/webhooks/payment`
   - **Events:** `payment.paid`, `payment.failed`, `payment.expired`
3. Copy the **Signing Secret** (whsec_test_...)
4. Set in `.env.local`:
   ```bash
   PAYMONGO_WEBHOOK_SECRET=whsec_test_...
   ```

### Step 4: Register Webhook in Development

For local development using ngrok:

```bash
# Install ngrok
brew install ngrok  # or download from ngrok.com

# Start ngrok tunnel
ngrok http 3000

# You'll get a URL like: https://abc123.ngrok.io

# Use this in PayMongo webhook URL:
# https://abc123.ngrok.io/api/webhooks/payment
```

## Supabase Setup

### 1. Create Storage Bucket

```sql
-- Create tours_receipts bucket (via Supabase Dashboard)
-- Storage → New bucket
-- Name: tours_receipts
-- Public: No (private bucket with signed URLs)
-- Max file size: 5MB
```

### 2. Create RLS Policies

```sql
-- Allow tourists to upload receipts to their own folder
CREATE POLICY "Users can upload receipts to their folder"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'tours_receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Allow tourists to read their own receipts
CREATE POLICY "Users can read their own receipts"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'tours_receipts'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
```

### 3. Create tours_receipts Table (Optional)

```sql
CREATE TABLE tours_receipts (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  transaction_id UUID NOT NULL UNIQUE,
  tourist_id UUID NOT NULL,
  storage_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (transaction_id) REFERENCES tours_payment_transactions(id),
  FOREIGN KEY (tourist_id) REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE tours_receipts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own receipts
CREATE POLICY "Users can view their own receipts"
  ON tours_receipts
  FOR SELECT
  USING (tourist_id = auth.uid());
```

## Testing

### 1. Run Unit Tests

```bash
npm test
```

### 2. Run Integration Tests

```bash
npm test -- payment-flow.integration.test
```

### 3. Manual Testing in Development

1. Start dev server:
   ```bash
   npm run dev
   ```

2. Navigate to booking page
3. Click "Proceed to Payment"
4. You'll be redirected to PayMongo test checkout

### 4. Test Payment Cards

**Success Payment:**
- Card Number: `4343434343434345`
- Exp Date: Any future date
- CVC: Any 3 digits
- Result: Payment succeeds, webhook fires

**Declined Payment:**
- Card Number: `4571736000000075`
- Result: Payment fails

**GCash/E-Wallet:**
- Use PayMongo's test GCash wallet
- Credentials available in PayMongo dashboard under Test Accounts

### 5. Test Webhook Delivery

Use PayMongo's webhook testing tool:

1. **Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook
3. **Send test event**
4. Check your app's `/api/webhooks/payment` handler

Or manually test with cURL:

```bash
curl -X POST http://localhost:3000/api/webhooks/payment \
  -H "Content-Type: application/json" \
  -H "paymongo-signature: your-signature" \
  -d '{
    "data": {
      "id": "event_123",
      "attributes": {
        "type": "payment.paid",
        "data": {
          "id": "pay_123",
          "attributes": {
            "status": "paid",
            "amount": 250000,
            "currency": "PHP"
          }
        }
      }
    }
  }'
```

## Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured on production server
- [ ] PayMongo production API keys obtained
- [ ] Webhook endpoint registered in PayMongo
- [ ] Supabase storage bucket created
- [ ] RLS policies configured
- [ ] Database migrations run
- [ ] Payment system tested in staging environment
- [ ] Logs configured and monitored

### Deploying to Production

1. **Switch to Production Keys:**
   ```bash
   PAYMONGO_SECRET_KEY=sk_live_...
   PAYMONGO_WEBHOOK_SECRET=whsec_live_...
   PAYMENT_TEST_MODE=false
   ```

2. **Configure Webhook:**
   - Update webhook URL to production domain
   - Update webhook signing secret

3. **Monitor First 24 Hours:**
   - Check logs for errors
   - Monitor transaction volume
   - Verify webhook deliveries
   - Test payment flow with real transactions

### Rollback Procedure

If issues occur:

1. Switch back to test mode:
   ```bash
   PAYMENT_TEST_MODE=true
   ```

2. Revert PayMongo webhook to test endpoint

3. Disable payment acceptance while investigating:
   ```bash
   PAYMENT_ENABLED=false
   ```

## Monitoring

### Key Metrics

- Payment success rate
- Average payment processing time
- Failed transaction rate
- Webhook delivery rate
- Storage usage

### Logs to Monitor

```bash
# Payment initiations
[payment-actions] createPaymentSession

# Webhook events
[webhook] Received payment event
[webhook-processor] Processing event

# Errors
[payment-error]
[webhook-error]
```

### Error Codes

| Error | Meaning | Action |
|-------|---------|--------|
| payment_not_found | Transaction doesn't exist | Check booking ID |
| invalid_signature | Webhook signature mismatch | Verify webhook secret |
| session_expired | Payment session expired | User must restart |
| insufficient_funds | Card has insufficient funds | Try different payment method |

## Troubleshooting

### Payment Session Creation Fails

1. Check PAYMONGO_SECRET_KEY is set
2. Verify booking exists and is in "pending_payment" status
3. Check Supabase connectivity
4. Review logs for specific error

### Webhook Not Received

1. Verify webhook URL is correct in PayMongo dashboard
2. Check webhook secret in PAYMONGO_WEBHOOK_SECRET
3. Verify `/api/webhooks/payment` is accessible
4. Check firewall/networking rules
5. Use PayMongo test tool to send manual webhook

### Receipt Generation Fails

1. Verify `tours_receipts` bucket exists
2. Check Supabase storage permissions
3. Verify transaction is completed
4. Check available disk space

### Transaction Not Updating

1. Check webhook is being received (logs)
2. Verify signature verification passes
3. Confirm payment token matches transaction
4. Check idempotency key

## Support

For issues, contact:
- **PayMongo:** [PayMongo Support](https://support.paymongo.com)
- **Supabase:** [Supabase Docs](https://supabase.com/docs)
- **Development:** Check app logs and payment system documentation

## Security Considerations

1. **API Keys:**
   - Never commit API keys to version control
   - Use environment variables
   - Rotate keys periodically

2. **Webhook Signature:**
   - Always verify webhook signature
   - Use HMAC-SHA256 verification
   - Implement rate limiting

3. **Transaction Ownership:**
   - Always validate tourist owns transaction
   - Use RLS policies in database
   - Implement server-side authorization checks

4. **PII Handling:**
   - Minimize PII in logs
   - Use encryption for sensitive data
   - Comply with data protection regulations

5. **Rate Limiting:**
   - Implement per-user rate limits
   - Limit payment attempts (5 per hour)
   - Monitor for suspicious activity
