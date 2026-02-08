"use client";

import { useMemo, useState } from "react";

type ReviewStatus = "idle" | "prompted" | "sent";

export default function DocumentGenerationView() {
  const [isGenerated, setIsGenerated] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<"yc" | "firm">("yc");

  const docSummary = useMemo(
    () => ({
      client: "NewCo, Inc.",
      counterparty: "Acme Holdings LLC",
      governingLaw: "Delaware",
      termLength: "24 months",
      contractValue: "$120,000 annually",
      effectiveDate: "March 1, 2026",
    }),
    [],
  );

  const templateLabel = selectedTemplate === "yc"
    ? "YC SaaS Agreement (Standard)"
    : "PL Software as a Service (SaaS) Agreement (Pro-Provider, Long Form)";

  const sourceFiles = useMemo(
    () => ({
      yc: "/legal/YC%20SAAS%20Agreement.doc",
      firm: "/legal/PL%20Software%20as%20a%20Service%20(SaaS)%20Agreement%20(Pro-Provider,%20Long%20Form).docx",
    }),
    [],
  );

  const handleGenerate = () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerated(true);
      setReviewStatus("prompted");
      setIsGenerating(false);
    }, 900);
  };

  return (
    <main className="flex flex-1 overflow-hidden">
      <div className="flex w-full flex-1 flex-col overflow-hidden">
        <div className="border-b border-white/5 px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-indigo-400">Scopic Workspace</div>
              <h1 className="mt-2 text-2xl font-semibold text-white">Document Generation</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                Draft client-ready documents with template grounding, structured fields, and optional lawyer review.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-300">
                Template-grounded generation
              </div>
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs text-emerald-200">
                Review-ready output
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Prompt + Inputs */}
          <section className="flex w-full max-w-xl flex-col gap-6 overflow-y-auto border-r border-white/5 bg-[#0c0f1a] p-6">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <div className="text-sm font-semibold text-white">Template Source</div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  Client template: YC SaaS Agreement (Standard)
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3">
                  Firm template: PL Software as a Service (SaaS) Agreement (Pro-Provider, Long Form)
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-xs uppercase tracking-wide text-slate-400">Primary template for draft</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedTemplate("yc")}
                      className={`rounded-2xl px-4 py-2 text-xs font-medium transition ${
                        selectedTemplate === "yc"
                          ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
                          : "bg-white/5 text-slate-200 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      YC Standard
                    </button>
                    <button
                      onClick={() => setSelectedTemplate("firm")}
                      className={`rounded-2xl px-4 py-2 text-xs font-medium transition ${
                        selectedTemplate === "firm"
                          ? "bg-indigo-500/20 text-indigo-200 border border-indigo-500/30"
                          : "bg-white/5 text-slate-200 border border-white/10 hover:border-white/20"
                      }`}
                    >
                      Firm Standard
                    </button>
                  </div>
                </div>
                <div className="grid gap-2 text-xs">
                  <a
                    href={sourceFiles.yc}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 transition hover:border-white/20"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View client template (YC SAAS Agreement.doc)
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide">DOC</span>
                  </a>
                  <a
                    href={sourceFiles.firm}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 transition hover:border-white/20"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    View firm template (Pro-Provider, Long Form)
                    <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide">DOCX</span>
                  </a>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-xs text-slate-300">
                  Draft output will be created from both sources and optimized for your firm standard.
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <div className="text-sm font-semibold text-white">Deal Inputs</div>
              <div className="mt-4 grid gap-3">
                {[
                  ["Client", docSummary.client],
                  ["Counterparty", docSummary.counterparty],
                  ["Governing law", docSummary.governingLaw],
                  ["Term length", docSummary.termLength],
                  ["Contract value", docSummary.contractValue],
                  ["Effective date", docSummary.effectiveDate],
                ].map(([label, value]) => (
                  <label key={label} className="flex flex-col gap-2 text-xs text-slate-300">
                    <span className="uppercase tracking-wide text-slate-400">{label}</span>
                    <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-2.5 text-sm text-slate-100">
                      {value}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-lg">
              <div className="text-sm font-semibold text-white">Prompt</div>
              <div className="mt-4 space-y-3 text-sm text-slate-300">
                <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3 text-sm leading-6 text-slate-200">
                  Please prepare a draft SaaS agreement using the attached template for NewCo. Fill in all fields. Use the
                  YC template as the base, then align with our firm standard clauses. Highlight any missing data in a notes
                  section.
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="rounded-full bg-indigo-500/10 px-2 py-1 text-indigo-300">RAG</span>
                  Uses your template library + executed documents for grounded drafting.
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              className="mt-auto rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
            >
              {isGenerating ? "Generating Draft…" : "Generate Draft"}
            </button>
          </section>

          {/* Right: Preview */}
          <section className="flex flex-1 flex-col overflow-hidden bg-[#05060c]">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
              <div>
                <div className="text-sm font-semibold text-white">Generated Draft</div>
                <div className="mt-1 text-xs text-slate-400">
                  Document is grounded in template sources and client inputs.
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Word Tracked Changes
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                  Email delivery
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!isGenerated ? (
                <div className="flex h-full items-center justify-center">
                  <div className="max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
                    <div className="text-lg font-semibold text-white">Ready to draft</div>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      Provide deal details and a prompt to generate a client-ready SaaS agreement.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mx-auto max-w-3xl space-y-6">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <div className="text-xs uppercase tracking-[0.3em] text-indigo-300">SaaS Agreement</div>
                    <h2 className="mt-2 text-2xl font-semibold text-white">
                      Software-as-a-Service Agreement
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-slate-300">
                      This SaaS Agreement (“Agreement”) is made effective {docSummary.effectiveDate} between{" "}
                      {docSummary.client} and {docSummary.counterparty}. The parties agree to the following terms and
                      conditions.
                    </p>
                    <div className="mt-4 grid gap-3 text-xs text-slate-300 sm:grid-cols-2">
                      <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3">
                        <div className="text-[10px] uppercase text-slate-400">Term</div>
                        <div className="mt-1 text-sm text-slate-100">{docSummary.termLength}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3">
                        <div className="text-[10px] uppercase text-slate-400">Value</div>
                        <div className="mt-1 text-sm text-slate-100">{docSummary.contractValue}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3">
                        <div className="text-[10px] uppercase text-slate-400">Governing Law</div>
                        <div className="mt-1 text-sm text-slate-100">{docSummary.governingLaw}</div>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-3">
                        <div className="text-[10px] uppercase text-slate-400">Template</div>
                        <div className="mt-1 text-sm text-slate-100">{templateLabel}</div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white">Draft Package</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Your draft uses the client-provided template and your firm standard, merged into a clean first pass.
                      Primary base: <span className="text-slate-100">{templateLabel}</span>.
                    </p>
                    <div className="mt-4 grid gap-3 text-sm text-slate-200 sm:grid-cols-2">
                      <a
                        href={sourceFiles.firm}
                        className="flex items-center justify-between rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-indigo-100 transition hover:border-indigo-400"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Download draft (DOCX)
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide">
                          Draft
                        </span>
                      </a>
                      <a
                        href={sourceFiles.yc}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-slate-200 transition hover:border-white/20"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Source template (YC)
                        <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] uppercase tracking-wide">
                          DOC
                        </span>
                      </a>
                    </div>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white">Key Clauses</h3>
                    <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                      {[
                        "Scope of Services and permitted users aligned to YC standard terms.",
                        "Payment schedule includes annual invoicing with net-30 terms.",
                        "Confidentiality and data protection clauses follow NewCo security policies.",
                        "Service availability and support commitments mapped to enterprise tier.",
                      ].map((item) => (
                        <li key={item} className="flex gap-3">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-indigo-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
                    <h3 className="text-lg font-semibold text-white">Missing Fields</h3>
                    <div className="mt-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                      Insert the service level metrics (uptime %, response time) for Schedule B.
                    </div>
                  </div>

                  {reviewStatus === "sent" && (
                    <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-emerald-100">Lawyer review in progress</div>
                          <p className="mt-2 text-sm leading-6 text-emerald-100/80">
                            We have sent the draft, the source template, and your prompt to your lawyer. You will receive
                            two redlines by email: one against your draft and one against the firm template.
                          </p>
                        </div>
                        <div className="rounded-2xl bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-100">
                          Sent
                        </div>
                      </div>
                      <div className="mt-4 grid gap-3 text-xs text-emerald-100/80 sm:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                          Redline A: Against firm template (Tracked Changes)
                        </div>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
                          Redline B: Against client draft (Tracked Changes)
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      {reviewStatus === "prompted" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0c0f1a] p-6 shadow-2xl">
            <div className="text-lg font-semibold text-white">Send to your lawyer for review?</div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              We will package the draft, your prompt, and template sources. You’ll receive two redlines in Word tracked
              changes.
            </p>
            <div className="mt-4 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
              Flat fee: <span className="font-semibold">$100</span>
            </div>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setReviewStatus("idle")}
                className="rounded-2xl bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
              >
                Not now
              </button>
              <button
                onClick={() => setReviewStatus("sent")}
                className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
              >
                Yes, send it
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

