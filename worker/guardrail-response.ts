import { createUIMessageStream, createUIMessageStreamResponse } from 'ai';

export function guardrailResponse(message: string): Response {
  const id = crypto.randomUUID();
  return createUIMessageStreamResponse({
    stream: createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: 'text-start', id });
        writer.write({ type: 'text-delta', id, delta: message });
        writer.write({ type: 'text-end', id });
      },
    }),
  });
}
