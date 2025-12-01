export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05060c] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-4 text-slate-300">
            Design Partner Program - Scopic Legal Inc.
          </p>
          
          <div className="mt-8 space-y-6 text-slate-300">
            <p>
              Please download the complete Privacy Policy document:
            </p>
            
            <a
              href="/legal/Privacy Policy for Design Partner Program (1).docx"
              download
              className="inline-block rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Download Privacy Policy (DOCX)
            </a>
            
            <div className="mt-8 border-t border-white/10 pt-8">
              <h2 className="text-xl font-semibold text-white">Quick Summary</h2>
              <p className="mt-4 leading-relaxed">
                This Privacy Policy describes how Scopic Legal Inc. collects, uses, and protects your 
                personal information during your participation in the Legal Tech Private Beta Program.
              </p>
              <p className="mt-4 leading-relaxed">
                We collect information you provide (such as your name, email, company name, and referral source), 
                usage data, and content you submit through the Program. This information is used to operate the 
                Program, improve our services, and communicate with you.
              </p>
              <p className="mt-4 leading-relaxed">
                <strong>Confidentiality:</strong> As a Design Partner, you agree to maintain confidentiality 
                of Program information, and we commit to protecting your personal information in accordance 
                with applicable privacy laws.
              </p>
              <p className="mt-4 text-sm text-slate-400">
                For complete privacy terms, please download and review the full document above.
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
              href="/terms"
              className="text-sm text-indigo-400 hover:text-indigo-300"
            >
              Terms of Use →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

