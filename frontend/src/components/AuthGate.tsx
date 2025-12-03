"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import ChatLayout from "./ChatLayout";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type AuthMode = "sign_in" | "sign_up";

export default function AuthGate() {
  const supabase = supabaseBrowserClient;
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [referralSource, setReferralSource] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) {
      setErrorMessage("Supabase client is not configured.");
      return;
    }
    setErrorMessage(null);
    if (authMode === "sign_in") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMessage(error.message);
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            company_name: companyName,
            referral_source: referralSource,
          },
        },
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Check your inbox to confirm your account.");
      }
    }
  };

  const handleSignOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  };

  const accessToken = useMemo(() => session?.access_token ?? null, [session]);

  if (!supabase) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05060c]">
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-10 py-6 text-center text-red-100">
          Missing Supabase configuration. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#05060c]">
        <div className="animate-pulse text-slate-300">Preparing Scopic Legal…</div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex h-screen flex-col overflow-hidden bg-[#050b14] lg:flex-row">
        {/* Left Column - Hero Section */}
        <div className="flex flex-1 items-center justify-center p-8 lg:p-12">
          <div className="max-w-xl space-y-6">
            <div className="space-y-3">
              <h1 className="text-5xl font-bold text-white lg:text-6xl">
                Scopic Legal
              </h1>
              <p className="text-base leading-relaxed text-gray-400">
                Transforming legal workflows with advanced AI and streamlined case management. 
                Secure, efficient, and designed for modern law practices. Join the future of legal technology.
              </p>
            </div>
            
            {/* Legal Tech Illustration Placeholder */}
            <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-blue-900/30 to-purple-900/30 p-6">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImciIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0eWxlPSJzdG9wLWNvbG9yOiMyNTYzZWI7c3RvcC1vcGFjaXR5OjAuMyIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3R5bGU9InN0b3AtY29sb3I6IzdjM2FlZDtzdG9wLW9wYWNpdHk6MC4zIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHJlY3Qgd2lkdGg9IjYwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9InVybCgjZykiLz48L3N2Zz4=')] opacity-50"></div>
              <div className="relative flex h-full items-center justify-center">
                <div className="text-center">
                  <svg className="mx-auto h-24 w-24 text-blue-400/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                  <p className="mt-3 text-xs text-gray-500">AI-Powered Legal Platform</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Auth Section */}
        <div className="flex flex-1 items-center justify-center overflow-y-auto p-8 lg:p-12">
          <div className="w-full max-w-md">
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl border border-white/10 bg-[#0a1120] p-6 shadow-2xl"
            >
              <h2 className="text-xl font-semibold text-white">
                {authMode === "sign_in" ? "Scopic Legal" : "Scopic Legal Beta Program"}
              </h2>
              {authMode === "sign_up" && (
                <p className="mt-1 text-xs text-gray-400">
                  Provide your details to submit an application
                </p>
              )}
              
              <div className="mt-5 space-y-3">
                {authMode === "sign_up" && (
                  <>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-400">Full Name</span>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(event) => setFullName(event.target.value)}
                        className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-400">Company Name</span>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(event) => setCompanyName(event.target.value)}
                        className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-purple-500"
                        required
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-medium text-gray-400">Referral Source</span>
                      <input
                        type="text"
                        value={referralSource}
                        onChange={(event) => setReferralSource(event.target.value)}
                        className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-purple-500"
                        placeholder="How did you hear about us?"
                        required
                      />
                    </label>
                  </>
                )}
                <label className="block">
                  <span className="text-xs font-medium text-gray-400">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-gray-400">Password</span>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 w-full rounded-xl border-0 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-gray-300 transition focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </label>
              </div>
              
              {errorMessage ? (
                <p className="mt-3 text-xs text-red-400" role="alert">
                  {errorMessage}
                </p>
              ) : null}
              
              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-gradient-to-r from-purple-600 to-violet-600 py-3 text-sm font-semibold text-white transition hover:from-purple-700 hover:to-violet-700"
              >
                {authMode === "sign_in" ? "Sign in" : "Apply to Join"}
              </button>
              
              <button
                type="button"
                onClick={() => setAuthMode(authMode === "sign_in" ? "sign_up" : "sign_in")}
                className="mt-3 w-full text-center text-xs text-gray-400 hover:text-white"
              >
                {authMode === "sign_in"
                  ? "Want to join our private beta? Apply here"
                  : "Already in the Private Beta? Sign in"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ChatLayout
      accessToken={accessToken}
      onSignOut={handleSignOut}
      supabase={supabase}
    />
  );
}

