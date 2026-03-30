"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabaseBrowserClient } from "@/lib/supabase/client";

const DOC_TYPES = [
  {
    slug: "articles-of-incorporation",
    title: "Articles of Incorporation",
    description:
      'The "birth certificate" of your company, filed in Delaware to officially create the legal entity.',
    icon: "🏛️",
    badge: "Formation",
  },
  {
    slug: "bylaws",
    title: "Corporate Bylaws",
    description:
      "The internal manual defining how your company is run, including voting rules and board member roles.",
    icon: "📋",
    badge: "Governance",
  },
  {
    slug: "founders-agreement",
    title: "Founders' Agreement",
    description:
      "A contract between co-founders detailing ownership percentages, roles, and break-up terms.",
    icon: "🤝",
    badge: "Equity",
  },
  {
    slug: "stock-purchase-agreement",
    title: "Stock Purchase Agreement",
    description:
      "Documents the formal sale of shares to founders to establish clear ownership.",
    icon: "📄",
    badge: "Equity",
  },
  {
    slug: "ip-assignment",
    title: "IP Assignment Agreement",
    description:
      "Legally transfers ownership of all code and IP from founders to the company entity.",
    icon: "💡",
    badge: "IP",
  },
  {
    slug: "piiia",
    title: "PIIIA",
    description:
      "Required for every employee and contractor to ensure their work belongs to the startup.",
    icon: "🔒",
    badge: "Employment",
  },
  {
    slug: "safe",
    title: "SAFE Agreement",
    description:
      "The standard document for early investment from angels or VCs without setting a fixed valuation.",
    icon: "💰",
    badge: "Fundraising",
  },
  {
    slug: "terms-privacy",
    title: "Terms of Service & Privacy Policy",
    description:
      "Legal contracts between your platform and users; essential for AI companies handling data.",
    icon: "⚖️",
    badge: "Compliance",
  },
  {
    slug: "offer-letter",
    title: "Employee Offer Letter",
    description:
      "Standardized documents for hiring outlining at-will employment, compensation, and benefits.",
    icon: "📨",
    badge: "Employment",
  },
  {
    slug: "nda",
    title: "Non-Disclosure Agreement",
    description:
      'A "hush-hush" contract used when sharing sensitive trade secrets with potential partners or vendors.',
    icon: "🤐",
    badge: "Confidentiality",
  },
];

const BADGE_COLORS: Record<string, string> = {
  Formation: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  Governance: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  Equity: "bg-green-500/20 text-green-300 border-green-500/30",
  IP: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  Employment: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  Fundraising: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  Compliance: "bg-red-500/20 text-red-300 border-red-500/30",
  Confidentiality: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
};

export default function DocumentGenerationPage() {
  const router = useRouter();
  const supabase = supabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_e, s) =>
      setSession(s)
    );
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    router.push("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#0f1117]/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-6xl px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 text-sm text-white/50 hover:text-white/80 transition-colors"
          >
            ← Back to Chat
          </button>
          <div className="h-4 w-px bg-white/20" />
          <div className="text-sm text-indigo-400 uppercase tracking-widest">
            Scopic Legal
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-300 uppercase tracking-widest">
          ✨ AI-Powered
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-white">
          Legal Document Generator
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-white/55">
          Select a document below. Our AI will ask you the right questions, then
          generate a complete, lawyer-quality legal document in minutes.
        </p>

        {/* Cards Grid */}
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DOC_TYPES.map((doc, idx) => (
            <button
              key={doc.slug}
              onClick={() =>
                router.push(`/document-generation/${doc.slug}`)
              }
              className="group relative flex flex-col items-start rounded-2xl border border-white/10 bg-[#1a1c24] p-6 text-left transition-all duration-200 hover:border-indigo-500/50 hover:bg-[#1e2030] hover:shadow-lg hover:shadow-indigo-900/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {/* Number badge */}
              <span className="absolute right-4 top-4 text-xs font-medium text-white/20">
                {String(idx + 1).padStart(2, "0")}
              </span>

              {/* Icon */}
              <span className="mb-4 text-3xl">{doc.icon}</span>

              {/* Category badge */}
              <span
                className={`mb-3 rounded-full border px-2 py-0.5 text-xs font-medium ${
                  BADGE_COLORS[doc.badge] ?? "bg-white/10 text-white/50"
                }`}
              >
                {doc.badge}
              </span>

              {/* Title */}
              <h2 className="text-base font-semibold text-white group-hover:text-indigo-200 transition-colors">
                {doc.title}
              </h2>

              {/* Description */}
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                {doc.description}
              </p>

              {/* CTA */}
              <div className="mt-5 flex items-center gap-1.5 text-xs font-medium text-indigo-400 opacity-0 transition-opacity group-hover:opacity-100">
                Generate document
                <span className="transition-transform group-hover:translate-x-0.5">→</span>
              </div>
            </button>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-white/30">
          All documents are generated by AI and are for informational purposes
          only. Please have critical documents reviewed by a qualified attorney.
        </p>
      </div>
    </div>
  );
}
