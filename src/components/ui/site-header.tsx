import Link from "next/link";
import { BrandMark } from "@/components/ui/brand-mark";

export function SiteHeader({ showAdminLink = false }: { showAdminLink?: boolean }) {
  return (
    <header className="border-b border-daet-ink/10 bg-white/75 backdrop-blur-sm">
      <div className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <BrandMark />
        <nav className="flex items-center gap-2 sm:gap-4" aria-label="Main navigation">
          <Link
            href="/tours/operator/register"
            className="inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold text-daet-ink transition hover:bg-daet-sand"
          >
            For operators
          </Link>
          {showAdminLink ? (
            <Link
              href="/tours/admin/operators"
              className="hidden min-h-11 items-center rounded-full border border-daet-forest/20 px-4 text-sm font-semibold text-daet-forest transition hover:bg-daet-forest/5 sm:inline-flex"
            >
              Admin review
            </Link>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
