"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromUrl = searchParams.get("email") || "";
  
  const [email, setEmail] = useState(emailFromUrl);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleVerifyCode = async () => {
    if (!code || !email) {
      setMessage({ type: "error", text: "Please enter your email and verification code." });
      return;
    }

    setVerifying(true);
    setMessage(null);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/password-reset/verify-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.detail || "Invalid verification code." });
      } else {
        setCodeVerified(true);
        setMessage({ type: "success", text: "Code verified! You can now set your new password." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setVerifying(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Validation
    if (password.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters long." });
      return;
    }

    if (password !== confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/api/v1/password-reset/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code, new_password: password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage({ type: "error", text: data.detail || "Failed to reset password." });
      } else {
        setMessage({
          type: "success",
          text: "Password reset successfully! Redirecting to sign in...",
        });
        
        // Redirect to home after 2 seconds
        setTimeout(() => {
          router.push("/");
        }, 2000);
      }
    } catch (err) {
      setMessage({ type: "error", text: "An unexpected error occurred." });
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05060c] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-white">Set New Password</h1>
            <p className="mt-2 text-slate-400">
              Enter your new password below. Make sure it&apos;s at least 6 characters long.
            </p>
          </div>

          <form onSubmit={codeVerified ? handleResetPassword : (e) => { e.preventDefault(); handleVerifyCode(); }} className="space-y-6">
            {!emailFromUrl && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-300">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={codeVerified}
                  className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                  placeholder="you@example.com"
                />
              </div>
            )}

            <div>
              <label htmlFor="code" className="block text-sm font-medium text-slate-300">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                disabled={codeVerified}
                maxLength={6}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-center text-2xl font-mono tracking-widest text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
                placeholder="000000"
              />
              <p className="mt-2 text-xs text-slate-400">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            {!codeVerified && (
              <button
                type="button"
                onClick={handleVerifyCode}
                disabled={verifying || !code || !email}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {verifying ? "Verifying..." : "Verify Code"}
              </button>
            )}

            {codeVerified && (
              <>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                placeholder="Confirm new password"
              />
            </div>

            {message && (
              <div
                className={`rounded-xl px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border border-green-500/40 bg-green-500/10 text-green-200"
                    : "border border-red-500/40 bg-red-500/10 text-red-200"
                }`}
              >
                {message.text}
              </div>
            )}

                <button
                  type="submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-3 font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Resetting Password..." : "Reset Password"}
                </button>
              </>
            )}
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#05060c]">
        <div className="animate-pulse text-slate-300">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
