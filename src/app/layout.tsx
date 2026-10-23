import type { Metadata, Viewport } from "next";
import "@fusorb/facet-tokens/tokens.css";
import "@/styles/globals.css";
import { Providers } from "@/providers";
import { SgMetadata } from "@/components/metadata";

export const metadata: Metadata = {
  title: {
    default: `${SgMetadata.name} · ${SgMetadata.tagline}`,
    template: `%s · ${SgMetadata.name}`,
  },
  description: SgMetadata.description,
  keywords: [...SgMetadata.keywords],
  authors: [{ name: SgMetadata.org.name, url: SgMetadata.org.url }],
  creator: SgMetadata.org.name,
  publisher: SgMetadata.org.name,
  icons: [{ rel: "icon", url: "/sg-bw.png" }],
  openGraph: {
    type: "website",
    locale: SgMetadata.locale,
    siteName: SgMetadata.name,
    title: `${SgMetadata.name} · ${SgMetadata.tagline}`,
    description: SgMetadata.longDescription,
    url: SgMetadata.url,
    images: [{ url: SgMetadata.ogImage }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: SgMetadata.themeColor,
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
