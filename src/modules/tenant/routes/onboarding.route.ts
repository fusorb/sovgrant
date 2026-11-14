// src/modules/tenant/routes/onboarding.route.ts
//
// Admin-facing (flow management), mounted under /tenants prefix:
//   POST   /tenants/:tenantId/projects/:projectId/onboarding-flows
//   GET    /tenants/:tenantId/projects/:projectId/onboarding-flows
//   GET    /tenants/:tenantId/projects/:projectId/onboarding-flows/:flowId
//   PATCH  /tenants/:tenantId/projects/:projectId/onboarding-flows/:flowId
//   DELETE /tenants/:tenantId/projects/:projectId/onboarding-flows/:flowId
//
// End-user facing (progress), mounted under /identity:
//   POST   /identity/onboarding/start            { flowId }
//   GET    /identity/onboarding/:progressId
//   POST   /identity/onboarding/:progressId/advance   { stepId, data? }

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import {
  CreateOnboardingFlowSchema,
  UpdateOnboardingFlowSchema,
  OnboardingFlowParamsSchema,
  ProjectFlowsParamsSchema,
  StartProgressSchema,
  AdvanceProgressSchema,
  ProgressParamsSchema,
} from "../validators/onboarding.schemas";
import { createOnboardingFlowFlow } from "../flows/create-onboarding-flow.flow";
import { listOnboardingFlowsFlow } from "../flows/list-onboarding-flows.flow";
import { getOnboardingFlowFlow } from "../flows/get-onboarding-flow.flow";
import { updateOnboardingFlowFlow } from "../flows/update-onboarding-flow.flow";
import { deleteOnboardingFlowFlow } from "../flows/delete-onboarding-flow.flow";
import { startOnboardingProgressFlow } from "../flows/start-onboarding-progress.flow";
import { getOnboardingProgressFlow } from "../flows/get-onboarding-progress.flow";
import { advanceOnboardingProgressFlow } from "../flows/advance-onboarding-progress.flow";

// ── Admin: flow management, mounted under /tenants ──────────────────────────
export async function onboardingFlowRoute(fastify: FastifyInstance) {
  fastify.post(
    "/:tenantId/projects/:projectId/onboarding-flows",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("onboarding:manage"),
      ],
      schema: {
        tags: ["Onboarding Flows"],
        summary: "Create an onboarding flow for a project",
        security: [{ bearerAuth: [] }],
        params: ProjectFlowsParamsSchema,
        body: CreateOnboardingFlowSchema,
        response: { 201: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId } = req.params as {
        tenantId: string;
        projectId: string;
      };
      const body = req.body as z.infer<typeof CreateOnboardingFlowSchema>;

      const result = await flowExecutor.run(
        createOnboardingFlowFlow,
        { ...body, tenantId, projectId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.status(201).send({ success: true, data: result });
    },
  );

  fastify.get(
    "/:tenantId/projects/:projectId/onboarding-flows",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Onboarding Flows"],
        summary: "List onboarding flows for a project",
        security: [{ bearerAuth: [] }],
        params: ProjectFlowsParamsSchema,
        response: {
          200: z.object({ success: z.boolean(), data: z.array(z.any()) }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId } = req.params as {
        tenantId: string;
        projectId: string;
      };

      const result = await flowExecutor.run(
        listOnboardingFlowsFlow,
        { tenantId, projectId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  fastify.get(
    "/:tenantId/projects/:projectId/onboarding-flows/:flowId",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Onboarding Flows"],
        summary: "Get a single onboarding flow",
        security: [{ bearerAuth: [] }],
        params: OnboardingFlowParamsSchema,
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId, flowId } = req.params as {
        tenantId: string;
        projectId: string;
        flowId: string;
      };

      const result = await flowExecutor.run(
        getOnboardingFlowFlow,
        { tenantId, projectId, flowId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  fastify.patch(
    "/:tenantId/projects/:projectId/onboarding-flows/:flowId",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("onboarding:manage"),
      ],
      schema: {
        tags: ["Onboarding Flows"],
        summary: "Update an onboarding flow",
        security: [{ bearerAuth: [] }],
        params: OnboardingFlowParamsSchema,
        body: UpdateOnboardingFlowSchema,
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId, flowId } = req.params as {
        tenantId: string;
        projectId: string;
        flowId: string;
      };
      const body = req.body as z.infer<typeof UpdateOnboardingFlowSchema>;

      const result = await flowExecutor.run(
        updateOnboardingFlowFlow,
        { ...body, tenantId, projectId, flowId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  fastify.delete(
    "/:tenantId/projects/:projectId/onboarding-flows/:flowId",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("onboarding:manage"),
      ],
      schema: {
        tags: ["Onboarding Flows"],
        summary:
          "Delete an onboarding flow (also deletes all progress records on it)",
        security: [{ bearerAuth: [] }],
        params: OnboardingFlowParamsSchema,
        response: { 200: z.object({ success: z.boolean() }) },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId, flowId } = req.params as {
        tenantId: string;
        projectId: string;
        flowId: string;
      };

      await flowExecutor.run(
        deleteOnboardingFlowFlow,
        { tenantId, projectId, flowId },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true });
    },
  );
}

// ── End-user: progress tracking, mounted under /identity ────────────────────
export async function onboardingProgressRoute(fastify: FastifyInstance) {
  fastify.post(
    "/onboarding/start",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Onboarding Progress"],
        summary:
          "Start (or resume) onboarding progress for the current identity",
        security: [{ bearerAuth: [] }],
        body: StartProgressSchema,
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const body = req.body as z.infer<typeof StartProgressSchema>;

      const result = await flowExecutor.run(
        startOnboardingProgressFlow,
        body,
        {
          identityId: req.identity.id,
          tenantId: null,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  fastify.get(
    "/onboarding/:progressId",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Onboarding Progress"],
        summary: "Get the current identity's progress on a flow",
        security: [{ bearerAuth: [] }],
        params: ProgressParamsSchema,
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { progressId } = req.params as { progressId: string };

      const result = await flowExecutor.run(
        getOnboardingProgressFlow,
        { progressId },
        {
          identityId: req.identity.id,
          tenantId: null,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );

  fastify.post(
    "/onboarding/:progressId/advance",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Onboarding Progress"],
        summary:
          "Mark a step complete and advance the current identity's progress",
        security: [{ bearerAuth: [] }],
        params: ProgressParamsSchema,
        body: AdvanceProgressSchema,
        response: { 200: z.object({ success: z.boolean(), data: z.any() }) },
      },
    },
    async (req, reply) => {
      const { progressId } = req.params as { progressId: string };
      const body = req.body as z.infer<typeof AdvanceProgressSchema>;

      const result = await flowExecutor.run(
        advanceOnboardingProgressFlow,
        { ...body, progressId },
        {
          identityId: req.identity.id,
          tenantId: null,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: result });
    },
  );
}
