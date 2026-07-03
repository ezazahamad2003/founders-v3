import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono, Inter, Libre_Baskerville } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });
const archivo = Archivo({ subsets: ["latin"], variable: "--font-display" });
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400"],
  style: ["italic"],
  variable: "--font-serif",
});
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-mono-landing",
});

const siteTitle = "Scopic";
const siteDescription =
  "Private legal AI for matter review, drafting, and firm-controlled model workflows.";
const siteUrl = "https://scopiclegal.com";
const ogImage = "/images/image.png?v=2";

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
        alt: "Scopic",
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('scopic_theme');
                  if (theme === 'light' || theme === 'dark') {
                    document.documentElement.setAttribute('data-theme', theme);
                  } else {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  }
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} ${archivo.variable} ${libreBaskerville.variable} ${ibmPlexMono.variable} app-bg`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
