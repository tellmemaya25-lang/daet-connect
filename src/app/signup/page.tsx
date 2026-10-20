import { redirect } from "next/navigation";
import { PageFrame } from "@/components/ui/page-frame";
import { Notice } from "@/components/ui/notice";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { SignupForm } from "./signup-form";

export const dynamic = "force-dynamic";

export default async function SignupPage() {
  if (!isSupabaseConfigured()) {
    return (
      <PageFrame>
        <div className="mx-auto max-w-md py-8">
          <Notice variant="warning" title="Supabase setup required">
            Configure Supabase environment variables before creating an account.
          </Notice>
        </div>
      </PageFrame>
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();

  if (data?.user) {
    redirect("/");
  }

  return (
    <PageFrame>
      <div className="mx-auto max-w-md">
        <section className="rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-10">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">CONNECT-DAET</p>
          <h1 className="mt-2 text-3xl font-black text-daet-ink">Create account</h1>
          <p className="mt-2 text-sm leading-6 text-daet-ink/65">
            Sign up to apply as an operator or guide, or to browse tour packages.
          </p>
          <SignupForm />
        </section>
      </div>
    </PageFrame>
  );
}
