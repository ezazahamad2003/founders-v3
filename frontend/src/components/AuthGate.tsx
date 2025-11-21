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
      const { error } = await supabase.auth.signUp({ email, password });
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
      <div className="flex min-h-screen items-center justify-center bg-[#05060c] px-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur"
        >
          <h1 className="text-2xl font-semibold text-white">Sign {authMode === "sign_in" ? "in" : "up"} to Scopic Legal</h1>
          <p className="mt-2 text-sm text-slate-300">
            {authMode === "sign_in" ? "Use your Supabase credentials to continue." : "Create an account to start chatting."}
          </p>
          <div className="mt-6 space-y-4">
            <label className="block text-sm text-slate-200">
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-indigo-400"
                required
              />
            </label>
            <label className="block text-sm text-slate-200">
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white outline-none focus:border-indigo-400"
                required
              />
            </label>
          </div>
          {errorMessage ? (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {errorMessage}
            </p>
          ) : null}
          <button
            type="submit"
            className="mt-6 w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 py-3 font-semibold text-white transition hover:opacity-90"
          >
            {authMode === "sign_in" ? "Sign in" : "Create account"}
          </button>
          <button
            type="button"
            onClick={() => setAuthMode(authMode === "sign_in" ? "sign_up" : "sign_in")}
            className="mt-4 w-full text-sm text-slate-300 hover:text-white"
          >
            {authMode === "sign_in"
              ? "Need an account? Create one"
              : "Already have an account? Sign in"}
          </button>
        </form>
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

