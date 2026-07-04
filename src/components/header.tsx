"use client";

import React from "react";
import { UserButton, useUser } from "@clerk/nextjs";
import { Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "./theme-provider";
import { getRoleFromMetadata } from "@/types";

export default function Header() {
  const { theme, toggleTheme } = useTheme();
  const { user } = useUser();

  const role = getRoleFromMetadata(user?.publicMetadata);

  return (
    <header className="h-16 border-b dark:border-gray-800 border-gray-200 dark:bg-gray-950/80 bg-white/80 backdrop-blur-md sticky top-0 z-30 flex items-center justify-between px-6 lg:px-8">
      {/* Search / Title */}
      <div className="flex items-center gap-4 pl-10 lg:pl-0">
        <h1 className="text-sm font-semibold dark:text-gray-300 text-gray-700 hidden md:block">
          Welcome back, <span className="dark:text-white text-gray-900 font-bold">{user?.firstName || "User"}</span>
        </h1>
        <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
          {role}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications Icon (SaaS aesthetic) */}
        <button className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition relative">
          <Bell size={18} />
          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
        </button>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-900 transition"
          aria-label="Toggle Theme"
        >
          {theme === "dark" ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} />}
        </button>

        {/* User Button Profile */}
        <div className="border-l dark:border-gray-800 border-gray-200 pl-4 flex items-center h-8">
          <UserButton
            appearance={{
              elements: {
                userButtonAvatarBox: "h-8 w-8 border dark:border-gray-800 border-gray-200 shadow-sm",
              },
            }}
          />
        </div>
      </div>
    </header>
  );
}
