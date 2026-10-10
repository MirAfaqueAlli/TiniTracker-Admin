/**
 * TiniTracker Admin — Next.js Edge Middleware (Security Proxy)
 * ════════════════════════════════════════════════════════════════
 * Runs BEFORE every request reaches a page or API route handler.
 * Uses the lightweight Edge runtime — no Node.js APIs, no DB roundtrips.
 * Provider JWT signature verified cryptographically via `jose`.
 *
 * Responsibilities:
 *  1. Route protection: unauthenticated visits to all admin pages redirect to /login.
 *  2. Auth bypass: already-authenticated admins hitting /login are bounced to /dashboard.
 *  3. CORS origin guard on all API routes (CSRF protection).
 *  4. In-memory sliding-window rate limiting (login: 10/15min, general: 60/min).
 *  5. OWASP security headers applied to EVERY response.
 *  6. No-cache headers on all API responses (prevent sensitive data caching).
 *  7. IP forwarding to downstream handlers via x-client-ip header.
 */

import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getRateLimitConfig, checkRateLimit } from './lib/rateLimiter';

// ─── Allowed origins ──────────────────────────────────────────────────────────
// In production set: CORS_ORIGIN=https://admin.tinitracker.in,https://app.tinitracker.in

function getAllowedOrigins() {
  const envOrigins = process.env.CORS_ORIGIN || process.env.ALLOWED_ORIGINS || '';
  const fromEnv = envOrigins
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  // Always include localhost variants for dev
  const devOrigins =
    process.env.NODE_ENV !== 'production'
      ? ['http://localhost:3000', 'http://localhost:3001']
      : [];

  return [...new Set([...fromEnv, ...devOrigins])];
}

/** Public API paths that don't require a provider token */
const PUBLIC_API_PREFIXES = [
  '/api/provider/auth/login',
];

// ─── OWASP security headers ──────────────────────────────────────────────────

const CSP_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-ancestors 'none'",    // Admin portal — stricter than main app
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join('; ');

function applySecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');          // Admin: no framing at all
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Content-Security-Policy', CSP_POLICY);
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  return response;
}

function applyApiCacheHeaders(response) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}

function applyRateLimitHeaders(response, rateCheck) {
  if (rateCheck?.limit !== undefined) {
    response.headers.set('X-RateLimit-Limit', String(rateCheck.limit));
    response.headers.set('X-RateLimit-Remaining', String(rateCheck.remaining));
    response.headers.set('X-RateLimit-Reset', String(rateCheck.resetSeconds));
  }
  return response;
}

// ─── CORS helpers ─────────────────────────────────────────────────────────────

function isOriginAllowed(origin) {
  if (!origin) return true; // Same-origin requests don't send Origin
  const cleanOrigin = origin.trim().replace(/\/+$/, '');
  const allowed = getAllowedOrigins();

  // Explicit allowlist match
  if (allowed.length > 0 && allowed.includes(cleanOrigin)) return true;

  // In development, allow all localhost origins if no env list set
  const isDev = process.env.NODE_ENV !== 'production';
  if (isDev) {
    if (
      cleanOrigin.startsWith('http://localhost:') ||
      cleanOrigin === 'http://localhost' ||
      cleanOrigin.startsWith('http://127.0.0.1:')
    ) return true;
  }

  return false;
}

function isCsrfSafe(request) {
  const method = request.method;
  // Safe methods don't need CSRF protection
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  const origin = request.headers.get('origin');
  if (!origin) return true; // No origin = same-origin fetch/form
  return isOriginAllowed(origin);
}

function applyCorsHeaders(response, request) {
  const origin = request.headers.get('origin');
  if (origin && isOriginAllowed(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    response.headers.set('Vary', 'Origin');
  }
  return response;
}

// ─── Client IP extraction ─────────────────────────────────────────────────────

function sanitizeIp(candidate) {
  if (!candidate || typeof candidate !== 'string') return null;
  let ip = candidate.trim();
  if (ip.startsWith('[') && ip.includes(']')) {
    ip = ip.substring(1, ip.indexOf(']'));
  } else if (ip.startsWith('::ffff:') && ip.includes('.')) {
    ip = ip.replace('::ffff:', '');
  } else if (!ip.includes(':') && ip.includes('.')) {
    ip = ip.split(':')[0];
  }
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  const IPV4 = /^(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
  return IPV4.test(ip) || ip.includes(':') ? ip : null;
}

function getClientIp(request) {
  const candidates = [
    request.headers.get('cf-connecting-ip'),
    request.headers.get('true-client-ip'),
    request.headers.get('x-real-ip'),
    ...(request.headers.get('x-forwarded-for') || '').split(','),
  ];
  for (const c of candidates) {
    const ip = sanitizeIp(c);
    if (ip) return ip;
  }
  return '127.0.0.1';
}


// ─── JWT verification ─────────────────────────────────────────────────────────

function getEncodedSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

/**
 * Verify the provider JWT from Authorization header or provider_token cookie.
 * Returns the JWT payload on success, null on failure.
 */
async function verifyProviderToken(request) {
  let token = request.cookies.get('provider_token')?.value;

  if (!token) {
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }
  }

  if (!token) return null;

  const secret = getEncodedSecret();
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    // Must be a provider-type token
    if (payload.type !== 'provider') return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Response builders ────────────────────────────────────────────────────────

function redirectToLogin(request) {
  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  const res = NextResponse.redirect(url);
  return applySecurityHeaders(res);
}

function redirectToDashboard(request) {
  const url = request.nextUrl.clone();
  url.pathname = '/dashboard';
  url.search = '';
  const res = NextResponse.redirect(url);
  return applySecurityHeaders(res);
}

function apiUnauthorized(message = 'Provider authentication required.', request, rateCheck = null) {
  const res = NextResponse.json({ error: message }, { status: 401 });
  applyCorsHeaders(res, request);
  applyApiCacheHeaders(res);
  if (rateCheck) applyRateLimitHeaders(res, rateCheck);
  return applySecurityHeaders(res);
}

function apiForbidden(message = 'Access denied.', request, rateCheck = null) {
  const res = NextResponse.json({ error: message }, { status: 403 });
  applyCorsHeaders(res, request);
  applyApiCacheHeaders(res);
  if (rateCheck) applyRateLimitHeaders(res, rateCheck);
  return applySecurityHeaders(res);
}

function apiRateLimited(rateCheck, request) {
  const res = NextResponse.json(
    { error: rateCheck.errorMessage, retryAfter: rateCheck.retryAfter },
    { status: 429 }
  );
  res.headers.set('Retry-After', String(rateCheck.retryAfter));
  res.headers.set('X-RateLimit-Limit', String(rateCheck.limit));
  res.headers.set('X-RateLimit-Remaining', '0');
  res.headers.set('X-RateLimit-Reset', String(rateCheck.resetSeconds));
  applyCorsHeaders(res, request);
  applyApiCacheHeaders(res);
  return applySecurityHeaders(res);
}

// ─── Route helpers ────────────────────────────────────────────────────────────

function startsWith(pathname, prefixes) {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// ─── Main proxy handler ────────────────────────────────────────────────────────

export async function proxy(request) {
  const { pathname } = request.nextUrl;
  const clientIp = getClientIp(request);

  // 1. Skip static assets and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(ico|png|jpg|jpeg|gif|svg|webp|woff|woff2|ttf|eot|css|js\.map|json|txt|xml)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2. Handle CORS preflight immediately
  if (request.method === 'OPTIONS') {
    const origin = request.headers.get('origin');
    if (origin && !isOriginAllowed(origin)) {
      const denied = NextResponse.json(
        { error: 'CORS preflight from untrusted origin denied.' },
        { status: 403 }
      );
      return applySecurityHeaders(denied);
    }
    const preflight = new NextResponse(null, { status: 204 });
    applyCorsHeaders(preflight, request);
    return applySecurityHeaders(preflight);
  }

  const isApiRoute = pathname.startsWith('/api/');

  // ══════════════════════════════════════════════════════════════════════════
  // A. API ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  if (isApiRoute) {
    // A0. CSRF origin guard for mutating requests
    if (!isCsrfSafe(request)) {
      return apiForbidden(
        'Cross-site request forgery protection: untrusted origin denied.',
        request
      );
    }

    // A1. Rate limiting
    const rateLimitConfig = getRateLimitConfig(pathname);
    let rateCheck = null;
    if (rateLimitConfig) {
      rateCheck = checkRateLimit(clientIp, rateLimitConfig);
      if (!rateCheck.allowed) {
        return apiRateLimited(rateCheck, request);
      }
    }

    // A2. Public API routes (login only) — allow through with IP header
    if (startsWith(pathname, PUBLIC_API_PREFIXES)) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-client-ip', clientIp);
      const res = NextResponse.next({ request: { headers: requestHeaders } });
      applyCorsHeaders(res, request);
      applyApiCacheHeaders(res);
      applyRateLimitHeaders(res, rateCheck);
      return applySecurityHeaders(res);
    }

    // A3. All other API routes require valid provider token
    const providerPayload = await verifyProviderToken(request);
    if (!providerPayload) {
      return apiUnauthorized('Provider authentication required.', request, rateCheck);
    }

    // Inject provider identity downstream
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-provider-id', String(providerPayload.id ?? ''));
    requestHeaders.set('x-provider-role', String(providerPayload.role ?? ''));
    requestHeaders.set('x-provider-type', 'provider');
    requestHeaders.set('x-client-ip', clientIp);

    const res = NextResponse.next({ request: { headers: requestHeaders } });
    applyCorsHeaders(res, request);
    applyApiCacheHeaders(res);
    applyRateLimitHeaders(res, rateCheck);
    return applySecurityHeaders(res);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // B. PAGE ROUTES
  // ══════════════════════════════════════════════════════════════════════════

  // B1. Login page: if already authenticated, bounce to dashboard
  if (pathname === '/login' || pathname.startsWith('/login/')) {
    const providerPayload = await verifyProviderToken(request);
    if (providerPayload) {
      return redirectToDashboard(request);
    }
    return applySecurityHeaders(NextResponse.next());
  }

  // B2. Root page: redirect to /dashboard (which will gate-keep itself)
  if (pathname === '/') {
    return redirectToDashboard(request);
  }

  // B3. All other pages require a valid provider token
  const providerPayload = await verifyProviderToken(request);
  if (!providerPayload) {
    const res = redirectToLogin(request);
    // Clear stale cookie if present
    if (request.cookies.has('provider_token')) {
      res.cookies.delete('provider_token');
    }
    return res;
  }

  return applySecurityHeaders(NextResponse.next());
}

// ─── Matcher config ───────────────────────────────────────────────────────────

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff2?|ttf|eot|css|js\\.map|json|txt|xml)$).*)',
  ],
};
