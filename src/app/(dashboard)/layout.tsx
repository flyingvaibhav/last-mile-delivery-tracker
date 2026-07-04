import React from "react";
import Sidebar from "@/components/sidebar";
import Header from "@/components/header";
import DemoBanner from "@/components/demo-banner";
import ChatAssistant from "@/components/chat-assistant";
import WalkthroughGuide from "@/components/walkthrough-guide";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Visual Demo Banner (if active) */}
      <DemoBanner />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Navigation Panel (Responsive) */}
        <Sidebar />

        {/* Main Dashboard Panel */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Dynamic Header */}
          <Header />

          {/* Main Content Scrolling Viewport */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 dark:bg-[#070b13] bg-[#f8fafc]">
            <div className="max-w-7xl mx-auto space-y-6">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Floating Helpers */}
      <ChatAssistant />
      <WalkthroughGuide />
    </div>
  );
}
