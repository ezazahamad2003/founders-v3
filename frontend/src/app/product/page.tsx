import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Scopic for Windows",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function ProductPage() {
  return (
    <div className="min-h-screen bg-ivory text-ink">
      <div className="mx-auto flex min-h-screen max-w-[960px] flex-col px-6 py-8 sm:px-8">
        <header className="border-b border-ink/15 pb-6">
          <div className="flex items-center gap-3">
            <span className="inline-block size-3 bg-saffron-400" aria-hidden />
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/55">
              Local-first legal AI
            </span>
          </div>
          <div className="pt-2">
            <span className="font-display text-2xl font-bold tracking-[-0.02em]">SCOPIC</span>
          </div>
        </header>

        <main className="flex flex-1 items-center py-12 sm:py-16">
          <section className="w-full border border-ink/15 p-6 sm:p-8">
            <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink/45">
              Windows beta installer
            </p>
            <h1 className="mt-4 font-display text-4xl font-bold tracking-[-0.03em] sm:text-5xl">
              Scopic for Windows
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-ink/75 sm:text-lg">
              Local-first legal AI for private drafting, research, document review, and
              Ollama-powered workflows.
            </p>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-ink/60">
              This is currently a Windows beta installer.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4">
              <a
                href="/api/download/windows"
                className="inline-flex items-center justify-center border border-ink bg-ink px-5 py-3 font-mono text-[11px] tracking-[0.14em] text-ivory transition hover:bg-saffron-400 hover:text-ink"
              >
                Download for Windows
              </a>
              <p className="text-[11px] leading-relaxed text-ink/50">
                After installation, Scopic checks for updates automatically.
              </p>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
