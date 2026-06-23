import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

// Methods that don't change state never require a CSRF token.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export type CsrfOptions = {
  // Name of the cookie that holds the token (must be readable by client JS).
  cookieName?: string;
  // Request header the client echoes the token in. Default: x-csrf-token
  headerName?: string;
  // Body field checked as a fallback (for non-JS HTML form posts). Default: _csrf
  fieldName?: string;
  // HMAC secret. Defaults to CSRF_SECRET, then JWT_PRIVATE_KEY.
  secret?: string;
  // Cookie attributes.
  cookie?: {
    sameSite?: boolean | 'lax' | 'strict' | 'none';
    secure?: boolean;
    path?: string;
    maxAge?: number;
  };
  // Path prefixes to skip (e.g. signed webhooks that can't carry the token).
  ignorePaths?: string[];
};

function resolveSecret(options?: CsrfOptions): string {
  const secret = options?.secret || process.env.CSRF_SECRET || process.env.JWT_PRIVATE_KEY;
  if (!secret) throw new Error('CSRF secret is not set (set CSRF_SECRET or JWT_PRIVATE_KEY)');
  return secret;
}

function hmac(value: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(value).digest('base64url');
}

// A token is "<random>.<hmac(random)>". Signing it means an attacker who can
// plant a cookie (e.g. via a sibling subdomain) still can't forge a valid token
// without the server secret — this is the "signed" in signed double-submit.
function issueToken(secret: string): string {
  const random = crypto.randomBytes(32).toString('base64url');
  return `${random}.${hmac(random, secret)}`;
}

function isValidToken(token: unknown, secret: string): boolean {
  if (typeof token !== 'string' || !token) return false;
  const idx = token.lastIndexOf('.');
  if (idx <= 0 || idx === token.length - 1) return false;
  const random = token.slice(0, idx);
  const signature = token.slice(idx + 1);
  return timingSafeEqual(signature, hmac(random, secret));
}

function timingSafeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

function readSubmittedToken(req: Request, headerName: string, fieldName: string): string {
  const header = req.headers[headerName];
  const fromHeader = Array.isArray(header) ? header[0] : header;
  if (fromHeader) return fromHeader;
  if (req.body && typeof req.body[fieldName] === 'string') return req.body[fieldName];
  return '';
}

// Stateless CSRF protection using a signed double-submit cookie.
//
// On safe requests it issues a signed token cookie (readable by client JS).
// On state-changing requests (POST/PUT/PATCH/DELETE) it requires that same
// token to be echoed back in a header (or form field) and to match the cookie.
// A cross-site attacker can make the browser send the cookie automatically but
// cannot read it (same-origin policy) nor set a custom header, so the check
// fails for forged requests.
export function createCsrfMiddleware(options?: CsrfOptions) {
  // Resolve the secret once so misconfiguration fails at startup, not per request.
  const secret = resolveSecret(options);
  const cookieName = options?.cookieName || 'csrfToken';
  const headerName = (options?.headerName || 'x-csrf-token').toLowerCase();
  const fieldName = options?.fieldName || '_csrf';
  const ignorePaths = options?.ignorePaths || [];
  const cookieOptions = {
    httpOnly: false, // must be readable by client JS for the double-submit
    sameSite: options?.cookie?.sameSite ?? 'lax' as const,
    secure: options?.cookie?.secure ?? process.env.NODE_ENV !== 'development',
    path: options?.cookie?.path ?? '/',
    maxAge: options?.cookie?.maxAge,
  };

  return function csrfMiddleware(req: Request, res: Response, next: NextFunction) {
    const existing: string = req.cookies?.[cookieName] || '';

    // Issue (or rotate) a token cookie when the current one is missing/invalid.
    let token = existing;
    if (!isValidToken(existing, secret)) {
      token = issueToken(secret);
      res.cookie(cookieName, token, cookieOptions);
    }
    // Make the token available to server-rendered pages (e.g. a hidden form field).
    res.locals.csrfToken = token;

    if (SAFE_METHODS.has(req.method)) return next();
    if (ignorePaths.some(prefix => req.path.startsWith(prefix))) return next();

    const submitted = readSubmittedToken(req, headerName, fieldName);
    if (isValidToken(existing, secret) && timingSafeEqual(submitted, existing)) {
      return next();
    }
    res.status(403).json({ message: 'Invalid CSRF token', });
  };
}
