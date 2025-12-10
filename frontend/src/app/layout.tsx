import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

const siteTitle = "Scopic Legal | Agentic frameworks for self-serve legal ops";
const siteDescription =
  "Agentic frameworks for self-serve legal operations—automated research, drafting, and workflows for modern legal teams.";
const siteUrl = "https://scopiclegal.com";
const ogImage = "/images/image.png";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: siteTitle,
  description: siteDescription,
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: siteUrl,
    siteName: "Scopic Legal",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Scopic Legal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [ogImage],
  },
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/logo.svg" type="image/svg+xml" />
        <link rel="shortcut icon" href="/logo.svg" />
      </head>
      <body className={`${inter.className} bg-[#05060c]`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
