import { describe, expect, it } from 'vitest';
import { guardrailResponse } from './guardrail-response';

describe('guardrail chat response', () => {
  it('streams a fixed, visible reply without calling a model', async () => {
    const response = guardrailResponse('Please choose one support question.');
    expect(response.headers.get('content-type')).toContain('text/event-stream');
    const body = await response.text();
    expect(body).toContain('Please choose one support question.');
    expect(body).toContain('text-delta');
    expect(body).toContain('[DONE]');
  });
});
