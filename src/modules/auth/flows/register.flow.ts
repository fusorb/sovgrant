// src/modules/auth/flows/register.flow.ts
import { z } from "zod";
import type { FlowContext, Flow } from "@/core/flows";
import { config } from "@/core/config";
import { RegisterSchema, IdentityDtoSchema } from "../validators/auth.schemas";
import { IdentityRepository } from "../repositories/identity.repository";
import { hashPassword } from "../services/password.service";
import { enforceSystemPasswordRules } from "@/lib/security/password-rules";
import { EmailTokenService } from "../services/email-token.service";
import { notificationService } from "@/lib/notifications/notification.service";
import { ApiError } from "@/core/errors";
import { auditService } from "@/modules/audit/services/audit.service";
import { presentIdentity } from "../presenters/identity.presenter";
import { dispatchWebhookEvent } from "@/lib/webhooks/webhook-dispatcher";

type Input = z.infer<typeof RegisterSchema>;
type Output = { identity: ReturnType<typeof presentIdentity> };

const SYSTEM_TENANT_ID = "SYSTEM";

export const registerFlow: Flow<Input, Output> = {
  name: "auth:register",
  inputSchema: RegisterSchema,

  async execute(input, ctx: FlowContext): Promise<Output> {
    const identityRepo = new IdentityRepository(ctx.db);

    if (await identityRepo.existsByEmail(input.email)) {
      throw ApiError.conflict("An account with this email already exists");
    }

    // TenantPolicy.passwordRules enforcement — see password-rules.ts for
    // why this is scoped to the SYSTEM tenant's policy.
    await enforceSystemPasswordRules(ctx.db, input.password);

    // ── TenantPolicy.allowedEmailDomains enforcement ──────────────────────────
    // New registrations are always scoped to the SYSTEM tenant, so we check
    // the SYSTEM tenant's policy.  Empty array / null means no restriction.
    const regPolicy = await ctx.db.tenantPolicy.findUnique({
      where: { tenantId: SYSTEM_TENANT_ID },
      select: { allowedEmailDomains: true },
    });

    const allowedDomains = regPolicy?.allowedEmailDomains ?? [];
    if (allowedDomains.length > 0) {
      const atIndex = input.email.indexOf("@");
      const domain = atIndex >= 0 ? input.email.slice(atIndex + 1) : "";
      if (!domain || !allowedDomains.includes(domain)) {
        throw new ApiError(
          "Registration from this email domain is not allowed",
          400,
          "EMAIL_DOMAIN_NOT_ALLOWED",
        );
      }
    }

    const passwordHash = await hashPassword(input.password);

    // FlowExecutor already runs this flow inside a managed transaction (ctx.db).
    // Do not nest $transaction here — starting an interactive tx on a tx client
    // can deadlock or fail with "Unable to start a transaction in the given time."
    const identity = await ctx.db.identity.create({
      data: {
        primaryEmail: input.email,
        name: input.name,
        status: "PENDING",
        localAccount: {
          create: { email: input.email, passwordHash },
        },
      },
    });

    const memberRole = await ctx.db.role.findFirst({
      where: { tenantId: SYSTEM_TENANT_ID, name: "MEMBER" },
      select: { id: true },
    });

    if (memberRole) {
      await ctx.db.tenantMembership.create({
        data: {
          identityId: identity.id,
          tenantId: SYSTEM_TENANT_ID,
          roleId: memberRole.id,
          status: "ACTIVE",
        },
      });
    } else {
      ctx.logger?.warn(
        "SYSTEM tenant MEMBER role not found — run prisma db seed",
        { identityId: identity.id },
      );
    }

    const emailTokenService = new EmailTokenService(ctx.db);
    const verifyToken = await emailTokenService.issue(
      identity.id,
      "VERIFY_EMAIL",
    );

    void notificationService.sendEmailVerification(input.email, verifyToken);

    await auditService.log(
      {
        action: "EMAIL_VERIFICATION_SENT",
        identityId: identity.id,
        ip: ctx.ip,
        requestId: ctx.requestId,
      },
      ctx.db,
    );

    await auditService.log(
      {
        action: "USER_REGISTERED",
        identityId: identity.id,
        ip: ctx.ip,
        requestId: ctx.requestId,
      },
      ctx.db,
    );

    try {
      await ctx.db.webhookEvent.create({
        data: {
          eventType: "IDENTITY_CREATED",
          identityId: identity.id,
          payload: { email: input.email, name: input.name ?? null },
          targetUrl: config.integration.relnexWebhookUrl,
        },
      });
    } catch (error) {
      ctx.logger?.error("Failed to write outbox webhookEvent record", {
        error,
        identityId: identity.id,
      });
    }

    void dispatchWebhookEvent(ctx.db, {
      tenantId: ctx.tenantId ?? SYSTEM_TENANT_ID,
      identityId: identity.id,
      eventType: "USER_REGISTERED",
      payload: { email: input.email, name: input.name ?? null },
    }).catch(() => {});

    return { identity: presentIdentity(identity) };
  },
};
