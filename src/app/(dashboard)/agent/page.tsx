"use client";

import React, { useEffect, useState } from "react";
import { 
  Compass, CheckCircle2, ChevronRight, MapPin, 
  ShieldAlert, Box, Check, EyeOff,
  Settings, UserCheck, RefreshCw, ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";

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

interface ZoneType {
  _id: string;
  name: string;
}

export default function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<"active" | "pool" | "settings">("active");

  // Core state
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [poolOrders, setPoolOrders] = useState<OrderType[]>([]);
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [agentStatus, setAgentStatus] = useState("available");
  const [agentZone, setAgentZone] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [refreshingPool, setRefreshingPool] = useState(false);
  const [updatingAgent, setUpdatingAgent] = useState(false);

  // Hidden/Rejected Orders List
  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);

  // Failure Modal State
  const [failureOrderId, setFailureOrderId] = useState<string | null>(null);
  const [failedReason, setFailedReason] = useState("");
  const [failingOrder, setFailingOrder] = useState(false);

  // Load hidden orders from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("swiftfleet_hidden_orders");
      if (stored) {
        setHiddenOrderIds(JSON.parse(stored));
      }
    } catch (e) {}
  }, []);

  async function loadData() {
    try {
      // 1. Fetch assigned orders
      const ordersRes = await fetch("/api/orders");
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }

      // 2. Fetch available pool orders
      const poolRes = await fetch("/api/orders?pool=true");
      if (poolRes.ok) {
        const poolData = await poolRes.json();
        setPoolOrders(poolData);
      }

      // 3. Fetch zones
      const zonesRes = await fetch("/api/zones");
      if (zonesRes.ok) {
        const zonesData = await zonesRes.json();
        setZones(zonesData);
      }

      // 4. Fetch agent profile (availabilities)
      const agentsRes = await fetch("/api/agents");
      if (agentsRes.ok) {
        const agents = await agentsRes.json();
        // Look for the rider record (which corresponds to current user)
        // Since API returns list, we match or PATCH route will return current details
      }
    } catch (err) {
      console.error("Failed to load agent dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load data on mount
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAgentStatusUpdate = async (statusVal: string, zoneVal: string) => {
    setUpdatingAgent(true);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          availabilityStatus: statusVal || undefined,
          currentZoneId: zoneVal || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAgentStatus(data.availabilityStatus);
        setAgentZone(data.currentZoneId || "");
        // Reload pool if zone changes
        loadData();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingAgent(false);
    }
  };

  const handleStatusTransition = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (res.ok) {
        loadData(); // Refresh list
      } else {
        const data = await res.json();
        alert(data.error || "Status update failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClaimOrder = async (orderId: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Picked Up", // Claiming assigns and transitions to Picked Up
        }),
      });

      if (res.ok) {
        // Toggle tab and reload
        setActiveTab("active");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to claim shipment.");
      }
    } catch (err) {
      console.error("Claim order fail:", err);
    }
  };

  const handleRejectOrder = (orderId: string) => {
    const updated = [...hiddenOrderIds, orderId];
    setHiddenOrderIds(updated);
    try {
      localStorage.setItem("swiftfleet_hidden_orders", JSON.stringify(updated));
    } catch (e) {}
  };

  const handleRefreshPool = async () => {
    setRefreshingPool(true);
    try {
      const poolRes = await fetch("/api/orders?pool=true");
      if (poolRes.ok) {
        const poolData = await poolRes.json();
        setPoolOrders(poolData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setRefreshingPool(false);
    }
  };

  const handleMarkFailed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!failureOrderId || !failedReason.trim()) return;

    setFailingOrder(true);
    try {
      const res = await fetch(`/api/orders/${failureOrderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Failed",
          failedReason: failedReason.trim(),
        }),
      });

      if (res.ok) {
        setFailureOrderId(null);
        setFailedReason("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Status update failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setFailingOrder(false);
    }
  };

  // Filter orders into active and completed delivery history
  const activeOrders = orders.filter((o) => !["Delivered", "Failed"].includes(o.status));
  const completedOrders = orders.filter((o) => ["Delivered", "Failed"].includes(o.status));

  // Filter pool orders to exclude hidden/rejected items
  const visiblePoolOrders = poolOrders.filter((o) => !hiddenOrderIds.includes(o._id));

  return (
    <div className="space-y-6">
      {/* Tab Navigation header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-gray-800 border-gray-200 pb-4 gap-4">
        <div>
          <h2 className="text-xl font-bold dark:text-white text-gray-900 tracking-tight flex items-center gap-2">
            <Compass className="text-blue-500" />
            Rider Delivery Console
          </h2>
          <p className="text-xs dark:text-gray-400 text-gray-500">Pick deliveries, transition shipment statuses, and view statistics.</p>
        </div>
        <div className="flex gap-2 p-1 rounded-lg dark:bg-gray-950 bg-gray-100 border dark:border-gray-800 border-gray-200">
          {[
            { id: "active", label: `My Assignments (${activeOrders.length})`, icon: ClipboardList },
            { id: "pool", label: `Available Pool (${visiblePoolOrders.length})`, icon: Box },
            { id: "settings", label: "Rider Settings", icon: Settings },
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

      {/* RENDER CHOSEN TAB VIEW */}

      {/* A. MY ASSIGNMENTS TAB */}
      {activeTab === "active" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Active Deliveries List */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest px-1">
              Active Shipments Underway
            </h3>

            {loading ? (
              <div className="space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-32 rounded-xl border dark:border-gray-800 border-gray-100 animate-pulse bg-gray-50/20 dark:bg-gray-900/10" />
                ))}
              </div>
            ) : activeOrders.length === 0 ? (
              <div className="p-12 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white text-center">
                <CheckCircle2 size={36} className="mx-auto mb-3 text-emerald-500 animate-bounce" />
                <h4 className="font-bold dark:text-gray-300 text-gray-700 text-sm">All caught up!</h4>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-normal">
                  No active assignments currently in your dispatch. Go to the **Available Pool** tab to claim pending deliveries in your zone.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeOrders.map((order) => (
                  <div
                    key={order._id}
                    className="p-5 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm space-y-4"
                  >
                    <div className="flex items-center justify-between border-b dark:border-gray-800 border-gray-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold dark:text-gray-500 text-gray-400 uppercase">
                          #{order._id.substring(order._id.length - 8).toUpperCase()}
                        </span>
                        <span className="ml-2 text-[10px] dark:bg-blue-950/40 dark:text-blue-400 bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                          {order.status}
                        </span>
                      </div>
                      <span className="text-xs font-bold font-mono text-blue-500">₹{order.charge.toFixed(2)}</span>
                    </div>

                    {/* Sender & Recipient detailed information */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs bg-gray-50/50 dark:bg-gray-950/40 p-3 rounded-xl border dark:border-gray-800 border-gray-150">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Sender Info</span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{order.senderName || "N/A"}</p>
                        <p className="text-[11px] text-gray-500">{order.senderPhone || "N/A"}</p>
                        <p className="text-[11px] font-medium leading-relaxed mt-1 text-gray-700 dark:text-gray-300">
                          <MapPin size={11} className="inline mr-1 text-gray-400" />
                          {order.pickupAddress} ({order.pickupPincode})
                        </p>
                      </div>

                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-gray-400 dark:text-gray-500 block">Recipient Info</span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{order.recipientName || "N/A"}</p>
                        <p className="text-[11px] text-gray-500">{order.recipientPhone || "N/A"}</p>
                        <p className="text-[11px] font-medium leading-relaxed mt-1 text-gray-700 dark:text-gray-300">
                          <MapPin size={11} className="inline mr-1 text-gray-400" />
                          {order.dropAddress} ({order.dropPincode})
                        </p>
                      </div>
                    </div>

                    {/* Specifications */}
                    <div className="flex gap-4 text-[10px] text-gray-500 dark:text-gray-400 pt-1">
                      <span>Vehicle: <strong className="dark:text-gray-300 text-gray-700">{order.vehicleType || "2-Wheeler"}</strong></span>
                      <span>Billed Weight: <strong className="dark:text-gray-300 text-gray-700">{order.billedWeight} kg</strong></span>
                      <span>Payment Method: <strong className="dark:text-gray-300 text-gray-700">{order.paymentType}</strong></span>
                    </div>

                    {/* Dynamic Action Buttons */}
                    <div className="flex items-center gap-2 justify-end border-t dark:border-gray-800 border-gray-100 pt-3">
                      {order.status === "Pending" && (
                        <button
                          onClick={() => handleStatusTransition(order._id, "Picked Up")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
                        >
                          Pick Up Order
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {order.status === "Picked Up" && (
                        <button
                          onClick={() => handleStatusTransition(order._id, "In Transit")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
                        >
                          Depart - In Transit
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {order.status === "In Transit" && (
                        <button
                          onClick={() => handleStatusTransition(order._id, "Out for Delivery")}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
                        >
                          Dispatch - Out for Delivery
                          <ChevronRight size={14} />
                        </button>
                      )}

                      {order.status === "Out for Delivery" && (
                        <>
                          <button
                            onClick={() => setFailureOrderId(order._id)}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg border dark:border-red-900/30 border-red-200 dark:bg-red-950/20 bg-red-50 dark:hover:bg-red-950/40 hover:bg-red-100 text-red-500 font-bold text-xs transition"
                          >
                            Mark Failed
                          </button>
                          <button
                            onClick={() => handleStatusTransition(order._id, "Delivered")}
                            className="flex items-center gap-1 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-500/10 transition active:scale-[0.98]"
                          >
                            Mark Delivered
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delivery History List */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest px-1">
              Completed Jobs ({completedOrders.length})
            </h3>

            {loading ? (
              <div className="h-48 rounded-xl border dark:border-gray-800 border-gray-100 animate-pulse bg-gray-50/20 dark:bg-gray-900/10" />
            ) : completedOrders.length === 0 ? (
              <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white text-center text-xs text-gray-500">
                No completed courier history recorded.
              </div>
            ) : (
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <div
                    key={order._id}
                    className="p-4 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm space-y-2.5 text-xs animate-none"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-gray-400">
                        #{order._id.substring(order._id.length - 6).toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                          order.status === "Delivered" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                        )}
                      >
                        {order.status}
                      </span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-300 leading-normal">
                      <strong>To:</strong> {order.recipientName || "Recipient"} <br />
                      <span className="text-[10px] text-gray-400">{order.dropAddress}</span>
                    </div>
                    <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 pt-1 border-t dark:border-gray-800 border-gray-100">
                      <span>{order.paymentType}</span>
                      <span>Earned: ₹{order.charge.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* B. AVAILABLE POOL TAB */}
      {activeTab === "pool" && (
        <div className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">
              Shipments Available For Claim
            </h3>
            <button
              onClick={handleRefreshPool}
              disabled={refreshingPool}
              className="flex items-center gap-1 text-[10px] font-bold dark:text-blue-400 text-blue-600 hover:opacity-80 transition disabled:opacity-50"
            >
              <RefreshCw size={11} className={cn(refreshingPool && "animate-spin")} />
              Refresh Pool
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2].map((n) => (
                <div key={n} className="h-44 rounded-xl border dark:border-gray-800 border-gray-100 animate-pulse bg-gray-50/20 dark:bg-gray-900/10" />
              ))}
            </div>
          ) : visiblePoolOrders.length === 0 ? (
            <div className="p-12 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white text-center">
              <Box size={36} className="mx-auto mb-3 text-gray-400" />
              <h4 className="font-bold dark:text-gray-300 text-gray-700 text-sm">No Available Shipments</h4>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto leading-normal">
                There are no unassigned Pending orders inside your current operating zone. Ensure your active zone is configured in the settings tab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {visiblePoolOrders.map((order) => (
                <div
                  key={order._id}
                  className="p-5 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between border-b dark:border-gray-800 border-gray-100 pb-2">
                      <span className="text-[10px] font-mono font-bold dark:text-gray-500 text-gray-400">
                        #{order._id.substring(order._id.length - 8).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-500">₹{order.charge.toFixed(2)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Pickup</span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{order.senderName || "Sender"}</p>
                        <p className="text-[10px] text-gray-500 leading-normal">{order.pickupAddress} ({order.pickupPincode})</p>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400 block mb-0.5">Delivery</span>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{order.recipientName || "Recipient"}</p>
                        <p className="text-[10px] text-gray-500 leading-normal">{order.dropAddress} ({order.dropPincode})</p>
                      </div>
                    </div>

                    <div className="flex gap-3 text-[10px] text-gray-400 dark:text-gray-500 pt-1">
                      <span>Vehicle: **{order.vehicleType || "2-Wheeler"}**</span>
                      <span>Weight: **{order.billedWeight} kg**</span>
                      <span>Payment: **{order.paymentType}**</span>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end border-t dark:border-gray-800 border-gray-100 pt-3">
                    <button
                      onClick={() => handleRejectOrder(order._id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg border dark:border-gray-800 border-gray-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 transition"
                    >
                      <EyeOff size={12} />
                      Reject
                    </button>
                    <button
                      onClick={() => handleClaimOrder(order._id)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition active:scale-[0.98]"
                    >
                      <Check size={12} />
                      Accept Delivery
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* C. RIDER SETTINGS TAB */}
      {activeTab === "settings" && (
        <div className="max-w-xl mx-auto space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border dark:border-gray-800 border-gray-200 shadow-sm">
          <div className="border-b dark:border-gray-800 border-gray-100 pb-3">
            <h3 className="text-base font-bold dark:text-white text-gray-900 flex items-center gap-2">
              <Settings className="text-blue-500" size={18} />
              Rider Dispatch Configurations
            </h3>
            <p className="text-xs dark:text-gray-400 text-gray-500 mt-1">Configure your active availability status and courier operating zone.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Operating Duty Status</label>
              <select
                disabled={updatingAgent}
                value={agentStatus}
                onChange={(e) => handleAgentStatusUpdate(e.target.value, agentZone)}
                className="w-full text-xs font-semibold rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="available">🟢 Available (Accepting assignments)</option>
                <option value="busy">🟡 Busy (Active delivery task lock)</option>
                <option value="offline">🔴 Offline (Suspended task assignments)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold dark:text-gray-300 text-gray-600 block mb-1">Active Operations Zone</label>
              <select
                disabled={updatingAgent}
                value={agentZone}
                onChange={(e) => handleAgentStatusUpdate(agentStatus, e.target.value)}
                className="w-full text-xs font-semibold rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- No operating zone configured --</option>
                {zones.map((z) => (
                  <option key={z._id} value={z._id}>
                    {z.name}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-gray-500 mt-1.5 block leading-relaxed">
                *Riders will only receive available pool shipments matching their operating zone pincode mapping.
              </span>
            </div>

            <div className="p-4 rounded-xl border dark:border-gray-800 border-gray-150 bg-gray-50/30 dark:bg-gray-900/10 space-y-2">
              <span className="text-[10px] font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest block">Rider Verification Card</span>
              <p className="text-[11px] text-blue-500 font-semibold flex items-center gap-1">
                <UserCheck size={14} /> Registered Logistics Courier
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Failure Reason Input Prompt Modal */}
      {failureOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <form
            onSubmit={handleMarkFailed}
            className="w-full max-w-md bg-white dark:bg-gray-900 border dark:border-gray-800 border-gray-200 rounded-xl p-6 shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-red-500 font-bold text-base">
              <ShieldAlert />
              <h4>Record Delivery Failure Reason</h4>
            </div>
            
            <p className="text-xs dark:text-gray-400 text-gray-500 leading-normal">
              Please specify the precise reason why this package delivery attempt failed. The customer will receive this detail and be prompted to reschedule.
            </p>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Reason for failure</label>
              <textarea
                required
                rows={3}
                placeholder="e.g. Customer not available at address / Pincode locked gate / Rejected COD payment"
                value={failedReason}
                onChange={(e) => setFailedReason(e.target.value)}
                className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFailureOrderId(null);
                  setFailedReason("");
                }}
                className="px-4 py-2 rounded-lg border dark:border-gray-800 border-gray-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={failingOrder || !failedReason.trim()}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md shadow-red-500/10 transition"
              >
                {failingOrder ? "Saving..." : "Confirm Failure"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
