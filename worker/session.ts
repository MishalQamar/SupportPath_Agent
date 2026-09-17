// A new cookie name starts a fresh journey after switching source websites.
const COOKIE_NAME = 'supportpath_turn2us_session_v3';
const SESSION_AGE_SECONDS = 24 * 60 * 60;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type SessionEnv = { SESSION_SIGNING_KEY: string };

function base64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const raw = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(raw, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function signingKey(env: SessionEnv): Promise<CryptoKey> {
  if (!env.SESSION_SIGNING_KEY || env.SESSION_SIGNING_KEY.length < 32) {
    throw new Error('SESSION_SIGNING_KEY must contain at least 32 characters.');
  }
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.SESSION_SIGNING_KEY),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function signSession(id: string, env: SessionEnv): Promise<string> {
  const signature = await crypto.subtle.sign(
    'HMAC',
    await signingKey(env),
    new TextEncoder().encode(id),
  );
  return `${id}.${base64Url(new Uint8Array(signature))}`;
}

export async function readSessionId(
  request: Request,
  env: SessionEnv,
): Promise<string | null> {
  const cookie = request.headers.get('Cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const value = cookie?.slice(COOKIE_NAME.length + 1) ?? '';
  const [id, encodedSignature, extra] = value.split('.');
  if (!SESSION_ID_PATTERN.test(id ?? '') || !encodedSignature || extra) {
    return null;
  }
  const signature = fromBase64Url(encodedSignature);
  if (!signature || signature.length !== 32) return null;
  const valid = await crypto.subtle.verify(
    'HMAC',
    await signingKey(env),
    signature,
    new TextEncoder().encode(id),
  );
  return valid ? id : null;
}

export async function sessionResponse(
  request: Request,
  env: SessionEnv,
): Promise<Response> {
  const existing = await readSessionId(request, env);
  const id = existing ?? crypto.randomUUID();
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  if (!existing) {
    const value = await signSession(id, env);
    const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
    headers.set(
      'Set-Cookie',
      `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_AGE_SECONDS}${secure}`,
    );
  }
  return new Response(JSON.stringify({ id }), { headers });
}

export function isOwnAgentRoute(pathname: string, id: string): boolean {
  const segments = pathname.split('/');
  return segments[1] === 'agents' &&
    segments[2] === 'browser-agent' &&
    segments[3] === id &&
    segments.length <= 5;
}
