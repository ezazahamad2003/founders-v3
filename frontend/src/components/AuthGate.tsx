"use client";

import { useEffect, useMemo, useState } from "react";
import type { SupabaseClient, Session } from "@supabase/supabase-js";
import ChatLayout from "./ChatLayout";
import LandingPage from "./LandingPage";
import { supabaseBrowserClient } from "@/lib/supabase/client";
import BlindSpotAnalysisView from "./BlindSpotAnalysisView";

type AuthMode = "sign_in" | "sign_up";

export type AuthGateView = "chat" | "blind_spot_analysis";

interface AuthGateProps {
  view?: AuthGateView;
}

export default function AuthGate({ view = "chat" }: AuthGateProps) {
  const supabase = supabaseBrowserClient();
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
    return <LandingPage />;
  }

  if (view === "blind_spot_analysis") {
    return <BlindSpotAnalysisView onSignOut={handleSignOut} />;
  }

  return (
    <ChatLayout
      accessToken={accessToken}
      onSignOut={handleSignOut}
      supabase={supabase}
    />
  );
}

