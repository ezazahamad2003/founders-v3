"use client";

import { Fragment } from "react";
import { Menu, Transition } from "@headlessui/react";
import { UserProfile } from "@/lib/types";
import { ThemeMode, useTheme } from "@/hooks/useTheme";

interface ProfileMenuProps {
  profile: UserProfile | null;
  onOpenProfile: () => void;
  onSignOut: () => void | Promise<void>;
}

export default function ProfileMenu({ profile, onOpenProfile, onSignOut }: ProfileMenuProps) {
  const { theme, setTheme } = useTheme();

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "?";
    const parts = email.split("@")[0];
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase();
    }
    return parts.substring(0, 1).toUpperCase();
  };

  const initials = getInitials(profile?.email);
  const themeOptionClass = (option: ThemeMode) =>
    `rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
      theme === option
        ? "border-indigo-400/60 bg-indigo-500/20 text-indigo-300"
        : "app-border app-surface-2 app-muted hover:app-border-strong hover:app-text"
    }`;

  return (
    <Menu as="div" className="relative z-50">
      <Menu.Button className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300 ring-2 ring-indigo-500/30 transition hover:bg-indigo-500/30 hover:ring-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[var(--app-bg)]">
        {initials}
      </Menu.Button>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-100"
        enterFrom="transform opacity-0 scale-95"
        enterTo="transform opacity-100 scale-100"
        leave="transition ease-in duration-75"
        leaveFrom="transform opacity-100 scale-100"
        leaveTo="transform opacity-0 scale-95"
      >
        <Menu.Items className="absolute right-0 z-50 mt-2 w-64 origin-top-right divide-y divide-[color:var(--app-border)] rounded-2xl border app-border app-surface shadow-lg ring-1 ring-black/5 focus:outline-none">
          <div className="px-4 py-3">
            <p className="text-sm font-medium app-text">{profile?.email ?? "Anonymous"}</p>
            <p className="mt-1 truncate text-xs app-muted">Signed in</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-wide app-subtle">Theme</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setTheme("dark")} className={themeOptionClass("dark")}>
                Dark
              </button>
              <button type="button" onClick={() => setTheme("light")} className={themeOptionClass("light")}>
                Light
              </button>
            </div>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onOpenProfile}
                  className={`${
                    active ? "app-surface-2 app-text" : "app-muted"
                  } group flex w-full items-center px-4 py-2 text-sm transition`}
                >
                  Profile
                </button>
              )}
            </Menu.Item>
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onSignOut}
                  className={`${
                    active ? "app-surface-2 app-text" : "app-muted"
                  } group flex w-full items-center px-4 py-2 text-sm transition`}
                >
                  Sign out
                </button>
              )}
            </Menu.Item>
          </div>
        </Menu.Items>
      </Transition>
    </Menu>
  );
}

