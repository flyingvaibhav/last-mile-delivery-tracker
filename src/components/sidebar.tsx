"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, SignOutButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Truck,
  MapPin,
  LogOut,
  Menu,
  X,
  Compass,
  PackageCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleFromMetadata } from "@/types";

// Create lib/utils.ts if it doesn't exist to use cn helper
// Wait, we will create lib/utils.ts shortly

export default function Sidebar() {
  const { user } = useUser();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const role = getRoleFromMetadata(user?.publicMetadata);

  const navigation = {
    admin: [
      { name: "Overview", href: "/admin", icon: LayoutDashboard },
      { name: "Orders", href: "/admin/orders", icon: Truck },
      { name: "Rates & Zones", href: "/admin/rates", icon: MapPin },
    ],
    agent: [
      { name: "My Deliveries", href: "/agent", icon: Compass },
    ],
    customer: [
      { name: "My Orders", href: "/customer", icon: LayoutDashboard },
      { name: "Book Shipment", href: "/customer/new", icon: PackageCheck },
    ],
  };

  const currentNav = navigation[role as keyof typeof navigation] || navigation.customer;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-900 border border-gray-800 text-white shadow-lg hover:bg-gray-800 transition"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Overlay for Mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 border-r dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-950 flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 lg:static",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col flex-1 p-6">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2 mb-8 mt-4 lg:mt-0">
            <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
              LM
            </div>
            <div>
              <h2 className="font-bold text-lg leading-tight dark:text-white text-gray-900">LastMile</h2>
              <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-500">Logistics Hub</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1">
            <div className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-600 px-3 mb-2 tracking-widest">
              {role} Panel
            </div>
            {currentNav.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group duration-200",
                    isActive
                      ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                  )}
                >
                  <item.icon
                    size={18}
                    className={cn(
                      "transition-colors duration-200",
                      isActive
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-300"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-6 border-t dark:border-gray-800 border-gray-200 bg-gray-50/50 dark:bg-gray-900/10">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-9 w-9 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center text-sm font-semibold dark:text-white text-gray-800">
              {user?.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.imageUrl} alt={user.fullName || "User"} className="h-full w-full object-cover" />
              ) : (
                user?.firstName?.charAt(0) || "U"
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <h4 className="text-sm font-semibold truncate text-gray-900 dark:text-white">{user?.fullName || "Active User"}</h4>
              <p className="text-[11px] text-gray-500 truncate">{user?.primaryEmailAddress?.emailAddress}</p>
            </div>
          </div>
          <SignOutButton>
            <button className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white dark:hover:bg-gray-800 hover:bg-gray-50 dark:text-gray-300 text-gray-700 transition">
              <LogOut size={14} />
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </aside>
    </>
  );
}
