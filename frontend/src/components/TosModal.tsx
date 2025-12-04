"use client";

interface TosModalProps {
  open: boolean;
  onAccept: () => void;
}

export default function TosModal({ open, onAccept }: TosModalProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0b0e17] p-8 text-slate-200 shadow-2xl">
        <h2 className="text-2xl font-semibold text-white">Acceptance of Terms and Privacy Policy</h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Thank you for participating in the Legal Tech Design Partner Program of Scopic Legal Inc. (together with our affiliates, &quot;Scopic&quot; or &quot;our&quot;) which was established to explore the application of generative artificial intelligence and other technologies in various legal use cases (the &quot;Program&quot;).
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          By clicking &quot;Join Program&quot;, you acknowledge that you have read, understood, and agree to be bound by our{" "}
          <a
            href="/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline hover:text-indigo-300"
          >
            Terms of Use
          </a>
          {" "}and{" "}
          <a
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 underline hover:text-indigo-300"
          >
            Privacy Policy
          </a>
          , which summarize the terms and conditions of your participation in our Program. You further acknowledge and agree that nothing in the Program, the use of our platform or any correspondence or communication in connection therewith constitutes legal advice, and that no attorney-client relationship is created between you and Scopic. The Program is only designed to observe and learn about your legal behavior, and ideate on potential technologies and solutions that may be helpful to you and other founders in the future.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">
          Please note that our Privacy Policy also includes confidentiality provisions that govern the use and disclosure of any information shared during the Program.
        </p>
        <button
          onClick={onAccept}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Join Program
        </button>
      </div>
    </div>
  );
}

