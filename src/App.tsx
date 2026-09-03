import { useAgentChat } from '@cloudflare/ai-chat/react';
import { useAgent } from 'agents/react';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';

type SeoCheck = {
  id: string;
  label: string;
  passed: boolean;
  value: unknown;
};

type SeoAuditOutput = {
  url: string;
  score: number;
  checks: SeoCheck[];
  screenshot: string;
};

const seoFixes: Record<string, string> = {
  title:
    'Add one descriptive <title> between 10 and 60 characters inside <head>.',
  description:
    'Add a unique meta description between 50 and 160 characters that summarizes this page.',
  h1: 'Use exactly one clear <h1> for the page’s primary heading.',
  'image-alt':
    'Add an alt attribute to every image. Use meaningful text for informative images and alt="" for decorative ones.',
  'open-graph':
    'Add both og:title and og:image meta properties so shared links have a title and preview image.',
  canonical:
    'Add a <link rel="canonical"> pointing to the preferred URL for this page.',
  viewport:
    'Add <meta name="viewport" content="width=device-width, initial-scale=1"> inside <head>.',
  'html-lang':
    'Add the page language to the root element, for example <html lang="en">.',
};

function isSeoCheck(check: unknown): check is SeoCheck {
  return (
    typeof check === 'object' &&
    check !== null &&
    'id' in check &&
    typeof check.id === 'string' &&
    'label' in check &&
    typeof check.label === 'string' &&
    'passed' in check &&
    typeof check.passed === 'boolean' &&
    'value' in check
  );
}

function isSeoAuditOutput(output: unknown): output is SeoAuditOutput {
  if (typeof output !== 'object' || output === null) {
    return false;
  }

  return (
    'url' in output &&
    typeof output.url === 'string' &&
    'score' in output &&
    typeof output.score === 'number' &&
    'checks' in output &&
    Array.isArray(output.checks) &&
    output.checks.every(isSeoCheck) &&
    'screenshot' in output &&
    typeof output.screenshot === 'string'
  );
}

function formatCheckValue(value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return 'Not found';
  }

  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, item]) => `${key}: ${String(item ?? 'Not found')}`)
      .join(' • ');
  }

  return String(value);
}

function SeoAuditReport({ output }: { output: SeoAuditOutput }) {
  const score = Math.max(0, Math.min(100, output.score));
  const passedCount = output.checks.filter((check) => check.passed).length;
  const failedCount = output.checks.length - passedCount;
  const scoreColor =
    score >= 80
      ? 'text-emerald-600'
      : score >= 50
        ? 'text-amber-600'
        : 'text-red-600';
  const scoreStroke =
    score >= 80 ? '#059669' : score >= 50 ? '#d97706' : '#dc2626';
  const circumference = 2 * Math.PI * 44;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white text-sm shadow-sm">
      <div className="border-b border-zinc-200 bg-zinc-50/80 p-5">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 space-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Audit complete
            </span>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-zinc-950">
                SEO health report
              </h2>
              <a
                href={output.url}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block truncate text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900"
              >
                {output.url}
              </a>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 font-medium text-emerald-700">
                {passedCount} passed
              </span>
              <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">
                {failedCount} needs improvement
              </span>
            </div>
          </div>

          <div className="relative grid h-28 w-28 shrink-0 place-items-center self-center">
            <svg
              viewBox="0 0 104 104"
              className="absolute inset-0 h-full w-full -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="52"
                cy="52"
                r="44"
                fill="none"
                stroke="#e4e4e7"
                strokeWidth="8"
              />
              <circle
                cx="52"
                cy="52"
                r="44"
                fill="none"
                stroke={scoreStroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="text-center">
              <div className={`text-3xl font-bold leading-none ${scoreColor}`}>
                {score}
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wide text-zinc-500">
                out of 100
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="font-semibold text-zinc-950">Audit checklist</h3>
          <span className="text-xs text-zinc-500">8 SEO checks</span>
        </div>

        <div className="space-y-2.5">
          {output.checks.map((check) => (
            <article
              key={check.id}
              className={`rounded-lg border p-3.5 ${
                check.passed
                  ? 'border-zinc-200 bg-white'
                  : 'border-red-200 bg-red-50/60'
              }`}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                    check.passed
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                  aria-label={check.passed ? 'Passed' : 'Failed'}
                >
                  {check.passed ? '✓' : '!'}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h4 className="font-medium leading-6 text-zinc-900">
                      {check.label}
                    </h4>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide ${
                        check.passed ? 'text-emerald-700' : 'text-red-700'
                      }`}
                    >
                      {check.passed ? 'Passed' : 'Improve'}
                    </span>
                  </div>

                  <p className="mt-1 break-words text-xs leading-5 text-zinc-500">
                    <span className="font-medium text-zinc-600">Found:</span>{' '}
                    {formatCheckValue(check.value)}
                  </p>

                  {!check.passed && (
                    <div className="mt-2 rounded-md border border-red-100 bg-white/80 p-2.5 text-xs leading-5 text-zinc-700">
                      <span className="font-semibold text-red-700">How to fix: </span>
                      {seoFixes[check.id] ??
                        'Review this item and update the page markup to meet the check.'}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <figure className="border-t border-zinc-200 bg-zinc-50 p-5">
        <figcaption className="mb-3 flex items-center justify-between gap-3">
          <span className="font-semibold text-zinc-950">Page screenshot</span>
          <span className="text-xs text-zinc-500">Captured during audit</span>
        </figcaption>
        <img
          src={output.screenshot}
          alt={`Screenshot of ${output.url}`}
          className="w-full rounded-lg border border-zinc-200 bg-white shadow-sm"
        />
      </figure>
    </div>
  );
}

function App() {
  const agent = useAgent({ agent: 'BrowserAgent' });

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
      if (part.type === 'reasoning') return null;
      if (isToolUIPart(part)) {
        const toolName = getToolName(part);

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
                <strong>Approve {toolName}?</strong>
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
              <strong>{toolName}</strong> — Rejected
            </div>
          );
        }

        if (toolName === 'auditSeo') {
          if (
            part.state === 'output-available' &&
            isSeoAuditOutput(part.output)
          ) {
            return (
              <div key={i} className="mt-2">
                <SeoAuditReport output={part.output} />
              </div>
            );
          }

          if (part.state === 'output-error') {
            return (
              <div
                key={i}
                className="mt-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-semibold">The audit could not be completed</p>
                <p className="mt-1 text-xs leading-5 text-red-700">
                  Check that the URL is public and try again.
                </p>
              </div>
            );
          }

          return (
            <div
              key={i}
              className="mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-900" />
                </span>
                <div>
                  <p className="font-semibold text-zinc-900">
                    Auditing website…
                  </p>
                  <p className="mt-0.5 text-xs text-zinc-500">
                    Opening the page and checking its SEO structure.
                  </p>
                </div>
              </div>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-zinc-100">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-zinc-900" />
              </div>
            </div>
          );
        }

        return (
          <div
            key={i}
            className="mt-2 rounded-md border border-zinc-200 bg-zinc-50 p-2 text-xs"
          >
            <div className="flex items-center gap-2">
              <span className="rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-white">
                {toolName}
              </span>
              <span className="text-zinc-500">{part.state}</span>
            </div>
            {'input' in part && part.input != null && (
              <pre className="mt-1 overflow-x-auto text-zinc-600">
                {JSON.stringify(part.input, null, 2)}
              </pre>
            )}
            {part.state === 'output-available' &&
              (isSeoAuditOutput(part.output) ? (
                <SeoAuditReport output={part.output} />
              ) : (
                <pre className="mt-1 overflow-x-auto text-zinc-600">
                  {JSON.stringify(part.output, null, 2)}
                </pre>
              ))}
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
            🌐 SEO Agent
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
