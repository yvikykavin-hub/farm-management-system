import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "react-hot-toast";
import InactivityTimer from "../components/InactivityTimer";
import ErrorBoundary from "../components/ErrorBoundary";
import PageWrapper from "../components/PageWrapper";
import OfflineMessage from "../components/OfflineMessage";
import MotorTurnNotifier from "../components/MotorTurnNotifier";
import "./globals.css";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Marutham FMS",
  description: "Marutham Farm Management System - Rooted in Tradition, Driven by Data",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192x192.png",
    apple: "/icon-192x192.png",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-title": "Marutham FMS",
  },
};

export const viewport: Viewport = {
  themeColor: "#2D6A4F",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ta" suppressHydrationWarning>
      <body className={`${geist.className} min-h-screen bg-green-50`}>
        <OfflineMessage />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} storageKey="marutham-theme">
          <InactivityTimer />
          <ErrorBoundary>
            <PageWrapper>{children}</PageWrapper>
          </ErrorBoundary>
          <MotorTurnNotifier />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: "#fff",
                color: "#111827",
                borderRadius: "12px",
                border: "1px solid #E5E7EB",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                fontSize: "14px",
                fontWeight: "500",
              },
              success: {
                iconTheme: { primary: "#2D6A4F", secondary: "#fff" },
              },
              error: {
                iconTheme: { primary: "#EF4444", secondary: "#fff" },
              },
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}