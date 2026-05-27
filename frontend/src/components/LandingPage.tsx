"use client";

import { useRef, useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/client";

const CALENDAR_URL = "https://calendar.app.google/F5SwWrfTKPVqeLTz7";

const BETA_BULLETS = [
  "Purpose-built legal tech with 100+ agentic legal workflows / skills",
  "Local LLMs on your device with complete privacy for sensitive legal work",
  "Frontier LLMs in the cloud with enhanced security for everything else",
] as const;

// Hidden until design-partner consents are confirmed. Flip to true to show.
const SHOW_DESIGN_PARTNERS = false;
const DESIGN_PARTNERS_LINE =
  "Built by Lawyers and AI Researchers, with the support of our Design Partners: Dentons, Reitler, Faskens, Aird & Berlis, Loyal VC, Senso, and many more.";

function externalLinkProps() {
  return {
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };
}

export default function LandingPage() {
  const betaRef = useRef<HTMLElement>(null);
  const [fullName, setFullName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollToBeta = () => {
    betaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedCompany = company.trim();
    const trimmedEmail = email.trim();
    const trimmedReferral = referralSource.trim();

    if (!trimmedName || !trimmedCompany || !trimmedEmail) {
      setError("Please fill in your name, company, and email.");
      return;
    }

    setSubmitting(true);

    const supabase = supabaseBrowserClient();
    if (!supabase) {
      setError("Signup is temporarily unavailable. Please try again later.");
      setSubmitting(false);
      return;
    }

    const { error: insertError } = await supabase.from("beta_signups").insert({
      full_name: trimmedName,
      company: trimmedCompany,
      email: trimmedEmail,
      referral_source: trimmedReferral || null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (insertError) {
      console.error("Beta signup failed:", insertError.message);
      setError("Something went wrong saving your details. Please try again.");
      setSubmitting(false);
      return;
    }

    window.location.href = CALENDAR_URL;
  };

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <div className="mx-auto flex min-h-screen max-w-[960px] flex-col px-6 py-8 sm:px-8">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-block size-3 bg-saffron-400" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
              Local-first legal AI
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={scrollToBeta}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70 transition hover:text-ink"
            >
              Join Our Beta
            </button>
            <a
              href={CALENDAR_URL}
              {...externalLinkProps()}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/70 transition hover:text-ink"
            >
              Book a call
            </a>
          </div>
          <div className="w-full pt-2">
            <span className="font-display text-2xl font-bold tracking-[-0.02em]">SCOPIC</span>
          </div>
        </header>

        <section className="border-b border-ink/15 py-10 sm:py-12">
          <h1 className="font-display text-5xl font-bold tracking-[-0.03em] sm:text-6xl">SCOPIC</h1>
          <p className="mt-5 max-w-2xl font-serif text-lg italic text-ink/70 sm:text-xl">
            Helping Lawyers use Advanced AI, Privately.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={scrollToBeta}
              className="inline-flex items-center gap-2 border border-ink bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink"
            >
              Join Our Beta →
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

        <section ref={betaRef} className="py-10 sm:py-12">
          <div className="grid gap-8 border border-ink/15 p-6 sm:p-8 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
                Early access
              </p>
              <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.02em] sm:text-3xl">
                Join our beta and get free early access to:
              </h2>
              <ul className="mt-5 space-y-3 text-sm leading-relaxed text-ink/80">
                {BETA_BULLETS.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <span
                      className="mt-1.5 inline-block size-2 shrink-0 bg-saffron-400"
                      aria-hidden
                    />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              {SHOW_DESIGN_PARTNERS ? (
                <p className="mt-6 text-xs leading-relaxed text-ink/60">
                  {DESIGN_PARTNERS_LINE}
                </p>
              ) : null}
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  Full name
                </span>
                <input
                  type="text"
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  Company
                </span>
                <input
                  type="text"
                  required
                  autoComplete="organization"
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  Email address
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/55">
                  How did you hear about us?
                </span>
                <input
                  type="text"
                  value={referralSource}
                  onChange={(event) => setReferralSource(event.target.value)}
                  className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                />
              </label>

              {error ? (
                <p className="text-xs text-red-700" role="alert">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 inline-flex items-center justify-center gap-2 border border-ink bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Join Our Beta →"}
              </button>
              <p className="text-[11px] leading-relaxed text-ink/50">
                After you submit, we&apos;ll take you to book an introductory demo meeting.
              </p>
            </form>
          </div>
        </section>

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

        <footer className="mt-auto flex flex-wrap items-center gap-4 border-t border-ink/15 pt-6 text-sm text-ink/55">
          <span>© Scopic</span>
        </footer>
      </div>
    </div>
  );
}
