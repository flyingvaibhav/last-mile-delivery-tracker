"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Package, User, Phone, Calendar, AlertTriangle, CheckCircle } from "lucide-react";
import Timeline from "@/components/timeline";
import MapPreview from "@/components/map-preview";
import { cn } from "@/lib/utils";
import { getRoleFromMetadata, getErrorMessage } from "@/types";

interface OrderDetail {
  _id: string;
  pickupAddress: string;
  pickupPincode: string;
  dropAddress: string;
  dropPincode: string;
  dimensions: { l: number; b: number; h: number };
  actualWeight: number;
  volumetricWeight: number;
  billedWeight: number;
  orderType: string;
  paymentType: string;
  charge: number;
  status: string;
  failedReason?: string;
  rescheduledDate?: string;
  agentId?: string;
  createdAt: string;
}

interface StatusHistoryEntry {
  status: string;
  changedByName: string;
  timestamp: string;
}

interface ApiUser {
  clerkId: string;
  name: string;
  phone?: string;
}

interface AgentDetails {
  name: string;
  phone?: string;
}

export default function TrackOrder(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);
  const { user } = useUser();
  const role = getRoleFromMetadata(user?.publicMetadata);
  const orderId = params.id;

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
  const [agent, setAgent] = useState<AgentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Rescheduling states
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduling, setRescheduling] = useState(false);
  const [rescheduleSuccess, setRescheduleSuccess] = useState(false);

  async function loadOrderDetails() {
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to load order tracking details.");
      }
      const data = await res.json();
      setOrder(data.order);
      setHistory(data.history);

      // If an agent is assigned, fetch their name
      if (data.order.agentId) {
        const usersRes = await fetch("/api/users");
        if (usersRes.ok) {
          const users = await usersRes.json();
          const assignedAgent = users.find((u: ApiUser) => u.clerkId === data.order.agentId);
          if (assignedAgent) {
            setAgent({
              name: assignedAgent.name,
              phone: assignedAgent.phone,
            });
          }
        }
      } else {
        setAgent(null);
      }
    } catch (err: unknown) {
      console.error(err);
      setError(getErrorMessage(err, "Something went wrong."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOrderDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleDate) return;

    setRescheduling(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rescheduledDate: rescheduleDate,
        }),
      });

      if (res.ok) {
        setRescheduleSuccess(true);
        setTimeout(() => {
          setRescheduleSuccess(false);
          setRescheduleDate("");
          loadOrderDetails(); // Reload fresh data
        }, 1500);
      } else {
        const data = await res.json();
        alert(data.error || "Rescheduling failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error submitting rescheduled request.");
    } finally {
      setRescheduling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm dark:text-gray-400 text-gray-500">Loading delivery tracking details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="rounded-xl border dark:border-red-900/30 border-red-200 p-8 text-center max-w-md mx-auto mt-12 bg-white dark:bg-gray-900">
        <AlertTriangle className="text-red-500 mx-auto mb-4" size={36} />
        <h3 className="text-lg font-bold dark:text-red-400 text-red-700">Tracking Failed</h3>
        <p className="text-xs dark:text-red-300 text-red-600 mt-2">{error || "Unable to display tracking information."}</p>
        <Link
          href={role === "admin" ? "/admin/orders" : role === "agent" ? "/agent" : "/customer"}
          className="mt-5 inline-block text-xs font-semibold px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-lg transition"
        >
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back navigation */}
      <div>
        <Link
          href={role === "admin" ? "/admin/orders" : role === "agent" ? "/agent" : "/customer"}
          className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:hover:text-gray-200 transition"
        >
          <ArrowLeft size={14} />
          Back to Dashboard
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Shipment Details & Reschedule */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status summary Card */}
          <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider dark:text-gray-500 text-gray-400">Order Reference</span>
              <h2 className="text-lg font-mono font-extrabold dark:text-white text-gray-900 mt-0.5 uppercase">
                #{order._id.substring(order._id.length - 12).toUpperCase()}
              </h2>
            </div>

            <div className="border-t dark:border-gray-800 border-gray-100 pt-3 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">Service Category</span>
                <span className="font-semibold dark:text-white text-gray-900">{order.orderType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Billing Charge</span>
                <span className="font-semibold text-blue-500 font-mono">${order.charge.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Billed Weight</span>
                <span className="font-semibold dark:text-white text-gray-900">{order.billedWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Package Size</span>
                <span className="font-semibold dark:text-white text-gray-900">
                  {order.dimensions.l} &times; {order.dimensions.b} &times; {order.dimensions.h} cm
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Payment type</span>
                <span className="font-semibold dark:text-white text-gray-900">{order.paymentType}</span>
              </div>
              {order.rescheduledDate && (
                <div className="flex justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Rescheduled Target:</span>
                  <span>{new Date(order.rescheduledDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Assigned Agent Details */}
          <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">Assigned Delivery Courier</h3>
            {agent ? (
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full dark:bg-gray-800 bg-gray-100 flex items-center justify-center text-blue-500">
                  <User size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold dark:text-white text-gray-900">{agent.name}</h4>
                  <p className="text-xs dark:text-gray-400 text-gray-500 flex items-center gap-1 mt-0.5">
                    <Phone size={10} />
                    {agent.phone || "No contact info"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-xs dark:text-gray-400 text-gray-500 italic p-3 rounded-lg dark:bg-gray-950 bg-gray-50 border dark:border-gray-800 border-gray-100">
                Pending assignment by logistics coordinator.
              </div>
            )}
          </div>

          {/* CUSTOMER FLOW: Reschedule delivery if status === Failed */}
          {order.status === "Failed" && (
            <div className="p-6 rounded-xl border border-red-500/20 bg-red-500/5 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={18} />
                Delivery Rescheduling
              </h3>
              <p className="text-xs dark:text-gray-300 text-gray-600 leading-normal">
                This shipment&apos;s latest delivery attempt was unsuccessful. Reason:{" "}
                <strong className="text-red-700 dark:text-red-300">&quot;{order.failedReason || "Not specified"}&quot;</strong>.
                {role === "customer" 
                  ? " Please select a new date below to reschedule this delivery. The package will be placed back into the assignment queue."
                  : " Wait for the customer to reschedule this delivery attempt."}
              </p>

              {role === "customer" && (
                <>
                  {rescheduleSuccess ? (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2 justify-center">
                      <CheckCircle size={14} />
                      Rescheduled Successfully!
                    </div>
                  ) : (
                    <form onSubmit={handleReschedule} className="space-y-3">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select New Delivery Date</label>
                        <input
                          type="date"
                          required
                          min={new Date().toISOString().split("T")[0]}
                          value={rescheduleDate}
                          onChange={(e) => setRescheduleDate(e.target.value)}
                          className="w-full text-sm rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={rescheduling || !rescheduleDate}
                        className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition active:scale-[0.99] disabled:opacity-50"
                      >
                        {rescheduling ? "Updating schedule..." : "Reschedule Delivery"}
                      </button>
                    </form>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Right Columns: Map Preview & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live map route rendering */}
          <MapPreview
            pickupPincode={order.pickupPincode}
            dropPincode={order.dropPincode}
            pickupAddress={order.pickupAddress}
            dropAddress={order.dropAddress}
            status={order.status}
            agentName={agent?.name}
          />

          {/* Timeline stepper */}
          <Timeline currentStatus={order.status} history={history} />
        </div>
      </div>
    </div>
  );
}
