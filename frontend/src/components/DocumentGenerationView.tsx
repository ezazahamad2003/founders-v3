"use client";

export default function DocumentGenerationView() {
  return (
    <main className="flex flex-1 overflow-hidden">
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/5 px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-indigo-400">Demo Feature</div>
              <h1 className="mt-2 text-2xl font-semibold text-white">Document Generation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Prompt → generate a draft document → optionally send it for a (fake) $100 lawyer review.
              </p>
            </div>
            <div className="hidden sm:flex">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                Frontend-only demo (no backend calls).
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-3xl rounded-3xl border border-white/10 bg-gradient-to-b from-white/5 to-white/[0.03] p-8 shadow-2xl">
            <div className="text-lg font-semibold text-white">Milestone 1</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Navigation + route are wired. Next milestone will add the prompt form, generated document preview, and the
              lawyer-review popup flow.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-2xl bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                Left sidebar item ✅
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                Route: /document-generation ✅
              </div>
              <div className="rounded-2xl bg-white/5 px-4 py-2 text-xs font-medium text-slate-200">
                Chat unchanged ✅
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

