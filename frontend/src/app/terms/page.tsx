export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-[#05060c] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Terms of Use</h1>
          <p className="mt-4 text-slate-300">
            Design Partner Program - Scopic Legal Inc.
          </p>
          
          <div className="mt-8 space-y-6 text-slate-300">
            <p>
              Please download the complete Terms of Use document:
            </p>
            
            <a
              href="/legal/Terms of Use for Design Partner Program (1).docx"
              download
              className="inline-block rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Download Terms of Use (DOCX)
            </a>
            
            <div className="mt-8 border-t border-white/10 pt-8">
              <h2 className="text-xl font-semibold text-white">Quick Summary</h2>
              <p className="mt-4 leading-relaxed">
                These Terms of Use govern your participation in the Legal Tech Private Beta Program 
                of Scopic Legal Inc. (together with our affiliates, &quot;R6&quot; or &quot;our&quot;). The Program was 
                established to explore the application of generative artificial intelligence and other 
                technologies in various legal use cases.
              </p>
              <p className="mt-4 leading-relaxed">
                By participating in the Program, you agree to provide feedback, maintain confidentiality 
                of Program information, and acknowledge that the services are provided on an experimental 
                basis during the beta period.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                For complete terms and conditions, please download and review the full document above.
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
            <a
              href="/privacy"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Privacy Policy →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

