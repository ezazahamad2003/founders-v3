"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ArrowRight, CheckCircle2, Cpu, Database, FileText, LockKeyhole, Scale, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { supabaseBrowserClient } from "@/lib/supabase/client";

const CALENDAR_URL = "https://calendar.app.google/z4aYNYvn748Br3ap8";

const BETA_BULLETS = [
  "A local-first legal AI workspace for reviewing, drafting, and reasoning over private matters",
  "100+ agentic legal workflows and skills built around real lawyer review loops",
  "Choice of local models for sensitive work and frontier cloud models when you need extra reach",
] as const;

const ADVANTAGES = [
  {
    title: "Matter memory",
    copy: "Every correction, precedent, and firm preference can become reusable context instead of a one-off chat.",
  },
  {
    title: "Private by default",
    copy: "Sensitive documents can stay on the device while lawyers decide when cloud reasoning is appropriate.",
  },
  {
    title: "Legal workflows",
    copy: "Scopic is shaped around lawyer tasks: document review, clause work, risk spotting, and matter-specific drafting.",
  },
  {
    title: "Human control",
    copy: "The lawyer remains the reviewer. The system improves through explicit edits, decisions, and feedback.",
  },
] as const;

const WORKFLOW_STEPS = [
  "Connect the matter workspace",
  "Review documents locally",
  "Route tasks to legal agents",
  "Capture lawyer corrections",
  "Reuse the learning on the next matter",
] as const;

const LAW_FIRM_LOGOS = [
  { name: "Dentons", src: "/logos/law-dentons.png" },
  { name: "Reitler", src: "/logos/law-reitler.png" },
  { name: "Marshall, Harp & Henman, LLP", src: "/logos/law-marshall-harp-henman.png" },
  { name: "Aird & Berlis", src: "/logos/law-aird-berlis.png" },
  { name: "GSA", src: "/logos/law-gsa.png" },
] as const;

const FOUNDER_LOGOS = [
  { name: "Senso", src: "/logos/founder-senso.png" },
  { name: "Ulalo", src: "/logos/founder-ulalo.png" },
  { name: "Crewz", src: "/logos/founder-crewz.png" },
  { name: "Nutraberry", src: "/logos/founder-nutraberry.png" },
  { name: "ShowerThoughts", src: "/logos/founder-showerthoughts.png" },
  { name: "Inheritchain", src: "/logos/founder-inheritchain.png" },
] as const;

// Hidden until design-partner consents are confirmed. Flip to true to show.
const SHOW_DESIGN_PARTNERS = false;
const DESIGN_PARTNERS_LINE =
  "Built by Lawyers and AI Researchers, with the support of our Design Partners: Dentons, Reitler, Marshall, Harp & Henman, LLP, Aird & Berlis, Loyal VC, Senso, and many more.";

function externalLinkProps() {
  return {
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };
}

function ScopicMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 220" fill="none" aria-hidden className={className}>
      <g fill="currentColor" stroke="currentColor" strokeLinecap="butt">
        <path d="M60 2C66 42 68 77 65 103C62 101 58 101 55 103C52 77 54 42 60 2Z" />
        <path d="M60 218C54 178 52 143 55 117C58 119 62 119 65 117C68 143 66 178 60 218Z" />
        <circle cx="60" cy="110" r="12" />
        <path d="M10 103C12 78 29 58 52 52" strokeWidth="10" />
        <path d="M68 52C91 58 108 78 110 103" strokeWidth="10" />
        <path d="M10 117C12 142 29 162 52 168" strokeWidth="10" />
        <path d="M68 168C91 162 108 142 110 117" strokeWidth="10" />
        <path d="M24 119C28 140 40 153 52 157" strokeWidth="6" />
        <path d="M68 63C89 69 99 86 101 102" strokeWidth="6" />
      </g>
    </svg>
  );
}

function LogoStrip({ logos }: { logos: readonly { name: string; src: string }[] }) {
  return (
    <div className="mt-5 grid grid-cols-2 items-center gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-6">
      {logos.map((logo) => (
        <div key={logo.name} className="flex min-h-12 items-center justify-center border border-ink/10 bg-white/45 px-4 py-3">
          <Image
            src={logo.src}
            alt={`${logo.name} logo`}
            width={220}
            height={80}
            className="max-h-10 w-auto max-w-full object-contain"
          />
        </div>
      ))}
    </div>
  );
}

function ApplyLink() {
  return (
    <a
      href={CALENDAR_URL}
      {...externalLinkProps()}
      className="font-semibold text-ink underline decoration-ink/25 underline-offset-4 transition hover:decoration-ink"
    >
      Apply
    </a>
  );
}

function ConsolePreview() {
  return (
    <div className="relative overflow-hidden border border-[#f7f3ea]/15 bg-[#0b0d0a] p-3 shadow-2xl shadow-black/35 sm:p-4">
      <Image
        src="/logos/scopic-logo-white-vertical.png"
        alt=""
        width={320}
        height={594}
        priority
        className="pointer-events-none absolute -right-12 top-4 hidden h-[430px] w-auto opacity-[0.06] lg:block"
      />
      <div className="relative border border-[#f7f3ea]/10 bg-[#070806]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#f7f3ea]/10 px-4 py-3 font-mono text-[11px] text-[#f7f3ea]/55">
          <span>scopic.local / matter-workspace</span>
          <span className="inline-flex items-center gap-2 text-[#8fd8aa]">
            <ShieldCheck className="size-3.5" aria-hidden />
            Private mode
          </span>
        </div>

        <div className="grid border-b border-[#f7f3ea]/10 sm:grid-cols-3">
          {[
            { label: "Documents", value: "42", detail: "indexed locally", icon: FileText, tone: "text-[#f7f3ea]/58" },
            { label: "Risk flags", value: "18", detail: "awaiting review", icon: TriangleAlert, tone: "text-[#e8b13a]" },
            { label: "Data out", value: "0", detail: "local model run", icon: LockKeyhole, tone: "text-[#8fd8aa]" },
          ].map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className={`p-4 ${index < 2 ? "border-b border-[#f7f3ea]/10 sm:border-b-0 sm:border-r" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase text-[#f7f3ea]/45">{stat.label}</p>
                  <Icon className={`size-4 ${stat.tone}`} aria-hidden />
                </div>
                <p className="mt-3 font-display text-3xl font-bold">{stat.value}</p>
                <p className="mt-1 text-xs text-[#f7f3ea]/55">{stat.detail}</p>
              </div>
            );
          })}
        </div>

        <div className="grid gap-0 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="border-b border-[#f7f3ea]/10 p-4 xl:border-b-0 xl:border-r">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-mono text-[10px] uppercase text-[#e8b13a]">Master Services Agreement</p>
              <span className="border border-[#f35f5f]/35 bg-[#f35f5f]/10 px-2 py-1 font-mono text-[9px] uppercase text-[#ff9b9b]">High risk</span>
              <span className="border border-[#8fd8aa]/30 bg-[#8fd8aa]/10 px-2 py-1 font-mono text-[9px] uppercase text-[#8fd8aa]">Fallback #302</span>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <div className="border border-[#f35f5f]/20 bg-[#f35f5f]/[0.06] p-3 text-[#f7f3ea]/78">
                <p className="font-mono text-[10px] uppercase text-[#ff9b9b]">Risk read</p>
                <p className="mt-2">Section 7 (Indemnity) redline flagged as high risk and inconsistent with any relevant Fallback Provisions.</p>
              </div>
              <div className="border-l-2 border-[#e8b13a] bg-[#e8b13a]/[0.06] p-3 text-[#f7f3ea]">
                <p className="font-mono text-[10px] uppercase text-[#e8b13a]">Suggested revision</p>
                <p className="mt-2">Suggested revision should track escrow release mechanics, not headline purchase price.</p>
              </div>
              <div className="border border-[#8fd8aa]/20 bg-[#8fd8aa]/[0.06] p-3 text-[#f7f3ea]/70">
                <p className="font-mono text-[10px] uppercase text-[#8fd8aa]">Human lawyer feedback</p>
                <p className="mt-2">Push back with Fallback Provision #302, because counterparty&apos;s affiliate accepted this language in a prior negotiation.</p>
              </div>
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[10px] uppercase text-[#f7f3ea]/45">Agent ledger</p>
              <Sparkles className="size-4 text-[#e8b13a]" aria-hidden />
            </div>
            <ol className="mt-4 space-y-3 text-sm text-[#f7f3ea]/70">
              {WORKFLOW_STEPS.map((step, index) => (
                <li key={step} className="grid grid-cols-[auto_1fr] gap-3">
                  <span className="flex size-6 items-center justify-center border border-[#f7f3ea]/15 font-mono text-[10px] text-[#e8b13a]">0{index + 1}</span>
                  <span className="border-b border-[#f7f3ea]/10 pb-3 last:border-b-0 last:pb-0">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
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
    <div className="min-h-screen bg-[#060705] text-[#f7f3ea]">
      <div className="mx-auto flex min-h-screen max-w-[1180px] flex-col px-5 py-6 sm:px-8 lg:px-10">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-[#f7f3ea]/15 pb-5">
          <a href="#top" className="flex items-center gap-4" aria-label="Scopic home">
            <ScopicMark className="h-16 w-9 text-[#f7f3ea] sm:h-20 sm:w-11" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-3xl font-bold tracking-normal sm:text-4xl">SCOPIC</span>
              <span className="mt-2 font-mono text-[11px] uppercase text-[#f7f3ea]/55">Private legal AI lab</span>
            </span>
          </a>
          <nav className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase text-[#f7f3ea]/62">
            <a href="#thinking" className="transition hover:text-[#f7f3ea]">Thinking</a>
            <a href="#system" className="transition hover:text-[#f7f3ea]">System</a>
            <button type="button" onClick={scrollToBeta} className="transition hover:text-[#f7f3ea]">
              Beta
            </button>
            <a href={CALENDAR_URL} {...externalLinkProps()} className="border border-[#e8b13a] px-4 py-2 text-[#e8b13a] transition hover:bg-[#e8b13a] hover:text-[#12110f]">
              Book a call
            </a>
          </nav>
        </header>

        <main id="top">
          <section className="grid gap-10 border-b border-[#f7f3ea]/15 py-12 lg:grid-cols-[0.92fr_1.08fr] lg:py-16">
            <div className="flex flex-col justify-center">
              <p className="font-mono text-xs uppercase text-[#e8b13a]">Local-first AI for lawyers</p>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-[0.96] tracking-normal text-balance sm:text-7xl lg:text-[82px]">
                Your matters. Your models. Your legal AI.
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-[#f7f3ea]/72 sm:text-xl">
                Scopic gives lawyers an AI workspace to privately codify legal judgment. Run sensitive work locally and use frontier models deliberately. Turn lawyer feedback into firm advantage to automate workflows, train teams, or power a digital twin.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={scrollToBeta}
                  className="inline-flex items-center gap-3 border border-[#e8b13a] bg-[#e8b13a] px-5 py-3 font-mono text-[11px] uppercase text-[#12110f] transition hover:bg-[#f7f3ea]"
                >
                  Join our lawyer beta
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <a
                  href={CALENDAR_URL}
                  {...externalLinkProps()}
                  className="inline-flex items-center gap-3 border border-[#f7f3ea]/20 px-5 py-3 font-mono text-[11px] uppercase text-[#f7f3ea]/72 transition hover:border-[#f7f3ea] hover:text-[#f7f3ea]"
                >
                  Book a call
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>
            <ConsolePreview />
          </section>

          <section id="thinking" className="grid gap-10 border-b border-[#f7f3ea]/15 py-12 lg:grid-cols-[0.8fr_1.2fr] lg:py-16">
            <div>
              <p className="font-mono text-xs uppercase text-[#f7f3ea]/45">How we think</p>
              <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-normal text-balance sm:text-5xl">
                Generic AI is rented intelligence. Legal AI should become firm infrastructure.
              </h2>
            </div>
            <div className="space-y-7">
              <p className="text-lg leading-8 text-[#f7f3ea]/72">
                The most valuable legal knowledge does not live on the public internet. It sits inside matters, markups, judgment calls, partner preferences, and review history. Scopic is built around that reality: private workspace first, model choice second, lawyer control always.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex items-start gap-3 border border-[#f7f3ea]/12 p-4">
                  <LockKeyhole className="mt-1 size-5 text-[#e8b13a]" aria-hidden />
                  <div>
                    <p className="font-semibold">Data control</p>
                    <p className="mt-1 text-sm leading-6 text-[#f7f3ea]/58">Keep confidential work on the machine when it matters.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-[#f7f3ea]/12 p-4">
                  <Cpu className="mt-1 size-5 text-[#e8b13a]" aria-hidden />
                  <div>
                    <p className="font-semibold">Model choice</p>
                    <p className="mt-1 text-sm leading-6 text-[#f7f3ea]/58">Move between local and cloud reasoning by task sensitivity.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-[#f7f3ea]/12 p-4">
                  <Database className="mt-1 size-5 text-[#e8b13a]" aria-hidden />
                  <div>
                    <p className="font-semibold">Reusable context</p>
                    <p className="mt-1 text-sm leading-6 text-[#f7f3ea]/58">Turn feedback into a better matter memory layer.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 border border-[#f7f3ea]/12 p-4">
                  <Scale className="mt-1 size-5 text-[#e8b13a]" aria-hidden />
                  <div>
                    <p className="font-semibold">Lawyer oversight</p>
                    <p className="mt-1 text-sm leading-6 text-[#f7f3ea]/58">Keep legal judgment in human hands.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="system" className="border-b border-[#f7f3ea]/15 py-12 lg:py-16">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {ADVANTAGES.map((advantage) => (
                <article key={advantage.title} className="border border-[#f7f3ea]/12 p-5">
                  <CheckCircle2 className="size-5 text-[#e8b13a]" aria-hidden />
                  <h3 className="mt-5 font-display text-2xl font-bold tracking-normal">{advantage.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-[#f7f3ea]/62">{advantage.copy}</p>
                </article>
              ))}
            </div>
          </section>

          <section ref={betaRef} className="relative overflow-hidden bg-ivory px-5 py-10 text-ink sm:px-8 lg:px-10 lg:py-14">
            <Image
              src="/logos/scopic-logo-black.png"
              alt=""
              width={300}
              height={520}
              className="pointer-events-none absolute -right-10 top-8 hidden h-[480px] w-auto opacity-[0.035] lg:block"
            />
            <div className="relative grid gap-10 lg:grid-cols-[0.92fr_1.08fr]">
              <div>
                <p className="font-mono text-xs uppercase text-ink/45">Early access</p>
                <h2 className="mt-4 font-display text-4xl font-bold leading-tight tracking-normal sm:text-5xl">
                  Join the lawyer beta for a private legal AI workspace.
                </h2>
                <ul className="mt-7 space-y-4 text-sm leading-relaxed text-ink/78">
                  {BETA_BULLETS.map((bullet) => (
                    <li key={bullet} className="flex gap-3">
                      <span className="mt-1.5 inline-block size-2 shrink-0 bg-saffron-400" aria-hidden />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
                {SHOW_DESIGN_PARTNERS ? (
                  <p className="mt-6 text-xs leading-relaxed text-ink/60">{DESIGN_PARTNERS_LINE}</p>
                ) : null}
              </div>

              <form onSubmit={handleSubmit} className="grid gap-4 border border-ink/15 bg-[#fbf8f0] p-5 sm:p-6" noValidate>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-ink/55">Full name</span>
                  <input
                    type="text"
                    required
                    autoComplete="name"
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-ink/55">Company</span>
                  <input
                    type="text"
                    required
                    autoComplete="organization"
                    value={company}
                    onChange={(event) => setCompany(event.target.value)}
                    className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-ink/55">Email address</span>
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="border border-ink/20 bg-ivory px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="font-mono text-[10px] uppercase text-ink/55">How did you hear about us?</span>
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
                  className="mt-1 inline-flex items-center justify-center gap-3 border border-ink bg-ink px-5 py-3 font-mono text-[11px] uppercase text-ivory transition hover:bg-saffron-400 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Submitting..." : "Join our lawyer beta"}
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <p className="text-[11px] leading-relaxed text-ink/50">
                  After you submit, we&apos;ll take you to book an introductory demo meeting.
                </p>
              </form>
            </div>

            <div className="relative mt-10 border-t border-ink/15 pt-7">
              <p className="text-sm leading-relaxed text-ink/75">
                <ApplyLink /> to our exclusive Lawyer Design Partner Program to help shape the future of legal tech with other innovative Lawyers from firms across the globe:
              </p>
              <LogoStrip logos={LAW_FIRM_LOGOS} />
            </div>

            <div className="relative mt-8 border-t border-ink/15 pt-7">
              <p className="text-sm leading-relaxed text-ink/75">
                <ApplyLink /> to our exclusive Founder Program to amplify your self-serve legal work under the light supervision of a trusted Lawyer from our Lawyer Design Partner Program:
              </p>
              <LogoStrip logos={FOUNDER_LOGOS} />
            </div>
          </section>

          <section className="flex flex-wrap items-center justify-between gap-5 border-b border-[#f7f3ea]/15 px-1 py-8">
            <div>
              <p className="font-mono text-xs uppercase text-[#f7f3ea]/45">Awaiting matter</p>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-normal sm:text-4xl">Bring Scopic into a live workflow.</h2>
            </div>
            <a
              href={CALENDAR_URL}
              {...externalLinkProps()}
              className="inline-flex items-center gap-3 border border-[#e8b13a] bg-[#e8b13a] px-5 py-3 font-mono text-[11px] uppercase text-[#12110f] transition hover:bg-[#f7f3ea]"
            >
              Book a call
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </section>
        </main>

        <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 pt-6 text-sm text-[#f7f3ea]/45">
          <span>Copyright Scopic</span>
          <span className="font-mono text-[11px] uppercase">Private legal AI lab</span>
        </footer>
      </div>
    </div>
  );
}
