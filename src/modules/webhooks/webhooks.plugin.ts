// src/modules/webhooks/webhooks.plugin.ts
import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { webhookRoutes } from "./routes/webhook.route";
import { webhookConfigRoute } from "./routes/webhook-config.route";

export const webhooksPlugin = fp(
  async (fastify: FastifyInstance) => {
    await fastify.register(
      async (scope) => {
        const withZod = scope.withTypeProvider<ZodTypeProvider>();

        // Inbound: POST /webhooks/sovgrant — internal system signal receiver
        await withZod.register(webhookRoutes);

        // Outbound management: POST/GET/PATCH/DELETE /webhooks/endpoints
        // and POST /webhooks/endpoints/:id/test
        // PRO-gated — requirePlan enforced inside each route handler.
        await withZod.register(webhookConfigRoute);
      },
      { prefix: "/webhooks" },
    );
  },
  {
    name: "sg:webhooks",
    dependencies: ["sg:db", "sg:auth-guard"],
  },
);
