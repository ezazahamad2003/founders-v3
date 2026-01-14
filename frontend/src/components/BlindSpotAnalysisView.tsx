"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface BlindSpotAnalysisViewProps {
  onSignOut: () => void | Promise<void>;
}

export default function BlindSpotAnalysisView({ onSignOut }: BlindSpotAnalysisViewProps) {
  const sections = useMemo(
    () => [
      {
        id: "incorporation",
        title: "Incorporation",
        purpose: "Make sure the company legally exists, ownership is issued correctly, and governance is clean.",
        checklist: [
          "Articles of Incorporation",
          "Certificate of Incorporation",
          "NUANS Name Search Report",
          "Initial Return (Form 1)",
          "By-Law No. 1",
          "Organizational Resolutions",
          "Registers & Ledgers",
          "Share Certificates",
          "Restricted Share Subscription (founder vesting / repurchase rights)",
          "Shareholders' Agreement (founder dispute + control rules)",
        ],
        risks: [
          "Founder disputes / deadlocks with no resolution path",
          "Equity issued wrong → \"dead equity\" + messy cap table",
          "Minority holder can block financing/exits without drag-along/buy-sell rules",
        ],
      },
      {
        id: "funding",
        title: "Funding",
        purpose: "Make the company \"venture-ready\" so fundraising doesn't get delayed or killed in diligence.",
        checklist: [
          "Clean cap table + equity issuance records",
          "Equity Incentive Plan (Option Pool / ESOP-style plan)",
          "Board/Shareholder approvals for equity + financings (resolutions)",
          "Founder vesting confirmed (via Restricted Share Subscription)",
          "(If raising) SAFE / convertible note / subscription documents",
          "Investor-friendly protections baked in (drag-along, info rights, pro-rata readiness)",
        ],
        risks: [
          "Broken cap table (ad-hoc equity grants, no vesting)",
          "Can't hire (no option pool / plan)",
          "Financing gets stuck because approvals + documentation aren't clean",
        ],
      },
      {
        id: "operations",
        title: "Operations",
        purpose: "Protect IP, reduce people/legal risk, and make sure work-for-hire is actually owned by the company.",
        checklist: [
          "Confidentiality / Non-Disclosure Agreement (NDA)",
          "IP Assignment Agreement (founders + contributors)",
          "Independent Contractor Agreement template",
          "Employment Agreement (with proper termination clauses)",
          "Advisor Agreement template (scope + vesting)",
          "Master Services Agreement (MSA) (if selling services / B2B)",
        ],
        risks: [
          "Company doesn't own its own code/IP → investors walk",
          "Contractors keep copyright / CRA misclassification exposure",
          "Employment severance risk under Ontario common law",
          "Advisors create \"dead equity\" with no vesting or scope",
        ],
      },
    ],
    [],
  );

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const selected = sections.find((s) => s.id === selectedSection);

  return (
    <div className="flex h-screen flex-col bg-[#05060c] text-slate-100">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/5 px-4 sm:px-6">
        <Link
          href="/"
          className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          ← Back to Chat
        </Link>
        <button
          onClick={() => void onSignOut()}
          className="rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Sign out
        </button>
      </div>

      <main className="flex flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {!selectedSection ? (
            <motion.div
              key="grid-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6"
            >
              <h1 className="text-2xl font-semibold text-white">Blind Spot Analysis</h1>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                A quick checklist to keep your legal foundation clean.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sections.map((section) => (
                  <motion.button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 text-left transition hover:border-white/20 hover:bg-white/10"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="text-base font-semibold text-white">{section.title}</div>
                    <div className="mt-2 text-sm leading-6 text-slate-300">
                      <span className="font-medium text-slate-200">Purpose:</span> {section.purpose}
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="detail-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="flex w-full"
            >
              {/* Left: Selected card */}
              <motion.div
                initial={{ x: 0, width: "33.333%" }}
                animate={{ x: 0, width: "33.333%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-shrink-0 border-r border-white/10 p-6"
              >
                <button
                  onClick={() => setSelectedSection(null)}
                  className="mb-4 rounded-lg bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  ← Back
                </button>
                <div className="rounded-2xl border border-indigo-500/40 bg-indigo-500/10 p-5">
                  <div className="text-lg font-semibold text-white">{selected?.title}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">
                    <span className="font-medium text-slate-200">Purpose:</span> {selected?.purpose}
                  </div>
                </div>
              </motion.div>

              {/* Right: Checklist + Risks */}
              <motion.div
                initial={{ x: "100%", opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: "100%", opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="flex-1 overflow-y-auto p-6"
              >
                <div className="mx-auto max-w-3xl">
                  <h2 className="text-xl font-semibold text-white">Checklist</h2>
                  <ul className="mt-4 space-y-3">
                    {selected?.checklist.map((item, idx) => {
                      const key = `${selected.id}:${idx}`;
                      const isChecked = checked[key] ?? false;
                      return (
                        <motion.li
                          key={key}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => setChecked((prev) => ({ ...prev, [key]: !isChecked }))}
                            className="mt-1 h-5 w-5 rounded border-white/20 bg-white/5 accent-indigo-400"
                          />
                          <span className="text-sm leading-6 text-slate-200">{item}</span>
                        </motion.li>
                      );
                    })}
                  </ul>

                  <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
                    <h3 className="text-base font-semibold text-red-300">Main blind-spot risks if missing</h3>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-300">
                      {selected?.risks.map((risk, idx) => (
                        <motion.li
                          key={risk}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 + idx * 0.05 }}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-1 text-red-400">•</span>
                          <span>{risk}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
