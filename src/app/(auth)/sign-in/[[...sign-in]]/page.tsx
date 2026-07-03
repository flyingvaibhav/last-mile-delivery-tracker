"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignIn } from "@clerk/nextjs";
import { Sparkles, Package, Compass, ShieldAlert, ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  const router = useRouter();
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  const handleStartDemo = async (role: string) => {
    setLoadingRole(role);
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect to sandboxed portal
        router.replace(data.redirectUrl);
      } else {
        alert("Unable to provision demo sandbox database.");
        setLoadingRole(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error starting demo session.");
      setLoadingRole(null);
    }
  };

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center dark:bg-[#070b13] bg-[#f8fafc] p-6 relative overflow-hidden">
      {/* Background Graphic Blobs */}
      <div className="absolute top-[-20%] left-[-10%] h-[600px] w-[600px] rounded-full bg-blue-500/10 blur-[120px] dark:bg-blue-600/5 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] h-[600px] w-[600px] rounded-full bg-emerald-500/10 blur-[120px] dark:bg-emerald-600/5 pointer-events-none" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(59,130,246,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.02)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

      <div className="z-10 w-full max-w-[400px] flex flex-col items-center">
        {/* Branding header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
            LM
          </div>
          <span className="text-xl font-bold dark:text-white text-gray-900 tracking-tight">LastMile Logistics</span>
        </div>

        {/* Clerk Sign In component */}
        <SignIn
          path="/sign-in"
          routing="path"
          signUpUrl="/sign-up"
          fallbackRedirectUrl="/"
        />

        {/* Try Live Demo CTA */}
        <div className="mt-6 w-full text-center">
          <span className="text-xs text-gray-400 dark:text-gray-500 block mb-3 font-semibold">Or explore without an account</span>
          <button
            onClick={() => setShowRoleModal(true)}
            className="w-full py-3 px-4 rounded-xl border border-dashed dark:border-amber-500/30 border-amber-300 dark:bg-amber-500/5 bg-amber-50/50 hover:dark:bg-amber-500/10 hover:bg-amber-50 dark:text-amber-400 text-amber-700 font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 active:scale-[0.99]"
          >
            <Sparkles size={16} className="animate-pulse" />
            Try Live Demo Sandbox
          </button>
        </div>
      </div>

      {/* Role Picker Selection Overlay Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border dark:border-gray-800 border-gray-200 rounded-xl p-6 shadow-2xl space-y-5 relative">
            
            {/* Close button */}
            <button
              onClick={() => {
                if (!loadingRole) setShowRoleModal(false);
              }}
              disabled={!!loadingRole}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition disabled:opacity-50"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-bold dark:text-white text-gray-900 flex items-center gap-2">
                <Sparkles className="text-amber-500" />
                Select Demo Persona
              </h3>
              <p className="text-xs dark:text-gray-400 text-gray-500 leading-normal">
                Choose a role profile to seed your private sandbox environment. You can jump between roles anytime from the dashboard banner.
              </p>
            </div>

            {/* Persona buttons list */}
            <div className="space-y-3">
              {[
                {
                  id: "customer",
                  label: "Explore as Customer",
                  desc: "Book courier orders with live price calculations and track shipment timelines.",
                  icon: Package,
                  color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
                },
                {
                  id: "agent",
                  label: "Explore as Delivery Agent",
                  desc: "View assigned routes, update package transit status, and log delivery failures.",
                  icon: Compass,
                  color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
                },
                {
                  id: "admin",
                  label: "Explore as System Admin",
                  desc: "Manage rates matrices, auto-assign agents, promote roles, and monitor performance.",
                  icon: ShieldAlert,
                  color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
                },
              ].map((persona) => {
                const isSelected = loadingRole === persona.id;
                
                return (
                  <button
                    key={persona.id}
                    disabled={!!loadingRole}
                    onClick={() => handleStartDemo(persona.id)}
                    className={cn(
                      "w-full p-4 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900/50 bg-gray-50/50 hover:bg-gray-100 dark:hover:bg-gray-900/80 transition text-left flex items-start gap-4 disabled:opacity-50 relative group",
                      isSelected && "border-amber-500 ring-2 ring-amber-500/20"
                    )}
                  >
                    <div className={cn("p-2.5 rounded-lg border shrink-0", persona.color)}>
                      <persona.icon size={18} />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                      <div className="font-bold text-sm text-gray-900 dark:text-white flex items-center justify-between">
                        {persona.label}
                        <ArrowRight size={14} className="text-gray-400 group-hover:text-amber-500 group-hover:translate-x-0.5 transition duration-200" />
                      </div>
                      <p className="text-[11px] text-gray-500 leading-normal">{persona.desc}</p>
                    </div>

                    {/* Loading spinner */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 rounded-xl flex items-center justify-center">
                        <div className="h-6 w-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-1" />
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 ml-2">Provisioning Sandbox...</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
