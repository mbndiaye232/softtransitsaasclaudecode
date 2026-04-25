/**
 * Cloudflare Worker — Reverse proxy vers le backend Express (Soft Transit API)
 * Variable d'environnement requise : BACKEND_URL (ex: https://api.mondomaine.com)
 */

export default {
  async fetch(request, env) {
    const backendUrl = env.BACKEND_URL;

    if (!backendUrl) {
      return new Response(
        JSON.stringify({ error: 'BACKEND_URL non configuré' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(request.url);
    const targetUrl = `${backendUrl}${url.pathname}${url.search}`;

    const proxyRequest = new Request(targetUrl, {
      method: request.method,
      headers: request.headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
      redirect: 'follow',
    });

    try {
      const response = await fetch(proxyRequest);

      const newHeaders = new Headers(response.headers);
      newHeaders.set('X-Proxied-By', 'Soft-Transit-Worker');

      // CORS pour le frontend Cloudflare Pages
      const origin = request.headers.get('Origin');
      if (origin) {
        newHeaders.set('Access-Control-Allow-Origin', origin);
        newHeaders.set('Access-Control-Allow-Credentials', 'true');
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: 'Backend inaccessible', detail: err.message }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }
  },

  // Gestion des requêtes OPTIONS (preflight CORS)
  async handleOptions(request) {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  },
};
