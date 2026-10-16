"use client";

import { Suspense, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const DEFAULT_NEXT_PATH = "/tours/guide/register";

function safeNextPath(candidate: string | null): string {
  if (!candidate || !candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return DEFAULT_NEXT_PATH;
  }

  try {
    const base = new URL("https://connect-daet.invalid");
    const target = new URL(candidate, base);
    if (target.origin !== base.origin) return DEFAULT_NEXT_PATH;
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return DEFAULT_NEXT_PATH;
  }
}

function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = useMemo(() => {
    try {
      return createSupabaseBrowserClient();
    } catch {
      return null;
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!supabase) {
      setError("Sign-in is not configured yet. Please contact the Tourism Office.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError(authError.message);
        return;
      }
      // Force a fresh request so the server-rendered page reads the auth cookies
      // just written by the Supabase browser client instead of a cached RSC tree.
      window.location.replace(nextPath);
    } catch {
      setError("We could not sign you in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-daet-sand/40 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-daet-ink/10 bg-white p-6 shadow-card sm:p-8">
        <p className="text-center text-xs font-black uppercase tracking-[0.18em] text-daet-leaf">CONNECT-DAET · Tourism in Daet</p>
        <h1 className="mt-3 text-center text-2xl font-black text-daet-ink sm:text-3xl">Sign in to CONNECT-DAET</h1>
        <p className="mt-2 text-center text-sm leading-6 text-daet-ink/65">Use your existing account to continue to your requested page.</p>

        {error ? (
          <div role="alert" className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
            {error}
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="login-email" className="block text-sm font-bold text-daet-ink">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-daet-ink/20 px-4 py-3 text-base text-daet-ink outline-none transition focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-bold text-daet-ink">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-2xl border border-daet-ink/20 px-4 py-3 text-base text-daet-ink outline-none transition focus:border-daet-forest focus:ring-4 focus:ring-daet-forest/10"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-daet-forest px-5 text-sm font-black text-white transition hover:bg-daet-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm leading-6 text-daet-ink/60">
          Don’t have an account? Contact the Tourism Office to create one.
        </p>
      </section>
    </main>
  );
}

function LoginFallback() {
  return (
    <main className="grid min-h-dvh place-items-center bg-daet-sand/40 px-4 py-10">
      <p role="status" className="text-sm font-semibold text-daet-ink/70">Loading sign-in…</p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
