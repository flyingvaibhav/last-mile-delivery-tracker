"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Package, ArrowLeft, CheckCircle } from "lucide-react";
import PricePreview from "@/components/price-preview";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getRoleFromMetadata, type OrderType, type PaymentType } from "@/types";

type PricePreviewData = React.ComponentProps<typeof PricePreview>["data"];

interface UserType {
  clerkId: string;
  name: string;
  email: string;
  role: string;
}

export default function BookShipment() {
  const { user } = useUser();
  const router = useRouter();
  const role = getRoleFromMetadata(user?.publicMetadata);

  // Form Fields
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

  // Sender & Recipient Contact Details
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");

  // Admin-specific: Select customer
  const [customerId, setCustomerId] = useState("");
  const [usersList, setUsersList] = useState<UserType[]>([]);

  // Preview State
  const [previewData, setPreviewData] = useState<PricePreviewData>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Submit State
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-fill logged in user info as Sender
  useEffect(() => {
    if (user) {
      setSenderName(user.fullName || "");
      setSenderPhone(user.primaryPhoneNumber?.phoneNumber || "");
    }
  }, [user]);

  // Fetch users if Admin
  useEffect(() => {
    if (role === "admin") {
      async function fetchUsers() {
        try {
          const res = await fetch("/api/users");
          if (res.ok) {
            const data = await res.json();
            // Filter to show customers
            setUsersList(data.filter((u: UserType) => u.role === "customer"));
          }
        } catch (err) {
          console.error("Failed to load users for booking on behalf:", err);
        }
      }
      fetchUsers();
    }
  }, [role]);

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
            l,
            b,
            h,
            actualWeight,
            orderType,
            paymentType,
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
        console.error("Preview fetch fail:", err);
        setPreviewError("Network error during pricing calculation.");
      } finally {
        setPreviewLoading(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [pickupPincode, dropPincode, l, b, h, actualWeight, orderType, paymentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (previewError || !previewData) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pickupAddress,
          pickupPincode: pickupPincode.trim(),
          dropAddress,
          dropPincode: dropPincode.trim(),
          l,
          b,
          h,
          actualWeight,
          orderType,
          paymentType,
          senderName,
          senderPhone,
          recipientName,
          recipientPhone,
          preview: false,
          customerId: role === "admin" && customerId ? customerId : undefined,
        }),
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(role === "admin" ? "/admin/orders" : "/customer");
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || "Order placement failed.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during order submission.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 bg-white dark:bg-gray-900 border dark:border-gray-800 border-gray-200 rounded-xl max-w-xl mx-auto shadow-sm">
        <div className="h-16 w-16 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-full mb-4 animate-bounce">
          <CheckCircle size={32} />
        </div>
        <h3 className="text-xl font-bold dark:text-white text-gray-900">Shipment Booked!</h3>
        <p className="text-sm dark:text-gray-400 text-gray-500 mt-2 max-w-sm">
          Your courier assignment and tracking sequence has been initialized. Redirecting you to the dashboard...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back button */}
      <div>
        <Link
          href={role === "admin" ? "/admin/orders" : "/customer"}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition"
        >
          <ArrowLeft size={14} />
          Back to Shipments
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Form Column */}
        <form onSubmit={handleSubmit} className="flex-1 w-full space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 border-gray-200 shadow-sm">
          <h2 className="text-lg font-bold dark:text-white text-gray-900 flex items-center gap-2 mb-4">
            <Package size={18} className="text-blue-500" />
            Book Shipment Courier
          </h2>

          {/* Admin On-Behalf Mode */}
          {role === "admin" && (
            <div className="space-y-2 p-4 rounded-lg bg-blue-50/20 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/20">
              <label className="text-xs font-bold uppercase tracking-wider text-blue-500 block">Book on behalf of Customer</label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select Customer Account --</option>
                {usersList.map((usr) => (
                  <option key={usr.clerkId} value={usr.clerkId}>
                    {usr.name} ({usr.email})
                  </option>
                ))}
              </select>
            </div>
          )}

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
                    placeholder="e.g. 400001"
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
                      onClick={() => setOrderType(t.id as OrderType)}
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
            disabled={submitting || previewError !== null || !previewData}
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-lg shadow-blue-500/10 transition active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? "Booking Courier..." : "Confirm & Book Delivery"}
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
    </div>
  );
}
