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
        <h2 className="text-2xl font-semibold text-white">Accept the Scopic Legal Terms</h2>
        <p className="mt-4 text-sm leading-relaxed text-slate-300">
          Before chatting with Scopic Legal, please acknowledge that this tool provides AI-generated insights
          for informational purposes only and does not replace professional legal counsel.
        </p>
        <button
          onClick={onAccept}
          className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Accept & continue
        </button>
      </div>
    </div>
  );
}

