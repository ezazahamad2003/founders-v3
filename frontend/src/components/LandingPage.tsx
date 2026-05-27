"use client";

import { useRef, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/client";

const GITHUB_URL = "https://github.com/ezazahamad2003/scopic";
const CALENDAR_URL = "https://calendar.app.google/WLR4JQz4XeKhAj9c8";
const LICENSE_URL = "https://github.com/ezazahamad2003/scopic/blob/main/LICENSE";

const VALUE_TILES = [
  {
    eyebrow: "Document-grounded chat",
    body: "Ask legal questions with context from uploaded agreements and prior conversation history.",
  },
  {
    eyebrow: "Document review",
    body: "Structured risk analysis with executive summaries and severity-rated findings across your files.",
  },
  {
    eyebrow: "Agentic workflows",
    body: "Research, drafting, and multi-agent debate modes powered by frontier models.",
  },
] as const;

function externalLinkProps() {
  return {
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };
}

function formatAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("already registered") || lower.includes("already been registered")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (lower.includes("password") && (lower.includes("weak") || lower.includes("least"))) {
    return "Password must be at least 8 characters.";
  }
  if (lower.includes("invalid login credentials")) {
    return "Invalid email or password.";
  }
  if (lower.includes("network") || lower.includes("fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return message;
}

export default function LandingPage() {
  const signupRef = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [name, setName] = useState("");
  const [lawFirmName, setLawFirmName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToSignup = () => {
    signupRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = supabaseBrowserClient();
    if (!supabase) {
      setError("Authentication service unavailable.");
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "signup") {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name.trim(),
              law_firm_name: lawFirmName.trim(),
              full_name: name.trim(),
              company_name: lawFirmName.trim(),
            },
          },
        });

        if (signUpError) {
          setError(formatAuthError(signUpError.message));
          setLoading(false);
          return;
        }

        if (data.user && data.session) {
          const { error: profileError } = await supabase.from("profiles").insert({
            id: data.user.id,
            email: email.trim(),
            full_name: name.trim(),
            company_name: lawFirmName.trim(),
          });

          if (profileError && !profileError.message.toLowerCase().includes("duplicate")) {
            console.error("Profile insert failed:", profileError.message);
          }
        } else if (data.user && !data.session) {
          setError(
            "Account created but email confirmation is required. Ask an admin to disable confirmations for immediate access."
          );
          setLoading(false);
          return;
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (signInError) {
          setError(formatAuthError(signInError.message));
          setLoading(false);
          return;
        }
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const inputClassName =
    "block w-full border border-ink/30 bg-ivory px-3 py-2.5 font-mono text-[13px] text-ink placeholder:text-ink/40 focus:border-ink focus:outline-none focus:ring-1 focus:ring-saffron-400";

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <div className="mx-auto flex min-h-screen max-w-[960px] flex-col px-6 py-8 sm:px-8">
        {/* Top bar */}
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-block size-3 bg-saffron-400" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
              Legal AI workspace
            </span>
          </div>
          <div className="flex items-center gap-5">
            <a
              href={GITHUB_URL}
              {...externalLinkProps()}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70 transition hover:text-ink"
            >
              View the source
            </a>
            <a
              href={CALENDAR_URL}
              {...externalLinkProps()}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70 transition hover:text-ink"
            >
              Talk to the team
            </a>
          </div>
          <div className="w-full pt-2">
            <span className="font-display text-2xl font-bold tracking-[-0.02em]">SCOPIC</span>
          </div>
        </header>

        {/* Hero */}
        <section className="border-b border-ink/15 py-10 sm:py-12">
          <h1 className="font-display text-5xl font-bold tracking-[-0.03em] sm:text-6xl">SCOPIC</h1>
          <p className="mt-5 max-w-2xl font-serif text-lg italic text-ink/70 sm:text-xl">
            An AI workspace for legal teams — research, review, and draft with your documents in
            context.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={scrollToSignup}
              className="inline-flex items-center gap-2 border border-ink bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink"
            >
              Get started →
            </button>
            <a
              href={CALENDAR_URL}
              {...externalLinkProps()}
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink/60 underline decoration-ink/25 underline-offset-4 transition hover:text-ink"
            >
              Book a call
            </a>
          </div>
        </section>

        {/* Value tiles */}
        <section className="grid gap-4 border-b border-ink/15 py-10 sm:grid-cols-3">
          {VALUE_TILES.map((tile) => (
            <article key={tile.eyebrow} className="relative border border-ink/15 p-5 pt-6">
              <span
                className="absolute left-0 top-0 inline-block size-3 bg-saffron-400"
                aria-hidden
              />
              <h2 className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                {tile.eyebrow}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink/80">{tile.body}</p>
            </article>
          ))}
        </section>

        {/* Signup card */}
        <section ref={signupRef} className="py-10 sm:py-12">
          <div className="border border-ink/15 bg-ivory p-6 sm:p-8">
            <div className="mb-6 flex gap-6 border-b border-ink/15 pb-4">
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError(null);
                }}
                className={`font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  mode === "signup"
                    ? "border-b-2 border-saffron-400 pb-1 text-ink"
                    : "text-ink/45 hover:text-ink/70"
                }`}
              >
                Create account
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("signin");
                  setError(null);
                }}
                className={`font-mono text-[10px] uppercase tracking-[0.14em] transition ${
                  mode === "signin"
                    ? "border-b-2 border-saffron-400 pb-1 text-ink"
                    : "text-ink/45 hover:text-ink/70"
                }`}
              >
                Sign in
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <>
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                      Full name
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClassName}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                      Law firm
                    </span>
                    <input
                      type="text"
                      required
                      autoComplete="organization"
                      value={lawFirmName}
                      onChange={(e) => setLawFirmName(e.target.value)}
                      className={inputClassName}
                    />
                  </label>
                </>
              )}

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClassName}
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                  Password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClassName}
                />
              </label>

              {error && (
                <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-destructive">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center border border-ink bg-ink px-4 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink disabled:opacity-50"
              >
                {loading
                  ? mode === "signup"
                    ? "Creating account…"
                    : "Signing in…"
                  : mode === "signup"
                    ? "Create account →"
                    : "Sign in →"}
              </button>

              {mode === "signup" && (
                <p className="font-mono text-[10px] uppercase tracking-[0.10em] text-ink/45">
                  By signing up you agree we will store your name, email and firm name. Your chat
                  documents are stored in your account.
                </p>
              )}
            </form>
          </div>
        </section>

        {/* Talk-to-us strip */}
        <section className="flex flex-wrap items-center justify-between gap-4 border-y border-ink/15 bg-ink px-6 py-5 text-ivory">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ivory/80">
            Want a walkthrough first?
          </p>
          <a
            href={CALENDAR_URL}
            {...externalLinkProps()}
            className="inline-flex items-center border border-saffron-400 bg-saffron-400 px-5 py-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition hover:bg-ivory"
          >
            Book a call
          </a>
        </section>

        {/* Footer */}
        <footer className="mt-auto flex flex-wrap items-center gap-4 border-t border-ink/15 pt-6 text-sm text-ink/55">
          <span>© Scopic</span>
          <a
            href={GITHUB_URL}
            {...externalLinkProps()}
            className="font-mono text-[10px] uppercase tracking-[0.14em] hover:text-ink"
          >
            GitHub
          </a>
          <a
            href={LICENSE_URL}
            {...externalLinkProps()}
            className="font-mono text-[10px] uppercase tracking-[0.14em] hover:text-ink"
          >
            AGPL-3.0-or-later
          </a>
        </footer>
      </div>
    </div>
  );
}
