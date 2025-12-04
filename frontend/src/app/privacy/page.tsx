export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#05060c] px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          <p className="mt-2 text-lg text-slate-300">
            Design Partner Program - Scopic Legal Inc.
          </p>
          
          {/* Scrollable content area */}
          <div className="mt-8 max-h-[600px] space-y-6 overflow-y-auto pr-4 text-slate-300">
            <section>
              <h2 className="text-xl font-semibold text-white">1. Introduction</h2>
              <p className="mt-3 leading-relaxed">
                This Privacy Policy describes how Scopic Legal Inc. (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, and protects 
                your personal information when you participate in our Legal Tech Private Beta Program (the &quot;Program&quot;).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">2. Information We Collect</h2>
              <p className="mt-3 leading-relaxed">We collect the following types of information:</p>
              
              <h3 className="mt-4 font-semibold text-white">2.1 Information You Provide</h3>
              <ul className="mt-2 list-inside list-disc space-y-2 pl-4">
                <li>Account information (name, email address, password)</li>
                <li>Company name and professional information</li>
                <li>Referral source information</li>
                <li>Communications with us (feedback, support requests)</li>
                <li>Content you submit through the Program (documents, queries, messages)</li>
              </ul>

              <h3 className="mt-4 font-semibold text-white">2.2 Automatically Collected Information</h3>
              <ul className="mt-2 list-inside list-disc space-y-2 pl-4">
                <li>Usage data (features accessed, time spent, interaction patterns)</li>
                <li>Device information (browser type, operating system, IP address)</li>
                <li>Log data (access times, pages viewed, errors encountered)</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">3. How We Use Your Information</h2>
              <p className="mt-3 leading-relaxed">We use your information to:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-4">
                <li>Provide and operate the Program</li>
                <li>Improve and develop our services and technologies</li>
                <li>Communicate with you about the Program</li>
                <li>Respond to your requests and provide support</li>
                <li>Analyze usage patterns and user behavior</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
                <li>Train and improve our AI models and algorithms</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">4. Information Sharing and Disclosure</h2>
              <p className="mt-3 leading-relaxed">
                We do not sell your personal information. We may share your information in the following circumstances:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-4">
                <li><strong>Service Providers:</strong> With third-party vendors who assist in operating the Program</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">5. Data Security</h2>
              <p className="mt-3 leading-relaxed">
                We implement appropriate technical and organizational measures to protect your personal information against 
                unauthorized access, alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-4">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Employee training on data protection</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                However, no method of transmission over the internet or electronic storage is 100% secure. While we strive 
                to protect your information, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">6. Data Retention</h2>
              <p className="mt-3 leading-relaxed">
                We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy 
                Policy, unless a longer retention period is required or permitted by law. When we no longer need your information, 
                we will securely delete or anonymize it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">7. Your Rights and Choices</h2>
              <p className="mt-3 leading-relaxed">Depending on your jurisdiction, you may have the following rights:</p>
              <ul className="mt-3 list-inside list-disc space-y-2 pl-4">
                <li><strong>Access:</strong> Request access to your personal information</li>
                <li><strong>Correction:</strong> Request correction of inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Objection:</strong> Object to certain processing of your information</li>
                <li><strong>Portability:</strong> Request transfer of your information to another service</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent for processing where applicable</li>
              </ul>
              <p className="mt-3 leading-relaxed">
                To exercise these rights, please contact us at{' '}
                <a href="mailto:privacy@scopiclegal.com" className="text-indigo-400 underline hover:text-indigo-300">
                  privacy@scopiclegal.com
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">8. Cookies and Tracking Technologies</h2>
              <p className="mt-3 leading-relaxed">
                We use cookies and similar tracking technologies to collect information about your browsing activities. 
                You can control cookies through your browser settings, but disabling cookies may affect your ability to 
                use certain features of the Program.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">9. Third-Party Services</h2>
              <p className="mt-3 leading-relaxed">
                The Program may integrate with third-party services (such as OpenAI for AI capabilities). These services 
                have their own privacy policies, and we encourage you to review them. We are not responsible for the 
                privacy practices of third-party services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">10. International Data Transfers</h2>
              <p className="mt-3 leading-relaxed">
                Your information may be transferred to and processed in countries other than your country of residence. 
                We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">11. Children&apos;s Privacy</h2>
              <p className="mt-3 leading-relaxed">
                The Program is not intended for individuals under the age of 18. We do not knowingly collect personal 
                information from children. If we become aware that we have collected information from a child, we will 
                take steps to delete it promptly.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">12. Changes to This Privacy Policy</h2>
              <p className="mt-3 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting 
                the updated policy on our website or within the Program. Your continued use of the Program after such changes 
                constitutes your acceptance of the updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">13. Contact Us</h2>
              <p className="mt-3 leading-relaxed">
                If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                please contact us at:
              </p>
              <div className="mt-3 space-y-1 pl-4">
                <p>
                  Email:{' '}
                  <a href="mailto:privacy@scopiclegal.com" className="text-indigo-400 underline hover:text-indigo-300">
                    privacy@scopiclegal.com
                  </a>
                </p>
                <p>Scopic Legal Inc.</p>
              </div>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-white">14. Confidentiality Obligations</h2>
              <p className="mt-3 leading-relaxed">
                As a Design Partner, you acknowledge that information about the Program, including its features, functionality, 
                and performance, is confidential. You agree not to disclose such information to third parties without our 
                prior written consent. See our{' '}
                <a href="/terms" className="text-indigo-400 underline hover:text-indigo-300">
                  Terms of Use
                </a>
                {' '}for more details on confidentiality obligations.
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

