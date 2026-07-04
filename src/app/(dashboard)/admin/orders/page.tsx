"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Truck, Search, PlusCircle, UserCheck, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrderType {
  _id: string;
  customerId: string;
  agentId?: string;
  pickupAddress: string;
  pickupPincode: string;
  pickupZoneId?: { _id: string; name: string } | null;
  dropAddress: string;
  dropPincode: string;
  dropZoneId?: { _id: string; name: string } | null;
  billedWeight: number;
  charge: number;
  status: string;
  paymentType: string;
  createdAt: string;
}

interface UserType {
  clerkId: string;
  name: string;
  role: string;
}

interface ZoneType {
  _id: string;
  name: string;
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [agents, setAgents] = useState<UserType[]>([]);
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [zoneFilter, setZoneFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Assignment Modal
  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [assigning, setAssigning] = useState(false);

  // Status Override dropdown control
  const [overridingOrderId, setOverridingOrderId] = useState<string | null>(null);

  async function loadData() {
    try {
      const ordersRes = await fetch("/api/orders");
      const usersRes = await fetch("/api/users");
      const zonesRes = await fetch("/api/zones");

      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (usersRes.ok) {
        const users = await usersRes.json();
        setAgents(users.filter((u: UserType) => u.role === "agent"));
      }
      if (zonesRes.ok) setZones(await zonesRes.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleAssignAgent = async (e: React.FormEvent, actionType: "manual" | "auto") => {
    e.preventDefault();
    if (!assignOrderId) return;
    if (actionType === "manual" && !selectedAgentId) return;

    setAssigning(true);
    try {
      const res = await fetch(`/api/orders/${assignOrderId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          agentId: actionType === "manual" ? selectedAgentId : undefined,
        }),
      });

      if (res.ok) {
        setAssignOrderId(null);
        setSelectedAgentId("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Assignment failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAssigning(false);
    }
  };

  const handleStatusOverride = async (orderId: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
        }),
      });

      if (res.ok) {
        setOverridingOrderId(null);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Status override failed.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filter orders on client
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.pickupAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.dropAddress.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order._id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = !statusFilter || order.status === statusFilter;

    const matchesAgent =
      !agentFilter ||
      (agentFilter === "unassigned" && !order.agentId) ||
      order.agentId === agentFilter;

    const matchesZone =
      !zoneFilter ||
      order.pickupZoneId?._id === zoneFilter ||
      order.dropZoneId?._id === zoneFilter;

    return matchesSearch && matchesStatus && matchesAgent && matchesZone;
  });

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white text-gray-900 tracking-tight">Order Deliveries Matrix</h2>
          <p className="text-sm dark:text-gray-400 text-gray-500">Monitor all courier transits, assign agents, and manually override statuses.</p>
        </div>
        <Link
          href="/customer/new"
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98] w-fit shrink-0"
        >
          <PlusCircle size={16} />
          Create Order (Admin)
        </Link>
      </div>

      {/* Filter and Control Toolbar */}
      <div className="p-5 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm flex flex-col gap-4">
        {/* Search */}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={16} />
          <input
            type="text"
            placeholder="Search pickup address, delivery address, or Order ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          />
        </div>

        {/* Dropdown filters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Pending">Pending Assignment</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Agent Assignment</label>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Agents</option>
              <option value="unassigned">Unassigned (Needs assignment)</option>
              {agents.map((agent) => (
                <option key={agent.clerkId} value={agent.clerkId}>
                  {agent.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Filter by Zone</label>
            <select
              value={zoneFilter}
              onChange={(e) => setZoneFilter(e.target.value)}
              className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Zones</option>
              {zones.map((zone) => (
                <option key={zone._id} value={zone._id}>
                  {zone.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[250px]">
            <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
            <p className="text-xs text-gray-400">Loading delivery matrix...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Truck size={40} className="mx-auto mb-3 text-gray-500 dark:text-gray-600" />
            <h4 className="font-bold dark:text-gray-300 text-gray-700">No orders logged</h4>
            <p className="text-xs text-gray-500 mt-1">Adjust your filters or book a shipment.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-950/40 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase border-b dark:border-gray-800 border-gray-100">
                <tr>
                  <th className="px-5 py-3">Order ID</th>
                  <th className="px-5 py-3">Route (From &rarr; To)</th>
                  <th className="px-5 py-3">Billed Wt</th>
                  <th className="px-5 py-3">Tariff</th>
                  <th className="px-5 py-3">Assigned Agent</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800 divide-gray-100">
                {filteredOrders.map((order) => {
                  const assignedAgent = agents.find((a) => a.clerkId === order.agentId);
                  
                  return (
                    <tr key={order._id} className="hover:bg-gray-50/50 hover:dark:bg-gray-950/10">
                      {/* ID */}
                      <td className="px-5 py-4 font-mono font-bold text-gray-900 dark:text-white">
                        #{order._id.substring(order._id.length - 6).toUpperCase()}
                      </td>

                      {/* Route */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]" title={order.pickupAddress}>
                            {order.pickupAddress}
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            Pincode: {order.pickupPincode} ({order.pickupZoneId?.name || "No Zone"})
                          </span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">
                            &rarr; {order.dropAddress} (Pincode: {order.dropPincode}, {order.dropZoneId?.name || "No Zone"})
                          </span>
                        </div>
                      </td>

                      {/* Weight */}
                      <td className="px-5 py-4 font-medium text-gray-900 dark:text-white">{order.billedWeight} kg</td>

                      {/* Charge */}
                      <td className="px-5 py-4 font-mono font-bold text-blue-500">${order.charge.toFixed(2)}</td>

                      {/* Agent */}
                      <td className="px-5 py-4">
                        {assignedAgent ? (
                          <span className="font-semibold text-gray-900 dark:text-white">{assignedAgent.name}</span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-600 italic">Unassigned</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        {overridingOrderId === order._id ? (
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusOverride(order._id, e.target.value)}
                            className="bg-white dark:bg-gray-950 border dark:border-gray-800 border-gray-200 rounded p-1 text-[11px] font-semibold text-gray-900 dark:text-white outline-none"
                          >
                            <option value="Pending">Pending</option>
                            <option value="Picked Up">Picked Up</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Failed">Failed</option>
                          </select>
                        ) : (
                          <span
                            onClick={() => setOverridingOrderId(order._id)}
                            className={cn(
                              "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase cursor-pointer hover:opacity-85 transition",
                              order.status === "Pending" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                              ["Picked Up", "In Transit", "Out for Delivery"].includes(order.status) &&
                                "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                              order.status === "Delivered" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                              order.status === "Failed" && "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            )}
                            title="Click to override status"
                          >
                            {order.status}
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right space-x-2 shrink-0">
                        <Link
                          href={`/customer/track/${order._id}`}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white dark:hover:bg-gray-800 hover:bg-gray-50 transition text-[10px] font-bold"
                        >
                          <Navigation size={10} />
                          Track
                        </Link>

                        <button
                          onClick={() => {
                            setAssignOrderId(order._id);
                            setSelectedAgentId(order.agentId || "");
                          }}
                          className="inline-flex items-center gap-0.5 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition text-[10px]"
                        >
                          <UserCheck size={10} />
                          Assign Agent
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Agent Dialog Modal */}
      {assignOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-gray-900 border dark:border-gray-800 border-gray-200 rounded-xl p-6 shadow-2xl space-y-4">
            <h4 className="font-bold text-base dark:text-white text-gray-900 flex items-center gap-2">
              <UserCheck className="text-blue-500" />
              Route Delivery Assignment
            </h4>
            
            <p className="text-xs dark:text-gray-400 text-gray-500 leading-normal">
              Select a delivery courier manually, or let the auto-assignment routing select the nearest available agent based on operating zones.
            </p>

            <div className="pt-2 border-t dark:border-gray-800 border-gray-100 flex flex-col gap-4">
              {/* Auto assignment */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1.5">Intelligent Routing</label>
                <button
                  type="button"
                  disabled={assigning}
                  onClick={(e) => handleAssignAgent(e, "auto")}
                  className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition active:scale-[0.98] disabled:opacity-50"
                >
                  {assigning ? "Routing agent..." : "Auto-Assign Closest Agent"}
                </button>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 my-1">
                <span className="w-full border-t dark:border-gray-800 border-gray-100" />
                <span className="px-3 shrink-0 uppercase font-bold text-[9px] tracking-wider">or manually select</span>
                <span className="w-full border-t dark:border-gray-800 border-gray-100" />
              </div>

              {/* Manual selection */}
              <form onSubmit={(e) => handleAssignAgent(e, "manual")} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Select Delivery Agent</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    required
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                  >
                    <option value="">-- Choose Agent --</option>
                    {agents.map((agent) => (
                      <option key={agent.clerkId} value={agent.clerkId}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAssignOrderId(null);
                      setSelectedAgentId("");
                    }}
                    className="px-4 py-2 rounded-lg border dark:border-gray-800 border-gray-200 text-xs font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={assigning || !selectedAgentId}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition"
                  >
                    {assigning ? "Assigning..." : "Assign Agent"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
