"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface LegalRiskAlertModalProps {
  onDismiss: () => void;
}

export default function LegalRiskAlertModal({ onDismiss }: LegalRiskAlertModalProps) {
  const [visible, setVisible] = useState(false);

  // Trigger entrance animation on next frame
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 250);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{
        transition: "opacity 250ms ease",
        opacity: visible ? 1 : 0,
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Card */}
      <div
        className="relative w-full max-w-lg"
        style={{
          transition: "opacity 250ms ease, transform 250ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.94) translateY(12px)",
        }}
      >
        {/* Outer glow */}
        <div className="absolute -inset-px rounded-3xl bg-gradient-to-b from-amber-500/20 to-transparent blur-sm pointer-events-none" />

        <div className="relative rounded-3xl border border-amber-500/25 bg-[#0c0e15] shadow-2xl overflow-hidden">
          {/* Subtle top gradient stripe */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-600 transition-all duration-150 hover:bg-white/8 hover:text-slate-300"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <div className="px-7 pt-6 pb-7">
            {/* Header */}
            <div className="flex items-start gap-4 mb-5">
              {/* Pulsing icon */}
              <div className="relative flex-shrink-0 mt-0.5">
                <div className="absolute inset-0 rounded-xl bg-amber-500/20 blur-md animate-pulse" />
                <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/12 ring-1 ring-amber-400/30">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-semibold tracking-wide text-amber-300 uppercase mb-2">
                  High Legal Risk Alert
                </h2>
                <p className="text-[15px] text-slate-300 leading-relaxed">
                  The Counterparty significantly changed{" "}
                  <span className="font-semibold text-white">Section 7(b) (Indemnity)</span>{" "}
                  and the annual contract value here is above{" "}
                  <span className="font-semibold text-white">$50,000</span>.
                  {" "}Are you sure you don&apos;t want to loop in Myron for this?
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/6 mb-5" />

            {/* Body */}
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              If so, I can relay the full details and get a quote, but based on my understanding, Myron could probably provide you a{" "}
              <a
                href="mailto:myron@scopiclegal.com?subject=Material Issues List Request&body=Hi Myron, I would like a Material Issues List for $500 for my document review."
                className="font-medium text-indigo-400 underline-offset-2 decoration-indigo-400/30 underline hover:text-indigo-300 hover:decoration-indigo-300 transition-colors duration-150"
              >
                Material Issues List for $500
              </a>{" "}
              or{" "}
              <a
                href="mailto:myron@scopiclegal.com?subject=Full Negotiation Request&body=Hi Myron, I would like you to complete the Full Negotiation for $3,000 for my document review."
                className="font-medium text-indigo-400 underline-offset-2 decoration-indigo-400/30 underline hover:text-indigo-300 hover:decoration-indigo-300 transition-colors duration-150"
              >
                complete the Full Negotiation for $3,000
              </a>
              , assuming new issues won&apos;t be raised.
            </p>

            {/* Footer */}
            <p className="text-sm text-slate-500 leading-relaxed">
              Click on the foregoing links if you want me to loop in Myron, or otherwise you can disregard this Guardrail by clicking here:{" "}
              <button
                onClick={handleDismiss}
                className="text-slate-400 underline underline-offset-2 decoration-slate-500/50 hover:text-slate-200 hover:decoration-slate-300/60 transition-colors duration-150"
              >
                I&apos;m fine to proceed with this risk
              </button>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
