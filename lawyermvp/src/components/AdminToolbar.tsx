"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AdminToolbar() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  if (pathname === "/login") {
    return null;
  }

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-gray-900/90 text-white px-4 py-2 text-sm backdrop-blur">
      <div className="font-semibold tracking-wide text-gray-200">Lawyer CRM (Admin)</div>
      <button
        onClick={handleSignOut}
        disabled={loading}
        className="rounded-md border border-white/20 px-3 py-1 text-xs uppercase tracking-wide text-white transition hover:border-white/40 disabled:opacity-70"
      >
        {loading ? "Signing out..." : "Sign out"}
      </button>
    </div>
  );
}