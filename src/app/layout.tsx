import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { ThemeProvider } from "@/components/theme-provider";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Last-Mile Delivery Tracker | Smart Logistics SaaS",
  description: "Enterprise delivery routing, pricing automation, agent assignment, and live tracking dashboard.",
  keywords: "logistics, last-mile delivery, route management, rate cards, clerk, mongoose, next.js",
  authors: [{ name: "Logistics Engineering" }],
};

// Inline script that runs BEFORE React hydration to apply the correct theme class
// This prevents the flash of wrong theme on page load
const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
  } catch(e) {
    document.documentElement.classList.add('dark');
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})()
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#3b82f6",
        },
        elements: {
          card: "dark:bg-gray-900 bg-white border dark:border-gray-800 border-gray-200 shadow-xl rounded-xl",
          headerTitle: "dark:text-white text-gray-900",
          headerSubtitle: "dark:text-gray-400 text-gray-500",
          socialButtonsBlockButton: "dark:bg-gray-800 dark:border-gray-700 dark:text-white text-gray-700 bg-gray-50 border-gray-300 hover:dark:bg-gray-700 hover:bg-gray-100",
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-white",
          formFieldLabel: "dark:text-gray-300 text-gray-700",
          formFieldInput: "dark:bg-gray-800 dark:border-gray-700 dark:text-white text-gray-900 bg-white border-gray-300",
          footerActionText: "dark:text-gray-400 text-gray-500",
          footerActionLink: "text-blue-500 hover:text-blue-600",
        },
      }}
    >
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <head>
          {/* Synchronous theme script - must run before any paint to avoid flash */}
          <Script
            id="theme-loader"
            strategy="beforeInteractive"
            dangerouslySetInnerHTML={{ __html: themeScript }}
          />
        </head>
        <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-300">
          <ThemeProvider>{children}</ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
