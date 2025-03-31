import { Toaster } from "@/components/ui/sonner";
import { PostHogProvider } from "@/providers/PostHogProvider";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StreamSight",
  description: "Time Series Monitoring",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <PostHogProvider>
          <div className="flex flex-col h-screen">
            {children}
            <Toaster />
          </div>
        </PostHogProvider>
      </body>
    </html>
  );
}
