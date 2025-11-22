import type { Request, Response, NextFunction } from 'express';

// Minimal tenant-scoping middleware. Reads from header or query.
export function tenantScope(req: Request, _res: Response, next: NextFunction) {
  // Accept tenant from x-tenant-id header or ?tenant= query param.
  const headerTenant = (req.headers['x-tenant-id'] || req.headers['x-tenant']) as string | undefined;
  const queryTenant = (req.query.tenant as string) || (req.query.tenantId as string) || undefined;
  // Store on request for later use; keep as string | undefined for now.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (req as any).tenantId = headerTenant || queryTenant;
  next();
}

