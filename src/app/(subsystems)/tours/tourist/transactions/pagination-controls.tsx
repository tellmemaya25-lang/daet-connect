import Link from "next/link";

interface PaginationControlsProps {
  currentPage: number;
  hasMore: boolean;
}

/**
 * Pagination Controls Component
 * 
 * Displays:
 * - Previous button (disabled on page 1)
 * - Page indicators
 * - Next button (disabled if no more results)
 */
export function PaginationControls({
  currentPage,
  hasMore,
}: PaginationControlsProps) {
  const prevPage = currentPage - 1;
  const nextPage = currentPage + 1;

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Previous Button */}
      <Link
        href={`/tours/tourist/transactions?page=${prevPage}`}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          currentPage > 1
            ? "bg-daet-forest text-white shadow-sm hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            : "cursor-not-allowed bg-gray-100 text-gray-400"
        }`}
        aria-disabled={currentPage === 1}
        {...(currentPage === 1 && { onClick: (e) => e.preventDefault() })}
      >
        ← Previous
      </Link>

      {/* Page Indicator */}
      <span className="text-sm font-bold text-daet-ink">Page {currentPage}</span>

      {/* Next Button */}
      <Link
        href={`/tours/tourist/transactions?page=${nextPage}`}
        className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-bold transition ${
          hasMore
            ? "bg-daet-forest text-white shadow-sm hover:bg-daet-ink focus:outline-none focus:ring-4 focus:ring-daet-forest/20"
            : "cursor-not-allowed bg-gray-100 text-gray-400"
        }`}
        aria-disabled={!hasMore}
        {...(!hasMore && { onClick: (e) => e.preventDefault() })}
      >
        Next →
      </Link>
    </div>
  );
}
