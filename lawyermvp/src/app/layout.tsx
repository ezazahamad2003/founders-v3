import type { Metadata } from "next";
import "./globals.css";

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
        {children}
      </body>
    </html>
  );
}
