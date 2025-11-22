export interface Env {
  MODE?: string
  NODE_ENV?: string
  APP_VERSION?: string
  DATABASE_URL?: string
  CHITTYCONNECT_API_BASE?: string
  CHITTYCONNECT_API_TOKEN?: string
  CHITTY_AUTH_SERVICE_TOKEN?: string
  API_ORIGIN?: string
  ASSETS: { fetch: (request: Request) => Promise<Response> }
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const body = JSON.stringify(data);
  return new Response(body, { status: 200, headers: { 'content-type': 'application/json; charset=utf-8' }, ...init });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Cloudflare Agent entrypoint (placeholder until full Agents integration)
    // Requirement: agent should be available at /agent
    if (path === '/agent') {
      const html = `<!doctype html>
        <html lang="en">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>ChittyFinance Agent</title>
          <style>
            body { font-family: -apple-system, system-ui, Segoe UI, Roboto, Helvetica, Arial, sans-serif; margin: 40px; line-height: 1.5; }
            code { padding: 2px 4px; background: #f5f5f5; border-radius: 4px; }
            .muted { color: #666 }
          </style>
        </head>
        <body>
          <h1>ChittyFinance Agent</h1>
          <p class="muted">System mode endpoint is reserved for Cloudflare Agents.</p>
          <p>Docs: <a href="https://github.com/cloudflare/agents" target="_blank" rel="noreferrer">cloudflare/agents</a></p>
          <p>Status:</p>
          <pre>{
  "mode": "${env.MODE || 'system'}",
  "nodeEnv": "${env.NODE_ENV || 'production'}",
  "provider": "cloudflare-agents (pending integration)",
  "ready": false
}</pre>
        </body>
        </html>`;
      return new Response(html, { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    if (path === '/health') {
      return json({ status: 'ok' });
    }

    if (path === '/api/v1/status') {
      const version = env.APP_VERSION || '1.0.0';
      const MODE = env.MODE || 'system';
      const nodeEnv = env.NODE_ENV || 'production';
      const dbConfigured = MODE === 'standalone' ? true : Boolean(env.DATABASE_URL);
      const chittyConfigured = Boolean((env.CHITTYCONNECT_API_BASE || '') && (env.CHITTYCONNECT_API_TOKEN || env.CHITTY_AUTH_SERVICE_TOKEN));
      return json({
        name: 'ChittyFinance',
        version,
        uptimeSec: Math.floor((Date.now() - performance.timeOrigin) / 1000),
        mode: MODE,
        nodeEnv,
        database: { configured: dbConfigured },
        chittyConnect: { configured: chittyConfigured },
        latencyMs: 0,
      });
    }

    if (path === '/api/v1/documentation') {
      const version = env.APP_VERSION || '1.0.0';
      return json({
        openapi: '3.0.3',
        info: { title: 'ChittyFinance API', version, description: 'ChittyFinance API for the ChittyOS ecosystem.' },
        servers: [{ url: 'https://finance.chitty.cc' }],
        paths: {
          '/health': { get: { summary: 'Health check', responses: { '200': { description: 'OK' } } } },
          '/api/v1/status': { get: { summary: 'Service status', responses: { '200': { description: 'Service status' } } } }
        }
      });
    }

    if (path === '/api/v1/metrics') {
      const MODE = env.MODE || 'system';
      const dbConfigured = MODE === 'standalone' ? 1 : (env.DATABASE_URL ? 1 : 0);
      const chittyConfigured = (env.CHITTYCONNECT_API_BASE && (env.CHITTYCONNECT_API_TOKEN || env.CHITTY_AUTH_SERVICE_TOKEN)) ? 1 : 0;
      const uptime = Math.floor((Date.now() - performance.timeOrigin) / 1000);
      const lines = [
        '# HELP service_uptime_seconds Process uptime in seconds',
        '# TYPE service_uptime_seconds gauge',
        `service_uptime_seconds ${uptime}`,
        '# HELP service_database_configured Database configured (1) or not (0)',
        '# TYPE service_database_configured gauge',
        `service_database_configured ${dbConfigured}`,
        '# HELP service_chittyconnect_configured ChittyConnect configured (1) or not (0)',
        '# TYPE service_chittyconnect_configured gauge',
        `service_chittyconnect_configured ${chittyConfigured}`,
        ''
      ];
      return new Response(lines.join('\n'), { status: 200, headers: { 'content-type': 'text/plain; version=0.0.4' } });
    }

    // API proxy (optional): if API_ORIGIN is set, forward /api/*
    if (path.startsWith('/api/') && env.API_ORIGIN) {
      const target = new URL(env.API_ORIGIN);
      const upstream = new URL(request.url);
      upstream.hostname = target.hostname;
      upstream.protocol = target.protocol;
      upstream.port = target.port;
      const init: RequestInit = {
        method: request.method,
        headers: request.headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : await request.clone().arrayBuffer()
      };
      return fetch(upstream.toString(), init);
    }

    // Minimal redirect helpers to keep flows discoverable
    if (path === '/connect') {
      const target = env.CHITTYCONNECT_API_BASE?.replace(/\/?api\/?$/, '') || 'https://connect.chitty.cc';
      return Response.redirect(target, 302);
    }
    if (path === '/register') {
      return Response.redirect('https://get.chitty.cc', 302);
    }
    // Static assets (served by Workers Assets)
    const assetResp = await env.ASSETS.fetch(request);
    if (assetResp.status !== 404) return assetResp;
    // Fallback 404
    return new Response('Not Found', { status: 404 });
  }
}
