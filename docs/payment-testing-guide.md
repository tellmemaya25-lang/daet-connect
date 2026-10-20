# Payment System Testing Guide

Complete guide for testing all payment system features in test and production environments.

## Test Environment Setup

Ensure `PAYMENT_TEST_MODE=true` in `.env.local`.

## Unit Tests

Run payment system unit tests:

```bash
# All tests
npm test

# Payment-specific tests
npm test -- payment

# Watch mode
npm test -- --watch payment
```

### Test Coverage

- Payment validation: `src/lib/tours/payment-validation.test.ts`
- Payment actions: `src/app/(subsystems)/tours/tourist/payments/actions.test.ts`
- Webhook processor: `src/app/(subsystems)/tours/tourist/payments/webhook-processor.ts`
- Receipt generator: `src/lib/tours/receipt-generator.test.ts`
- Webhook route: `src/app/api/webhooks/payment/route.test.ts`

Current coverage: **231 unit tests** covering:
- ✅ Payment session creation
- ✅ Transaction management
- ✅ Webhook processing
- ✅ Receipt generation
- ✅ Error handling
- ✅ Authorization & ownership validation
- ✅ Idempotency

## Integration Tests

Run end-to-end payment flow tests:

```bash
npm test -- payment-flow.integration.test
```

Tests cover:
- Complete payment success flow
- Payment cancellation
- Payment failure
- Transaction history retrieval
- Authorization checks
- Idempotency validation
- Error scenarios

## Manual Testing Checklist

### Scenario 1: Successful Payment

**Setup:**
1. Create a booking with status "pending_payment"
2. Ensure booking total_amount is set

**Test Steps:**
1. ✓ Navigate to `/tours/tourist/bookings/[id]`
2. ✓ Click "Proceed to Payment" button
3. ✓ Verify loading state appears
4. ✓ Redirected to PayMongo checkout
5. ✓ Enter test card: `4343434343434345`
6. ✓ Complete payment
7. ✓ Redirected to `/payment-success`
8. ✓ Verify success message appears
9. ✓ Verify transaction details displayed
10. ✓ Verify booking status changed to "completed"
11. ✓ Can navigate to `/tours/tourist/transactions` and see transaction

**Verification:**
- [ ] Database: `tours_payment_transactions` has new record with status "completed"
- [ ] Database: `tours_bookings` status changed to "completed"
- [ ] Logs: No errors in payment processing
- [ ] Receipt: Can download receipt PDF from transaction detail page

### Scenario 2: Failed Payment

**Test Steps:**
1. ✓ Navigate to `/tours/tourist/bookings/[id]`
2. ✓ Click "Proceed to Payment"
3. ✓ Enter declined test card: `4571736000000075`
4. ✓ Transaction fails
5. ✓ Redirected to `/payment-success` (showing failure after polling timeout)
6. ✓ Verify error message displayed
7. ✓ Verify "Retry Payment" option available

**Verification:**
- [ ] Database: `tours_payment_transactions` has status "failed"
- [ ] Database: `tours_bookings` status still "pending_payment"
- [ ] Payment lock released
- [ ] Can retry payment

### Scenario 3: Cancelled Payment

**Test Steps:**
1. ✓ Navigate to payment checkout
2. ✓ Click "Cancel" or back button
3. ✓ Redirected to `/payment-cancelled`
4. ✓ Verify cancellation message
5. ✓ Click "Retry Payment"
6. ✓ Back to checkout

**Verification:**
- [ ] Booking remains in "pending_payment"
- [ ] No charges made to customer
- [ ] Can retry payment anytime

### Scenario 4: Transaction History

**Test Steps:**
1. ✓ Navigate to `/tours/tourist/transactions`
2. ✓ Verify all completed transactions displayed
3. ✓ Verify reverse chronological order (newest first)
4. ✓ Verify pagination (20 per page)
5. ✓ Click on transaction
6. ✓ Verify transaction details page
7. ✓ Verify gateway response summary
8. ✓ Click "Download Receipt"
9. ✓ PDF downloads correctly

**Verification:**
- [ ] Transaction list shows correct data
- [ ] Pagination works
- [ ] Transaction detail complete
- [ ] Receipt PDF is valid and readable

### Scenario 5: Webhook Processing

**Automated Testing:**
```bash
# Webhook signature verification test
npm test -- webhook/route.test

# Webhook processor test
npm test -- webhook-processor
```

**Manual Testing:**

1. **Using PayMongo Dashboard:**
   - Dashboard → Developers → Webhooks
   - Click your webhook
   - "Send test event"
   - Select `payment.paid`
   - Verify received in logs

2. **Using cURL:**
   ```bash
   # Generate signature
   PAYLOAD='{"data":{"id":"event_123","attributes":{"type":"payment.paid"}}}'
   SECRET="your-webhook-secret"
   SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" -hex | cut -d' ' -f2)
   
   # Send request
   curl -X POST http://localhost:3000/api/webhooks/payment \
     -H "Content-Type: application/json" \
     -H "paymongo-signature: $SIGNATURE" \
     -d "$PAYLOAD"
   ```

**Verification:**
- [ ] Webhook received (status 200)
- [ ] Transaction status updated correctly
- [ ] Booking status updated after 1-3 seconds
- [ ] No errors in logs

### Scenario 6: Receipt Generation

**Test Steps:**
1. ✓ Complete a successful payment
2. ✓ Navigate to `/tours/tourist/transactions/[id]`
3. ✓ Click "Download Receipt"
4. ✓ PDF opens/downloads
5. ✓ Verify PDF contains:
   - [ ] Transaction ID
   - [ ] Customer information
   - [ ] Booking details
   - [ ] Payment details
   - [ ] QR code
   - [ ] Professional formatting

**Verification:**
- [ ] PDF generated successfully
- [ ] All data is correct
- [ ] QR code is scannable
- [ ] Receipt stored in Supabase storage
- [ ] File path: `{tourist_id}/{transaction_id}.pdf`

### Scenario 7: Error Handling

**Test Network Errors:**
1. Disable internet
2. Try to create payment session
3. Verify error message displayed
4. Verify can retry when connection restored

**Test Invalid Data:**
1. Try to create payment for non-existent booking
2. Verify error: "Booking not found"
3. Try to access transaction from different tourist
4. Verify error: "You do not have access"

**Test Edge Cases:**
1. Duplicate payment creation (same booking, 2 quick clicks)
   - Should return existing transaction (idempotent)
2. Webhook received twice with same event ID
   - Should process only once (idempotent)
3. Payment completed while on success page
   - Should reflect correct status after polling

## Mobile Testing

Test all payment flows on mobile devices/viewports:

### Viewports to Test
- 375px (iPhone SE)
- 414px (iPhone 12)
- 768px (iPad)
- Landscape orientation

### Mobile Checklist
- [ ] Payment button minimum 44px height
- [ ] Text readable without zooming
- [ ] Loading spinner visible
- [ ] Success/error messages clear
- [ ] Payment flow works end-to-end
- [ ] No horizontal scrolling needed
- [ ] Form inputs accessible
- [ ] Links clickable on touch

### Mobile Testing Tools

```bash
# Use Chrome DevTools
1. F12 → Toggle device toolbar (Ctrl+Shift+M)
2. Select device or custom dimensions
3. Test all payment flows

# Or test on real device:
1. ngrok tunnel: ngrok http 3000
2. Visit https://your-ngrok-url on mobile
3. Test payment flow
```

## Production Testing

Before deploying to production:

### Pre-Deployment Tests
1. All unit tests pass
2. Integration tests pass
3. Manual testing checklist complete
4. Mobile testing complete
5. No security issues found
6. Logs clear of errors

### Staging Environment Testing

Deploy to staging with production configuration:

```bash
PAYMENT_TEST_MODE=false
PAYMONGO_SECRET_KEY=sk_test_...  # Use test keys in staging
```

### Load Testing

Test system under load:

```bash
# Create multiple test payments simultaneously
# Verify system handles concurrent requests
# Monitor response times and errors
```

### Monitoring After Deployment

**First 24 Hours:**
- Monitor error rates
- Check webhook delivery rate (>99%)
- Verify transaction success rate
- Monitor payment processing time

**Ongoing Monitoring:**
- Weekly: Payment success rate
- Daily: Error logs
- Weekly: Storage usage
- Monthly: Cost analysis

## Test Cards for PayMongo

### Credit/Debit Cards

| Card Type | Number | Status |
|-----------|--------|--------|
| Visa | 4343434343434345 | Success |
| Visa Decline | 4571736000000075 | Declined |
| Mastercard | 5555555555554444 | Success |
| Amex | 378282246310005 | Success |

### E-Wallets

| Provider | Test | Instructions |
|----------|------|--------------|
| GCash | See test account | Use test account from PayMongo dashboard |
| GrabPay | See test account | Use test account from PayMongo dashboard |
| Maya/PayMaya | See test account | Use test account from PayMongo dashboard |

### Test Amounts

- **Any amount** works in test mode
- Common test amount: ₱2,500 (250000 centavos)
- Recommended: Use booking amount for realistic testing

## Debugging Failed Payments

### Check Logs

```bash
# Application logs
tail -f logs/payment.log

# Supabase logs
# Dashboard → Logs → Filter by payment

# PayMongo webhook logs
# Dashboard → Developers → Webhooks → Event logs
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Invalid API key" | Wrong PAYMONGO_SECRET_KEY | Check .env.local |
| "Webhook signature failed" | Wrong PAYMONGO_WEBHOOK_SECRET | Verify webhook secret |
| "Payment not found" | Transaction ID mismatch | Check payment token extraction |
| "Booking status not updated" | Webhook not received | Check webhook URL and firewall |
| "Receipt generation failed" | Supabase storage issue | Verify bucket permissions |

### Enable Verbose Logging

Add to `.env.local`:

```bash
DEBUG=daet-connect:payment:*
LOG_LEVEL=debug
```

## Test Data Cleanup

After testing, clean up test data:

```sql
-- Delete test transactions (use tourist_id from logs)
DELETE FROM tours_payment_transactions 
WHERE tourist_id = 'test_tourist_id';

-- Delete test bookings
DELETE FROM tours_bookings 
WHERE tourist_id = 'test_tourist_id';

-- Delete test receipts
DELETE FROM tours_receipts 
WHERE tourist_id = 'test_tourist_id';
```

## Performance Testing

### Expected Performance

- Payment session creation: < 2 seconds
- Webhook processing: < 1 second
- Receipt generation: < 5 seconds
- Transaction history load: < 2 seconds

### Load Test

```bash
# Using Apache Bench (ab):
ab -n 100 -c 10 http://localhost:3000/api/webhooks/payment

# Or use Artillery:
npm install -g artillery
artillery run load-test.yml
```

## Sign-Off Checklist

Before deployment, verify:

- [ ] All 231 unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing checklist complete
- [ ] Mobile testing complete
- [ ] Error handling verified
- [ ] Performance acceptable
- [ ] Logs clear and monitored
- [ ] Security audit passed
- [ ] Accessibility checked
- [ ] Database migrations run
- [ ] Environment variables configured
- [ ] PayMongo webhook registered
- [ ] Backup and rollback plan in place
