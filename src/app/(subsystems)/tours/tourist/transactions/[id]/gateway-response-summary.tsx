/**
 * Gateway Response Summary Component
 * 
 * Displays a summary of the PayMongo gateway response:
 * - Success/error messages only (not raw data)
 * - Webhook event details
 * - Payment processing info
 * 
 * Sanitizes sensitive data from gateway response before displaying
 */
interface GatewayResponseSummaryProps {
  response: Record<string, any> | null;
}

export function GatewayResponseSummary({
  response,
}: GatewayResponseSummaryProps) {
  if (!response) {
    return (
      <div>
        <h2 className="mb-4 font-bold text-daet-ink">Gateway Information</h2>
        <p className="text-sm text-daet-ink/65">No gateway response available.</p>
      </div>
    );
  }

  // Extract safe information from response
  const webhookEvent = response.webhookEvent as Record<string, any> | undefined;
  const paymentAttributes = webhookEvent?.paymentAttributes as Record<string, any> | undefined;

  return (
    <div>
      <h2 className="mb-4 font-bold text-daet-ink">Gateway Information</h2>

      <div className="space-y-4">
        {/* Webhook Event Info */}
        {webhookEvent && (
          <div className="rounded-lg border border-daet-ink/10 bg-daet-ink/5 p-4">
            <h3 className="mb-3 text-sm font-bold text-daet-ink">Payment Processing</h3>

            <div className="space-y-2 text-sm">
              {webhookEvent.id && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Event ID:</span>
                  <span className="font-mono text-daet-ink">
                    {webhookEvent.id.substring(0, 20)}...
                  </span>
                </div>
              )}

              {webhookEvent.type && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Event Type:</span>
                  <span className="font-bold text-daet-ink">{webhookEvent.type}</span>
                </div>
              )}

              {webhookEvent.timestamp && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Processed:</span>
                  <span className="text-daet-ink">
                    {new Date(webhookEvent.timestamp).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment Attributes */}
        {paymentAttributes && (
          <div className="rounded-lg border border-daet-ink/10 bg-daet-ink/5 p-4">
            <h3 className="mb-3 text-sm font-bold text-daet-ink">Payment Details</h3>

            <div className="space-y-2 text-sm">
              {paymentAttributes.status && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Status:</span>
                  <span className="font-bold text-emerald-600 uppercase">
                    {paymentAttributes.status}
                  </span>
                </div>
              )}

              {paymentAttributes.amount && paymentAttributes.currency && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Amount:</span>
                  <span className="font-bold text-daet-ink">
                    {(paymentAttributes.amount / 100).toLocaleString("en-PH", {
                      style: "currency",
                      currency: paymentAttributes.currency,
                    })}
                  </span>
                </div>
              )}

              {paymentAttributes.description && (
                <div className="flex justify-between gap-4">
                  <span className="text-daet-ink/65">Description:</span>
                  <span className="text-right text-daet-ink line-clamp-2">
                    {paymentAttributes.description}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-xs text-blue-800">
            <strong>ℹ️ Note:</strong> For security reasons, only essential transaction information is displayed.
            For detailed payment processing information, contact our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
