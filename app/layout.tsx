import type { Metadata } from "next";
import { headers } from "next/headers";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "BackOffice — AI Agent",
  description: "WhatsApp-first AI back-office for Ghana & Nigeria SMEs",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") ?? "";
  const showSidebar = !pathname.startsWith("/login");

  return (
    <html lang="en">
      <body className={`${inter.className} bg-white`}>
        {showSidebar ? (
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="flex-1 overflow-auto">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
