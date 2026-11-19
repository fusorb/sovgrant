import type { FastifyInstance } from "fastify";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { config } from "@/core/config";

const WebhookIncomingSchema = z.object({
  eventType: z.string(),
  identityId: z.string(),
  payload: z.any(),
});

function bearerMatches(authHeader: string | undefined, expected: string): boolean {
  const prefix = "Bearer ";
  if (!authHeader || !authHeader.startsWith(prefix)) return false;
  const presented = authHeader.slice(prefix.length);
  if (presented.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(presented), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function webhookRoutes(fastify: FastifyInstance) {
  fastify.post(
    "/sg", // Placed under a /webhooks prefix inside server registration
    {
      schema: {
        tags: ["System Webhooks Engine"],
        summary:
          "Ingest internal notification and ecosystem state synchronization signals",
        body: WebhookIncomingSchema,
        response: {
          200: z.object({
            success: z.boolean(),
            received: z.boolean(),
          }),
        },
      },
    },
    async (req, reply) => {
      if (
        !bearerMatches(
          req.headers.authorization,
          config.webhooks.signingSecret,
        )
      ) {
        return reply.status(401).send({ error: "Unauthorized" });
      }

      const { eventType, identityId, payload } = req.body as z.infer<
        typeof WebhookIncomingSchema
      >;

      fastify.log.info(
        `[WEBHOOK_RECEIVER] Signal ingested safely. Event: ${eventType} | Identity Context: ${identityId}`,
      );

      // Perform processing or cross-workspace notifications here...

      return reply.status(200).send({
        success: true,
        received: true,
      });
    },
  );
}
