"use client";

import { useRef } from "react";

const GITHUB_URL = "https://github.com/ezazahamad2003/scopic";
const CALENDAR_URL = "https://calendar.app.google/WLR4JQz4XeKhAj9c8";
const LICENSE_URL = "https://github.com/ezazahamad2003/scopic/blob/main/LICENSE";

const VALUE_TILES = [
  {
    eyebrow: "Local-first",
    body: "Your documents stay on your machine unless you choose a cloud model.",
  },
  {
    eyebrow: "Document-grounded chat",
    body: "Hybrid RAG with citations across the matters and files you pin.",
  },
  {
    eyebrow: "Multi-provider models",
    body: "Ollama, Claude, GPT, and Gemini — switch providers in chat.",
  },
] as const;

function externalLinkProps() {
  return {
    target: "_blank" as const,
    rel: "noopener noreferrer" as const,
  };
}

export default function LandingPage() {
  const ctaRef = useRef<HTMLElement>(null);

  const scrollToCta = () => {
    ctaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

        <section className="border-b border-ink/15 py-10 sm:py-12">
          <h1 className="font-display text-5xl font-bold tracking-[-0.03em] sm:text-6xl">SCOPIC</h1>
          <p className="mt-5 max-w-2xl font-serif text-lg italic text-ink/70 sm:text-xl">
            A local-first AI workspace for lawyers — your documents stay on your machine.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={scrollToCta}
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

        <section ref={ctaRef} className="py-10 sm:py-12">
          <div className="border border-ink/15 p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
              Open source
            </p>
            <h2 className="mt-3 font-display text-2xl font-bold tracking-[-0.02em]">
              Run Scopic locally
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink/75">
              Clone the repo, install Ollama, and keep your legal work on your own machine. Need help
              getting set up? Book a walkthrough with the team.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href={GITHUB_URL}
                {...externalLinkProps()}
                className="inline-flex items-center border border-ink bg-ink px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink"
              >
                View the source →
              </a>
              <a
                href={CALENDAR_URL}
                {...externalLinkProps()}
                className="inline-flex items-center border border-ink/30 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink transition hover:border-ink"
              >
                Book a call
              </a>
            </div>
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
