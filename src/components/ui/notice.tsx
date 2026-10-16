import type { ReactNode } from "react";

const variants = {
  info: "border-sky-200 bg-sky-50 text-sky-950",
  warning: "border-amber-200 bg-amber-50 text-amber-950",
  success: "border-emerald-200 bg-emerald-50 text-emerald-950",
  error: "border-rose-200 bg-rose-50 text-rose-950",
} as const;

export function Notice({
  variant = "info",
  title,
  children,
  className = "",
}: {
  variant?: keyof typeof variants;
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div role={variant === "error" ? "alert" : "status"} className={`rounded-2xl border p-4 ${variants[variant]} ${className}`}>
      {title ? <p className="font-bold">{title}</p> : null}
      <div className={title ? "mt-1 text-sm leading-6" : "text-sm leading-6"}>{children}</div>
    </div>
  );
}
