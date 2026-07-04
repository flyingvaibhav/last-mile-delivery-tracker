"use client";

import React, { useEffect, useState } from "react";
import { MapPin, DollarSign, PlusCircle, Trash2, Grid } from "lucide-react";
import type { OrderType } from "@/types";

interface AreaType {
  _id: string;
  pincodeOrName: string;
  zoneId: string;
}

interface ZoneType {
  _id: string;
  name: string;
  areas: AreaType[];
}

interface RateCardType {
  _id: string;
  orderType: "B2B" | "B2C";
  zoneFrom: { _id: string; name: string };
  zoneTo: { _id: string; name: string };
  baseCharge: number;
  ratePerKg: number;
}

interface CODSurchargeType {
  _id: string;
  orderType: "B2B" | "B2C";
  surchargeAmount: number;
}

export default function RatesManagement() {
  const [zones, setZones] = useState<ZoneType[]>([]);
  const [rateCards, setRateCards] = useState<RateCardType[]>([]);
  const [surcharges, setSurcharges] = useState<CODSurchargeType[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [newZoneName, setNewZoneName] = useState("");
  const [targetZoneId, setTargetZoneId] = useState("");
  const [newAreaPincode, setNewAreaPincode] = useState("");

  const [rateOrderType, setRateOrderType] = useState<"B2B" | "B2C">("B2C");
  const [rateZoneFrom, setRateZoneFrom] = useState("");
  const [rateZoneTo, setRateZoneTo] = useState("");
  const [rateBaseCharge, setRateBaseCharge] = useState("");
  const [ratePerKg, setRatePerKg] = useState("");

  const [surchargeOrderType, setSurchargeOrderType] = useState<"B2B" | "B2C">("B2C");
  const [surchargeAmount, setSurchargeAmount] = useState("");

  async function loadData() {
    try {
      const zonesRes = await fetch("/api/zones");
      const ratesRes = await fetch("/api/rates");
      
      if (zonesRes.ok) setZones(await zonesRes.ok ? await zonesRes.json() : []);
      if (ratesRes.ok) {
        const ratesData = await ratesRes.json();
        setRateCards(ratesData.rateCards || []);
        setSurcharges(ratesData.codSurcharges || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneName.trim()) return;

    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "createZone", name: newZoneName.trim() }),
      });

      if (res.ok) {
        setNewZoneName("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create zone.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateArea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetZoneId || !newAreaPincode.trim()) return;

    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createArea",
          zoneId: targetZoneId,
          pincodeOrName: newAreaPincode.trim(),
        }),
      });

      if (res.ok) {
        setNewAreaPincode("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to map pincode.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    if (!confirm("Are you sure you want to delete this zone? All associated area pincodes will be deleted.")) return;

    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteZone", zoneId }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    try {
      const res = await fetch("/api/zones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteArea", areaId }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpsertRateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateZoneFrom || !rateZoneTo || !rateBaseCharge || !ratePerKg) return;

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsertRateCard",
          orderType: rateOrderType,
          zoneFrom: rateZoneFrom,
          zoneTo: rateZoneTo,
          baseCharge: Number(rateBaseCharge),
          ratePerKg: Number(ratePerKg),
        }),
      });

      if (res.ok) {
        setRateBaseCharge("");
        setRatePerKg("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to upsert rate card.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpsertSurcharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!surchargeAmount) return;

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsertCODSurcharge",
          orderType: surchargeOrderType,
          surchargeAmount: Number(surchargeAmount),
        }),
      });

      if (res.ok) {
        setSurchargeAmount("");
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save COD surcharge.");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteRateCard = async (rateCardId: string) => {
    if (!confirm("Delete this rate card?")) return;

    try {
      const res = await fetch("/api/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "deleteRateCard", rateCardId }),
      });

      if (res.ok) {
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold dark:text-white text-gray-900 tracking-tight">Rates & Zones Control Panel</h2>
        <p className="text-sm dark:text-gray-400 text-gray-500">Configure logistics delivery bounds, zone-to-zone tariffs, and COD surcharges.</p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <div className="h-8 w-8 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mb-4" />
          <p className="text-xs text-gray-500">Loading rates data...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Column 1: Zones & Areas */}
          <div className="space-y-6 lg:col-span-1">
            {/* Create Zone */}
            <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
              <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <MapPin size={14} className="text-blue-500" />
                Add Delivery Zone
              </h3>
              <form onSubmit={handleCreateZone} className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="e.g. Zone North"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  className="flex-1 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow transition active:scale-[0.98]">
                  Create
                </button>
              </form>
            </div>

            {/* Create Area mapping */}
            <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
              <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                <PlusCircle size={14} className="text-blue-500" />
                Map Area Pincode
              </h3>
              <form onSubmit={handleCreateArea} className="space-y-3">
                <div>
                  <select
                    required
                    value={targetZoneId}
                    onChange={(e) => setTargetZoneId(e.target.value)}
                    className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Select Zone --</option>
                    {zones.map((z) => (
                      <option key={z._id} value={z._id}>
                        {z.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. 110001 or Delhi"
                    value={newAreaPincode}
                    onChange={(e) => setNewAreaPincode(e.target.value)}
                    className="flex-1 text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button type="submit" className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow transition active:scale-[0.98]">
                    Map
                  </button>
                </div>
              </form>
            </div>

            {/* List Zones & Areas */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest px-1">Registered Zones</h4>
              
              {zones.length === 0 ? (
                <div className="text-xs text-gray-400 italic text-center py-6">No zones created yet.</div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {zones.map((zone) => (
                    <div key={zone._id} className="p-4 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-3">
                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold dark:text-white text-gray-900">{zone.name}</strong>
                        <button
                          onClick={() => handleDeleteZone(zone._id)}
                          className="text-gray-400 hover:text-red-500 transition p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {/* Area chips list */}
                      <div className="flex flex-wrap gap-1.5">
                        {zone.areas.length === 0 ? (
                          <span className="text-[10px] text-gray-400 italic">No pincodes mapped</span>
                        ) : (
                          zone.areas.map((area) => (
                            <span
                              key={area._id}
                              className="inline-flex items-center gap-1 pl-2 pr-1.5 py-0.5 rounded bg-gray-50 dark:bg-gray-950 border dark:border-gray-800 border-gray-100 text-[10px] font-bold text-gray-700 dark:text-gray-300"
                            >
                              {area.pincodeOrName}
                              <button
                                type="button"
                                onClick={() => handleDeleteArea(area._id)}
                                className="text-gray-400 hover:text-red-500 font-bold transition ml-0.5"
                              >
                                &times;
                              </button>
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Columns 2-3: Rate Cards & COD Surcharges */}
          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Configure Rate Card */}
              <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
                <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign size={14} className="text-blue-500" />
                  Upsert Rate Card
                </h3>
                <form onSubmit={handleUpsertRateCard} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Order Type</label>
                      <select
                        value={rateOrderType}
                        onChange={(e) => setRateOrderType(e.target.value as OrderType)}
                        className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                      >
                        <option value="B2C">B2C (Retail)</option>
                        <option value="B2B">B2B (Business)</option>
                      </select>
                    </div>
                    <div />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">From Zone</label>
                      <select
                        required
                        value={rateZoneFrom}
                        onChange={(e) => setRateZoneFrom(e.target.value)}
                        className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- From --</option>
                        {zones.map((z) => (
                          <option key={z._id} value={z._id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">To Zone</label>
                      <select
                        required
                        value={rateZoneTo}
                        onChange={(e) => setRateZoneTo(e.target.value)}
                        className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- To --</option>
                        {zones.map((z) => (
                          <option key={z._id} value={z._id}>
                            {z.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Base Charge ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="e.g. 50"
                        value={rateBaseCharge}
                        onChange={(e) => setRateBaseCharge(e.target.value)}
                        className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Rate Per Kg ($)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        required
                        placeholder="e.g. 10"
                        value={ratePerKg}
                        onChange={(e) => setRatePerKg(e.target.value)}
                        className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition active:scale-[0.98]"
                  >
                    Save Rate Card Config
                  </button>
                </form>
              </div>

              {/* Configure COD Surcharges */}
              <div className="p-6 rounded-xl border dark:border-gray-800 border-gray-200 bg-white dark:bg-gray-900 shadow-sm space-y-4">
                <h3 className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest flex items-center gap-1.5">
                  <Grid size={14} className="text-blue-500" />
                  Configure COD Surcharge
                </h3>
                <form onSubmit={handleUpsertSurcharge} className="space-y-3">
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Order Type</label>
                    <select
                      value={surchargeOrderType}
                      onChange={(e) => setSurchargeOrderType(e.target.value as OrderType)}
                      className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
                    >
                      <option value="B2C">B2C (Retail)</option>
                      <option value="B2B">B2B (Business)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block mb-1">Surcharge Amount ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      placeholder="e.g. 25"
                      value={surchargeAmount}
                      onChange={(e) => setSurchargeAmount(e.target.value)}
                      className="w-full text-xs rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-950 bg-white p-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow transition active:scale-[0.98]"
                  >
                    Save Surcharge Config
                  </button>
                </form>
              </div>
            </div>

            {/* Lists active rate cards */}
            <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b dark:border-gray-800 border-gray-100 flex justify-between items-center bg-gray-50/50 dark:bg-gray-950/20">
                <span className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">Active Zone-to-Zone Rate Cards</span>
                <span className="text-[10px] uppercase font-bold dark:text-gray-500 text-gray-400">Total: {rateCards.length}</span>
              </div>

              {rateCards.length === 0 ? (
                <div className="p-8 text-center text-xs text-gray-400 italic">No rate cards configured. Pricing defaults are not loaded.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs text-gray-500 dark:text-gray-400">
                    <thead className="bg-gray-50 dark:bg-gray-950/40 text-[10px] font-bold text-gray-400 dark:text-gray-600 uppercase border-b dark:border-gray-800 border-gray-100">
                      <tr>
                        <th className="px-5 py-3">Type</th>
                        <th className="px-5 py-3">Route (From &rarr; To)</th>
                        <th className="px-5 py-3">Base Charge</th>
                        <th className="px-5 py-3">Rate Per Kg</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-gray-800 divide-gray-100">
                      {rateCards.map((rate) => (
                        <tr key={rate._id} className="hover:bg-gray-50/50 hover:dark:bg-gray-950/10">
                          <td className="px-5 py-3.5 font-semibold text-gray-900 dark:text-white">{rate.orderType}</td>
                          <td className="px-5 py-3.5 font-medium text-gray-900 dark:text-white">
                            {rate.zoneFrom?.name || "Deleted Zone"} &rarr; {rate.zoneTo?.name || "Deleted Zone"}
                          </td>
                          <td className="px-5 py-3.5 font-mono font-semibold">${rate.baseCharge.toFixed(2)}</td>
                          <td className="px-5 py-3.5 font-mono font-semibold">${rate.ratePerKg.toFixed(2)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleDeleteRateCard(rate._id)}
                              className="text-gray-400 hover:text-red-500 transition p-1"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* List Active COD Surcharges */}
            <div className="rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-white shadow-sm overflow-hidden w-full md:w-1/2">
              <div className="px-6 py-4 border-b dark:border-gray-800 border-gray-100 bg-gray-50/50 dark:bg-gray-950/20">
                <span className="text-xs font-bold dark:text-gray-400 text-gray-500 uppercase tracking-widest">Active COD surcharges</span>
              </div>
              <div className="divide-y dark:divide-gray-800 divide-gray-100 p-4 space-y-2 text-xs">
                {surcharges.length === 0 ? (
                  <span className="text-gray-400 italic block">No COD surcharge config mapped.</span>
                ) : (
                  surcharges.map((s) => (
                    <div key={s._id} className="flex justify-between items-center py-2">
                      <span className="font-semibold text-gray-900 dark:text-white">{s.orderType} Shipments</span>
                      <strong className="text-blue-500 font-mono">${s.surchargeAmount.toFixed(2)}</strong>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
