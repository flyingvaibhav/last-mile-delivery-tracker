"use client";

import React, { useState, useRef, useEffect } from "react";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/types";

interface ZoneWithAreas {
  name: string;
  areas?: { pincodeOrName: string }[];
}

interface Message {
  id: string;
  sender: "bot" | "user";
  text: string;
  timestamp: Date;
  actions?: { label: string; value: string }[];
}

export default function ChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "init",
      sender: "bot",
      text: "Hello! I am Swifty, your logistics coordinator. How can I assist you today?",
      timestamp: new Date(),
      actions: [
        { label: "📦 Track Shipment", value: "track" },
        { label: "💰 Estimate Shipping Cost", value: "price" },
        { label: "📍 Active Service Locations", value: "zones" },
      ],
    },
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(2, 9),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const queryText = textToSend.toLowerCase().trim();
    let botReplyText = "";
    let botActions: { label: string; value: string }[] | undefined = undefined;

    try {
      // 1. Keyword check: TRACKING
      if (queryText.includes("track")) {
        // Extract anything that looks like an ID
        const match = queryText.match(/track\s+([a-f0-9]{24})/i) || queryText.match(/([a-f0-9]{24})/i);
        if (match) {
          const orderId = match[1];
          const res = await fetch(`/api/orders/${orderId}`);
          if (res.ok) {
            const data = await res.json();
            const order = data.order;
            botReplyText = `📦 **Shipment Details (${order._id.substring(18)})**\n\n` +
              `• **Status**: ${order.status}\n` +
              `• **Route**: ${order.pickupAddress} (${order.pickupPincode}) ➔ ${order.dropAddress} (${order.dropPincode})\n` +
              `• **Billed Weight**: ${order.billedWeight} kg\n` +
              `• **Total Charge**: ₹${order.charge.toFixed(2)}\n\n` +
              `*Audit Trail*: Current location logged as ${order.status} with ${data.history?.length || 1} transition points.`;
          } else {
            botReplyText = `❌ Could not find shipment with ID \`${orderId}\`. Please check the ID and try again.`;
          }
        } else {
          botReplyText = "To track a parcel, please enter `track <order_id>`. For example:\n`track 64f1234567890abcdef12345`";
        }
      } 
      // 2. Keyword check: RATE ESTIMATOR
      else if (queryText.startsWith("price") || queryText.startsWith("estimate") || queryText.startsWith("calc")) {
        // Matches "price <pickup> <drop> <weight>" (e.g. price 110001 220002 5)
        const parts = queryText.split(/\s+/);
        if (parts.length >= 4) {
          const pickup = parts[1];
          const drop = parts[2];
          const wt = parts[3];
          
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              pickupAddress: "Estimate",
              pickupPincode: pickup,
              dropAddress: "Estimate",
              dropPincode: drop,
              l: "10", b: "10", h: "10", // default small dimension
              actualWeight: wt,
              orderType: "B2C",
              paymentType: "Prepaid",
              preview: true,
            }),
          });
          
          if (res.ok) {
            const data = await res.json();
            botReplyText = `💰 **Calculated Price Estimate**\n\n` +
              `• **Pickup**: ${data.pickupZone.name} (${pickup})\n` +
              `• **Destination**: ${data.dropZone.name} (${drop})\n` +
              `• **Weight**: ${wt} kg\n` +
              `• **Base Fare**: ₹${data.baseCharge}\n` +
              `• **Route Rate**: ₹${data.ratePerKg}/kg\n` +
              `• **Total Estimate**: **₹${data.charge.toFixed(2)}**`;
          } else {
            const errData = await res.json();
            botReplyText = `⚠️ Calculation failed: ${errData.error || "Pincodes not mapped to active rate cards."}`;
          }
        } else {
          botReplyText = "To calculate shipping rates, enter `price <pickup_pincode> <drop_pincode> <weight_in_kg>`. For example:\n`price 110001 220002 2`";
        }
      }
      // 3. Keyword check: ACTIVE ZONES
      else if (queryText.includes("zone") || queryText.includes("location") || queryText.includes("service") || queryText.includes("pincode")) {
        const res = await fetch("/api/zones");
        if (res.ok) {
          const zones = await res.json();
          if (zones.length > 0) {
            botReplyText = "📍 **Active SwiftFleet Delivery Zones**\n\n" + 
              zones.map((z: ZoneWithAreas) => `• **${z.name}**: Serving codes ${z.areas?.map((a) => `\`${a.pincodeOrName.split('-')[0]}\``).join(", ") || "None"}`).join("\n");
          } else {
            botReplyText = "Service locations are currently offline. Please contact administrator to seed zones.";
          }
        } else {
          botReplyText = "Unable to fetch operating zones at this moment.";
        }
      }
      // 4. Default greetings / help
      else if (queryText === "hello" || queryText === "hi" || queryText === "hey") {
        botReplyText = "Hi there! I can help you track shipments, estimate shipping costs, or look up service locations. Select one of the quick options below or ask a question!";
        botActions = [
          { label: "📦 Track Shipment", value: "track" },
          { label: "💰 Estimate Shipping Cost", value: "price" },
          { label: "📍 Service Locations", value: "zones" },
        ];
      } else {
        botReplyText = "I didn't quite get that. Here is what I can do:\n\n" +
          "1. **Track Shipment**: Type `track <order_id>`\n" +
          "2. **Estimate Rates**: Type `price <pickup_pincode> <drop_pincode> <weight>`\n" +
          "3. **Zones list**: Type `zones` or `locations`";
        botActions = [
          { label: "📦 Track Shipment", value: "track" },
          { label: "💰 Estimate Shipping Cost", value: "price" },
          { label: "📍 Active Service Locations", value: "zones" },
        ];
      }
    } catch (e: unknown) {
      botReplyText = `Sorry, I encountered an issue: ${getErrorMessage(e, "Unknown error")}`;
    }

    // Set delay for simulated human reply
    setTimeout(() => {
      const botMsg: Message = {
        id: Math.random().toString(36).substring(2, 9),
        sender: "bot",
        text: botReplyText,
        timestamp: new Date(),
        actions: botActions,
      };
      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);
    }, 400);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat window panel */}
      {isOpen && (
        <div className="w-[360px] h-[480px] rounded-2xl border dark:border-gray-800 border-gray-200 dark:bg-gray-950/95 bg-white/95 shadow-2xl flex flex-col overflow-hidden backdrop-blur-md mb-4 transition-all duration-300 transform scale-100 origin-bottom-right">
          
          {/* Header */}
          <div className="p-4 border-b dark:border-gray-800 border-gray-100 dark:bg-gray-900 bg-blue-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-white/10 dark:bg-blue-600/30 flex items-center justify-center text-white">
                <Bot size={16} />
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight">Swifty Assistant</h4>
                <span className="text-[10px] text-blue-200 dark:text-gray-400 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online & Active
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white dark:text-gray-400 dark:hover:text-gray-200 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs scrollbar-thin dark:scrollbar-thumb-gray-800 scrollbar-thumb-gray-200">
            {messages.map((m) => (
              <div key={m.id} className={cn("flex gap-2 max-w-[85%]", m.sender === "user" ? "ml-auto flex-row-reverse" : "mr-auto")}>
                <div className={cn(
                  "h-6 w-6 rounded-full shrink-0 flex items-center justify-center border text-[10px] font-semibold",
                  m.sender === "user" 
                    ? "bg-blue-500/10 text-blue-500 border-blue-500/20" 
                    : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                )}>
                  {m.sender === "user" ? <User size={10} /> : <Bot size={10} />}
                </div>
                <div className="space-y-2">
                  <div className={cn(
                    "p-3 rounded-2xl whitespace-pre-wrap leading-relaxed shadow-sm",
                    m.sender === "user" 
                      ? "bg-blue-600 text-white rounded-tr-none" 
                      : "dark:bg-gray-900 bg-gray-50 border dark:border-gray-800 border-gray-150 text-gray-800 dark:text-gray-200 rounded-tl-none"
                  )}>
                    {m.text}
                  </div>
                  
                  {/* Action buttons */}
                  {m.actions && (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {m.actions.map((act) => (
                        <button
                          key={act.value}
                          onClick={() => {
                            let text = "";
                            if (act.value === "track") text = "track <order_id>";
                            else if (act.value === "price") text = "price 110001 220002 1.5";
                            else if (act.value === "zones") text = "zones";
                            handleSendMessage(text);
                          }}
                          className="py-1.5 px-3 rounded-lg border dark:border-gray-800 border-gray-200 dark:bg-gray-900/50 bg-white hover:bg-gray-50 dark:hover:bg-gray-900 dark:text-blue-400 text-blue-600 transition font-medium text-[10px]"
                        >
                          {act.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2 mr-auto max-w-[85%]">
                <div className="h-6 w-6 rounded-full shrink-0 flex items-center justify-center border bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">
                  <Loader2 size={10} className="animate-spin" />
                </div>
                <div className="p-3 rounded-2xl dark:bg-gray-900 bg-gray-50 border dark:border-gray-800 border-gray-150 text-gray-400 rounded-tl-none italic flex items-center gap-1.5">
                  Swifty is typing...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Form input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(input);
            }}
            className="p-3 border-t dark:border-gray-800 border-gray-100 flex gap-2 dark:bg-gray-950 bg-white"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask track ID, price calculator, or zones..."
              className="flex-1 text-xs rounded-xl border dark:border-gray-800 border-gray-200 dark:bg-gray-900 bg-gray-50 p-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="h-9 w-9 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition disabled:opacity-50 disabled:pointer-events-none active:scale-95"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      )}

      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-12 w-12 rounded-full flex items-center justify-center text-white shadow-xl transition-all duration-300 transform active:scale-95",
          isOpen 
            ? "bg-red-500 rotate-90 shadow-red-500/20" 
            : "bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-blue-500/20"
        )}
      >
        {isOpen ? <X size={20} /> : <MessageSquare size={20} />}
      </button>
    </div>
  );
}
