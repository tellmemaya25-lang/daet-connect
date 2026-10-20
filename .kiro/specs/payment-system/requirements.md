# Requirements Document

## Introduction

The Payment System enables tourists to complete tour bookings by processing payments through Philippine payment gateways. The system handles payment initiation, gateway communication, transaction tracking, status synchronization via webhooks, and booking status updates. It supports multiple Philippine payment methods including GCash, credit/debit cards, and bank transfers, with built-in security measures for PCI compliance and idempotent payment processing.

## Glossary

- **Payment_Gateway**: External payment service provider (e.g., PayMongo, Paymaya, Xendit) that processes payment transactions
- **Payment_Session**: Temporary payment context created for a booking, containing payment intent and gateway-specific identifiers
- **Transaction_Record**: Persistent record of a payment attempt or completion stored in the tours_payment_transactions table
- **Payment_Token**: Secure identifier issued by Payment_Gateway for tracking a payment through its lifecycle
- **Webhook**: HTTP callback from Payment_Gateway to Payment_System notifying payment status changes
- **Idempotency_Key**: Unique identifier ensuring duplicate payment requests do not create multiple charges
- **Payment_Status**: Current state of a payment (pending | processing | completed | failed | refunded)
- **Booking_Record**: Existing record in tours_bookings table representing a tour reservation
- **Payment_Method**: Method used for payment (gcash | card | bank_transfer | paymaya)
- **Tourist**: Authenticated user with role 'tourist' who books and pays for tours
- **Payment_Processor**: Server-side component that orchestrates payment operations
- **Receipt_Generator**: Component that produces transaction receipts for completed payments
- **Payment_UI**: Client-side interface for payment initiation and status display

## Requirements

### Requirement 1: Payment Initiation

**User Story:** As a tourist, I want to initiate payment for my pending booking, so that I can secure my tour reservation.

#### Acceptance Criteria

1. WHEN a Tourist views a Booking_Record with status "pending_payment", THE Payment_UI SHALL display an enabled "Proceed to Payment" button
2. WHEN a Tourist clicks "Proceed to Payment", THE Payment_Processor SHALL create a Payment_Session with a unique Idempotency_Key
3. WHEN creating a Payment_Session, THE Payment_Processor SHALL retrieve the total_amount from the Booking_Record
4. WHEN creating a Payment_Session, THE Payment_Processor SHALL call Payment_Gateway API to create a payment intent
5. WHEN Payment_Gateway returns a Payment_Token, THE Payment_Processor SHALL store a Transaction_Record with Payment_Status "pending"
6. WHEN Payment_Session creation succeeds, THE Payment_UI SHALL redirect the Tourist to the Payment_Gateway checkout page
7. IF Payment_Gateway API call fails, THEN THE Payment_Processor SHALL return an error message to the Tourist
8. WHEN a duplicate payment request is received with the same Idempotency_Key within 24 hours, THE Payment_Processor SHALL return the existing Payment_Session instead of creating a new one

### Requirement 2: Payment Method Selection

**User Story:** As a tourist, I want to choose my preferred payment method, so that I can pay using the most convenient option for me.

#### Acceptance Criteria

1. THE Payment_Gateway SHALL support GCash as a Payment_Method
2. THE Payment_Gateway SHALL support credit and debit cards as a Payment_Method
3. THE Payment_Gateway SHALL support bank transfers as a Payment_Method
4. WHERE PayMaya is available, THE Payment_Gateway SHALL support PayMaya as a Payment_Method
5. WHEN a Tourist is redirected to Payment_Gateway checkout, THE Payment_UI SHALL display all available Payment_Method options
6. WHEN a Tourist selects a Payment_Method, THE Payment_Gateway SHALL display method-specific input fields
7. THE Transaction_Record SHALL store the selected Payment_Method after payment completion

### Requirement 3: Payment Processing

**User Story:** As a tourist, I want my payment to be processed securely, so that my financial information is protected.

#### Acceptance Criteria

1. THE Payment_Gateway SHALL handle all sensitive payment information (card numbers, CVV, bank credentials)
2. THE Payment_System SHALL transmit payment data to Payment_Gateway using HTTPS encryption
3. WHEN a Tourist submits payment information to Payment_Gateway, THE Payment_Gateway SHALL validate the payment details
4. WHEN payment validation succeeds, THE Payment_Gateway SHALL process the transaction
5. WHEN Payment_Gateway processes a transaction, THE Payment_Gateway SHALL return a transaction result to the Payment_System
6. THE Payment_System SHALL store Payment_Token references only, not raw payment credentials
7. THE Payment_System SHALL implement rate limiting of 5 payment attempts per booking within 1 hour

### Requirement 4: Transaction Tracking

**User Story:** As a tourist, I want to track my payment status in real-time, so that I know when my payment is confirmed.

#### Acceptance Criteria

1. THE Payment_System SHALL create a Transaction_Record for each payment attempt
2. THE Transaction_Record SHALL include fields: id, booking_id, payment_token, payment_method, amount, currency, status, gateway_response, idempotency_key, created_at, updated_at
3. WHEN a payment is initiated, THE Payment_Processor SHALL set Payment_Status to "pending"
4. WHEN Payment_Gateway begins processing, THE Payment_Processor SHALL update Payment_Status to "processing"
5. WHEN Payment_Gateway completes a payment successfully, THE Payment_Processor SHALL update Payment_Status to "completed"
6. IF payment processing fails, THEN THE Payment_Processor SHALL update Payment_Status to "failed"
7. THE Payment_Processor SHALL store the Payment_Gateway response in the gateway_response field as JSON
8. WHEN a Transaction_Record is updated, THE Payment_Processor SHALL update the updated_at timestamp

### Requirement 5: Webhook Processing

**User Story:** As the system, I want to receive real-time payment status updates from the payment gateway, so that booking statuses are synchronized immediately.

#### Acceptance Criteria

1. THE Payment_System SHALL expose a webhook endpoint at /api/webhooks/payment
2. WHEN Payment_Gateway sends a webhook notification, THE Payment_System SHALL verify the webhook signature
3. IF webhook signature verification fails, THEN THE Payment_System SHALL return HTTP 401 and ignore the payload
4. WHEN a valid webhook is received, THE Payment_System SHALL extract the Payment_Token from the payload
5. WHEN Payment_Token is extracted, THE Payment_System SHALL locate the corresponding Transaction_Record
6. WHEN a webhook indicates payment success, THE Payment_System SHALL update Transaction_Record Payment_Status to "completed"
7. WHEN a webhook indicates payment failure, THE Payment_System SHALL update Transaction_Record Payment_Status to "failed"
8. THE Payment_System SHALL return HTTP 200 to Payment_Gateway after processing the webhook
9. THE Payment_System SHALL implement idempotent webhook processing to handle duplicate notifications

### Requirement 6: Booking Status Update

**User Story:** As a tourist, I want my booking status to update automatically when payment succeeds, so that my tour is confirmed.

#### Acceptance Criteria

1. WHEN a Transaction_Record Payment_Status changes to "completed", THE Payment_Processor SHALL retrieve the associated Booking_Record
2. WHEN Booking_Record is retrieved, THE Payment_Processor SHALL update the Booking_Record status from "pending_payment" to "completed"
3. WHEN Booking_Record status is updated, THE Payment_Processor SHALL update the Booking_Record updated_at timestamp
4. IF Booking_Record status is already "completed" or "cancelled", THEN THE Payment_Processor SHALL not modify the status
5. WHEN Booking_Record status update fails, THE Payment_Processor SHALL log the error and queue for retry
6. THE Payment_Processor SHALL implement retry logic with exponential backoff for failed status updates (3 attempts: 1s, 5s, 15s)

### Requirement 7: Payment Redirect and Callback

**User Story:** As a tourist, I want to return to the booking page after payment, so that I can see my confirmed booking.

#### Acceptance Criteria

1. WHEN creating a Payment_Session, THE Payment_Processor SHALL provide a success_url to Payment_Gateway pointing to /tours/tourist/bookings/[bookingId]/payment-success
2. WHEN creating a Payment_Session, THE Payment_Processor SHALL provide a cancel_url to Payment_Gateway pointing to /tours/tourist/bookings/[bookingId]/payment-cancelled
3. WHEN a Tourist completes payment on Payment_Gateway, THE Payment_Gateway SHALL redirect the Tourist to success_url
4. WHEN a Tourist cancels payment on Payment_Gateway, THE Payment_Gateway SHALL redirect the Tourist to cancel_url
5. WHEN Tourist arrives at success_url, THE Payment_UI SHALL display a loading state while verifying payment
6. WHEN payment verification completes, THE Payment_UI SHALL display booking confirmation with updated status
7. WHEN Tourist arrives at cancel_url, THE Payment_UI SHALL display cancellation message and option to retry payment
8. THE Payment_UI SHALL poll Transaction_Record status for up to 30 seconds if webhook has not yet updated the status

### Requirement 8: Transaction History

**User Story:** As a tourist, I want to view my payment history, so that I can track all my tour payments.

#### Acceptance Criteria

1. THE Payment_UI SHALL provide a transaction history page at /tours/tourist/transactions
2. WHEN a Tourist views transaction history, THE Payment_System SHALL retrieve all Transaction_Record entries where booking_id matches Tourist's bookings
3. THE Payment_UI SHALL display transactions in reverse chronological order (newest first)
4. THE Payment_UI SHALL display for each transaction: booking title, payment date, amount, Payment_Method, Payment_Status
5. WHEN a Tourist clicks a transaction, THE Payment_UI SHALL display full transaction details including Transaction_Record id and gateway_response summary
6. THE Payment_UI SHALL implement pagination with 20 transactions per page
7. WHERE Transaction_Record Payment_Status is "completed", THE Payment_UI SHALL display a "View Receipt" link

### Requirement 9: Receipt Generation

**User Story:** As a tourist, I want to download a receipt for my completed payment, so that I have proof of purchase.

#### Acceptance Criteria

1. WHEN a Transaction_Record has Payment_Status "completed", THE Receipt_Generator SHALL be able to produce a receipt
2. THE Receipt_Generator SHALL include in the receipt: transaction ID, booking details, payment date, amount, Payment_Method, Tourist name, operator name
3. THE Receipt_Generator SHALL format the receipt as a PDF document
4. WHEN a Tourist requests a receipt, THE Payment_System SHALL generate the PDF and return it as a download
5. THE Receipt_Generator SHALL store generated receipts in Supabase Storage under bucket tours_receipts with path {tourist_id}/{transaction_id}.pdf
6. WHEN receipt generation fails, THE Payment_System SHALL retry once after 2 seconds
7. THE Receipt_Generator SHALL include QR code containing transaction verification URL

### Requirement 10: Payment Failure Handling

**User Story:** As a tourist, I want clear feedback when payment fails, so that I can understand what went wrong and retry.

#### Acceptance Criteria

1. WHEN Payment_Status changes to "failed", THE Payment_UI SHALL display the failure reason from gateway_response
2. THE Payment_UI SHALL provide a "Retry Payment" button for failed transactions
3. WHEN a Tourist clicks "Retry Payment", THE Payment_Processor SHALL create a new Payment_Session with a new Idempotency_Key
4. THE Payment_UI SHALL display common failure reasons in user-friendly language (e.g., "insufficient funds" instead of error codes)
5. IF payment fails 5 times for the same booking, THEN THE Payment_UI SHALL display contact support message
6. WHEN payment fails due to gateway timeout, THE Payment_UI SHALL automatically retry after 5 seconds (one automatic retry only)
7. THE Payment_System SHALL send failure notification to Tourist via email for manual retries

### Requirement 11: Payment Timeout Handling

**User Story:** As a tourist, I want abandoned payment sessions to expire, so that I can create fresh payment sessions without conflicts.

#### Acceptance Criteria

1. THE Payment_System SHALL set Payment_Session expiration to 30 minutes from creation
2. WHEN Payment_Session expires before payment completion, THE Payment_Gateway SHALL invalidate the Payment_Token
3. WHEN a Tourist returns to an expired Payment_Session, THE Payment_UI SHALL display "Payment session expired" message
4. WHEN payment session expires, THE Payment_UI SHALL provide a "Start New Payment" button
5. THE Payment_System SHALL run a scheduled job every hour to mark Transaction_Record entries with Payment_Status "pending" older than 30 minutes as "expired"

### Requirement 12: Test Mode Support

**User Story:** As a developer, I want to test payment flows without real money, so that I can verify the system works correctly.

#### Acceptance Criteria

1. WHERE environment variable PAYMENT_TEST_MODE is "true", THE Payment_System SHALL use Payment_Gateway test API credentials
2. WHILE in test mode, THE Payment_Gateway SHALL process payments without actual fund transfers
3. WHILE in test mode, THE Payment_UI SHALL display a test mode banner at the top of payment pages
4. THE Payment_System SHALL store test mode status in Transaction_Record metadata field
5. WHERE environment variable PAYMENT_TEST_MODE is "false" or unset, THE Payment_System SHALL use Payment_Gateway production credentials
6. THE Payment_System SHALL prevent test mode transactions from triggering production notifications

### Requirement 13: Currency and Amount Handling

**User Story:** As a tourist, I want to see payment amounts in Philippine Pesos, so that pricing is clear and matches local currency.

#### Acceptance Criteria

1. THE Payment_System SHALL store all transaction amounts in Philippine Pesos (PHP)
2. THE Transaction_Record SHALL include a currency field with value "PHP"
3. THE Payment_UI SHALL display amounts formatted as "₱X,XXX.XX" with comma thousand separators and two decimal places
4. WHEN sending amount to Payment_Gateway, THE Payment_Processor SHALL convert amount to centavos (multiply by 100) if required by gateway API
5. WHEN receiving amount from Payment_Gateway webhook, THE Payment_Processor SHALL convert from centavos to pesos if necessary
6. THE Payment_System SHALL validate that transaction amount matches Booking_Record total_amount before processing

### Requirement 14: Refund Support (Schema Preparation)

**User Story:** As the system, I want the database schema to support future refund functionality, so that refunds can be implemented without schema migration.

#### Acceptance Criteria

1. THE Transaction_Record SHALL include a refunded_amount field defaulting to 0
2. THE Transaction_Record SHALL include a refund_reason field accepting text or null
3. THE Transaction_Record SHALL support Payment_Status value "refunded"
4. THE Transaction_Record SHALL include a refunded_at timestamp field accepting datetime or null
5. WHEN a Transaction_Record is created, THE Payment_System SHALL set refunded_amount to 0 and refunded_at to null

### Requirement 15: Security and Authorization

**User Story:** As a tourist, I want only my payments to be visible to me, so that my financial information remains private.

#### Acceptance Criteria

1. WHEN a Tourist requests transaction history, THE Payment_System SHALL verify the Tourist is authenticated
2. WHEN retrieving Transaction_Record entries, THE Payment_System SHALL filter by booking_id where tourist_id matches the authenticated Tourist
3. IF a Tourist attempts to access another Tourist's transaction, THEN THE Payment_System SHALL return HTTP 403 Forbidden
4. THE Payment_System SHALL store Payment_Gateway webhook secrets as environment variables, not in code
5. THE Payment_System SHALL validate that payment initiation requests include CSRF tokens
6. THE Payment_System SHALL log all payment operations with timestamp, user ID, and operation type for audit trails

### Requirement 16: Error Logging and Monitoring

**User Story:** As an administrator, I want payment errors to be logged comprehensively, so that I can diagnose and resolve issues quickly.

#### Acceptance Criteria

1. WHEN Payment_Gateway API call fails, THE Payment_System SHALL log the error with request payload and response
2. WHEN webhook signature verification fails, THE Payment_System SHALL log the failed verification attempt with sender IP
3. WHEN booking status update fails, THE Payment_System SHALL log the booking_id and error details
4. THE Payment_System SHALL implement structured logging with fields: timestamp, level, component, booking_id, transaction_id, error_message
5. WHEN a payment operation fails, THE Payment_System SHALL include correlation ID in logs to trace the request flow
6. THE Payment_System SHALL expose payment metrics: total_transactions, success_rate, average_processing_time, failed_transactions_count

### Requirement 17: Concurrent Payment Prevention

**User Story:** As the system, I want to prevent multiple simultaneous payment attempts for the same booking, so that double-charging cannot occur.

#### Acceptance Criteria

1. WHEN a payment is in progress for a booking, THE Payment_System SHALL lock the Booking_Record
2. IF a second payment request arrives for a locked Booking_Record, THEN THE Payment_System SHALL return "Payment already in progress" error
3. WHEN a payment completes or fails, THE Payment_System SHALL release the Booking_Record lock
4. THE Payment_System SHALL implement lock timeout of 10 minutes to prevent permanent locks from crashes
5. WHEN lock timeout expires, THE Payment_System SHALL automatically release the lock

### Requirement 18: Mobile Responsive Payment UI

**User Story:** As a tourist using a mobile device, I want the payment interface to work smoothly on my phone, so that I can complete payments on the go.

#### Acceptance Criteria

1. THE Payment_UI SHALL render correctly on viewport widths from 375px to 1440px
2. THE Payment_UI SHALL use touch-friendly button sizes with minimum height of 44px
3. WHEN Payment_Gateway loads checkout in iframe, THE Payment_UI SHALL ensure iframe is responsive
4. WHERE Payment_Gateway provides mobile-optimized checkout, THE Payment_System SHALL request the mobile variant on devices with width less than 768px
5. THE Payment_UI SHALL display loading indicators during payment processing
6. THE Payment_UI SHALL prevent accidental double-clicks on payment submission buttons with disable-on-click behavior
