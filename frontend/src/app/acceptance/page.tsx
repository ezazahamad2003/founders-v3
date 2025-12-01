export default function AcceptancePage() {
  return (
    <div className="min-h-screen bg-[#05060c] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Acceptance for Design Partner Program</h1>
          <p className="mt-4 text-slate-300">
            Scopic Legal Inc. - Private Beta Program
          </p>
          
          <div className="mt-8 space-y-6 text-slate-300">
            <p>
              Please download the complete Acceptance document:
            </p>
            
            <a
              href="/legal/Acceptance for Design Partner Program (1).docx"
              download
              className="inline-block rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Download Acceptance Document (DOCX)
            </a>
            
            <div className="mt-8 border-t border-white/10 pt-8">
              <h2 className="text-xl font-semibold text-white">About the Program</h2>
              <p className="mt-4 leading-relaxed">
                This document confirms your acceptance into the Scopic Legal Design Partner Program. 
                As a Design Partner, you will have early access to our Legal Tech Private Beta Program 
                and the opportunity to provide valuable feedback that shapes the future of our platform.
              </p>
              <p className="mt-4 leading-relaxed">
                Your participation is based on your referral source and demonstrated interest in 
                exploring generative AI applications for legal use cases.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                For complete details, please download and review the full document above.
              </p>
            </div>
          </div>
          
          <div className="mt-8 flex justify-between border-t border-white/10 pt-6">
            <a
              href="/"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              ← Back to Home
            </a>
            <div className="space-x-4">
              <a
                href="/terms"
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Terms of Use
              </a>
              <a
                href="/privacy"
                className="text-sm text-indigo-400 hover:text-indigo-300"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

