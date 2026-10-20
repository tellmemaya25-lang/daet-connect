import { redirect } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { getAuthenticatedSession } from "@/lib/tours/server-auth";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getTouristTransactions } from "../payments/actions";
import { TransactionWithBooking } from "@/lib/tours/payment-contract";
import { TransactionCard } from "./transaction-card";
import { PaginationControls } from "./pagination-controls";

export const dynamic = "force-dynamic";

interface TransactionHistoryPageProps {
  searchParams: { page?: string };
}

const ITEMS_PER_PAGE = 20;

/**
 * Transaction History Page
 * 
 * Task 19: Transaction History Page with Pagination
 * 
 * Lists all tourist transactions with:
 * - Reverse chronological ordering
 * - Transaction details (booking, date, amount, method, status)
 * - Status badges with color coding
 * - Pagination controls
 * - View receipt links for completed transactions
 * - Currency formatting
 * 
 * Acceptance Criteria:
 * - 8.1: Transaction history page exists at /tours/tourist/transactions
 * - 8.3: Transactions displayed in reverse chronological order
 * - 8.4: Shows booking title, payment date, amount, method, status
 * - 8.6: Pagination displays 20 per page
 * - 8.7: "View Receipt" link shown for completed transactions
 * - 13.3: Amounts formatted as "₱X,XXX.XX"
 */
export default async function TransactionHistoryPage({
  searchParams,
}: TransactionHistoryPageProps) {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Notice variant="warning" title="Supabase setup is needed">
          Configure Supabase before opening the transaction history page.
        </Notice>
      </PageFrame>
    );
  }

  let session;
  try {
    session = await getAuthenticatedSession();
  } catch {
    session = { user: null, role: null, error: "Supabase could not be reached." };
  }

  if (!session.user) {
    redirect(`/login?next=${encodeURIComponent("/tours/tourist/transactions")}`);
  }

  if (session.error || !session.role) {
    return (
      <PageFrame>
        <Notice
          variant="error"
          title="We could not verify your account"
        >
          {session.error ?? "Your role could not be verified."}
        </Notice>
      </PageFrame>
    );
  }

  // Get current page from search params
  const currentPage = parseInt(searchParams.page || "1", 10);
  if (isNaN(currentPage) || currentPage < 1) {
    redirect("/tours/tourist/transactions?page=1");
  }

  // Fetch transactions
  const result = await getTouristTransactions(currentPage, ITEMS_PER_PAGE);

  if (!result.success) {
    return (
      <PageFrame>
        <Notice variant="error" title="Could not load transactions">
          {result.error || "An error occurred while loading your transactions."}
        </Notice>
      </PageFrame>
    );
  }

  const transactions = result.data || [];

  return (
    <PageFrame>
      <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black text-daet-ink">Transaction History</h1>
          <p className="mt-2 text-daet-ink/65">
            View all your tour booking payments and transaction details.
          </p>
        </div>

        {/* Empty State */}
        {transactions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-daet-ink/20 p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-daet-ink/30"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-bold text-daet-ink">No transactions yet</h3>
            <p className="mt-1 text-sm text-daet-ink/65">
              Your completed tour bookings will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Transaction List */}
            <div className="space-y-4">
              {transactions.map((transaction: TransactionWithBooking) => (
                <TransactionCard
                  key={transaction.id}
                  transaction={transaction}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="mt-8 border-t border-daet-ink/10 pt-8">
              <PaginationControls
                currentPage={currentPage}
                hasMore={transactions.length === ITEMS_PER_PAGE}
              />
            </div>
          </>
        )}
      </section>
    </PageFrame>
  );
}
