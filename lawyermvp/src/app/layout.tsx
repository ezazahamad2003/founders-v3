import type { Metadata } from "next";
import "./globals.css";
import AdminToolbar from "@/components/AdminToolbar";

export const metadata: Metadata = {
  title: "Lawyer CRM - Scopic Legal",
  description: "Client management dashboard for lawyers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AdminToolbar />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
