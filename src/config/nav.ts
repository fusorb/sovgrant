/**
 * SovGrant Navigation Configuration
 *
 * Single source of truth for the console sidebar nav tree.
 * The facet ConsoleLayout's Sidebar reads this - not hardcoded JSX.
 *
 * Permission gating (`requiredPermission`) is declared here but is NOT
 * enforced in the UI. The backend is the real enforcement boundary.
 */

import type { IconName } from "@fusorb/facet-components";

export interface NavItem {
  /** Full route path e.g. "/console/security/sessions" */
  href: string;
  /** Display label */
  label: string;
  /** Icon name from the facet icon registry (lucide kebab-case) */
  icon: IconName;
  /** Optional RBAC permission string - reserved for future gating */
  requiredPermission?: string;
  /** Sub-items (rendered as a collapsible group in the sidebar) */
  children?: NavItem[];
}

export interface NavSection {
  /** Section heading in the sidebar */
  title: string;
  /** Items in this section */
  items: NavItem[];
}

export const navConfig: NavSection[] = [
  {
    title: "Overview",
    items: [{ href: "/console", label: "Dashboard", icon: "layout-dashboard" }],
  },
  {
    title: "Identity",
    items: [
      {
        href: "/console/identities",
        label: "Identities",
        icon: "users",
        requiredPermission: "admin:system",
        children: [
          {
            href: "/console/identities/external-ids",
            label: "External IDs",
            icon: "badge-check",
          },
        ],
      },
      { href: "/console/tenants", label: "Tenants", icon: "building-2" },
    ],
  },
  {
    title: "Organization",
    items: [
      { href: "/console/organization", label: "Overview", icon: "building" },
      {
        href: "/console/organization/members",
        label: "Members",
        icon: "users",
      },
      {
        href: "/console/organization/policies",
        label: "Policies",
        icon: "shield-check",
      },
      {
        href: "/console/organization/signing-keys",
        label: "Signing keys",
        icon: "key",
      },
      { href: "/console/organization/did", label: "DID", icon: "globe" },
      {
        href: "/console/organization/projects",
        label: "Projects",
        icon: "folder-kanban",
      },
      {
        href: "/console/organization/sso",
        label: "SSO",
        icon: "fingerprint",
      },
    ],
  },
  {
    title: "Credentials",
    items: [
      { href: "/console/credentials", label: "Credentials", icon: "file-check" },
    ],
  },
  {
    title: "Security",
    items: [
      { href: "/console/security/sessions", label: "Sessions", icon: "monitor" },
      { href: "/console/security/passkeys", label: "Passkeys", icon: "key" },
      { href: "/console/security/mfa", label: "Two-factor", icon: "lock" },
      {
        href: "/console/security/paired-devices",
        label: "Paired devices",
        icon: "smartphone",
      },
      {
        href: "/console/security/devices",
        label: "Devices",
        icon: "server",
      },
      {
        href: "/console/security/audit",
        label: "Audit log",
        icon: "scroll-text",
        requiredPermission: "audit:read:any",
      },
    ],
  },
  {
    title: "Developers",
    items: [
      {
        href: "/console/oauth/applications",
        label: "OAuth applications",
        icon: "globe",
      },
      { href: "/console/oauth/tokens", label: "OAuth tokens", icon: "key" },
      { href: "/console/webhooks", label: "Webhooks", icon: "send" },
      { href: "/console/api-keys", label: "API keys", icon: "plug" },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/console/user", label: "Account", icon: "user" },
      { href: "/console/billing", label: "Billing", icon: "credit-card" },
    ],
  },
];
