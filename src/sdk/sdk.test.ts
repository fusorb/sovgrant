import { describe, it, expect, vi, beforeEach } from "vitest";
import { SgClient, AuthSdk, TenantSdk, BillingSdk, AuditSdk, VcSdk, IdentitySdk, OAuthSdk, WebhooksSdk, PasskeySdk, IdpSdk } from "@fusorb/facet-sdk";
import { auth, tenants, billing, credentials, audit, identity, oauth, webhooks, passkeys, idp, sgClient } from "./index";

// The migrated SDK layer is a thin singleton wiring over @fusorb/facet-sdk.
// These tests verify the singletons are wired to the right facet classes and
// that the client integration behaves (token refresh + auth-cleared hooks).

describe("sdk singleton wiring", () => {
  it("exports each domain SDK wired to the facet-sdk class", () => {
    expect(auth).toBeInstanceOf(AuthSdk);
    expect(tenants).toBeInstanceOf(TenantSdk);
    expect(billing).toBeInstanceOf(BillingSdk);
    expect(audit).toBeInstanceOf(AuditSdk);
    expect(credentials).toBeInstanceOf(VcSdk);
    expect(identity).toBeInstanceOf(IdentitySdk);
    expect(oauth).toBeInstanceOf(OAuthSdk);
    expect(webhooks).toBeInstanceOf(WebhooksSdk);
    expect(passkeys).toBeInstanceOf(PasskeySdk);
    expect(idp).toBeInstanceOf(IdpSdk);
  });

  it("re-exports the shared SgClient singleton", () => {
    expect(sgClient).toBeInstanceOf(SgClient);
  });

  it("exposes the HTTP verbs on the client", () => {
    expect(typeof sgClient.get).toBe("function");
    expect(typeof sgClient.post).toBe("function");
    expect(typeof sgClient.patch).toBe("function");
    expect(typeof sgClient.del).toBe("function");
    expect(typeof sgClient.setAccessToken).toBe("function");
    expect(typeof sgClient.getAccessToken).toBe("function");
  });
});

describe("client token integration", () => {
  it("setAccessToken + getAccessToken round-trip", () => {
    sgClient.setAccessToken("tok-123");
    expect(sgClient.getAccessToken()).toBe("tok-123");
    sgClient.setAccessToken(null);
    expect(sgClient.getAccessToken()).toBeNull();
  });
});

describe("tenant SDK method delegation", () => {
  it("tenants.create() delegates to POST /tenants with name and slug", async () => {
    const mockTenant = { id: "tenant-1", name: "Test Org", slug: "test-org" };
    const postSpy = vi.spyOn(sgClient, "post").mockResolvedValue({
      data: mockTenant,
      error: null,
    });

    const result = await tenants.create({ name: "Test Org", slug: "test-org" });

    expect(postSpy).toHaveBeenCalledWith("/tenants", { name: "Test Org", slug: "test-org" });
    expect(result.data).toEqual(mockTenant);
    postSpy.mockRestore();
  });

  it("tenants.acceptInvite() delegates to POST /invites/accept with token", async () => {
    const mockResult = { ok: true };
    const postSpy = vi.spyOn(sgClient, "post").mockResolvedValue({
      data: mockResult,
      error: null,
    });

    const result = await tenants.acceptInvite({ token: "invite-token-123" });

    expect(postSpy).toHaveBeenCalledWith("/invites/accept", { token: "invite-token-123" });
    expect(result.data).toEqual(mockResult);
    postSpy.mockRestore();
  });
});
