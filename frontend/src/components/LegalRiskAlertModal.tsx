"use client";

import { AlertTriangle, X } from "lucide-react";

interface LegalRiskAlertModalProps {
  onDismiss: () => void;
}

export default function LegalRiskAlertModal({ onDismiss }: LegalRiskAlertModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — blurs the chat output behind */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0d0f16]/95 shadow-2xl shadow-amber-900/20 ring-1 ring-white/5">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-500 transition hover:bg-white/10 hover:text-slate-200"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-7">
          {/* Header */}
          <div className="flex items-start gap-3 mb-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-500/15 ring-1 ring-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-amber-300 leading-snug">
                High Legal Risk Alert
              </h2>
              <p className="mt-1 text-sm text-slate-300 leading-relaxed">
                The Counterparty significantly changed <span className="font-semibold text-white">Section 7(b) (Indemnity)</span> and the annual contract value here is above <span className="font-semibold text-white">$50,000</span>. Are you sure you don&apos;t want to loop in Myron for this?
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="rounded-2xl border border-white/8 bg-white/3 px-5 py-4 text-sm text-slate-300 leading-relaxed mb-5">
            If so, I can relay the full details and get a quote, but based on my understanding, Myron could probably provide you a{" "}
            <a
              href="mailto:myron@scopiclegal.com?subject=Material Issues List Request&body=Hi Myron, I would like a Material Issues List for $500 for my document review."
              className="font-medium text-indigo-400 underline decoration-indigo-400/40 underline-offset-2 hover:text-indigo-300 hover:decoration-indigo-300/60 transition-colors"
            >
              Material Issues List for $500
            </a>{" "}
            or{" "}
            <a
              href="mailto:myron@scopiclegal.com?subject=Full Negotiation Request&body=Hi Myron, I would like you to complete the Full Negotiation for $3,000 for my document review."
              className="font-medium text-indigo-400 underline decoration-indigo-400/40 underline-offset-2 hover:text-indigo-300 hover:decoration-indigo-300/60 transition-colors"
            >
              complete the Full Negotiation for $3,000
            </a>
            , assuming new issues won&apos;t be raised.
          </div>

          {/* Footer */}
          <p className="text-sm text-slate-400 leading-relaxed">
            Click on the foregoing links if you want me to loop in Myron, or otherwise you can disregard this Guardrail by clicking here:{" "}
            <button
              onClick={onDismiss}
              className="font-medium text-slate-300 underline decoration-slate-400/40 underline-offset-2 hover:text-white hover:decoration-white/50 transition-colors"
            >
              I&apos;m fine to proceed with this risk
            </button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
