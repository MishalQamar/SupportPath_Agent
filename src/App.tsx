import { useAgentChat } from '@cloudflare/ai-chat/react';
import { useAgent } from 'agents/react';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import type { BrowserAgentState } from '../worker/types';

function App() {
  const agent = useAgent<BrowserAgentState>({
    agent: 'BrowserAgent',
  });
  const persistedState = agent?.state as
    | Partial<BrowserAgentState>
    | undefined;
  const liveUrl = persistedState?.liveUrl ?? null;
  const evidence = persistedState?.evidence ?? [];
  const hopCount = persistedState?.hopCount ?? 0;

  const {
    messages,
    sendMessage,
    clearHistory,
    status,
    stop,
    addToolApprovalResponse,
  } = useAgentChat({ agent });

  const handleSubmit = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const message = formData.get('input') as string;
    if (!message?.trim()) return;
    sendMessage({ text: message });
    e.currentTarget.reset();
  };

  function renderMessage(msg: UIMessage) {
    return msg.parts.map((part, i) => {
      if (part.type === 'text')
        return (
          <p key={i} className="whitespace-pre-wrap leading-relaxed">
            {part.text}
          </p>
        );
      if (part.type === 'reasoning')
        return (
          <p key={i} className="text-xs italic text-zinc-500">
            {part.text}
          </p>
        );
      if (isToolUIPart(part)) {
        if (
          'approval' in part &&
          part.state === 'approval-requested'
        ) {
          return (
            <div
              key={i}
              className="text-sm bg-yellow-50 border border-yellow-300 p-2 rounded my-1"
            >
              <div>
                <strong>Approve {getToolName(part)}?</strong>
              </div>
              {'input' in part && part.input != null && (
                <pre className="mt-1">
                  {JSON.stringify(part.input, null, 2)}
                </pre>
              )}
              <div className="mt-2 flex gap-2">
                <button
                  className="px-3 py-1 bg-green-500 text-white rounded"
                  onClick={() =>
                    addToolApprovalResponse({
                      id: part.approval.id,
                      approved: true,
                    })
                  }
                >
                  Approve
                </button>
                <button
                  className="px-3 py-1 bg-red-500 text-white rounded"
                  onClick={() =>
                    addToolApprovalResponse({
                      id: part.approval.id,
                      approved: false,
                    })
                  }
                >
                  Reject
                </button>
              </div>
            </div>
          );
        }

        if (part.state === 'output-denied') {
          return (
            <div
              key={i}
              className="text-sm bg-red-50 border border-red-300 p-2 rounded my-1"
            >
              <strong>{getToolName(part)}</strong> — Rejected
            </div>
          );
        }

        const name = getToolName(part);
        const output =
          part.state === 'output-available'
            ? (part.output as
                | {
                    key?: string;
                    screenshotKey?: string;
                  }
                | undefined)
            : undefined;
        const screenshotKey =
          output?.screenshotKey ?? output?.key ?? null;

        return (
          <div
            key={i}
            className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {name}
              </span>
              <span className="text-zinc-500">{part.state}</span>
            </div>
            {'input' in part && part.input != null && (
              <pre className="mt-1 overflow-x-auto text-zinc-600">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            )}
            {screenshotKey ? (
              <img
                src={`/${screenshotKey}`}
                alt="screenshot"
                className="mt-2 w-full rounded border border-zinc-200"
              />
            ) : (
              part.state === 'output-available' && (
                <pre className="mt-1 overflow-x-auto text-zinc-600">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              )
            )}
          </div>
        );
      }
      return null;
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <h1 className="shrink-0 text-sm font-semibold tracking-tight">
            🌐 Browser Agent
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-1 gap-2">
            <input
              name="input"
              placeholder="Type a message..."
              autoComplete="off"
              className="flex-1 rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm outline-none transition focus:border-zinc-400 focus:bg-white"
            />
            <button
              type="submit"
              className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
            >
              Send
            </button>
          </form>
          <button
            onClick={clearHistory}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900"
          >
            Clear
          </button>
          <button
            onClick={stop}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-red-500 transition hover:bg-red-100 hover:text-red-900"
          >
            Stop
          </button>
          <span className="shrink-0 text-xs text-zinc-400">
            {status}
          </span>
        </div>
      </header>

      {liveUrl ? (
        <section className="border-b border-zinc-200 bg-white px-4 py-4">
          <div className="mx-auto max-w-5xl">
            <h2 className="mb-2 text-sm font-semibold">
              Live browser
            </h2>
            <iframe
              title="Browser Live View"
              src={liveUrl}
              className="h-[600px] w-full rounded-lg border border-zinc-200 bg-white"
              allow="clipboard-read; clipboard-write"
            />
          </div>
        </section>
      ) : null}

      {evidence.length ? (
        <section className="border-b border-zinc-200 bg-zinc-100 px-4 py-4">
          <div className="mx-auto max-w-5xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">
                Evidence history
              </h2>
              <span className="text-xs text-zinc-500">
                {evidence.length} screenshot
                {evidence.length === 1 ? '' : 's'} · {hopCount}/5 hops
              </span>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {evidence.map((item, index) => (
                <figure
                  key={item.key}
                  className="overflow-hidden rounded-lg border border-zinc-200 bg-white"
                >
                  <img
                    src={`/${item.key}`}
                    alt={`Evidence ${index + 1}: ${item.title}`}
                    className="w-full border-b border-zinc-200"
                    loading="lazy"
                  />
                  <figcaption className="space-y-1 p-3 text-xs">
                    <div className="font-medium text-zinc-900">
                      {index + 1}. {item.title || 'Untitled page'}
                    </div>
                    <div className="text-zinc-500">
                      Hop {item.hop}
                    </div>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-blue-600 hover:underline"
                    >
                      {item.url}
                    </a>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 pb-24">
        <div className="flex-1 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full min-h-[40vh] items-center justify-center text-sm text-zinc-400">
              Say something to get started.
            </div>
          )}
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                    isUser
                      ? 'bg-zinc-900 text-white'
                      : 'border border-zinc-200 bg-white text-zinc-900'
                  }`}
                >
                  {renderMessage(message)}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default App;
