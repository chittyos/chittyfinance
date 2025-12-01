/**
 * Storage Helpers - Smart wrappers for multi-tenant storage access
 *
 * These helpers automatically handle tenant context from Express requests
 * and route to the correct storage implementation (standalone vs system mode).
 */

import type { Request } from 'express';
import { storage as standaloneStorage } from '../storage';
import { systemStorage } from '../storage-system';

const MODE = process.env.MODE || 'standalone';

/**
 * Get the appropriate storage context from a request
 */
export function getStorageContext(req: Request): {
  userId: number | string;
  tenantId?: string;
  mode: 'standalone' | 'system';
} {
  const mode = MODE === 'system' ? 'system' : 'standalone';

  if (mode === 'system') {
    // In system mode, we need tenant context
    return {
      userId: req.userId || '',
      tenantId: req.tenantId,
      mode: 'system',
    };
  }

  // In standalone mode, userId is a number
  return {
    userId: (req as any).userId || 0,
    mode: 'standalone',
  };
}

/**
 * Get integrations for current user/tenant
 */
export async function getIntegrations(req: Request) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getIntegrations(ctx.tenantId);
  }

  return standaloneStorage.getIntegrations(Number(ctx.userId));
}

/**
 * Get single integration
 */
export async function getIntegration(req: Request, id: number | string) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getIntegration(String(id), ctx.tenantId);
  }

  return standaloneStorage.getIntegration(Number(id));
}

/**
 * Create integration
 */
export async function createIntegration(req: Request, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.createIntegration({
      ...data,
      tenantId: ctx.tenantId,
    });
  }

  return standaloneStorage.createIntegration({
    ...data,
    userId: Number(ctx.userId),
  });
}

/**
 * Update integration
 */
export async function updateIntegration(req: Request, id: number | string, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.updateIntegration(String(id), ctx.tenantId, data);
  }

  return standaloneStorage.updateIntegration(Number(id), data);
}

/**
 * Get tasks for current user/tenant
 */
export async function getTasks(req: Request, limit?: number) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getTasks(ctx.tenantId, String(ctx.userId), limit);
  }

  return standaloneStorage.getTasks(Number(ctx.userId), limit);
}

/**
 * Get single task
 */
export async function getTask(req: Request, id: number | string) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getTask(String(id), ctx.tenantId);
  }

  return standaloneStorage.getTask(Number(id));
}

/**
 * Create task
 */
export async function createTask(req: Request, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.createTask({
      ...data,
      tenantId: ctx.tenantId,
      userId: String(ctx.userId),
    });
  }

  return standaloneStorage.createTask({
    ...data,
    userId: Number(ctx.userId),
  });
}

/**
 * Update task
 */
export async function updateTask(req: Request, id: number | string, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.updateTask(String(id), ctx.tenantId, data);
  }

  return standaloneStorage.updateTask(Number(id), data);
}

/**
 * Get AI messages for current user/tenant
 */
export async function getAiMessages(req: Request, limit?: number) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getAiMessages(ctx.tenantId, String(ctx.userId), limit);
  }

  return standaloneStorage.getAiMessages(Number(ctx.userId), limit);
}

/**
 * Create AI message
 */
export async function createAiMessage(req: Request, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.createAiMessage({
      ...data,
      tenantId: ctx.tenantId,
      userId: String(ctx.userId),
    });
  }

  return standaloneStorage.createAiMessage({
    ...data,
    userId: Number(ctx.userId),
  });
}

/**
 * Get transactions for current user/tenant
 */
export async function getTransactions(req: Request, limit?: number) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getTransactions(ctx.tenantId, limit);
  }

  return standaloneStorage.getTransactions(Number(ctx.userId), limit);
}

/**
 * Create transaction
 */
export async function createTransaction(req: Request, data: any) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    // In system mode, tenant and account IDs should already be in data
    return systemStorage.createTransaction(data);
  }

  return standaloneStorage.createTransaction({
    ...data,
    userId: Number(ctx.userId),
  });
}

/**
 * Get financial summary for current user/tenant
 */
export async function getFinancialSummary(req: Request) {
  const ctx = getStorageContext(req);

  if (ctx.mode === 'system' && ctx.tenantId) {
    return systemStorage.getFinancialSummary(ctx.tenantId);
  }

  const user = await standaloneStorage.getSessionUser();
  if (!user) return undefined;

  return standaloneStorage.getFinancialSummary(user.id);
}
