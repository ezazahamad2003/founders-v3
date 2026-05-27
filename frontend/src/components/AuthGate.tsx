"use client";

import { useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import ChatLayout from "./ChatLayout";
import ErrorBoundary from "./ErrorBoundary";
import LandingPage from "./LandingPage";
import { supabaseBrowserClient } from "@/lib/supabase/client";

export default function AuthGate() {
  const supabase = supabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
        <div className="animate-pulse text-slate-300">Preparing Scopic…</div>
      </div>
    );
  }

  if (!accessToken) {
    return <LandingPage />;
  }

  return (
    <ErrorBoundary>
      <ChatLayout
        accessToken={accessToken}
        onSignOut={handleSignOut}
        supabase={supabase}
      />
    </ErrorBoundary>
  );
}

