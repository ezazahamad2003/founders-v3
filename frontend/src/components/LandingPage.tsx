"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    companyName: "",
    referralSource: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabase = supabaseBrowserClient();
      if (!supabase) {
        setError("Authentication service unavailable");
        setLoading(false);
        return;
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            company_name: formData.companyName,
            referral_source: formData.referralSource,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (err) {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen bg-[#05060c]">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-r from-[#05060c] via-[#05060c]/95 to-[#05060c]/60 z-10" />
          <img
            src="/images/image.png"
            alt="Legal documents with futuristic overlay"
            className="w-full h-full object-cover opacity-40"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 container mx-auto px-4 py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Side - Hero Text */}
            <div className="text-white space-y-8">
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                SCOPIC LEGAL
              </h1>
              <p className="text-xl lg:text-2xl text-slate-300 leading-relaxed">
                Agentic frameworks for self-serve legal work with human lawyers on standby
              </p>
            </div>

            {/* Right Side - Spacer for image */}
            <div className="hidden lg:block" />
          </div>
        </div>
      </div>

      {/* Beta Program Section */}
      <div className="bg-gradient-to-b from-slate-900/50 to-[#05060c] py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-start">
              {/* Left Side - Information */}
              <div className="text-white space-y-8">
                <h2 className="text-3xl lg:text-4xl font-bold">
                  JOIN OUR EXCLUSIVE, PRIVATE BETA PROGRAM
                </h2>
                
                <p className="text-lg text-slate-300 leading-relaxed">
                  Help us create a new dynamic where AI-savvy Founders can safely self-serve 
                  legal work and loop in AI-savvy human lawyers, when the stakes are high.
                </p>

                <div className="space-y-4">
                  <p className="text-lg font-semibold text-white">
                    By joining you'll get free:
                  </p>
                  <ul className="space-y-3 text-slate-300">
                    <li className="flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1">•</span>
                      <span className="text-lg">
                        Early access to our AI platform powered by GPT 5.1,
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1">•</span>
                      <span className="text-lg">
                        Legal strategy consultations with experienced human lawyers, and
                      </span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-400 mr-3 mt-1">•</span>
                      <span className="text-lg">
                        Intros to cost-effective lawyers for complex legal work, if needed.
                      </span>
                    </li>
                  </ul>
                </div>

                <p className="text-lg text-white font-semibold">
                  And most importantly, you'll also help shape the future of legal services!
                </p>
              </div>

              {/* Right Side - Sign Up Form */}
              <div className="bg-white/5 backdrop-blur-lg rounded-3xl border border-white/10 p-8 shadow-2xl">
                {success ? (
                  <div className="text-center py-12">
                    <div className="text-green-400 text-6xl mb-4">✓</div>
                    <h3 className="text-2xl font-bold text-white mb-2">Welcome to Scopic Legal!</h3>
                    <p className="text-slate-300">Redirecting you to the platform...</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <h3 className="text-2xl font-bold text-white mb-6">Get Started</h3>

                    <div>
                      <label htmlFor="fullName" className="block text-sm font-medium text-slate-300 mb-2">
                        Full Name *
                      </label>
                      <input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
                        Email Address *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="you@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
                        Password *
                      </label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        required
                        minLength={6}
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="••••••••"
                      />
                    </div>

                    <div>
                      <label htmlFor="companyName" className="block text-sm font-medium text-slate-300 mb-2">
                        Company Name *
                      </label>
                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        required
                        value={formData.companyName}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="Your company name"
                      />
                    </div>

                    <div>
                      <label htmlFor="referralSource" className="block text-sm font-medium text-slate-300 mb-2">
                        How did you hear about us?
                      </label>
                      <input
                        id="referralSource"
                        name="referralSource"
                        type="text"
                        value={formData.referralSource}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                        placeholder="e.g., Google, LinkedIn, Friend"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-lg font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? "Joining Beta..." : "Join Beta Program"}
                    </button>

                    <p className="text-xs text-slate-400 text-center">
                      By signing up, you agree to our{" "}
                      <a href="/legal/terms-of-use.html" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">
                        Terms of Use
                      </a>{" "}
                      and{" "}
                      <a href="/legal/privacy-policy.html" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">
                        Privacy Policy
                      </a>
                    </p>

                    <div className="text-center pt-4">
                      <button
                        type="button"
                        onClick={() => router.push("/signin")}
                        className="text-sm text-indigo-400 hover:text-indigo-300"
                      >
                        Already have an account? Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-[#05060c] border-t border-white/10 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-slate-400 text-sm">
              © {new Date().getFullYear()} Scopic Legal. All rights reserved.
            </p>
            <div className="flex gap-6">
              <a
                href="/legal/terms-of-use.html"
                target="_blank"
                className="text-slate-400 hover:text-white text-sm transition"
              >
                Terms of Use
              </a>
              <a
                href="/legal/privacy-policy.html"
                target="_blank"
                className="text-slate-400 hover:text-white text-sm transition"
              >
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
