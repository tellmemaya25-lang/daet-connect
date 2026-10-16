import Link from "next/link";
import { PageFrame } from "@/components/ui/page-frame";

export default function HomePage() {
  return (
    <PageFrame adminNav>
      <section className="overflow-hidden rounded-[2rem] bg-daet-forest px-6 py-10 text-white shadow-card sm:px-10 sm:py-14 lg:px-14">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-100/80">Daet, Camarines Norte</p>
          <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            Local stories.<br className="hidden sm:block" /> Local guides.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/80 sm:text-lg">
            CONNECT-DAET brings trusted local tour operators and meaningful Camarines Norte experiences together.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/tours/operator/register" className="inline-flex min-h-12 items-center justify-center rounded-full bg-daet-sun px-7 text-sm font-black text-daet-ink transition hover:bg-amber-300">
              Apply as an operator <span className="ml-2" aria-hidden="true">↗</span>
            </Link>
            <Link href="/tours/admin/operators" className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/30 px-7 text-sm font-bold text-white transition hover:bg-white/10">
              Tourism Office review
            </Link>
          </div>
        </div>
        <div className="mt-12 grid gap-3 border-t border-white/15 pt-6 text-sm sm:grid-cols-3 sm:gap-6">
          <div><span className="font-black text-daet-sun">01</span><p className="mt-1 text-white/75">Apply in three short steps</p></div>
          <div><span className="font-black text-daet-sun">02</span><p className="mt-1 text-white/75">Tourism Office verifies your documents</p></div>
          <div><span className="font-black text-daet-sun">03</span><p className="mt-1 text-white/75">Approved operators can publish packages</p></div>
        </div>
      </section>
      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-daet-leaf">For local businesses</p>
          <h2 className="mt-2 text-xl font-black">Get accredited before listing a tour</h2>
          <p className="mt-2 text-sm leading-6 text-daet-ink/65">Keep your business details, permit, registration document, and GCash QR ready.</p>
        </div>
        <div className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-daet-leaf">For the Tourism Office</p>
          <h2 className="mt-2 text-xl font-black">Review pending applications securely</h2>
          <p className="mt-2 text-sm leading-6 text-daet-ink/65">Uploaded documents stay private; access links are time-limited and visible only to an admin.</p>
        </div>
      </section>
    </PageFrame>
  );
}
