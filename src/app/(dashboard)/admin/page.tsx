"use client";

import React, { useEffect, useState } from "react";
import { Users, Truck, DollarSign, AlertCircle, TrendingUp, MapPin, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserType {
  clerkId: string;
  name: string;
  email: string;
  role: "customer" | "agent" | "admin";
  phone?: string;
  agentInfo?: {
    currentZoneId?: { _id: string; name: string } | null;
    availabilityStatus?: "available" | "busy" | "offline";
  } | null;
  createdAt: string;
}

interface OrderType {
  _id: string;
  charge: number;
  status: string;
  pickupZoneId?: { _id: string; name: string } | null;
  dropZoneId?: { _id: string; name: string } | null;
  createdAt: string;
}

interface ZoneType {
  _id: string;
  name: string;
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<UserType[]>([]);
  const [orders, setOrders] = useState<OrderType[]>([]);
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [loading, setLoading] = useState(true);

  // promotion state
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);

  async function loadAdminData() {
    try {
      const usersRes = await fetch("/api/users");
      const ordersRes = await fetch("/api/orders");
      const zonesRes = await fetch("/api/zones");

      if (usersRes.ok) setUsers(await usersRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (zonesRes.ok) setZones(await zonesRes.json());
    } catch (err) {
      console.error("Failed to load admin metrics:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setPromotingUserId(targetUserId);
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, role: newRole }),
      });

      if (res.ok) {
        loadAdminData(); // Reload stats
      } else {
        const data = await res.json();
        alert(data.error || "Role promotion failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPromotingUserId(null);
    }
  };

  const handleAgentZoneChange = async (clerkId: string, zoneId: string) => {
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId, currentZoneId: zoneId }),
      });

      if (res.ok) {
        loadAdminData();
      } else {
        alert("Failed to map agent to zone.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Metrics Calculations
  const revenueTotal = orders
    .filter((o) => o.status === "Delivered")
    .reduce((sum, o) => sum + o.charge, 0);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const ordersToday = orders.filter((o) => new Date(o.createdAt) >= startOfToday).length;

  const inTransitCount = orders.filter((o) => ["Picked Up", "In Transit", "Out for Delivery"].includes(o.status)).length;
  const failedCount = orders.filter((o) => o.status === "Failed").length;

  // Revenue by zone calculations
  const zoneRevenueMap: Record<string, number> = {};
  orders
    .filter((o) => o.status === "Delivered")
    .forEach((o) => {
      const zoneName = o.pickupZoneId?.name || "Unmapped Zone";
      zoneRevenueMap[zoneName] = (zoneRevenueMap[zoneName] || 0) + o.charge;
    });

  const zoneRevenueList = Object.entries(zoneRevenueMap).map(([name, revenue]) => ({
    name,
    revenue,
  }));

  return (
    <div className="space-y-8">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900 tracking-tight">System Performance Hub</h2>
        <p className="text-sm dark:text-gray-400 text-gray-500">Real-time logistics analytics, user management, and promotions.</p>
      </div>

      {/* KPI Stats widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `$${revenueTotal.toFixed(2)}`, icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10" },
          { label: "Orders Today", value: ordersToday, icon: TrendingUp, color: "text-blue-500 bg-blue-500/10" },
          { label: "In Transit Parcels", value: inTransitCount, icon: Truck, color: "text-purple-500 bg-purple-500/10" },
          { label: "Failed Deliveries", value: failedCount, icon: AlertCircle, color: "text-red-500 bg-red-500/10" },
        ].map((kpi, idx) => (
          <div
            key={idx}
            className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm flex items-center justify-between transition hover:-translate-y-0.5"
          >
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold dark:text-gray-400 text-gray-500 uppercase tracking-wider">{kpi.label}</span>
              <h3 className="text-2xl font-extrabold dark:text-white text-gray-900 tracking-tight">
                {loading ? "..." : kpi.value}
              </h3>
            </div>
            <div className={cn("p-3 rounded-lg shrink-0", kpi.color)}>
              <kpi.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* Content split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Users Promoting & Zone assignments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b dark:border-gray-800 border-gray-100 flex items-center justify-between bg-gray-50/50 dark:bg-gray-950/20">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-500" />
                <h3 className="text-sm font-bold dark:text-white text-gray-900 uppercase">User Accounts & Roles</h3>
              </div>
              <span className="text-[10px] uppercase tracking-wider dark:text-gray-500 text-gray-400 font-bold">
                Total accounts: {users.length}
              </span>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2].map((n) => (
                  <div key={n} className="h-16 rounded border dark:border-gray-800 border-gray-100 animate-pulse bg-gray-50/20 dark:bg-gray-900/10" />
                ))}
              </div>
            ) : (
              <div className="divide-y dark:divide-gray-800 divide-gray-100 max-h-[500px] overflow-y-auto">
                {users.map((usr) => (
                  <div key={usr.clerkId} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <strong className="text-sm font-bold dark:text-white text-gray-900 truncate block">{usr.name}</strong>
                        {usr.role === "admin" && (
                          <span title="System Admin"><Award size={14} className="text-purple-500 shrink-0" /></span>
                        )}
                      </div>
                      <p className="text-xs dark:text-gray-400 text-gray-500 truncate">{usr.email}</p>

                      {/* Agent specifications */}
                      {usr.role === "agent" && (
                        <div className="flex flex-wrap items-center gap-3 pt-2 text-[10px]">
                          {/* Agent availability status indicator */}
                          <span className={cn(
                            "inline-flex items-center gap-1 font-semibold capitalize",
                            usr.agentInfo?.availabilityStatus === "available" && "text-emerald-500",
                            usr.agentInfo?.availabilityStatus === "busy" && "text-amber-500",
                            usr.agentInfo?.availabilityStatus === "offline" && "text-gray-500",
                            !usr.agentInfo?.availabilityStatus && "text-gray-400"
                          )}>
                            <span className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              usr.agentInfo?.availabilityStatus === "available" && "bg-emerald-500 animate-pulse",
                              usr.agentInfo?.availabilityStatus === "busy" && "bg-amber-500",
                              usr.agentInfo?.availabilityStatus === "offline" && "bg-gray-500",
                              !usr.agentInfo?.availabilityStatus && "bg-gray-400"
                            )} />
                            {usr.agentInfo?.availabilityStatus || "offline"}
                          </span>

                          {/* Agent operational zone assignment */}
                          <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                            <MapPin size={10} />
                            <span>Zone:</span>
                            <select
                              value={usr.agentInfo?.currentZoneId?._id || ""}
                              onChange={(e) => handleAgentZoneChange(usr.clerkId, e.target.value)}
                              className="bg-transparent border-b border-gray-300 dark:border-gray-800 text-[10px] font-semibold text-gray-700 dark:text-gray-300 outline-none pb-0.5"
                            >
                              <option value="">Unassigned Zone</option>
                              {zones.map((z) => (
                                <option key={z._id} value={z._id}>
                                  {z.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Role Promotion selectors */}
                    <div className="shrink-0 flex items-center gap-2">
                      <select
                        disabled={promotingUserId === usr.clerkId}
                        value={usr.role}
                        onChange={(e) => handleRoleChange(usr.clerkId, e.target.value)}
                        className="text-xs font-semibold rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="customer">Customer</option>
                        <option value="agent">Delivery Agent</option>
                        <option value="admin">System Admin</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Zone Revenue Chart representation */}
        <div className="space-y-6">
          <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
            <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">Revenue by Pickup Zone</h3>
            
            {loading ? (
              <div className="h-48 rounded bg-gray-50/20 dark:bg-gray-900/10 animate-pulse" />
            ) : zoneRevenueList.length === 0 ? (
              <div className="text-xs text-gray-400 dark:text-gray-500 italic py-6 text-center">
                No billing data logged for deliveries yet.
              </div>
            ) : (
              <div className="space-y-4">
                {zoneRevenueList.map((zone, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex justify-between font-semibold">
                      <span className="dark:text-gray-300 text-gray-700">{zone.name}</span>
                      <span className="text-blue-500">${zone.revenue.toFixed(2)}</span>
                    </div>
                    {/* Visual bar fill representation */}
                    <div className="h-2 w-full rounded-full dark:bg-gray-800 bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{
                          width: `${Math.min(
                            100,
                            (zone.revenue / Math.max(1, ...zoneRevenueList.map((z) => z.revenue))) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
