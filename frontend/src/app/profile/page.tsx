"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Session } from "@supabase/supabase-js";
import {
  getMe,
  getProfileDocumentDownloadUrl,
  updateMe,
  uploadProfileDocument,
} from "@/lib/api";
import { UserProfile } from "@/lib/types";
import { supabaseBrowserClient } from "@/lib/supabase/client";

type ProfileFormState = {
  full_name: string;
  company_name: string;
  website: string;
};

const emptyFormState: ProfileFormState = {
  full_name: "",
  company_name: "",
  website: "",
};

export default function ProfilePage() {
  const supabase = supabaseBrowserClient();
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [formState, setFormState] = useState<ProfileFormState>(emptyFormState);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const accessToken = useMemo(() => session?.access_token ?? null, [session]);

  const refreshProfileImage = useCallback(async (token: string, imagePath: string | null | undefined) => {
    if (!imagePath) {
      setProfileImageUrl(null);
      return;
    }

    try {
      const response = await getProfileDocumentDownloadUrl(token, imagePath);
      setProfileImageUrl(response.url);
    } catch {
      setProfileImageUrl(null);
    }
  }, []);

  const refreshProfile = useCallback(
    async (token: string) => {
      setIsProfileLoading(true);
      try {
        const me = await getMe(token);
        setProfile(me);
        setFormState({
          full_name: me.full_name ?? "",
          company_name: me.company_name ?? "",
          website: me.website ?? "",
        });
        await refreshProfileImage(token, me.profile_image_path);
      } finally {
        setIsProfileLoading(false);
      }
    },
    [refreshProfileImage],
  );

  useEffect(() => {
    if (!accessToken) {
      setProfile(null);
      setFormState(emptyFormState);
      setProfileImageUrl(null);
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    refreshProfile(accessToken).catch((error) => {
      setErrorMessage((error as Error).message || "Failed to load your profile.");
    });
  }, [accessToken, refreshProfile]);

  const handleFormInputChange = (field: keyof ProfileFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accessToken) return;

    setIsSaving(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const updated = await updateMe(accessToken, {
        full_name: formState.full_name || null,
        company_name: formState.company_name || null,
        website: formState.website || null,
      });
      setProfile(updated);
      setFormState({
        full_name: updated.full_name ?? "",
        company_name: updated.company_name ?? "",
        website: updated.website ?? "",
      });
      await refreshProfileImage(accessToken, updated.profile_image_path);
      setSuccessMessage("Profile details saved.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleProfileImageUpload = async (file: File) => {
    if (!accessToken) return;
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload a valid image file.");
      return;
    }

    setIsUploadingImage(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const uploaded = await uploadProfileDocument(accessToken, file);
      const updated = await updateMe(accessToken, { profile_image_path: uploaded.path });
      setProfile(updated);
      await refreshProfileImage(accessToken, uploaded.path);
      setSuccessMessage("Profile image updated.");
    } catch (error) {
      setErrorMessage((error as Error).message || "Failed to upload profile image.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  if (!supabase) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="app-surface app-border w-full max-w-xl rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-semibold app-text">Missing Supabase configuration</h1>
          <p className="mt-2 text-sm app-muted">
            Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use profile management.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="text-sm app-muted">Loading profile workspace…</div>
      </div>
    );
  }

  if (!accessToken) {
    return (
      <div className="flex min-h-screen items-center justify-center app-bg p-6">
        <div className="app-surface app-border w-full max-w-xl rounded-3xl border p-8 text-center">
          <h1 className="text-xl font-semibold app-text">Please sign in first</h1>
          <p className="mt-2 text-sm app-muted">Your profile settings and document vault are available after login.</p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20"
          >
            Go to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg app-text">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Profile</h1>
            <p className="mt-1 text-sm app-muted">Update your personal details and profile image.</p>
          </div>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border app-border app-surface-2 px-4 py-2 text-sm font-medium app-text transition hover:opacity-90"
          >
            Back to Workspace
          </Link>
        </div>

        {errorMessage ? (
          <div className="mb-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {errorMessage}
          </div>
        ) : null}
        {successMessage ? (
          <div className="mb-4 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <section className="app-surface app-border rounded-3xl border p-6">
            <h2 className="text-lg font-semibold">Personal Information</h2>
            <p className="mt-1 text-sm app-muted">This information appears in your account profile.</p>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
              <div>
                <label htmlFor="full-name" className="mb-1 block text-xs font-medium uppercase tracking-wide app-subtle">
                  Full Name
                </label>
                <input
                  id="full-name"
                  type="text"
                  value={formState.full_name}
                  onChange={(event) => handleFormInputChange("full_name", event.target.value)}
                  className="app-surface-2 app-border app-text w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-indigo-400/70"
                  placeholder="e.g. Jane Founder"
                />
              </div>

              <div>
                <label
                  htmlFor="company-name"
                  className="mb-1 block text-xs font-medium uppercase tracking-wide app-subtle"
                >
                  Company Name
                </label>
                <input
                  id="company-name"
                  type="text"
                  value={formState.company_name}
                  onChange={(event) => handleFormInputChange("company_name", event.target.value)}
                  className="app-surface-2 app-border app-text w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-indigo-400/70"
                  placeholder="e.g. Acme Technologies"
                />
              </div>

              <div>
                <label htmlFor="website" className="mb-1 block text-xs font-medium uppercase tracking-wide app-subtle">
                  Website
                </label>
                <input
                  id="website"
                  type="text"
                  value={formState.website}
                  onChange={(event) => handleFormInputChange("website", event.target.value)}
                  className="app-surface-2 app-border app-text w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-indigo-400/70"
                  placeholder="https://yourcompany.com"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSaving || isProfileLoading}
                  className="inline-flex items-center justify-center rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-300 transition hover:border-indigo-400 hover:bg-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving…" : "Save Profile"}
                </button>
              </div>
            </form>
          </section>

          <section className="app-surface app-border rounded-3xl border p-6">
            <h2 className="text-lg font-semibold">Profile Image</h2>
            <p className="mt-1 text-sm app-muted">Upload an image that represents your account.</p>

            <div className="mt-5 flex justify-center">
              {profileImageUrl ? (
                <Image
                  src={profileImageUrl}
                  alt="Profile"
                  width={112}
                  height={112}
                  className="h-28 w-28 rounded-full border border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full border app-border app-surface-2 text-3xl font-semibold text-indigo-300">
                  {(profile?.full_name || profile?.email || "?").slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>

            <label className="mt-5 inline-flex w-full cursor-pointer items-center justify-center rounded-xl border app-border app-surface-2 px-4 py-2 text-sm font-medium app-text transition hover:opacity-90">
              {isUploadingImage ? "Uploading…" : "Upload Profile Image"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploadingImage}
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (file) {
                    await handleProfileImageUpload(file);
                  }
                  event.target.value = "";
                }}
              />
            </label>
          </section>
        </div>

      </div>
    </div>
  );
}
