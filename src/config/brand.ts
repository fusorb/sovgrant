// src/config/brand.ts
//
// Single source of truth for SovGrant's identity strings - name, tagline,
// description, OG/Twitter defaults, brand URLs. `src/app/layout.tsx` derives
// its root `Metadata` export from this. Per-page metadata should use
// `buildMetadata({ title, description, path })` rather than redefining these
// strings, so a brand-copy change is a one-file edit.

export const SgMetadata = {
  name: "SovGrant",
  shortName: "SovGrant",
  tagline: "Sovereign Identity Engine",

  description:
    "Enterprise identity, credentials, and access management for Web2 and Web3.",

  // Longer-form description used for SEO/OG - keep `description` short
  // (used in <head> meta + UI copy), this is for social previews.
  longDescription:
    "SovGrant is a sovereign identity infrastructure platform. Multi-tenant " +
    "OAuth2/OIDC, W3C Verifiable Credentials, DID:web, passkeys, and " +
    "enterprise SSO - built for African and global deployments.",

  keywords: [
    "identity platform",
    "OAuth2",
    "OIDC",
    "verifiable credentials",
    "decentralized identity",
    "DID",
    "passkeys",
    "WebAuthn",
    "multi-tenant IAM",
    "enterprise SSO",
    "Africa identity",
    "SovGrant",
    "Fusorb",
  ],

  version: "1.0.0-alpha",

  org: {
    name: "Fusorb",
    url: "https://fusorb.com",
  },

  url: process.env.NEXT_PUBLIC_APP_URL ?? "https://sg.fusorb.com",
  ogImage: "/sg-full.png",
  twitterHandle: "@fusorb",
  locale: "en_NG",

  themeColor: "#0f1117",
} as const;

// ── Per-page metadata helper ────────────────────────────────────────────────
// Use in a page's `generateMetadata()`:
//
//   export function generateMetadata() {
//     return buildMetadata({ title: "Sessions", description: "Manage your active sessions." });
//   }
//
// `title` is run through the root `template: "%s · SovGrant"` automatically -
// don't append "· SovGrant" yourself.
interface BuildMetadataOptions {
  title?: string;
  description?: string;
  path?: string; // e.g. "/security/sessions" - used for canonical/OG url
}

export function buildMetadata({
  title,
  description,
  path,
}: BuildMetadataOptions = {}) {
  const resolvedTitle = title ?? SgMetadata.tagline;
  const resolvedDescription = description ?? SgMetadata.description;
  const url = path ? `${SgMetadata.url}${path}` : SgMetadata.url;

  return {
    title,
    description: resolvedDescription,
    openGraph: {
      title: title ? `${title} · ${SgMetadata.name}` : SgMetadata.name,
      description: resolvedDescription,
      url,
    },
    twitter: {
      title,
      description: resolvedDescription,
    },
    alternates: { canonical: url },
  };
}
