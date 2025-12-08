"use client";

import { Fragment, useState } from "react";
import { Menu, Transition } from "@headlessui/react";
import { UserProfile } from "@/lib/types";

interface ProfileMenuProps {
  profile: UserProfile | null;
  onSignOut: () => void | Promise<void>;
}

export default function ProfileMenu({ profile, onSignOut }: ProfileMenuProps) {
  const getInitials = (email: string | null | undefined) => {
    if (!email) return "?";
    const parts = email.split("@")[0];
    if (parts.length >= 2) {
      return parts.substring(0, 2).toUpperCase();
    }
    return parts.substring(0, 1).toUpperCase();
  };

  const initials = getInitials(profile?.email);

  return (
    <Menu as="div" className="relative z-50">
      <Menu.Button className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-sm font-semibold text-indigo-300 ring-2 ring-indigo-500/30 transition hover:bg-indigo-500/30 hover:ring-indigo-400/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-[#05060c]">
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
        <Menu.Items className="absolute right-0 mt-2 w-56 origin-top-right divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#0b0e16] shadow-lg ring-1 ring-black/5 focus:outline-none z-50">
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-white">{profile?.email ?? "Anonymous"}</p>
            <p className="mt-1 truncate text-xs text-slate-400">Signed in</p>
          </div>
          <div className="py-1">
            <Menu.Item>
              {({ active }) => (
                <button
                  onClick={onSignOut}
                  className={`${
                    active ? "bg-white/10 text-white" : "text-slate-300"
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

