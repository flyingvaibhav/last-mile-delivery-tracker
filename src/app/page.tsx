"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { 
  Sparkles, Package, Compass, ShieldAlert, ArrowRight, 
  Calculator, Loader2, XCircle
} from "lucide-react";
import { cn } from "@/lib/utils";
import PricePreview from "@/components/price-preview";
import { getRoleFromMetadata, type OrderType, type PaymentType, type VehicleType } from "@/types";

type PricePreviewData = React.ComponentProps<typeof PricePreview>["data"];

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Pricing Calculator Widget State
  const [vehicleType, setVehicleType] = useState<"2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup">("2-Wheeler");
  const [pickupPincode, setPickupPincode] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [l, setL] = useState("15");
  const [b, setB] = useState("15");
  const [h, setH] = useState("15");
  const [actualWeight, setActualWeight] = useState("1.5");
  const [orderType, setOrderType] = useState<"B2B" | "B2C">("B2C");
  const [paymentType, setPaymentType] = useState<"Prepaid" | "COD">("Prepaid");

  // Calculator API response state
  const [calcData, setCalcData] = useState<PricePreviewData>(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);

  // Role Modal state for Sandbox Entry
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [loadingRole, setLoadingRole] = useState<string | null>(null);

  // Redirect if logged in
  useEffect(() => {
    if (!isLoaded) return;

    // 1. Check for active demo cookie first
    const match = document.cookie.match(new RegExp('(^| )demo_session=([^;]+)'));
    if (match) {
      try {
        const session = JSON.parse(decodeURIComponent(match[2]));
        if (session.role === "admin") router.push("/admin");
        else if (session.role === "agent") router.push("/agent");
        else router.push("/customer");
        return;
      } catch {
        // Invalid demo cookie — fall through to Clerk auth
      }
    }

    // 2. Clerk Auth redirect
    if (user) {
      const role = getRoleFromMetadata(user.publicMetadata);
      if (role === "admin") router.push("/admin");
      else if (role === "agent") router.push("/agent");
      else router.push("/customer");
    } else {
      setCheckingAuth(false);
    }
  }, [user, isLoaded, router]);

  // Run dynamic calculation on input change
  useEffect(() => {
    if (checkingAuth) return;
    if (
      !pickupPincode.trim() ||
      !dropPincode.trim() ||
      !l || Number(l) <= 0 ||
      !b || Number(b) <= 0 ||
      !h || Number(h) <= 0 ||
      !actualWeight || Number(actualWeight) <= 0
    ) {
      setCalcData(null);
      setCalcError(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setCalcLoading(true);
      setCalcError(null);
      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            pickupAddress: "Estimate",
            pickupPincode: pickupPincode.trim(),
            dropAddress: "Estimate",
            dropPincode: dropPincode.trim(),
            l, b, h,
            actualWeight,
            orderType,
            paymentType,
            vehicleType,
            preview: true,
          }),
        });

        const data = await res.json();
        if (res.ok) {
          setCalcData(data);
        } else {
          setCalcError(data.error || "Pincodes not serviced.");
          setCalcData(null);
        }
      } catch {
        setCalcError("Pricing calculator offline.");
      } finally {
        setCalcLoading(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [pickupPincode, dropPincode, l, b, h, actualWeight, orderType, paymentType, vehicleType, checkingAuth]);

  // Demo Sandbox Seeding Request
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
        router.replace(data.redirectUrl);
      } else {
        alert("Unable to provision sandbox environment.");
        setLoadingRole(null);
      }
    } catch (err) {
      console.error(err);
      alert("Network error starting demo sandbox.");
      setLoadingRole(null);
    }
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen w-full flex flex-col items-center justify-center dark:bg-[#070b13] bg-[#f8fafc]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="text-xs font-semibold text-gray-500">Checking active sessions...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full dark:bg-[#070b13] bg-[#f8fafc] overflow-x-hidden relative animate-none">
      {/* Visual background gradients */}
      <div className="absolute top-[-10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-blue-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute top-[30%] right-[-5%] h-[600px] w-[600px] rounded-full bg-emerald-500/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(148,163,184,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(148,163,184,0.02)_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,rgba(59,130,246,0.01)_1px,transparent_1px),linear-gradient(to_bottom,rgba(59,130,246,0.01)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between z-20 relative">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/25">
            SF
          </div>
          <span className="text-lg font-black dark:text-white text-gray-900 tracking-tight uppercase">SwiftFleet</span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition"
          >
            Sign In
          </Link>
          <button
            onClick={() => setShowRoleModal(true)}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/10 transition active:scale-95"
          >
            Explore Sandbox
          </button>
        </div>
      </header>

      {/* Main Section */}
      <section className="max-w-7xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10 relative">
        
        {/* Left Column: Hero Taglines */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold dark:bg-amber-500/10 bg-amber-50 border border-amber-500/20 text-amber-600 dark:text-amber-400 uppercase tracking-widest">
            <Sparkles size={11} className="animate-pulse" />
            Intelligent Logistics Sandbox
          </div>

          <h1 className="text-4xl sm:text-5xl font-black tracking-tight leading-tight text-gray-900 dark:text-white">
            Smart Last-Mile <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-emerald-500">
              Delivery Dispatching
            </span>
          </h1>

          <p className="text-sm dark:text-gray-400 text-gray-600 leading-relaxed max-w-xl">
            SwiftFleet is an enterprise last-mile delivery tracking platform modeled on industry standards like Porter. Includes dynamic zone mappings, volumetric weight tariff cards, smart availability dispatcher auto-assignments, and a failed-delivery self-healing loop.
          </p>

          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={() => setShowRoleModal(true)}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold text-sm shadow-xl shadow-blue-500/10 transition active:scale-[0.98] flex items-center gap-2"
            >
              Try Live Demo Sandbox
              <ArrowRight size={16} />
            </button>
            <Link
              href="/sign-in"
              className="px-6 py-3 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900/50 bg-white hover:bg-gray-50 dark:hover:bg-gray-900 transition font-bold text-sm text-gray-700 dark:text-gray-200 flex items-center justify-center"
            >
              Sign Up Production Account
            </Link>
          </div>

          {/* SaaS Core Specs tags */}
          <div className="grid grid-cols-3 gap-4 pt-6 max-w-md border-t dark:border-gray-900 border-gray-150">
            <div>
              <h5 className="text-xl font-extrabold text-blue-500">₹0</h5>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Verification Cost</p>
            </div>
            <div>
              <h5 className="text-xl font-extrabold text-emerald-500">1 Click</h5>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Sandbox Seeding</p>
            </div>
            <div>
              <h5 className="text-xl font-extrabold text-purple-500">100%</h5>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">Data Isolated</p>
            </div>
          </div>
        </div>

        {/* Right Column: Pricing Estimator Widget */}
        <div className="lg:col-span-5 w-full space-y-6">
          <div className="p-5 rounded-2xl border dark:border-gray-800 border-gray-200 dark:bg-gray-950/80 bg-white shadow-2xl space-y-4">
            <h3 className="text-xs font-bold dark:text-white text-gray-900 uppercase tracking-widest flex items-center gap-1.5 pb-2 border-b dark:border-gray-900 border-gray-100">
              <Calculator className="text-blue-500" size={15} />
              Dynamic Cost Calculator
            </h3>

            <div className="space-y-4">
              {/* Vehicle Type Picker */}
              <div>
                <label className="text-[9px] font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">Select Vehicle Type</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "2-Wheeler", label: "2-Wheeler", icon: "🏍️", cap: "20 kg" },
                    { id: "Three-Wheeler", label: "3-Wheeler", icon: "🛺", cap: "150 kg" },
                    { id: "Tata Ace", label: "Tata Ace", icon: "🚚", cap: "750 kg" },
                    { id: "Pickup", label: "Pickup", icon: "🚛", cap: "1.5 Ton" },
                  ].map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVehicleType(v.id as VehicleType)}
                      className={cn(
                        "p-2 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200",
                        vehicleType === v.id
                          ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500 ring-2 ring-blue-500/20 shadow-sm font-bold"
                          : "border-gray-200 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                      )}
                    >
                      <span className="text-xl mb-1">{v.icon}</span>
                      <span className="text-[9px] font-bold block whitespace-nowrap">{v.label}</span>
                      <span className="text-[8px] opacity-60 block mt-0.5">{v.cap}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Pickup Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 110001"
                    value={pickupPincode}
                    onChange={(e) => setPickupPincode(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1">Drop Pincode</label>
                  <input
                    type="text"
                    placeholder="e.g. 220002"
                    value={dropPincode}
                    onChange={(e) => setDropPincode(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">L (cm)</label>
                  <input
                    type="number"
                    value={l}
                    onChange={(e) => setL(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">B (cm)</label>
                  <input
                    type="number"
                    value={b}
                    onChange={(e) => setB(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">H (cm)</label>
                  <input
                    type="number"
                    value={h}
                    onChange={(e) => setH(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Wt (kg)</label>
                  <input
                    type="number"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Order Type</label>
                  <select
                    value={orderType}
                    onChange={(e) => setOrderType(e.target.value as OrderType)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none"
                  >
                    <option value="B2C">B2C (Retail)</option>
                    <option value="B2B">B2B (Corporate)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[9px] font-bold text-gray-500 block mb-0.5">Payment</label>
                  <select
                    value={paymentType}
                    onChange={(e) => setPaymentType(e.target.value as PaymentType)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2 outline-none"
                  >
                    <option value="Prepaid">Prepaid</option>
                    <option value="COD">COD</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Price Preview results */}
            <div className="pt-2">
              <PricePreview
                data={calcData}
                loading={calcLoading}
                error={calcError}
                actualWeight={actualWeight ? Number(actualWeight) : 0}
              />
            </div>

            {!calcData && !calcLoading && !calcError && (
              <span className="text-[9px] text-gray-400 block text-center italic">
                *Input pickup (110001) & drop (220002) pincodes to view rates matrix.
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Role Picker Selection Overlay Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-950 border dark:border-gray-800 border-gray-200 rounded-xl p-6 shadow-2xl space-y-5 relative">
            
            <button
              onClick={() => {
                if (!loadingRole) setShowRoleModal(false);
              }}
              disabled={!!loadingRole}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition disabled:opacity-50"
            >
              <XCircle size={18} />
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

                    {isSelected && (
                      <div className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-amber-500 animate-spin mr-2" />
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">Provisioning Sandbox...</span>
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
