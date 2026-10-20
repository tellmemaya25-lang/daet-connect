# Tasks: Payment System Implementation

## Phase 1: Foundation (Week 1)

### Task 1: Database Migration - Payment Transactions Table
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 3 hours

#### Description
Create a database migration to establish the `tours_payment_transactions` table with all required fields, indexes, and constraints. This table stores payment transaction records linked to bookings.

#### Acceptance Criteria
- [ ] 4.1: Transaction record is created for each payment attempt
- [ ] 4.2: Transaction record includes all required fields (id, booking_id, payment_token, payment_method, amount, currency, status, gateway_response, idempotency_key, created_at, updated_at)
- [ ] 13.1: Currency field defaults to "PHP"
- [ ] 13.2: Amount field is stored as DECIMAL(10, 2)
- [ ] 14.1: Refunded_amount field exists with default 0
- [ ] 14.2: Refund_reason field exists accepting text or null
- [ ] 14.4: Refunded_at timestamp field exists accepting datetime or null

#### Files to Create/Modify
- `supabase/migrations/[timestamp]_create_tours_payment_transactions.sql` - Create table with all fields
- `supabase/migrations/[timestamp]_create_tours_payment_transactions.sql` - Add indexes for performance
- `supabase/migrations/[timestamp]_create_tours_payment_transactions.sql` - Add foreign key to tours_bookings
- `supabase/migrations/[timestamp]_create_tours_payment_transactions.sql` - Add updated_at trigger

#### Dependencies
- Requires existing tours_bookings table
- Requires update_updated_at_column() function

#### Technical Notes
- Use `gen_random_uuid()` for id primary key
- Foreign key: `booking_id REFERENCES tours_bookings(id) ON DELETE RESTRICT`
- Status constraint: `CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired', 'refunded'))`
- Unique constraint on idempotency_key
- Indexes needed: booking_id, payment_token, status, created_at, idempotency_key

---

### Task 2: RLS Policies for Payment Transactions
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 2 hours

#### Description
Implement Row-Level Security policies on the `tours_payment_transactions` table to ensure tourists can only access their own transactions and the system can update any transaction for webhook processing.

#### Acceptance Criteria
- [ ] 15.1: Tourist authentication is verified before transaction access
- [ ] 15.2: Transactions are filtered by booking.tourist_id matching authenticated user
- [ ] 15.3: Unauthorized access returns HTTP 403 Forbidden

#### Files to Create/Modify
- `supabase/migrations/[timestamp]_add_transactions_rls_policies.sql` - Enable RLS
- `supabase/migrations/[timestamp]_add_transactions_rls_policies.sql` - Tourist SELECT policy
- `supabase/migrations/[timestamp]_add_transactions_rls_policies.sql` - Tourist INSERT policy
- `supabase/migrations/[timestamp]_add_transactions_rls_policies.sql` - Service role UPDATE policy

#### Dependencies
- Task 1 must be completed first
- Requires auth.uid() function

#### Technical Notes
- Enable RLS: `ALTER TABLE tours_payment_transactions ENABLE ROW LEVEL SECURITY;`
- SELECT policy: Filter through JOIN with tours_bookings on tourist_id
- INSERT policy: Validate booking ownership before insertion
- UPDATE policy: Allow service_role for webhook processing

---

### Task 3: Payment Contract Types and Interfaces
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Create the payment contract module with TypeScript types, interfaces, field mappings, and constants. This serves as the single source of truth for payment-related data structures.

#### Acceptance Criteria
- [ ] 4.2: All transaction record fields are typed
- [ ] 4.3: Payment status enum includes all valid states
- [ ] 2.1: Payment method enum includes all supported methods
- [ ] 13.1: Currency type is defined

#### Files to Create/Modify
- `src/lib/tours/payment-contract.ts` - Payment status enum
- `src/lib/tours/payment-contract.ts` - Payment method enum
- `src/lib/tours/payment-contract.ts` - TransactionRecord interface
- `src/lib/tours/payment-contract.ts` - TransactionWithBooking interface
- `src/lib/tours/payment-contract.ts` - PayMongoPaymentIntentRequest interface
- `src/lib/tours/payment-contract.ts` - PayMongoCheckoutSessionRequest interface
- `src/lib/tours/payment-contract.ts` - PayMongoWebhookEvent interface
- `src/lib/tours/payment-contract.ts` - PAYMENT_FIELDS mapping object
- `src/lib/tours/payment-contract.ts` - Query select constants

#### Dependencies
- None

#### Technical Notes
- Use "server-only" import to prevent client-side usage
- Follow camelCase (JS) to snake_case (DB) pattern from existing contracts
- Payment status: "pending" | "processing" | "completed" | "failed" | "expired" | "refunded"
- Payment method: "gcash" | "card" | "bank_transfer" | "paymaya" | "grabpay"

---

### Task 4: Payment Validation Functions
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 5 hours

#### Description
Implement validation functions for payment operations including booking eligibility, amount validation, idempotency key generation, webhook signature verification, and currency conversion.

#### Acceptance Criteria
- [ ] 1.2: Idempotency key is generated with unique format
- [ ] 1.3: Payment amount is validated against booking total_amount
- [ ] 5.2: Webhook signature verification is implemented
- [ ] 13.4: Pesos to centavos conversion is correct
- [ ] 13.5: Centavos to pesos conversion is correct
- [ ] 10.4: Gateway errors are mapped to user-friendly messages

#### Files to Create/Modify
- `src/lib/tours/payment-validation.ts` - validateBookingForPayment()
- `src/lib/tours/payment-validation.ts` - validatePaymentAmount()
- `src/lib/tours/payment-validation.ts` - generateIdempotencyKey()
- `src/lib/tours/payment-validation.ts` - validateIdempotencyKey()
- `src/lib/tours/payment-validation.ts` - verifyWebhookSignature()
- `src/lib/tours/payment-validation.ts` - pesosToCentavos()
- `src/lib/tours/payment-validation.ts` - centavosToPesos()
- `src/lib/tours/payment-validation.ts` - formatCurrency()
- `src/lib/tours/payment-validation.ts` - mapGatewayError()
- `src/lib/tours/payment-validation.ts` - isTransactionExpired()
- `src/lib/tours/payment-validation.ts` - validatePaymentMethod()

#### Dependencies
- Task 3 must be completed first

#### Technical Notes
- Idempotency key format: `payment_{bookingId}_{timestamp}`
- Use HMAC-SHA256 for webhook signature with crypto.timingSafeEqual()
- Currency conversion: multiply by 100 for centavos, divide by 100 for pesos
- Format currency with Intl.NumberFormat for PHP locale
- Transaction expires after 30 minutes

---

### Task 5: Unit Tests for Payment Validators
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Write comprehensive unit tests for all validation functions in payment-validation.ts using Jest.

#### Acceptance Criteria
- [ ] All validation functions have test coverage
- [ ] Edge cases are tested (invalid inputs, boundary conditions)
- [ ] Webhook signature verification is tested with valid and invalid signatures
- [ ] Currency conversion round-trip is tested

#### Files to Create/Modify
- `src/lib/tours/payment-validation.test.ts` - Test validateBookingForPayment
- `src/lib/tours/payment-validation.test.ts` - Test validatePaymentAmount
- `src/lib/tours/payment-validation.test.ts` - Test idempotency key generation and validation
- `src/lib/tours/payment-validation.test.ts` - Test webhook signature verification
- `src/lib/tours/payment-validation.test.ts` - Test currency conversions
- `src/lib/tours/payment-validation.test.ts` - Test error message mapping
- `src/lib/tours/payment-validation.test.ts` - Test transaction expiration detection

#### Dependencies
- Task 4 must be completed first

#### Technical Notes
- Use Jest with TypeScript
- Mock crypto module for signature verification tests
- Test with real PayMongo test webhook signatures
- Verify timing-safe comparison works correctly

---

## Phase 2: Server Actions (Week 2)

### Task 6: Create Payment Session Server Action
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 8 hours

#### Description
Implement the `createPaymentSession` Server Action that validates booking eligibility, generates idempotency keys, communicates with PayMongo API to create checkout sessions, and stores transaction records.

#### Acceptance Criteria
- [ ] 1.1: "Proceed to Payment" button triggers payment session creation
- [ ] 1.2: Unique idempotency key is generated
- [ ] 1.3: Booking total_amount is retrieved
- [ ] 1.4: PayMongo API is called to create payment intent
- [ ] 1.5: Transaction record is stored with status "pending"
- [ ] 1.6: Checkout URL is returned for redirect
- [ ] 1.7: API call failures return error message
- [ ] 1.8: Duplicate requests return existing session (idempotent)
- [ ] 3.7: Rate limiting enforced (5 attempts per hour)
- [ ] 7.1: Success URL is provided to gateway
- [ ] 7.2: Cancel URL is provided to gateway
- [ ] 13.4: Amount is converted to centavos for gateway
- [ ] 13.6: Transaction amount matches booking total_amount
- [ ] 17.1: Booking is locked during payment

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - createPaymentSession()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: checkExistingPendingTransaction()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: callPayMongoCheckoutAPI()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: storeTransactionRecord()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: acquirePaymentLock()

#### Dependencies
- Task 1, 2, 3, 4 must be completed first
- Requires PAYMONGO_SECRET_KEY environment variable
- Requires PayMongo SDK: `npm install @paymongo/node`

#### Technical Notes
- Use getAuthenticatedSession() pattern for auth
- Return ActionResult<{ checkoutUrl: string; transactionId: string }>
- Check for existing transaction with same idempotency_key within 24 hours
- Set payment_lock on booking before gateway call
- Success URL: `/tours/tourist/bookings/{bookingId}/payment-success`
- Cancel URL: `/tours/tourist/bookings/{bookingId}/payment-cancelled`

---

### Task 7: Get Transaction Status Server Action
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 3 hours

#### Description
Implement the `getTransactionStatus` Server Action to retrieve the current status of a transaction for polling on the success page.

#### Acceptance Criteria
- [ ] 4.3-4.6: Current payment status is returned
- [ ] 15.2: Transaction is filtered by tourist ownership
- [ ] 15.3: Unauthorized access is rejected

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - getTransactionStatus()

#### Dependencies
- Task 3, 4, 6 must be completed first

#### Technical Notes
- Return ActionResult<TransactionRecord>
- Validate tourist owns transaction through booking.tourist_id
- Use Supabase select with join to bookings for authorization

---

### Task 8: Get Tourist Transactions List Server Action
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Implement the `getTouristTransactions` Server Action to retrieve paginated list of all transactions for the authenticated tourist with booking and package details.

#### Acceptance Criteria
- [ ] 8.1: Transaction history page retrieves tourist transactions
- [ ] 8.2: Transactions are filtered by tourist ownership
- [ ] 8.3: Transactions are ordered by created_at descending
- [ ] 8.6: Pagination returns 20 transactions per page

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - getTouristTransactions()

#### Dependencies
- Task 3, 4 must be completed first

#### Technical Notes
- Return ActionResult<TransactionWithBooking[]>
- Use TRANSACTION_LIST_SELECT from contract
- Default page size: 20
- Include booking, package, and operator profile in select
- Use .range() for pagination: `range(offset, offset + pageSize - 1)`

---

### Task 9: Get Transaction Detail Server Action
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 3 hours

#### Description
Implement the `getTransactionDetail` Server Action to retrieve complete transaction information including gateway response for the transaction detail page.

#### Acceptance Criteria
- [ ] 8.5: Full transaction details are retrieved
- [ ] 4.7: Gateway response is included
- [ ] 15.2: Transaction ownership is validated

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - getTransactionDetail()

#### Dependencies
- Task 3, 4 must be completed first

#### Technical Notes
- Return ActionResult<TransactionWithBooking>
- Use TRANSACTION_DETAIL_SELECT from contract
- Include complete gateway_response field
- Sanitize sensitive data from gateway response before returning

---

### Task 10: Unit Tests for Payment Actions
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 6 hours

#### Description
Write comprehensive unit tests for all payment Server Actions, mocking database calls and PayMongo API.

#### Acceptance Criteria
- [ ] All Server Actions have test coverage
- [ ] Idempotent behavior is tested
- [ ] Authorization checks are tested
- [ ] Error cases are tested

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test createPaymentSession
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test getTransactionStatus
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test getTouristTransactions
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test getTransactionDetail
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test authorization failures
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test idempotency

#### Dependencies
- Tasks 6-9 must be completed first

#### Technical Notes
- Mock Supabase client
- Mock PayMongo API calls
- Test both success and failure paths
- Use jest.fn() for mocking

---

## Phase 3: Webhook Handler (Week 3)

### Task 11: Webhook API Route
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Create the webhook API route at `/api/webhooks/payment` to receive POST requests from PayMongo with payment status updates.

#### Acceptance Criteria
- [ ] 5.1: Webhook endpoint exists at /api/webhooks/payment
- [ ] 5.2: Webhook signature is verified
- [ ] 5.3: Invalid signatures return HTTP 401
- [ ] 5.8: Webhook returns HTTP 200 after processing

#### Files to Create/Modify
- `src/app/api/webhooks/payment/route.ts` - POST handler
- `src/app/api/webhooks/payment/route.ts` - Signature extraction from headers
- `src/app/api/webhooks/payment/route.ts` - Error handling

#### Dependencies
- Task 4 must be completed first
- Requires PAYMONGO_WEBHOOK_SECRET environment variable

#### Technical Notes
- Use NextRequest and NextResponse from next/server
- Get raw body with `await request.text()`
- Extract signature from `paymongo-signature` header
- Return 200 even on processing errors to prevent retries
- Log all webhook events for debugging

---

### Task 12: Webhook Signature Verification
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 2 hours

#### Description
Integrate the webhook signature verification function into the webhook route to ensure authenticity of webhook requests.

#### Acceptance Criteria
- [ ] 5.2: Webhook signature is verified using HMAC-SHA256
- [ ] 5.3: Invalid signatures are rejected with 401

#### Files to Create/Modify
- `src/app/api/webhooks/payment/route.ts` - Call verifyWebhookSignature()

#### Dependencies
- Task 4, 11 must be completed first

#### Technical Notes
- Use verifyWebhookSignature() from payment-validation.ts
- Compare signature header with computed hash
- Log verification failures with request metadata

---

### Task 13: Process Webhook Event Function
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 6 hours

#### Description
Implement the `processWebhookEvent` function to extract payment tokens, locate transactions, update statuses, and trigger booking updates.

#### Acceptance Criteria
- [ ] 5.4: Payment token is extracted from webhook payload
- [ ] 5.5: Transaction is located by payment token
- [ ] 5.6: Transaction status is updated to "completed" on success
- [ ] 5.7: Transaction status is updated to "failed" on failure
- [ ] 5.9: Webhook processing is idempotent
- [ ] 2.7: Payment method is captured and stored
- [ ] 4.7: Gateway response is stored as JSON

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - processWebhookEvent()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: extractPaymentToken()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: mapWebhookEventToStatus()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: isEventAlreadyProcessed()

#### Dependencies
- Task 3, 4, 11 must be completed first

#### Technical Notes
- Check gateway_response for existing event_id (idempotency)
- Map PayMongo event types to our status enum
- Store full webhook payload in gateway_response field
- Extract payment_method from event attributes
- Trigger booking status update on "completed"
- Use service role client for updates (bypass RLS)

---

### Task 14: Update Booking Status After Payment
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 5 hours

#### Description
Implement the `updateBookingStatusAfterPayment` function with retry logic using exponential backoff to update booking status from "pending_payment" to "completed".

#### Acceptance Criteria
- [ ] 6.1: Booking record is retrieved from transaction
- [ ] 6.2: Booking status is updated from "pending_payment" to "completed"
- [ ] 6.3: Booking updated_at timestamp is updated
- [ ] 6.4: Already completed/cancelled bookings are not modified
- [ ] 6.5: Failures are logged for retry
- [ ] 6.6: Retry logic with exponential backoff (3 attempts: 1s, 5s, 15s)
- [ ] 17.3: Booking lock is released after completion

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - updateBookingStatusAfterPayment()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: retryWithBackoff()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: releasePaymentLock()

#### Dependencies
- Task 6, 13 must be completed first

#### Technical Notes
- Implement exponential backoff: delays of 1000ms, 5000ms, 15000ms
- Only update if current status is "pending_payment"
- Release payment_lock on completion
- Log errors with correlation ID for manual intervention
- Use service role client for update

---

### Task 15: Webhook Handler Tests
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 5 hours

#### Description
Write comprehensive tests for webhook route and processing functions including signature verification, idempotent processing, and booking updates.

#### Acceptance Criteria
- [ ] Webhook route tests cover valid and invalid signatures
- [ ] Event processing tests cover all status transitions
- [ ] Idempotency tests verify duplicate handling
- [ ] Booking update tests verify retry logic

#### Files to Create/Modify
- `src/app/api/webhooks/payment/route.test.ts` - Test POST handler
- `src/app/api/webhooks/payment/route.test.ts` - Test signature verification
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test processWebhookEvent
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test updateBookingStatusAfterPayment
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test idempotent processing

#### Dependencies
- Tasks 11-14 must be completed first

#### Technical Notes
- Mock NextRequest with text() and headers.get()
- Use sample PayMongo webhook payloads
- Generate valid signatures for positive tests
- Mock Supabase client for database operations
- Test retry logic with jest fake timers

---

## Phase 4: UI Components (Week 4)

### Task 16: Payment Initiation Button Component
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Create a payment button component that triggers payment session creation and redirects to PayMongo checkout with loading states and error handling.

#### Acceptance Criteria
- [ ] 1.1: "Proceed to Payment" button is displayed
- [ ] 1.6: Button redirects to gateway checkout on success
- [ ] 1.7: Error message is displayed on failure
- [ ] 18.2: Button has minimum height of 44px
- [ ] 18.6: Button is disabled on click to prevent double-submission

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-button.tsx` - PaymentButton component
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-button.tsx` - Loading state
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-button.tsx` - Error display

#### Dependencies
- Task 6 must be completed first

#### Technical Notes
- Use "use client" directive
- Call createPaymentSession on click
- Show loading spinner during processing
- Redirect to checkoutUrl with window.location.href
- Display error toast on failure
- Button styling: `min-h-12 px-6` (touch-friendly)
- Disable button after click with state

---

### Task 17: Payment Success Page
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 5 hours

#### Description
Create the payment success page that polls transaction status, displays confirmation, and provides options to view booking or download receipt.

#### Acceptance Criteria
- [ ] 7.3: Gateway redirects to success URL
- [ ] 7.5: Loading state is displayed initially
- [ ] 7.6: Booking confirmation is shown when verified
- [ ] 7.8: Transaction status is polled for up to 30 seconds

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-success/page.tsx` - Success page
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-success/page.tsx` - Status polling logic
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-success/page.tsx` - Confirmation display
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-success/page.tsx` - Action buttons

#### Dependencies
- Task 7 must be completed first

#### Technical Notes
- Use "use client" directive
- Poll getTransactionStatus every 2 seconds
- Stop polling after 30 seconds or when status is final
- Display success icon and confirmation message
- Show transaction ID and amount
- Provide "Download Receipt" and "View Booking" buttons
- Handle case where webhook hasn't arrived yet

---

### Task 18: Payment Cancelled Page
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 3 hours

#### Description
Create the payment cancelled page that displays cancellation message and provides option to retry payment.

#### Acceptance Criteria
- [ ] 7.4: Gateway redirects to cancel URL on cancellation
- [ ] 7.7: Cancellation message is displayed
- [ ] 7.7: "Retry Payment" option is available

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-cancelled/page.tsx` - Cancelled page
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-cancelled/page.tsx` - Cancellation message
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-cancelled/page.tsx` - Retry button

#### Dependencies
- Task 6 must be completed first

#### Technical Notes
- Display cancellation icon and message
- Show booking details for context
- "Retry Payment" button creates new payment session
- Link back to booking detail page

---

### Task 19: Transaction History Page with Pagination
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 6 hours

#### Description
Create the transaction history page at `/tours/tourist/transactions` that lists all tourist transactions with pagination, filtering, and status badges.

#### Acceptance Criteria
- [ ] 8.1: Transaction history page exists at /tours/tourist/transactions
- [ ] 8.3: Transactions are displayed in reverse chronological order
- [ ] 8.4: Each transaction shows booking title, payment date, amount, payment method, status
- [ ] 8.6: Pagination displays 20 transactions per page
- [ ] 8.7: "View Receipt" link is shown for completed transactions
- [ ] 13.3: Amounts are formatted as "₱X,XXX.XX"

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/transactions/page.tsx` - Transaction history page
- `src/app/(subsystems)/tours/tourist/transactions/transaction-card.tsx` - Transaction card component
- `src/app/(subsystems)/tours/tourist/transactions/status-badge.tsx` - Status badge component
- `src/app/(subsystems)/tours/tourist/transactions/pagination.tsx` - Pagination controls

#### Dependencies
- Task 8 must be completed first

#### Technical Notes
- Server component for initial data load
- Use getTouristTransactions with pagination
- Status badge colors: completed=green, failed=red, pending=yellow, processing=blue
- Card layout for mobile, table for desktop (768px+ breakpoint)
- Pagination: Previous/Next buttons with page numbers
- Format currency with formatCurrency() from validation

---

### Task 20: Transaction Detail Page
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Create the transaction detail page at `/tours/tourist/transactions/[id]` that displays complete transaction information including gateway response summary.

#### Acceptance Criteria
- [ ] 8.5: Transaction detail page displays full transaction info
- [ ] 4.7: Gateway response summary is displayed
- [ ] 8.7: "Download Receipt" button is shown for completed transactions

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/transactions/[id]/page.tsx` - Transaction detail page
- `src/app/(subsystems)/tours/tourist/transactions/[id]/gateway-response-summary.tsx` - Gateway response display

#### Dependencies
- Task 9 must be completed first

#### Technical Notes
- Server component for data fetching
- Use getTransactionDetail action
- Display: transaction ID, booking details, payment date, amount, method, status
- Show gateway response summary (success/error messages only, not raw data)
- Link to booking detail page
- "Download Receipt" button for completed status

---

### Task 21: Integrate Payment Button into Booking Detail Page
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 2 hours

#### Description
Add the payment button component to the existing booking detail page for bookings with status "pending_payment".

#### Acceptance Criteria
- [ ] 1.1: Button is visible on bookings with status "pending_payment"
- [ ] Button is not shown for other booking statuses

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/bookings/[id]/page.tsx` - Import and render PaymentButton
- `src/app/(subsystems)/tours/tourist/bookings/[id]/page.tsx` - Conditional rendering based on status

#### Dependencies
- Task 16 must be completed first
- Requires existing booking detail page

#### Technical Notes
- Conditionally render: `{booking.status === 'pending_payment' && <PaymentButton />}`
- Pass bookingId as prop to PaymentButton
- Position button prominently in booking summary section

---

## Phase 5: Receipt Generation (Week 5)

### Task 22: Generate Receipt Server Action
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Implement the `generateReceipt` Server Action that validates transaction completion, generates PDF receipts with QR codes, uploads to storage, and returns download URLs.

#### Acceptance Criteria
- [ ] 9.1: Receipt can be generated for completed transactions
- [ ] 9.4: PDF is returned as download
- [ ] 9.5: Receipt is stored in tours_receipts bucket with path {tourist_id}/{transaction_id}.pdf
- [ ] 9.6: Receipt generation retries once after 2 seconds on failure
- [ ] 15.2: Tourist ownership is validated

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - generateReceipt()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: checkExistingReceipt()
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Helper: uploadReceiptToStorage()

#### Dependencies
- Task 9, 23 must be completed first
- Requires tours_receipts storage bucket

#### Technical Notes
- Return ActionResult<{ downloadUrl: string }>
- Check if receipt already exists before generating
- Generate signed URL with 1-hour expiration
- Implement retry logic: 1 retry after 2 seconds
- Storage path: `{tourist_id}/{transaction_id}.pdf`

---

### Task 23: Receipt PDF Template with QR Code
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 8 hours

#### Description
Create the PDF receipt template using pdfkit library, including transaction details, booking information, operator details, and QR code for verification.

#### Acceptance Criteria
- [ ] 9.2: Receipt includes transaction ID, booking details, payment date, amount, payment method, tourist name, operator name
- [ ] 9.3: Receipt is formatted as PDF document
- [ ] 9.7: QR code is embedded in receipt
- [ ] 13.3: Amount is formatted as "₱X,XXX.XX"

#### Files to Create/Modify
- `src/lib/tours/receipt-generator.ts` - generateReceiptPDF()
- `src/lib/tours/receipt-generator.ts` - PDF layout and styling
- `src/lib/tours/receipt-generator.ts` - QR code generation
- `src/lib/tours/receipt-generator.ts` - Receipt data formatting

#### Dependencies
- Task 3 must be completed first
- Requires pdfkit: `npm install pdfkit @types/pdfkit`
- Requires qrcode: `npm install qrcode @types/qrcode`

#### Technical Notes
- Use pdfkit for PDF generation
- QR code should encode: `https://daet-connect.ph/verify/transaction/{transaction_id}`
- Include company logo/header
- Display transaction details in structured format
- Add footer with timestamp and verification info
- Return PDF as Buffer for upload

---

### Task 24: Set Up Supabase Storage Bucket
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 2 hours

#### Description
Create and configure the `tours_receipts` storage bucket in Supabase with appropriate access policies.

#### Acceptance Criteria
- [ ] 9.5: tours_receipts bucket exists
- [ ] Bucket is configured as public with path-based access
- [ ] RLS policies allow tourist to access their own receipts

#### Files to Create/Modify
- Supabase Dashboard configuration (documented in migration notes)
- `docs/supabase-storage-setup.md` - Documentation for bucket setup

#### Dependencies
- None

#### Technical Notes
- Bucket name: `tours_receipts`
- Public bucket: No (use signed URLs)
- File size limit: 5MB per receipt
- Allowed MIME types: application/pdf
- Storage policy: Tourist can insert into {tourist_id}/
- Storage policy: Tourist can select from {tourist_id}/

---

### Task 25: Receipt Generation Tests
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Write unit tests for receipt generation including PDF creation, QR code embedding, storage upload, and retry logic.

#### Acceptance Criteria
- [ ] Receipt generation tests cover all scenarios
- [ ] QR code validity is tested
- [ ] Storage upload is tested
- [ ] Retry logic is tested

#### Files to Create/Modify
- `src/lib/tours/receipt-generator.test.ts` - Test PDF generation
- `src/lib/tours/receipt-generator.test.ts` - Test QR code generation
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test generateReceipt action
- `src/app/(subsystems)/tours/tourist/payments/actions.test.ts` - Test retry logic

#### Dependencies
- Tasks 22, 23 must be completed first

#### Technical Notes
- Mock pdfkit and qrcode modules
- Mock Supabase storage client
- Verify PDF buffer is generated
- Test QR code contains correct URL
- Test retry behavior with jest fake timers

---

## Phase 6: Testing & Polish (Week 6)

### Task 26: Integration Tests for Payment Flow
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 8 hours

#### Description
Write integration tests that cover the complete payment flow from initiation through webhook processing to booking completion using test database.

#### Acceptance Criteria
- [ ] Complete payment flow is tested end-to-end
- [ ] Webhook integration is tested
- [ ] Booking status synchronization is tested
- [ ] Transaction history is tested

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/payment-flow.integration.test.ts` - Payment initiation flow
- `src/app/(subsystems)/tours/tourist/payments/payment-flow.integration.test.ts` - Webhook processing flow
- `src/app/(subsystems)/tours/tourist/payments/payment-flow.integration.test.ts` - Cancellation flow
- `src/app/(subsystems)/tours/tourist/payments/payment-flow.integration.test.ts` - Failure and retry flow

#### Dependencies
- All previous tasks must be completed
- Requires test database

#### Technical Notes
- Use real Supabase test instance
- Mock PayMongo API calls
- Create test bookings and transactions
- Verify database state after each step
- Clean up test data after tests

---

### Task 27: E2E Tests with Playwright (Test Mode)
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 8 hours

#### Description
Write end-to-end tests using Playwright that test the complete payment user journey in PayMongo test mode, including actual gateway interaction.

#### Acceptance Criteria
- [ ] Tourist can initiate payment
- [ ] Tourist is redirected to PayMongo checkout
- [ ] Tourist can complete test payment
- [ ] Tourist is redirected to success page
- [ ] Booking status is updated
- [ ] Receipt can be downloaded

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/payment.e2e.spec.ts` - Payment success flow
- `src/app/(subsystems)/tours/tourist/payments/payment.e2e.spec.ts` - Payment cancellation flow
- `src/app/(subsystems)/tours/tourist/payments/payment.e2e.spec.ts` - Receipt download test
- `src/app/(subsystems)/tours/tourist/payments/mobile-payment.e2e.spec.ts` - Mobile payment flow (375px)

#### Dependencies
- All previous tasks must be completed
- Requires PayMongo test account
- Requires PAYMENT_TEST_MODE=true

#### Technical Notes
- Use Playwright with TypeScript
- Test with PayMongo test cards
- Test card (success): 4343434343434345
- Handle iframe for PayMongo checkout
- Verify redirect URLs
- Test mobile viewport (375px)
- Wait for webhook processing before assertions

---

### Task 28: Error Handling and User-Friendly Messages
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Implement comprehensive error handling across all payment operations with user-friendly error messages and proper logging.

#### Acceptance Criteria
- [ ] 10.1: Failure reasons are displayed clearly
- [ ] 10.4: Error messages are user-friendly
- [ ] 10.5: Support message is shown after 5 failures
- [ ] 16.1-16.5: All errors are logged with required fields

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/error-messages.ts` - Error message constants
- `src/app/(subsystems)/tours/tourist/payments/actions.ts` - Enhanced error handling
- `src/lib/tours/payment-logger.ts` - Structured logging functions

#### Dependencies
- All Server Actions completed

#### Technical Notes
- Map all PayMongo error codes to friendly messages
- Use mapGatewayError() from validation
- Log errors with correlation IDs
- Implement structured logging format
- Display errors in toast notifications
- Track failure count per booking

---

### Task 29: Loading States and Animations
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Add loading spinners, skeleton screens, and smooth transitions to all payment UI components for better user experience.

#### Acceptance Criteria
- [ ] 7.5: Loading state shown during payment verification
- [ ] 18.5: Loading indicators shown during processing
- [ ] Smooth transitions between states

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/loading-spinner.tsx` - Reusable spinner component
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-button.tsx` - Add loading state
- `src/app/(subsystems)/tours/tourist/bookings/[id]/payment-success/page.tsx` - Add loading spinner
- `src/app/(subsystems)/tours/tourist/transactions/page.tsx` - Add skeleton screens

#### Dependencies
- UI components completed

#### Technical Notes
- Use Tailwind CSS animations
- Spinner with "Processing payment..." message
- Skeleton screens for transaction list loading
- Disable buttons during loading
- Timeout after 30 seconds with manual check option

---

### Task 30: Mobile Responsive Testing
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Test all payment UI components on mobile viewports (375px, 414px) and ensure touch-friendly interactions.

#### Acceptance Criteria
- [ ] 18.1: UI renders correctly from 375px to 1440px
- [ ] 18.2: Touch targets are minimum 44px
- [ ] 18.4: Mobile checkout variant is used on small screens
- [ ] Payment flow works on mobile devices

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/mobile-test-checklist.md` - Testing checklist

#### Dependencies
- All UI components completed

#### Technical Notes
- Test on real devices if possible
- Use Chrome DevTools mobile emulation
- Test viewports: 375px, 414px, 768px, 1024px
- Verify button sizes meet 44px minimum
- Test landscape orientation
- Verify PayMongo checkout is responsive

---

### Task 31: Accessibility Audit (WCAG 2.1 AA)
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 6 hours

#### Description
Conduct accessibility audit of all payment UI components and fix issues to meet WCAG 2.1 AA standards.

#### Acceptance Criteria
- [ ] Color contrast ratio ≥ 4.5:1 for all text
- [ ] Status indicators use icons + text (not color alone)
- [ ] Keyboard navigation works for all interactions
- [ ] ARIA labels present for icon buttons
- [ ] Screen reader announcements for status changes
- [ ] Focus states visible on all interactive elements

#### Files to Create/Modify
- `src/app/(subsystems)/tours/tourist/payments/accessibility-audit.md` - Audit results
- Various UI component files - Accessibility fixes

#### Dependencies
- All UI components completed

#### Technical Notes
- Use axe DevTools for automated testing
- Test with keyboard navigation only
- Test with screen reader (NVDA or JAWS)
- Verify focus indicators visible
- Add ARIA labels where needed
- Use semantic HTML elements
- Test skip links work correctly

---

### Task 32: PayMongo Test Environment Setup
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 3 hours

#### Description
Set up PayMongo test account, configure webhook endpoint, and document test credentials and test card numbers.

#### Acceptance Criteria
- [ ] 12.1: PAYMENT_TEST_MODE environment variable configured
- [ ] PayMongo test API keys obtained
- [ ] Webhook endpoint registered with PayMongo
- [ ] Test payment methods documented

#### Files to Create/Modify
- `.env.example` - Add payment environment variables
- `docs/payment-system-setup.md` - Setup documentation
- `docs/payment-testing-guide.md` - Testing guide with test cards

#### Dependencies
- Webhook route completed (Task 11)

#### Technical Notes
- Create PayMongo test account at https://dashboard.paymongo.com
- Get test API keys from dashboard
- Set PAYMONGO_SECRET_KEY=sk_test_...
- Set PAYMONGO_WEBHOOK_SECRET=whsec_test_...
- Set PAYMENT_TEST_MODE=true for test environment
- Configure webhook URL in PayMongo dashboard
- Document test card numbers:
  - Success: 4343434343434345
  - Declined: 4571736000000075
- Test GCash credentials available in PayMongo docs

---

### Task 33: Documentation and Deployment Guide
**Status:** not_started  
**Assigned to:** unassigned  
**Estimated effort:** 4 hours

#### Description
Write comprehensive documentation for the payment system including architecture overview, API documentation, deployment guide, and troubleshooting.

#### Acceptance Criteria
- [ ] Architecture documentation complete
- [ ] API documentation for all Server Actions
- [ ] Deployment checklist created
- [ ] Troubleshooting guide available

#### Files to Create/Modify
- `docs/payment-system/README.md` - Overview and architecture
- `docs/payment-system/api-reference.md` - Server Actions documentation
- `docs/payment-system/deployment.md` - Deployment checklist
- `docs/payment-system/troubleshooting.md` - Common issues and solutions
- `docs/payment-system/security.md` - Security considerations

#### Dependencies
- All implementation tasks completed

#### Technical Notes
- Document all environment variables
- Include example API requests/responses
- Provide webhook testing instructions
- Document common error codes
- Include security best practices
- Add monitoring and logging guidance
- Create deployment checklist:
  - [ ] Environment variables configured
  - [ ] Database migration run
  - [ ] Storage bucket created
  - [ ] Webhook registered
  - [ ] Test payment flow in staging
  - [ ] Monitor logs after deployment

---

## Summary

**Total Tasks:** 33  
**Estimated Total Effort:** 154 hours (~6 weeks with 1 developer)

**Phase Breakdown:**
- Phase 1 (Foundation): 18 hours
- Phase 2 (Server Actions): 28 hours
- Phase 3 (Webhook Handler): 22 hours
- Phase 4 (UI Components): 24 hours
- Phase 5 (Receipt Generation): 18 hours
- Phase 6 (Testing & Polish): 44 hours

**Critical Path:**
Task 1 → Task 2 → Task 3 → Task 4 → Task 6 → Task 11 → Task 13 → Task 14 → Task 16 → Task 21 → Task 26 → Task 27

**External Dependencies:**
- PayMongo account and test API keys
- Supabase project with tours_bookings table
- npm packages: @paymongo/node, pdfkit, qrcode
- Environment variables: PAYMONGO_SECRET_KEY, PAYMONGO_WEBHOOK_SECRET, PAYMENT_TEST_MODE

**Risk Mitigation:**
- Start PayMongo account setup early (Task 32)
- Test webhook delivery in PayMongo dashboard before integration
- Use test mode throughout development
- Deploy to staging with test credentials first
- Monitor logs closely after initial deployment
