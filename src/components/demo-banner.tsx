"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  LogOut,
  Users,
  Mail,
  X,
  BellRing,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NotificationLog {
  _id: string;
  to: string;
  subject: string;
  body: string;
  timestamp: string;
}

export default function DemoBanner() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [switching, setSwitching] = useState(false);

  // Helper to parse cookie on mount or status updates
  const parseCookie = () => {
    try {
      const match = document.cookie.match(new RegExp("(^| )demo_session=([^;]*)"));
      if (match) {
        const data = JSON.parse(decodeURIComponent(match[2]));
        setRole(data.role);
        setSessionId(data.sessionId);
      } else {
        setRole(null);
        setSessionId(null);
      }
    } catch {
      setRole(null);
      setSessionId(null);
    }
  };

  useEffect(() => {
    parseCookie();
    // Poll cookie changes occasionally or bind to router events
    const interval = setInterval(parseCookie, 2000);
    return () => clearInterval(interval);
  }, []);

  // Fetch notification logs
  const fetchLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await fetch("/api/demo/notifications");
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (showDrawer) {
      fetchLogs();
    }
  }, [showDrawer]);

  const handleReset = async () => {
    if (!role) return;
    setResetting(true);
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setResetting(false);
    }
  };

  const handleRoleSwitch = async (newRole: string) => {
    if (newRole === role) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (res.ok) {
        const data = await res.json();
        // Redirect to new dashboard
        router.push(data.redirectUrl);
        // Force refresh to reload layouts
        setTimeout(() => {
          window.location.href = data.redirectUrl;
        }, 300);
      }
    } catch (err) {
      console.error(err);
      setSwitching(false);
    }
  };

  const handleExitDemo = () => {
    // Delete cookie by setting expiry in past
    document.cookie = "demo_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    window.location.href = "/sign-in";
  };

  const handleClearLogs = async () => {
    try {
      const res = await fetch("/api/demo/notifications", {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // If not in demo mode, do not render banner
  if (!role || !sessionId) return null;

  return (
    <>
      {/* Top Banner Bar */}
      <div className="bg-amber-600 text-white text-xs px-4 py-2 flex flex-col md:flex-row md:items-center justify-between gap-3 sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="h-4.5 w-4.5 text-amber-100 animate-pulse shrink-0" />
          <span>You are in <strong className="uppercase">Demo Mode Sandbox</strong> &mdash; isolated session changes reset on exit or reset click.</span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Role Switcher */}
          <div className="relative group/switcher">
            <button className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-700/60 hover:bg-amber-800/80 transition font-bold">
              <Users size={12} />
              Role: <span className="uppercase">{role}</span>
              <ChevronDown size={10} />
            </button>
            <div className="absolute right-0 mt-1 w-36 rounded-md bg-white text-gray-900 shadow-xl border border-gray-100 py-1 hidden group-hover/switcher:block z-50">
              {[
                { id: "customer", label: "Customer View" },
                { id: "agent", label: "Delivery Agent" },
                { id: "admin", label: "Admin Panel" },
              ].map((item) => (
                <button
                  key={item.id}
                  disabled={switching}
                  onClick={() => handleRoleSwitch(item.id)}
                  className={cn(
                    "w-full text-left px-3 py-1.5 text-xs font-semibold hover:bg-gray-100 transition",
                    role === item.id && "bg-blue-50 text-blue-600 hover:bg-blue-50"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Email Notification Log */}
          <button
            onClick={() => setShowDrawer(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-amber-700/60 hover:bg-amber-800/80 transition font-bold shrink-0"
          >
            <Mail size={12} />
            Email Log
          </button>

          {/* Reset button */}
          <button
            onClick={handleReset}
            disabled={resetting}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-amber-700/60 hover:bg-amber-800/80 transition font-bold disabled:opacity-50 shrink-0"
          >
            <RefreshCw size={12} className={cn(resetting && "animate-spin")} />
            {resetting ? "Resetting..." : "Reset Data"}
          </button>

          {/* Exit Button */}
          <button
            onClick={handleExitDemo}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-red-700 hover:bg-red-800 transition font-bold shrink-0"
          >
            <LogOut size={12} />
            Exit Demo
          </button>
        </div>
      </div>

      {/* Floating Mock Notification Log Drawer (Right slide out) */}
      {showDrawer && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay backdrop */}
          <div
            onClick={() => setShowDrawer(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-gray-950 border-l dark:border-gray-800 border-gray-200 flex flex-col shadow-2xl">
              {/* Header */}
              <div className="p-6 border-b dark:border-gray-800 border-gray-100 flex items-center justify-between dark:bg-gray-900 bg-gray-50">
                <div className="flex items-center gap-2 text-amber-500 font-bold">
                  <BellRing size={18} />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Simulated Email Alerts</h3>
                </div>
                <button onClick={() => setShowDrawer(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                  <X size={18} />
                </button>
              </div>

              {/* Log List View */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {loadingLogs ? (
                  <div className="flex flex-col items-center justify-center h-48">
                    <div className="h-6 w-6 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mb-2" />
                    <span className="text-xs text-gray-400">Fetching logs...</span>
                  </div>
                ) : logs.length === 0 ? (
                  <div className="text-center py-12 text-gray-400 space-y-2">
                    <Mail size={32} className="mx-auto mb-2 text-gray-500" />
                    <h4 className="font-semibold text-xs text-gray-700 dark:text-gray-300">No mock emails sent</h4>
                    <p className="text-[11px] text-gray-500 max-w-xs mx-auto">
                      Change order statuses (e.g. dispatch as Agent or book as Customer) to trigger transactional email alerts.
                    </p>
                  </div>
                ) : (
                  logs.map((log) => (
                    <div
                      key={log._id}
                      className="p-4 rounded-lg border dark:border-gray-800 border-gray-200 bg-gray-50/50 dark:bg-gray-900/40 space-y-2.5 text-xs text-gray-600 dark:text-gray-300"
                    >
                      <div className="flex justify-between items-baseline gap-2">
                        <span className="truncate">To: <strong className="text-gray-900 dark:text-white">{log.to}</strong></span>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <div className="font-bold text-gray-900 dark:text-white">{log.subject}</div>
                      
                      {/* Embed content rendering */}
                      <div
                        className="p-3 border dark:border-gray-800 border-gray-200 rounded-md bg-white dark:bg-gray-950 max-h-48 overflow-y-auto"
                        dangerouslySetInnerHTML={{ __html: log.body }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Footer controllers */}
              {logs.length > 0 && (
                <div className="p-4 border-t dark:border-gray-800 border-gray-100 bg-gray-50/50 dark:bg-gray-900/40 flex justify-end">
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-500/20 text-red-500 hover:bg-red-500/10 text-xs font-bold transition"
                  >
                    <Trash2 size={12} />
                    Clear Logs
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
