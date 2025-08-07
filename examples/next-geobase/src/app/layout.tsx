import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "GeoAI.js - Interactive Examples",
  description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
  keywords: ["GeoAI", "Geospatial AI", "JavaScript", "Machine Learning", "Computer Vision", "Satellite Imagery", "Building Detection", "Object Detection"],
  authors: [{ name: "Geobase.app" }],
  creator: "Geobase.app",
  publisher: "Geobase.app",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://geoaijs-live.geobase.app"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "GeoAI.js - Interactive Examples",
    description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
    url: "https://geoaijs-live.geobase.app",
    siteName: "GeoAI.js Examples",
    images: [
      {
        url: "/geoaijs-meta.png",
        width: 1200,
        height: 630,
        alt: "GeoAI.js Interactive Examples - Geospatial AI for JavaScript",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GeoAI.js - Interactive Examples",
    description: "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
    images: ["/geoaijs-meta.png"],
    creator: "@geobaseapp",
    site: "@geobaseapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
    yandex: "your-yandex-verification-code",
    yahoo: "your-yahoo-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        {/* Favicon and icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="shortcut icon" href="/favicon.ico" />
        <meta name="msapplication-TileColor" content="#ffffff" />
        <meta name="theme-color" content="#ffffff" />
        
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              "name": "GeoAI.js Interactive Examples",
              "description": "Explore GeoAI.js capabilities with interactive examples. Run AI models for building detection, object detection, land cover classification, and more directly in your browser.",
              "url": "https://geoaijs-live.geobase.app",
              "applicationCategory": "DeveloperApplication",
              "operatingSystem": "Web Browser",
              "author": {
                "@type": "Organization",
                "name": "Geobase.app",
                "url": "https://geobase.app"
              },
              "creator": {
                "@type": "Organization",
                "name": "Geobase.app",
                "url": "https://geobase.app"
              },
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Building Detection",
                "Object Detection", 
                "Land Cover Classification",
                "Zero Shot Object Detection",
                "Zero Shot Segmentation",
                "Oil Storage Tank Detection",
                "Car Detection",
                "Ship Detection",
                "Solar Panel Detection",
                "Wetland Segmentation"
              ],
              "screenshot": "https://geoaijs-live.geobase.app/geoaijs-meta.png",
              "softwareVersion": "1.0.0",
              "datePublished": "2025-01-01",
              "inLanguage": "en-US"
            })
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}