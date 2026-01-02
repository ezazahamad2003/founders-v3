"use client";

import { useState } from "react";
import { supabaseBrowserClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false); // Default to sign-in
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

      if (isSignUp) {
        // Sign Up
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
      } else {
        // Sign In
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (signInError) {
          setError(signInError.message);
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
      
      // Only redirect for sign-in, not sign-up (user needs to verify email first)
      if (!isSignUp) {
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
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
    <div className="min-h-screen w-full bg-[#05060c] flex flex-col lg:flex-row overflow-x-hidden">
      {/* Left Side - Hero Content */}
      <div className="flex-1 relative flex items-center justify-center min-h-[50vh] lg:min-h-screen p-6 sm:p-8 lg:p-12">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/20 via-purple-600/20 to-[#05060c] z-10" />
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 sm:w-72 sm:h-72 lg:w-96 lg:h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
          <img
            src="/images/image.png"
            alt="Legal documents"
            className="w-full h-full object-cover opacity-10"
          />
        </div>

        {/* Content */}
        <div className="relative z-20 w-full max-w-2xl">
          <div className="space-y-4 sm:space-y-6 lg:space-y-8">
            <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
              <span className="text-indigo-300 text-xs sm:text-sm font-medium">PRIVATE BETA • EXCLUSIVE ACCESS</span>
            </div>
            
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight bg-gradient-to-r from-white via-indigo-100 to-purple-200 bg-clip-text text-transparent">
              SCOPIC LEGAL
            </h1>
            
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-slate-300 leading-relaxed">
              Agentic frameworks for self-serve legal work with human lawyers on standby
            </p>

            <div className="space-y-3 sm:space-y-4 pt-2 sm:pt-4">
              <p className="text-base sm:text-lg font-semibold text-white">
                Join our beta and get free:
              </p>
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                  <span className="text-sm sm:text-base text-slate-300">Early access to GPT 5.2-powered AI platform</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                  <span className="text-sm sm:text-base text-slate-300">Legal strategy consultations with expert lawyers</span>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-indigo-400 rounded-full flex-shrink-0" />
                  <span className="text-sm sm:text-base text-slate-300">Cost-effective lawyer intros for complex work</span>
                </div>
              </div>
            </div>

            <div className="pt-8 sm:pt-10 lg:pt-12 flex flex-wrap items-center gap-3 sm:gap-6 text-[10px] sm:text-xs text-slate-400">
              <a href="/legal/terms-of-use.html" target="_blank" className="hover:text-indigo-400 transition">
                Terms of Use
              </a>
              <span className="hidden sm:inline">•</span>
              <a href="/legal/privacy-policy.html" target="_blank" className="hover:text-indigo-400 transition">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Sign Up Form */}
      <div className="w-full lg:w-[480px] bg-gradient-to-br from-slate-900/50 to-slate-950/50 backdrop-blur-xl lg:border-l border-white/10 flex items-center justify-center p-6 sm:p-8 min-h-[50vh] lg:min-h-screen">
        <div className="w-full max-w-md">
          {success ? (
            <div className="text-center py-12">
              <div className="w-20 h-20 mx-auto mb-6 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {isSignUp ? "Check Your Email!" : "Welcome to Scopic Legal!"}
              </h3>
              <p className="text-slate-300">
                {isSignUp 
                  ? "We've sent you a confirmation email. Please check your inbox and click the link to verify your account."
                  : "Redirecting you to the platform..."}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
              <div className="text-center mb-6 sm:mb-8">
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                  {isSignUp ? "Join the Beta" : "SCOPIC LEGAL"}
                </h3>
                <p className="text-slate-400 text-xs sm:text-sm">
                  {isSignUp ? "Shape the future of legal services" : "Sign in to your account"}
                </p>
              </div>

              {isSignUp && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Full Name *"
                    />
                  </div>
                  <div>
                    <input
                      id="companyName"
                      name="companyName"
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                      placeholder="Company *"
                    />
                  </div>
                </div>
              )}

              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Email Address *"
                />
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  placeholder="Password (min 6 chars) *"
                />
              </div>

              {isSignUp && (
                <div>
                  <input
                    id="referralSource"
                    name="referralSource"
                    type="text"
                    value={formData.referralSource}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:px-4 sm:py-3 text-sm sm:text-base text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    placeholder="How did you hear about us?"
                  />
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-3 sm:px-6 sm:py-4 text-base sm:text-lg font-semibold text-white transition hover:shadow-lg hover:shadow-indigo-500/50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (isSignUp ? "Joining..." : "Signing In...") : (isSignUp ? "Join Beta Program" : "Sign In")}
              </button>

              {/* Forgot Password Link - Only show in sign-in mode */}
              {!isSignUp && (
                <div className="text-center pt-2">
                  <a
                    href="/forgot-password"
                    className="text-xs sm:text-sm text-slate-400 hover:text-indigo-400 transition"
                  >
                    Forgot your password?
                  </a>
                </div>
              )}

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(!isSignUp);
                    setError(null);
                  }}
                  className="text-xs sm:text-sm text-indigo-400 hover:text-indigo-300 transition"
                >
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Join Beta"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
