// src/modules/tenant/routes/project.route.ts
//
// Mounted under /tenants (see tenant.plugin.ts), same convention as
// signing-key.route.ts and did.route.ts. Routes are thin: auth/validation
// → FlowExecutor → reply. Business logic lives in flows.
//
// Canonical paths:
//   POST   /tenants/:tenantId/projects
//   GET    /tenants/:tenantId/projects
//   GET    /tenants/:tenantId/projects/:projectId
//   PATCH  /tenants/:tenantId/projects/:projectId
//   DELETE /tenants/:tenantId/projects/:projectId

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { flowExecutor } from "@/core/flows";
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ProjectParamsSchema,
  TenantParamsSchema,
  ListProjectsQuerySchema,
} from "../validators/project.schemas";
import { createProjectFlow } from "../flows/create-project.flow";
import { listProjectsFlow } from "../flows/list-projects.flow";
import { getProjectFlow } from "../flows/get-project.flow";
import { updateProjectFlow } from "../flows/update-project.flow";
import { deleteProjectFlow } from "../flows/delete-project.flow";

export async function projectRoute(fastify: FastifyInstance) {
  // ── POST /:tenantId/projects ─────────────────────────────────────────────
  fastify.post(
    "/:tenantId/projects",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("project:manage"),
      ],
      schema: {
        tags: ["Project Management"],
        summary: "Create a new project (product/section) under this tenant",
        security: [{ bearerAuth: [] }],
        params: TenantParamsSchema,
        body: CreateProjectSchema,
        response: {
          201: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      const body = req.body as z.infer<typeof CreateProjectSchema>;

      const project = await flowExecutor.run(
        createProjectFlow,
        { tenantId, ...body },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.status(201).send({ success: true, data: project });
    },
  );

  // ── GET /:tenantId/projects ──────────────────────────────────────────────
  fastify.get(
    "/:tenantId/projects",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Project Management"],
        summary:
          "List projects under this tenant, optionally filtered by category",
        security: [{ bearerAuth: [] }],
        params: TenantParamsSchema,
        querystring: ListProjectsQuerySchema,
        response: {
          200: z.object({ success: z.boolean(), data: z.array(z.any()) }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId } = req.params as { tenantId: string };
      const { category } = req.query as { category?: string };

      const projects = await flowExecutor.run(
        listProjectsFlow,
        { tenantId, category },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: projects });
    },
  );

  // ── GET /:tenantId/projects/:projectId ───────────────────────────────────
  fastify.get(
    "/:tenantId/projects/:projectId",
    {
      preHandler: fastify.auth.requireUser,
      schema: {
        tags: ["Project Management"],
        summary:
          "Get a single project, including its OAuth clients and onboarding flows",
        security: [{ bearerAuth: [] }],
        params: ProjectParamsSchema,
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const params = req.params as { tenantId: string; projectId: string };

      const project = await flowExecutor.run(getProjectFlow, params, {
        identityId: req.identity.id,
        tenantId: params.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return reply.send({ success: true, data: project });
    },
  );

  // ── PATCH /:tenantId/projects/:projectId ─────────────────────────────────
  fastify.patch(
    "/:tenantId/projects/:projectId",
    {
      preHandler: [
        fastify.auth.requireUser,
        fastify.auth.requirePermission("project:manage"),
      ],
      schema: {
        tags: ["Project Management"],
        summary: "Update a project's name or category",
        security: [{ bearerAuth: [] }],
        params: ProjectParamsSchema,
        body: UpdateProjectSchema,
        response: {
          200: z.object({ success: z.boolean(), data: z.any() }),
        },
      },
    },
    async (req, reply) => {
      const { tenantId, projectId } = req.params as {
        tenantId: string;
        projectId: string;
      };
      const body = req.body as z.infer<typeof UpdateProjectSchema>;

      const project = await flowExecutor.run(
        updateProjectFlow,
        { tenantId, projectId, ...body },
        {
          identityId: req.identity.id,
          tenantId,
          ip: req.ip,
          userAgent: req.headers["user-agent"],
        },
      );

      return reply.send({ success: true, data: project });
    },
  );

  // ── DELETE /:tenantId/projects/:projectId ────────────────────────────────
  fastify.delete(
    "/:tenantId/projects/:projectId",
    {
      preHandler: [
        fastify.auth.requireElevated,
        fastify.auth.requirePermission("project:manage"),
      ],
      schema: {
        tags: ["Project Management"],
        summary:
          "Delete a project (requires step-up re-authentication). OAuth clients built on it are NOT deleted — they fall back to tenant-level.",
        security: [{ bearerAuth: [] }],
        params: ProjectParamsSchema,
        response: {
          200: z.object({ success: z.boolean() }),
        },
      },
    },
    async (req, reply) => {
      const params = req.params as { tenantId: string; projectId: string };

      await flowExecutor.run(deleteProjectFlow, params, {
        identityId: req.identity.id,
        tenantId: params.tenantId,
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return reply.send({ success: true });
    },
  );
}
