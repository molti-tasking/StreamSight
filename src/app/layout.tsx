import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { PostHogProvider } from "@/providers/PostHogProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Stream Sight",
  description: "Time Series Visualization App",
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
