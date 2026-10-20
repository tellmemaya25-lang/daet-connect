import type { PaymentStatus } from "@/lib/tours/payment-contract";

interface StatusBadgeProps {
  status: PaymentStatus;
}

/**
 * Status Badge Component
 * 
 * Displays payment status with color coding:
 * - completed: green
 * - failed: red
 * - pending: yellow
 * - processing: blue
 * - expired: gray
 * - refunded: purple
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const statusConfig = {
    completed: {
      label: "Completed",
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-800",
      borderColor: "border-emerald-200",
      icon: "✓",
    },
    failed: {
      label: "Failed",
      bgColor: "bg-red-50",
      textColor: "text-red-800",
      borderColor: "border-red-200",
      icon: "✕",
    },
    pending: {
      label: "Pending",
      bgColor: "bg-yellow-50",
      textColor: "text-yellow-800",
      borderColor: "border-yellow-200",
      icon: "⏳",
    },
    processing: {
      label: "Processing",
      bgColor: "bg-blue-50",
      textColor: "text-blue-800",
      borderColor: "border-blue-200",
      icon: "⟳",
    },
    expired: {
      label: "Expired",
      bgColor: "bg-gray-50",
      textColor: "text-gray-800",
      borderColor: "border-gray-200",
      icon: "⊗",
    },
    refunded: {
      label: "Refunded",
      bgColor: "bg-purple-50",
      textColor: "text-purple-800",
      borderColor: "border-purple-200",
      icon: "↶",
    },
  };

  const config = statusConfig[status];

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border ${config.bgColor} ${config.textColor} ${config.borderColor} text-xs font-bold whitespace-nowrap`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </div>
  );
}
