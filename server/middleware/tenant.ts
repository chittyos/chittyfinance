import type { Request, Response, NextFunction } from 'express';
import { systemStorage } from '../storage-system';

declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenant?: any;
      userId?: string;
    }
  }
}

// Minimal tenant-scoping middleware (standalone mode compatibility)
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  const headerTenant = (req.headers['x-tenant-id'] || req.headers['x-tenant']) as string | undefined;
  const queryTenant = (req.query.tenant as string) || (req.query.tenantId as string) || undefined;
  (req as any).tenantId = headerTenant || queryTenant;
  next();
}

// System mode: tenant resolution with access validation
export async function resolveTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    let tenantId = req.headers['x-tenant-id'] as string;
    let tenantSlug = req.query.tenantId as string;

    if (!tenantId && !tenantSlug) {
      const userTenants = await systemStorage.getUserTenants(userId);
      if (userTenants.length === 0) {
        return res.status(403).json({ error: 'No tenant access' });
      }
      req.tenant = userTenants[0];
      req.tenantId = userTenants[0].id;
      return next();
    }

    let tenant;
    if (tenantSlug) {
      tenant = await systemStorage.getTenantBySlug(tenantSlug);
    } else if (tenantId) {
      tenant = await systemStorage.getTenant(tenantId);
    }

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const userTenants = await systemStorage.getUserTenants(userId);
    const hasAccess = userTenants.some(t => t.id === tenant.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }

    req.tenant = tenant;
    req.tenantId = tenant.id;
    next();
  } catch (error) {
    console.error('Tenant resolution error:', error);
    res.status(500).json({ error: 'Failed to resolve tenant' });
  }
}

// Optional tenant (no error if missing)
export async function optionalTenant(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId;
    if (!userId) return next();

    const tenantId = req.headers['x-tenant-id'] as string;
    const tenantSlug = req.query.tenantId as string;

    if (!tenantId && !tenantSlug) return next();

    let tenant;
    if (tenantSlug) {
      tenant = await systemStorage.getTenantBySlug(tenantSlug);
    } else if (tenantId) {
      tenant = await systemStorage.getTenant(tenantId);
    }

    if (tenant) {
      const userTenants = await systemStorage.getUserTenants(userId);
      if (userTenants.some(t => t.id === tenant.id)) {
        req.tenant = tenant;
        req.tenantId = tenant.id;
      }
    }

    next();
  } catch (error) {
    console.error('Optional tenant resolution error:', error);
    next();
  }
}

