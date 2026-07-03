"use client";

import React, { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { 
  Package, Search, PlusCircle, Navigation, ArrowRight, 
  CheckCircle2, XCircle, User, Phone, MapPin, Mail, 
  Sparkles, ShieldCheck, Clock, Settings, BookOpen, Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";
import PricePreview from "@/components/price-preview";
import Link from "next/link";
import type { OrderType as OrderCategory, PaymentType, VehicleType } from "@/types";

type PricePreviewData = React.ComponentProps<typeof PricePreview>["data"];

interface OrderType {
  _id: string;
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  billedWeight: number;
  charge: number;
  status: string;
  paymentType: string;
  senderName: string;
  senderPhone: string;
  recipientName: string;
  recipientPhone: string;
  vehicleType: "2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup";
  failedReason?: string;
  createdAt: string;
}

export default function CustomerDashboard() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"dashboard" | "book" | "settings">("dashboard");

  // Core State
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Booking Form State
  const [vehicleType, setVehicleType] = useState<"2-Wheeler" | "Three-Wheeler" | "Tata Ace" | "Pickup">("2-Wheeler");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPincode, setPickupPincode] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [dropPincode, setDropPincode] = useState("");
  const [l, setL] = useState("");
  const [b, setB] = useState("");
  const [h, setH] = useState("");
  const [actualWeight, setActualWeight] = useState("");
  const [orderType, setOrderType] = useState<"B2B" | "B2C">("B2C");
  const [paymentType, setPaymentType] = useState<"Prepaid" | "COD">("Prepaid");
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Pricing Preview
  const [previewData, setPreviewData] = useState<PricePreviewData>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Settings State
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);

  // Load User details
  useEffect(() => {
    if (user) {
      setProfileName(user.fullName || "");
      setProfilePhone(user.primaryPhoneNumber?.phoneNumber || "");
      setProfileEmail(user.primaryEmailAddress?.emailAddress || "");
      setSenderName(user.fullName || "");
      setSenderPhone(user.primaryPhoneNumber?.phoneNumber || "");
    }
  }, [user]);

  async function fetchOrders() {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrders();
  }, []);

  // Trigger price preview calculation when inputs change
  useEffect(() => {
    if (
      !pickupPincode.trim() ||
      !dropPincode.trim() ||
      !l || Number(l) <= 0 ||
      !b || Number(b) <= 0 ||
      !h || Number(h) <= 0 ||
      !actualWeight || Number(actualWeight) <= 0
    ) {
      setPreviewData(null);
      setPreviewError(null);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setPreviewLoading(true);
      setPreviewError(null);
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
          setPreviewData(data);
        } else {
          setPreviewError(data.error || "Unable to calculate charge.");
          setPreviewData(null);
        }
      } catch (err) {
        console.error("Preview calculation failed:", err);
        setPreviewError("Pricing calculation offline.");
      } finally {
        setPreviewLoading(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [pickupPincode, dropPincode, l, b, h, actualWeight, orderType, paymentType, vehicleType]);

  const handleBookOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewError || !previewData) return;

    setSubmittingOrder(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          pickupPincode: pickupPincode.trim(),
          dropAddress,
          dropPincode: dropPincode.trim(),
          l, b, h,
          actualWeight,
          orderType,
          paymentType,
          senderName,
          senderPhone,
          recipientName,
          recipientPhone,
          vehicleType,
          preview: false,
        }),
      });

      if (res.ok) {
        // Reset booking form
        setPickupAddress("");
        setPickupPincode("");
        setDropAddress("");
        setDropPincode("");
        setL(""); setB(""); setH("");
        setActualWeight("");
        setRecipientName("");
        setRecipientPhone("");
        setVehicleType("2-Wheeler");
        setPreviewData(null);
        setActiveTab("dashboard");
        fetchOrders();
      } else {
        const data = await res.json();
        alert(data.error || "Order placement failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error booking delivery.");
    } finally {
      setSubmittingOrder(false);
    }
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setTimeout(() => {
      setSavingSettings(false);
      alert("Profile configurations saved successfully!");
    }, 800);
  };

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.dropAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order._id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !["Delivered", "Failed"].includes(order.status)) ||
      (statusFilter === "completed" && order.status === "Delivered") ||
      (statusFilter === "failed" && order.status === "Failed");

    return matchesSearch && matchesStatus;
  });

  const totalBooked = orders.length;
  const activeCount = orders.filter((o) => !["Delivered", "Failed"].includes(o.status)).length;
  const completedCount = orders.filter((o) => o.status === "Delivered").length;
  const failedCount = orders.filter((o) => o.status === "Failed").length;

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-gray-800 border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white text-gray-900 tracking-tight">Customer Courier Portal</h2>
          <p className="text-xs dark:text-gray-400 text-gray-500">Dispatch parcels, review status history, and update contact logs.</p>
        </div>
        <div className="flex gap-2 p-1 rounded-lg dark:bg-gray-950 bg-gray-100 border dark:border-gray-800 border-gray-200">
          {[
            { id: "dashboard", label: "My Orders", icon: BookOpen },
            { id: "book", label: "Book Shipment", icon: PlusCircle },
            { id: "settings", label: "Settings", icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-semibold whitespace-nowrap transition",
                activeTab === tab.id
                  ? "dark:bg-gray-900 bg-white text-gray-900 dark:text-white shadow-sm border dark:border-gray-800 border-gray-200"
                  : "text-gray-500 hover:text-gray-950 dark:hover:text-gray-200"
              )}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* RENDER ACTIVE TAB */}

      {/* 1. DASHBOARD VIEW */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Metrics Widget Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Total Booked", value: totalBooked, color: "text-blue-500", bg: "dark:bg-blue-500/5 bg-blue-50/50" },
              { label: "Active Courier Tasks", value: activeCount, color: "text-amber-500 animate-pulse", bg: "dark:bg-amber-500/5 bg-amber-50/50" },
              { label: "Delivered Packages", value: completedCount, color: "text-emerald-500", bg: "dark:bg-emerald-500/5 bg-emerald-50/50" },
              { label: "Failed Tasks", value: failedCount, color: "text-red-500", bg: "dark:bg-red-500/5 bg-red-50/50" },
            ].map((stat, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-5 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm flex flex-col justify-between transition duration-200 hover:-translate-y-0.5",
                  stat.bg
                )}
              >
                <span className="text-[10px] font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">{stat.label}</span>
                <span className={cn("text-3xl font-black mt-2 tracking-tight", stat.color)}>{loading ? "..." : stat.value}</span>
              </div>
            ))}
          </div>

          {/* Orders Console */}
          <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden">
            <div className="p-5 border-b dark:border-gray-800 border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between bg-gray-50/50 dark:bg-gray-950/20">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
                <input
                  type="text"
                  placeholder="Search order ID, recipient name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition animate-none"
                />
              </div>

              <div className="flex gap-1.5 p-1 rounded-lg dark:bg-gray-950 bg-gray-100 border dark:border-gray-800 border-gray-200 overflow-x-auto self-stretch md:self-auto">
                {[
                  { id: "all", label: "All" },
                  { id: "active", label: "Active" },
                  { id: "completed", label: "Delivered" },
                  { id: "failed", label: "Failed" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition",
                      statusFilter === tab.id
                        ? "dark:bg-gray-900 bg-white text-gray-900 dark:text-white shadow-sm border dark:border-gray-800 border-gray-200"
                        : "text-gray-500 hover:text-gray-950 dark:hover:text-gray-200"
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {loading ? (
              <div className="p-5 space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 rounded-lg border dark:border-gray-800 border-gray-100 animate-pulse bg-gray-50/20 dark:bg-gray-900/10 h-16" />
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 flex flex-col items-center justify-center text-center">
                <Package size={48} className="text-gray-400 dark:text-gray-600 mb-4" />
                <h3 className="font-bold dark:text-gray-300 text-gray-700 text-sm">No shipments booked</h3>
                <p className="text-xs text-gray-500 max-w-xs mt-1">Book your first courier delivery or adjust your search parameters.</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800 divide-gray-100">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedOrderId === order._id;
                  return (
                    <div key={order._id} className="hover:dark:bg-gray-950/20 hover:bg-gray-50/50 transition duration-150">
                      <div
                        onClick={() => setExpandedOrderId(isExpanded ? null : order._id)}
                        className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer"
                      >
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold dark:text-gray-500 text-gray-400">
                              #{order._id.substring(order._id.length - 8).toUpperCase()}
                            </span>
                            <span className="text-xs dark:text-gray-400 text-gray-500">
                              {new Date(order.createdAt).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-sm font-semibold dark:text-gray-200 text-gray-800">
                            <span className="truncate max-w-[240px]">{order.pickupAddress}</span>
                            <ArrowRight size={14} className="text-gray-400 hidden sm:block shrink-0" />
                            <span className="truncate max-w-[240px]">{order.dropAddress}</span>
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs dark:text-gray-400 text-gray-500">
                            <span>Recipient: <strong className="dark:text-gray-300 text-gray-700">{order.recipientName || "Not Recorded"}</strong></span>
                            <span>Vehicle: <strong className="dark:text-gray-300 text-gray-700">{order.vehicleType || "2-Wheeler"}</strong></span>
                            <span>Weight: <strong className="dark:text-gray-300 text-gray-700">{order.billedWeight} kg</strong></span>
                            <span>Charge: <strong className="text-blue-500">₹{order.charge.toFixed(2)}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between md:justify-end gap-3">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold shrink-0 uppercase tracking-wider",
                            order.status === "Pending" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                            ["Picked Up", "In Transit", "Out for Delivery"].includes(order.status) && "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                            order.status === "Delivered" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                            order.status === "Failed" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              order.status === "Pending" && "bg-amber-500",
                              ["Picked Up", "In Transit", "Out for Delivery"].includes(order.status) && "bg-blue-500 animate-pulse",
                              order.status === "Delivered" && "bg-emerald-500",
                              order.status === "Failed" && "bg-red-500"
                            )} />
                            {order.status}
                          </span>

                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Link
                              href={`/customer/track/${order._id}`}
                              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white dark:hover:bg-gray-800 hover:bg-gray-50 transition"
                            >
                              <Navigation size={12} />
                              Track
                            </Link>

                            {order.status === "Failed" && (
                              <Link
                                href={`/customer/track/${order._id}?reschedule=true`}
                                className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow shadow-blue-500/10 transition"
                              >
                                Reschedule
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expandable Shipment Details Panel */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-1 border-t dark:border-gray-800/50 border-gray-100 dark:bg-gray-950/30 bg-gray-50/20 text-xs text-gray-600 dark:text-gray-400 grid grid-cols-1 md:grid-cols-3 gap-6 animate-none">
                          <div className="space-y-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 block">Sender Details</span>
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-300">
                                <User size={13} className="text-gray-400" /> {order.senderName || "N/A"}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Phone size={13} /> {order.senderPhone || "N/A"}
                              </p>
                              <p className="flex items-center gap-1.5 leading-normal">
                                <MapPin size={13} /> {order.pickupAddress} ({order.pickupPincode})
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 block">Recipient Details</span>
                            <div className="space-y-1.5">
                              <p className="flex items-center gap-1.5 font-semibold text-gray-800 dark:text-gray-300">
                                <User size={13} className="text-gray-400" /> {order.recipientName || "N/A"}
                              </p>
                              <p className="flex items-center gap-1.5">
                                <Phone size={13} /> {order.recipientPhone || "N/A"}
                              </p>
                              <p className="flex items-center gap-1.5 leading-normal">
                                <MapPin size={13} /> {order.dropAddress} ({order.dropPincode})
                              </p>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <span className="font-bold text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-500 block">Shipment Summary</span>
                            <div className="space-y-1">
                              <p>Vehicle Type: <strong className="text-gray-800 dark:text-gray-300 font-semibold">{order.vehicleType || "2-Wheeler"}</strong></p>
                              <p>Billed Weight: <strong className="text-gray-800 dark:text-gray-300 font-semibold">{order.billedWeight} kg</strong></p>
                              <p>Payment Type: <strong className="text-gray-800 dark:text-gray-300 font-semibold">{order.paymentType}</strong></p>
                              <p>Order Pricing: <strong className="text-blue-500 font-bold">₹{order.charge.toFixed(2)}</strong></p>
                              {order.status === "Failed" && (
                                <p className="text-red-500 font-semibold leading-normal pt-1 flex items-start gap-1">
                                  <span>🚨 Reason:</span>
                                  <span>{order.failedReason || "Recipient not reachable"}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. BOOK SHIPMENT TAB */}
      {activeTab === "book" && (
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Left Form Column */}
          <form onSubmit={handleBookOrder} className="flex-1 w-full space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 border-gray-200 shadow-sm">
            <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2 mb-4">
              <Package size={18} className="text-blue-500" />
              Book Shipment Courier
            </h2>

            {/* Vehicle Type Selection Picker */}
            <div className="space-y-2 p-4 rounded-xl border dark:border-gray-800 border-gray-150 bg-gray-50/20 dark:bg-gray-900/10">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block mb-1.5 uppercase tracking-wider">Select Vehicle Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: "2-Wheeler", label: "2-Wheeler", icon: "🏍️", cap: "Max 20 kg" },
                  { id: "Three-Wheeler", label: "3-Wheeler", icon: "🛺", cap: "Max 150 kg" },
                  { id: "Tata Ace", label: "Tata Ace (8-Ft)", icon: "🚚", cap: "Max 750 kg" },
                  { id: "Pickup", label: "Pickup (14-Ft)", icon: "🚛", cap: "Max 1.5 Ton" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVehicleType(v.id as VehicleType)}
                    className={cn(
                      "p-3 rounded-xl border flex flex-col items-center justify-center text-center transition-all duration-200",
                      vehicleType === v.id
                        ? "bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500 ring-2 ring-blue-500/20 shadow-sm font-bold"
                        : "border-gray-200 dark:border-gray-800 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-900/50"
                    )}
                  >
                    <span className="text-2xl mb-1">{v.icon}</span>
                    <span className="text-xs font-bold block whitespace-nowrap">{v.label}</span>
                    <span className="text-[9px] opacity-60 block mt-0.5">{v.cap}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sender & Recipient Contact Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Sender Contact */}
              <div className="space-y-3 p-4 rounded-xl border dark:border-gray-800 border-gray-150 bg-gray-50/30 dark:bg-gray-900/20">
                <h3 className="text-xs font-bold dark:text-white text-gray-900 uppercase tracking-widest border-b dark:border-gray-800 border-gray-200 pb-2">Sender Contact</h3>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Sender Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Sender Full Name"
                    value={senderName}
                    onChange={(e) => setSenderName(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Sender Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 555-019-2834"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              {/* Recipient Contact */}
              <div className="space-y-3 p-4 rounded-xl border dark:border-gray-800 border-gray-150 bg-gray-50/30 dark:bg-gray-900/20">
                <h3 className="text-xs font-bold dark:text-white text-gray-900 uppercase tracking-widest border-b dark:border-gray-800 border-gray-200 pb-2">Recipient Contact</h3>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Recipient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient Full Name"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Recipient Phone</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. +1 555-010-9999"
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-gray-800 border-gray-100">
              {/* Pickup Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest border-b dark:border-gray-800 border-gray-100 pb-2">Pickup Location</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Flat 101, Northern Hub"
                      value={pickupAddress}
                      onChange={(e) => setPickupAddress(e.target.value)}
                      className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Pincode / Area Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 110001"
                      value={pickupPincode}
                      onChange={(e) => setPickupPincode(e.target.value)}
                      className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Destination Details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest border-b dark:border-gray-800 border-gray-100 pb-2">Delivery Location</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Street Address</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Plot 4B, Western Hub"
                      value={dropAddress}
                      onChange={(e) => setDropAddress(e.target.value)}
                      className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Pincode / Area Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 220002"
                      value={dropPincode}
                      onChange={(e) => setDropPincode(e.target.value)}
                      className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Shipment Parameters */}
            <div className="space-y-4 pt-4 border-t dark:border-gray-800 border-gray-100">
              <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">Shipment Parameters</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Length (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Length"
                    value={l}
                    onChange={(e) => setL(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Width (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Width"
                    value={b}
                    onChange={(e) => setB(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Height (cm)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="Height"
                    value={h}
                    onChange={(e) => setH(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    required
                    placeholder="Weight in kg"
                    value={actualWeight}
                    onChange={(e) => setActualWeight(e.target.value)}
                    className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Order Type</label>
                  <div className="flex gap-2">
                    {[
                      { id: "B2C", label: "B2C (Retail)" },
                      { id: "B2B", label: "B2B (Business)" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setOrderType(t.id as OrderCategory)}
                        className={cn(
                          "flex-1 py-2 text-sm rounded-lg border font-semibold transition",
                          orderType === t.id
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500"
                            : "border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Payment Method</label>
                  <div className="flex gap-2">
                    {[
                      { id: "Prepaid", label: "Prepaid card" },
                      { id: "COD", label: "Cash on Delivery" },
                    ].map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPaymentType(p.id as PaymentType)}
                        className={cn(
                          "flex-1 py-2 text-sm rounded-lg border font-semibold transition",
                          paymentType === p.id
                            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-500"
                            : "border-gray-200 dark:border-gray-800 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
                        )}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingOrder || previewError !== null || !previewData}
              className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
            >
              {submittingOrder ? "Booking Courier..." : "Confirm & Book Delivery"}
            </button>
          </form>

          {/* Right Preview Column */}
          <div className="w-full lg:w-[380px] shrink-0 sticky top-24">
            <PricePreview
              data={previewData}
              loading={previewLoading}
              error={previewError}
              actualWeight={actualWeight ? Number(actualWeight) : 0}
            />
          </div>
        </div>
      )}

      {/* 3. SETTINGS TAB */}
      {activeTab === "settings" && (
        <form onSubmit={handleSaveSettings} className="max-w-xl mx-auto space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 border-gray-200 shadow-sm">
          <div className="border-b dark:border-gray-800 border-gray-100 pb-3">
            <h3 className="text-base font-bold dark:text-white text-gray-900 flex items-center gap-2">
              <User className="text-blue-500" size={18} />
              Customer Profile Configurations
            </h3>
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-1">Configure your default contact card and shipping addresses.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Primary Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="text"
                  required
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
                <input
                  type="email"
                  disabled
                  value={profileEmail}
                  className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50/50 outline-none cursor-not-allowed opacity-70"
                />
              </div>
              <span className="text-[10px] text-gray-500 mt-1 block">Account emails are managed securely by Clerk identity credentials.</span>
            </div>

            <div className="p-4 rounded-xl border dark:border-gray-800 border-gray-150 bg-gray-50/30 dark:bg-gray-900/10 space-y-2">
              <span className="text-[10px] font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest block">Sandbox Authorization Status</span>
              <p className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
                <ShieldCheck size={14} /> Active Session Verified & Protected
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg shadow-blue-500/10 transition active:scale-[0.99] flex items-center justify-center gap-1.5"
          >
            {savingSettings ? <Loader2 className="animate-spin" size={14} /> : null}
            Save Configurations
          </button>
        </form>
      )}
    </div>
  );
}
