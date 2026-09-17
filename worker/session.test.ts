import { describe, expect, it } from 'vitest';
import { isOwnAgentRoute, readSessionId, sessionResponse } from './session';

const env = { SESSION_SIGNING_KEY: 'a-test-signing-key-with-at-least-32-characters' };

describe('private session boundaries', () => {
  it('accepts its signed cookie and rejects a changed session ID', async () => {
    const response = await sessionResponse(new Request('https://example.test/api/session'), env);
    const { id } = await response.json() as { id: string };
    const cookie = response.headers.get('Set-Cookie')?.split(';')[0] ?? '';
    expect(response.headers.get('Set-Cookie')).toContain('HttpOnly');
    expect(await readSessionId(new Request('https://example.test/', { headers: { Cookie: cookie } }), env)).toBe(id);

    const otherId = crypto.randomUUID();
    const tampered = cookie.replace(id, otherId);
    expect(await readSessionId(new Request('https://example.test/', { headers: { Cookie: tampered } }), env)).toBeNull();
    const previousSiteCookie = cookie.replace('supportpath_turn2us_session_v3=', 'supportpath_citizensadvice_session=');
    expect(await readSessionId(new Request('https://example.test/', { headers: { Cookie: previousSiteCookie } }), env)).toBeNull();
  });

  it('routes an agent connection only to the signed session', () => {
    const id = crypto.randomUUID();
    expect(isOwnAgentRoute(`/agents/browser-agent/${id}`, id)).toBe(true);
    expect(isOwnAgentRoute(`/agents/browser-agent/${crypto.randomUUID()}`, id)).toBe(false);
    expect(isOwnAgentRoute(`/agents/another-agent/${id}`, id)).toBe(false);
  });
});
