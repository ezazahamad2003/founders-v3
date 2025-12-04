export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-[#05060c] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Terms of Use</h1>
          <p className="mt-2 text-lg text-slate-300">
            Design Partner Program - Scopic Legal Inc.
          </p>
          
          {/* Scrollable content area */}
          <div className="mt-8 max-h-[600px] space-y-6 overflow-y-auto pr-4 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
              <p className="mt-3 leading-relaxed">
                These Terms of Use govern your participation in the Legal Tech Private Beta Program of Scopic Legal Inc. 
                (together with our affiliates, &quot;R6&quot; or &quot;our&quot;). The Program was established to explore the application of 
                generative artificial intelligence and other technologies in various legal use cases.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">2. Acceptance of Terms</h2>
              <p className="mt-3 leading-relaxed">
                By accessing or using the Program, you agree to be bound by these Terms of Use and our{' '}
                <a href="/privacy" className="text-indigo-400 underline hover:text-indigo-300">
                  Privacy Policy
                </a>
                . If you do not agree to these terms, you may not participate in the Program.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">3. Program Description</h2>
              <p className="mt-3 leading-relaxed">
                The Program provides access to experimental legal technology tools and services. These services are provided 
                on an &quot;as is&quot; basis for testing and feedback purposes only. The Program is not intended to provide legal advice 
                or create an attorney-client relationship.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">4. Eligibility</h2>
              <p className="mt-3 leading-relaxed">
                You must be at least 18 years old and have the legal capacity to enter into these Terms. By participating, 
                you represent and warrant that you meet these eligibility requirements.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">5. User Obligations</h2>
              <p className="mt-3 leading-relaxed">As a participant in the Program, you agree to:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-4">
                <li>Provide accurate and complete information during registration</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Use the Program only for lawful purposes and in accordance with these Terms</li>
                <li>Provide constructive feedback about your experience with the Program</li>
                <li>Not attempt to reverse engineer, decompile, or disassemble any aspect of the Program</li>
                <li>Not use the Program to transmit any harmful, offensive, or illegal content</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">6. Confidentiality</h2>
              <p className="mt-3 leading-relaxed">
                You acknowledge that the Program and related information constitute confidential and proprietary information 
                of Scopic Legal Inc. You agree not to disclose any information about the Program, including its features, 
                functionality, or performance, to any third party without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">7. Intellectual Property</h2>
              <p className="mt-3 leading-relaxed">
                All intellectual property rights in the Program, including software, content, trademarks, and documentation, 
                are owned by Scopic Legal Inc. or our licensors. You are granted a limited, non-exclusive, non-transferable 
                license to use the Program solely for the purposes of the Design Partner Program.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">8. Data and Privacy</h2>
              <p className="mt-3 leading-relaxed">
                Your use of the Program is subject to our{' '}
                <a href="/privacy" className="text-indigo-400 underline hover:text-indigo-300">
                  Privacy Policy
                </a>
                , which describes how we collect, use, and protect your personal information. By participating in the Program, 
                you consent to our data practices as described in the Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">9. Disclaimer of Warranties</h2>
              <p className="mt-3 leading-relaxed">
                THE PROGRAM IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. 
                SCOPIC LEGAL INC. DISCLAIMS ALL WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, 
                FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE PROGRAM WILL BE UNINTERRUPTED, 
                ERROR-FREE, OR SECURE.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">10. Limitation of Liability</h2>
              <p className="mt-3 leading-relaxed">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, SCOPIC LEGAL INC. SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, 
                SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR 
                INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES RESULTING FROM YOUR PARTICIPATION 
                IN THE PROGRAM.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">11. Indemnification</h2>
              <p className="mt-3 leading-relaxed">
                You agree to indemnify, defend, and hold harmless Scopic Legal Inc., its affiliates, and their respective 
                officers, directors, employees, and agents from any claims, liabilities, damages, losses, and expenses arising 
                out of or related to your use of the Program or violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">12. Termination</h2>
              <p className="mt-3 leading-relaxed">
                We reserve the right to suspend or terminate your access to the Program at any time, with or without cause or 
                notice. Upon termination, your right to use the Program will immediately cease, and you must destroy all 
                confidential information related to the Program.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">13. Modifications</h2>
              <p className="mt-3 leading-relaxed">
                We may modify these Terms at any time by posting the revised terms on our website or within the Program. 
                Your continued participation in the Program after such modifications constitutes your acceptance of the 
                updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">14. Governing Law</h2>
              <p className="mt-3 leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which 
                Scopic Legal Inc. is incorporated, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">15. Contact Information</h2>
              <p className="mt-3 leading-relaxed">
                If you have any questions about these Terms, please contact us at{' '}
                <a href="mailto:support@scopiclegal.com" className="text-indigo-400 underline hover:text-indigo-300">
                  support@scopiclegal.com
                </a>
                .
              </p>
            </section>

            <section className="border-t border-white/10 pt-6">
              <p className="text-sm text-slate-400">
                Last Updated: December 2024
              </p>
              <p className="mt-2 text-sm text-slate-400">
                © 2024 Scopic Legal Inc. All rights reserved.
              </p>
            </section>
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

