import { redirect } from "next/navigation";
import Link from "next/link";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ guideId: string }>;
}

export default async function VerifyGuidePage({ params }: Props) {
  const { guideId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <Notice variant="warning" title="Supabase setup needed">
          Configure Supabase to verify guides.
        </Notice>
      </PageFrame>
    );
  }

  const supabase = await createSupabaseServerClient();

  // Get current user (optional - for checking if guide is assigned to tourist)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get guide profile with full details
  const { data: guide, error } = await supabase
    .from("tours_guides")
    .select(`
      id,
      profile_id,
      full_name,
      contact_phone,
      address,
      languages,
      specializations,
      years_of_experience,
      accreditation_status,
      profile_photo_url,
      created_at
    `)
    .eq("id", guideId)
    .maybeSingle();

  if (error || !guide) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-2xl py-12 text-center">
          <div className="mb-6 text-6xl">❌</div>
          <h1 className="text-3xl font-black text-daet-ink">Guide Not Found</h1>
          <p className="mt-3 text-daet-ink/60">
            This QR code is invalid or the guide profile no longer exists.
          </p>
          <Link
            href="/tours/browse"
            className="mt-6 inline-block rounded-full bg-daet-forest px-8 py-3 font-bold text-white transition hover:bg-daet-ink"
          >
            Browse Tours
          </Link>
        </div>
      </PageFrame>
    );
  }

  // Check if this guide is assigned to the current tourist's booking
  let isAssignedToMe = false;
  let assignedBooking = null;

  if (user) {
    const { data: assignment } = await supabase
      .from("tours_guide_assignments")
      .select(`
        id,
        booking_id,
        tours_bookings!inner (
          id,
          booking_reference,
          tour_date,
          user_id,
          tours_packages (
            title,
            location_name
          )
        )
      `)
      .eq("guide_id", guideId)
      .eq("tours_bookings.user_id", user.id)
      .maybeSingle();

    if (assignment) {
      isAssignedToMe = true;
      assignedBooking = assignment;
    }
  }

  // Status badge
  const statusConfig = {
    approved: { bg: "bg-emerald-100", text: "text-emerald-900", label: "✅ Accredited Guide" },
    pending: { bg: "bg-amber-100", text: "text-amber-900", label: "⏳ Pending Accreditation" },
    rejected: { bg: "bg-rose-100", text: "text-rose-900", label: "❌ Not Accredited" },
  };

  const status = statusConfig[guide.accreditation_status] || statusConfig.pending;

  return (
    <PageFrame>
      <div className="mx-auto max-w-3xl">
        {/* Verification Banner */}
        {isAssignedToMe && (
          <div className="mb-6 rounded-3xl border-2 border-emerald-500 bg-emerald-50 p-6 text-center">
            <div className="mb-3 text-5xl">✅</div>
            <h2 className="text-2xl font-black text-emerald-900">Verified Guide!</h2>
            <p className="mt-2 text-sm text-emerald-800">
              This guide is assigned to your booking
            </p>
            {assignedBooking && (
              <div className="mt-3 text-sm font-bold text-emerald-900">
                Booking: {(assignedBooking as any).tours_bookings.booking_reference}
              </div>
            )}
          </div>
        )}

        {/* Guide Profile Card */}
        <div className="rounded-3xl border border-daet-ink/10 bg-white p-8 shadow-sm">
          {/* Header */}
          <div className="flex items-start gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              {guide.profile_photo_url ? (
                <img
                  src={guide.profile_photo_url}
                  alt={guide.full_name}
                  className="h-32 w-32 rounded-full border-4 border-daet-sand object-cover"
                />
              ) : (
                <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-daet-sand bg-daet-sand/50 text-5xl font-black text-daet-ink">
                  {guide.full_name.charAt(0)}
                </div>
              )}
            </div>

            {/* Name & Status */}
            <div className="flex-1">
              <h1 className="text-3xl font-black text-daet-ink">{guide.full_name}</h1>
              <div className="mt-3">
                <span
                  className={`inline-block rounded-full px-4 py-2 text-sm font-bold ${status.bg} ${status.text}`}
                >
                  {status.label}
                </span>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="mt-8 space-y-4">
            {/* Contact */}
            <div className="rounded-2xl border border-daet-ink/10 bg-daet-sand/20 p-4">
              <p className="text-xs font-bold text-daet-ink/60">Contact Number</p>
              <p className="mt-1 text-lg font-black text-daet-ink">
                📞 {guide.contact_phone}
              </p>
            </div>

            {/* Address */}
            <div className="rounded-2xl border border-daet-ink/10 bg-daet-sand/20 p-4">
              <p className="text-xs font-bold text-daet-ink/60">Address</p>
              <p className="mt-1 text-lg font-bold text-daet-ink">
                📍 {guide.address}
              </p>
            </div>

            {/* Experience */}
            {guide.years_of_experience && (
              <div className="rounded-2xl border border-daet-ink/10 bg-daet-sand/20 p-4">
                <p className="text-xs font-bold text-daet-ink/60">Experience</p>
                <p className="mt-1 text-lg font-bold text-daet-ink">
                  🏆 {guide.years_of_experience} years
                </p>
              </div>
            )}

            {/* Languages */}
            {guide.languages && guide.languages.length > 0 && (
              <div className="rounded-2xl border border-daet-ink/10 bg-daet-sand/20 p-4">
                <p className="text-xs font-bold text-daet-ink/60">Languages</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {guide.languages.map((lang: string) => (
                    <span
                      key={lang}
                      className="rounded-full bg-white px-3 py-1 text-sm font-bold text-daet-ink"
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Specializations */}
            {guide.specializations && guide.specializations.length > 0 && (
              <div className="rounded-2xl border border-daet-ink/10 bg-daet-sand/20 p-4">
                <p className="text-xs font-bold text-daet-ink/60">Specializations</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {guide.specializations.map((spec: string) => (
                    <span
                      key={spec}
                      className="rounded-full bg-daet-forest/10 px-3 py-1 text-sm font-bold text-daet-forest"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Warning if not accredited */}
          {guide.accreditation_status !== "approved" && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-center">
              <p className="text-sm font-bold text-rose-900">
                ⚠️ Warning: This guide is not currently accredited by CONNECT-DAET Tourism Office
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/tours/my-bookings"
            className="rounded-full bg-daet-forest px-8 py-3 font-bold text-white transition hover:bg-daet-ink"
          >
            View My Bookings
          </Link>
          <Link
            href="/tours/browse"
            className="rounded-full border border-daet-ink/20 px-8 py-3 font-bold text-daet-ink transition hover:bg-daet-sand"
          >
            Browse Tours
          </Link>
        </div>
      </div>
    </PageFrame>
  );
}
