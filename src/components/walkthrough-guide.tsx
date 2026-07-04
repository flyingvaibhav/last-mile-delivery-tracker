"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, HelpCircle, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  id: number;
  role: "customer" | "agent" | "admin";
  title: string;
  desc: string;
  action: string;
}

export default function WalkthroughGuide() {
  const [isVisible, setIsVisible] = useState(true);
  const [currentRole, setCurrentRole] = useState<string>("customer");
  
  const steps: Step[] = [
    {
      id: 1,
      role: "customer",
      title: "1. Book Shipment (Customer)",
      desc: "In Customer portal, click 'Book Shipment'. Fill out the Sender & Recipient contact details alongside pickup/drop pincodes, verify volumetric weight calculation, and submit.",
      action: "Switch to Customer role & book an order",
    },
    {
      id: 2,
      role: "agent",
      title: "2. Claim & Fail Shipment (Rider)",
      desc: "Switch to Rider (Agent) role. On the Rider dashboard, go to 'Available Orders in My Zone', click 'Accept Delivery' to assign yourself, progress status, and finally mark it as 'Failed' (with a reason).",
      action: "Switch to Rider, claim shipment & fail it",
    },
    {
      id: 3,
      role: "customer",
      title: "3. Reschedule Order (Customer)",
      desc: "Switch back to Customer role. You will see the failed notification. Click 'Reschedule' on the order card, pick a new date, and confirm. This clears the agent and puts the order back to Pending.",
      action: "Switch to Customer & click Reschedule",
    },
    {
      id: 4,
      role: "admin",
      title: "4. Admin Control (Admin)",
      desc: "Switch to Admin role. Verify the Logistics Overview dashboard metrics, total revenue calculators, active agents registry, rate card matrices configuration, and status overrides.",
      action: "Switch to Admin and verify analytics",
    },
  ];

  // Helper to extract demo cookie details client-side
  useEffect(() => {
    function checkRole() {
      const match = document.cookie.match(new RegExp('(^| )demo_session=([^;]+)'));
      if (match) {
        try {
          const session = JSON.parse(decodeURIComponent(match[2]));
          setCurrentRole(session.role);
        } catch (e) {
          console.error(e);
        }
      }
    }
    checkRole();
    
    // Poll to keep role aligned on header banner clicks
    const interval = setInterval(checkRole, 1000);
    return () => clearInterval(interval);
  }, []);

  // Check if we are currently running in demo mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  useEffect(() => {
    setIsDemoMode(document.cookie.includes("demo_session"));
  }, []);

  if (!isDemoMode) return null;

  return (
    <div className="fixed bottom-6 left-6 z-40 max-w-[320px] transition-all duration-300">
      {isVisible ? (
        <div className="rounded-2xl border dark:border-gray-800 border-gray-200 dark:bg-gray-950/95 bg-white/95 shadow-2xl p-4 backdrop-blur-md space-y-3">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b dark:border-gray-800 border-gray-100 pb-2">
            <h4 className="text-xs font-bold dark:text-white text-gray-900 flex items-center gap-1.5">
              <Sparkles className="text-amber-500 animate-pulse" size={14} />
              Evaluator Quick-Guide
            </h4>
            <button
              onClick={() => setIsVisible(false)}
              className="text-[10px] font-bold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex items-center gap-0.5 transition"
            >
              <EyeOff size={12} />
              Hide
            </button>
          </div>

          {/* Stepper Steps */}
          <div className="space-y-3">
            {steps.map((st) => {
              const isActive = currentRole === st.role;
              return (
                <div
                  key={st.id}
                  className={cn(
                    "p-2.5 rounded-xl border transition-all text-[11px] leading-relaxed",
                    isActive
                      ? "dark:bg-amber-500/5 bg-amber-50/50 border-amber-500 dark:text-white text-gray-900 shadow-sm"
                      : "dark:bg-gray-900/30 bg-gray-50/30 border-transparent dark:text-gray-400 text-gray-500 opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between font-bold mb-1">
                    <span className="flex items-center gap-1.5">
                      {isActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />}
                      {st.title}
                    </span>
                    {isActive && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                        Active Step
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] leading-normal">{st.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="text-[9px] text-gray-400 text-center leading-normal pt-1 border-t dark:border-gray-800 border-gray-100">
            💡 Toggle personas in the **top banner** to complete the walkthrough.
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsVisible(true)}
          className="h-10 px-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/10 font-bold text-xs transition active:scale-95 hover:scale-105"
        >
          <HelpCircle size={16} />
          Show Walkthrough Guide
        </button>
      )}
    </div>
  );
}
