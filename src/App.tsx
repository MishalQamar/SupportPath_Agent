import { useEffect, useMemo, useRef, useState } from 'react';
import { useAgentChat } from '@cloudflare/ai-chat/react';
import { useAgent } from 'agents/react';
import { getToolName, isToolUIPart, type UIMessage } from 'ai';
import { isAllowedTurn2usUrl } from '../worker/journey-policy';
import { assessQuestion } from '../worker/question-guard';
import type { BrowserAgentState } from '../worker/types';
import { EXAMPLE_PROMPTS } from './example-prompts';

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    compass: <><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2.1 4.9-4.9 2.1 2.1-4.9 4.9-2.1Z"/><circle cx="12" cy="12" r=".5"/></>,
    camera: <><path d="M5 7h2l1.2-2h7.6L17 7h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3"/></>,
    shield: <path d="M12 3 4.5 6v5c0 4.6 3.2 8 7.5 10 4.3-2 7.5-5.4 7.5-10V6L12 3Z"/>,
    external: <><path d="M14 4h6v6M20 4l-9 9"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/></>,
    send: <><path d="m21 3-7.4 18-3.8-7.8L2 9.4 21 3Z"/><path d="m9.8 13.2 4.6-4.6"/></>,
    spark: <path d="m12 2 1.3 5.2L18 10l-4.7 2.8L12 18l-1.3-5.2L6 10l4.7-2.8L12 2Z"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    bolt: <path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>,
    family: <><circle cx="9" cy="7" r="3"/><circle cx="17" cy="9" r="2"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M15 15.5a4 4 0 0 1 6 3.5v1"/></>,
    heart: <path d="M20.8 5.8a5.5 5.5 0 0 0-7.8 0L12 6.9l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z"/>,
    wallet: <><path d="M4 6h14a2 2 0 0 1 2 2v10H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12"/><path d="M15 11h6v4h-6a2 2 0 0 1 0-4Z"/></>,
    route: <><circle cx="6" cy="5" r="2"/><circle cx="18" cy="19" r="2"/><path d="M8 5h3a3 3 0 0 1 3 3v8a3 3 0 0 0 3 3h-1"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M18.5 16A8 8 0 1 1 20 12"/></>,
    stop: <rect x="5" y="5" width="14" height="14" rx="2"/>,
    eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function LinkifiedText({ text }: { text: string }) {
  const chunks = text.split(/(https?:\/\/[^\s)\]]+)/g);
  return <>{chunks.map((chunk, index) => /^https?:\/\//.test(chunk) && isAllowedTurn2usUrl(chunk.replace(/[.,;:]$/, '')) ? (
    <a key={index} href={chunk.replace(/[.,;:]$/, '')} target="_blank" rel="noreferrer" className="answer-link">
      {chunk.replace(/[.,;:]$/, '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}<Icon name="external" size={13} />
    </a>
  ) : <span key={index}>{chunk}</span>)}</>;
}

type ComposerProps = {
  hero?: boolean;
  input: string;
  isWorking: boolean;
  setInput: (value: string) => void;
  submitPrompt: (message: string) => void;
};

function Composer({ hero = false, input, isWorking, setInput, submitPrompt }: ComposerProps) {
  return (
    <form className={`composer ${hero ? 'composer-hero' : ''}`} onSubmit={(event) => { event.preventDefault(); submitPrompt(input); }}>
      <label htmlFor={hero ? 'hero-question' : 'chat-question'} className="sr-only">Ask about one type of support</label>
      <textarea id={hero ? 'hero-question' : 'chat-question'} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); submitPrompt(input); } }} rows={hero ? 3 : 1} placeholder="Ask about one type of support…" disabled={isWorking} />
      <div className="composer-footer"><span>{hero ? 'One question at a time · No personal details needed' : 'Support information, not eligibility advice'}</span><button type="submit" className="send-button" disabled={!input.trim() || isWorking} aria-label="Send message"><Icon name="send" size={18} /></button></div>
    </form>
  );
}

function Workspace({ sessionId }: { sessionId: string }) {
  const [input, setInput] = useState('');
  const [inputFeedback, setInputFeedback] = useState<string | null>(null);
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isHandingOff, setIsHandingOff] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const agent = useAgent<BrowserAgentState>({
    agent: 'BrowserAgent',
    name: sessionId,
    onConnectionError: () => setConnectionError('The connection was interrupted. Please try again.'),
    onOpen: () => setConnectionError(null),
  });
  const persistedState = agent?.state as Partial<BrowserAgentState> | undefined;
  const liveUrl = persistedState?.liveUrl ?? null;
  const evidence = useMemo(() => persistedState?.evidence ?? [], [persistedState?.evidence]);
  const route = persistedState?.route ?? [];
  const hopCount = persistedState?.hopCount ?? 0;
  const journeyStatus = persistedState?.journeyStatus ?? 'idle';
  const { messages, sendMessage, clearHistory, status, stop, error: chatError, isStreaming, addToolApprovalResponse } = useAgentChat({ agent });
  const isWorking = status === 'submitted' || status === 'streaming' || isStreaming;
  const showError = actionError || connectionError || persistedState?.journeyError || (chatError ? 'The search was interrupted. Please try again.' : null);
  const hasStarted = messages.length > 0;
  const latestEvidence = evidence.at(-1);

  const routeItems = useMemo(() => {
    const seen = new Set<string>();
    return evidence.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  }, [evidence]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, status]);

  const submitPrompt = (message: string) => {
    const clean = message.trim();
    if (!clean || isWorking || isResetting) return;
    const assessment = assessQuestion(clean);
    if (assessment.kind === 'invalid') {
      setInputFeedback(assessment.message);
      return;
    }
    setInputFeedback(null);
    setActionError(null);
    sendMessage({ text: clean });
    setInput('');
  };

  const updateInput = (value: string) => {
    setInput(value);
    setInputFeedback(null);
  };

  const resetJourney = async (): Promise<boolean> => {
    if (isResetting || isWorking) return false;
    setIsResetting(true);
    setActionError(null);
    try {
      await agent.call('resetJourney');
      clearHistory();
      setInput('');
      setInputFeedback(null);
      setEvidenceOpen(false);
      return true;
    } catch {
      setActionError('The search could not be reset. Please try again.');
      return false;
    } finally {
      setIsResetting(false);
    }
  };

  const retryQuestion = async () => {
    const previous = [...messages].reverse().find((message) => message.role === 'user');
    const question = previous?.parts.filter((part) => part.type === 'text').map((part) => part.text).join(' ') ?? '';
    if (!question) return;
    if (await resetJourney()) submitPrompt(question);
  };

  const takeControl = async () => {
    setIsHandingOff(true);
    setActionError(null);
    try {
      await agent.call('takeControl');
    } catch {
      setActionError('Browser control could not start. Please try again.');
    } finally {
      setIsHandingOff(false);
    }
  };

  const finishTakeover = async () => {
    setIsHandingOff(true);
    setActionError(null);
    try {
      await agent.call('finishTakeover');
    } catch {
      setActionError('The browser could not be closed. Please try again.');
    } finally {
      setIsHandingOff(false);
    }
  };

  const stopExploring = async () => {
    try {
      await stop();
      await agent.call('cancelJourney');
    } catch {
      setActionError('The search was stopped, but the browser could not be closed. Start a new chat to continue.');
    }
  };

  function renderMessage(msg: UIMessage) {
    return msg.parts.map((part, index) => {
      if (part.type === 'text') return <p key={index} className="message-copy"><LinkifiedText text={part.text} /></p>;
      if (part.type === 'reasoning' || !isToolUIPart(part)) return null;
      const name = getToolName(part);
      if ('approval' in part && part.state === 'approval-requested') {
        return <div key={index} className="approval-card"><p><strong>SupportPath needs your approval</strong> to {name}.</p><div className="approval-actions"><button onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: true })}>Allow</button><button className="quiet-button" onClick={() => addToolApprovalResponse({ id: part.approval.id, approved: false })}>Not now</button></div></div>;
      }
      const output = part.state === 'output-available' ? part.output as { ok?: boolean; title?: string; closed?: boolean; message?: string; goalReached?: boolean } : undefined;
      const failed = part.state === 'output-error' || part.state === 'output-denied' || output?.ok === false;
      const labels: Record<string, string> = {
        startJourney: output?.title ? `Started at ${output.title}` : 'Starting at the Turn2us homepage',
        followLink: output?.title ? `Visited ${output.title}` : 'Opening a Turn2us page',
        readPage: output?.title ? `Read ${output.title}` : 'Reading this page',
        screenshot: 'Saved screenshot evidence',
        finishJourney: 'Found the relevant page',
        closeBrowser: output?.closed ? 'Browser session closed' : 'Browser session complete',
      };
      return <div key={index} className={`activity-line ${failed ? 'failed' : part.state === 'output-available' ? 'complete' : ''}`}><span className="activity-icon">{failed ? '!' : part.state === 'output-available' ? <Icon name="check" size={13} /> : <span className="pulse-dot" />}</span><span>{failed ? (output?.message ?? 'This step could not be completed.') : output?.goalReached ? 'Reached the requested page' : (labels[name] ?? 'Checking the official source')}</span></div>;
    });
  }

  return <div className="app-shell">
    <header className="topbar">
      <a href="/" className="brand" aria-label="SupportPath home"><span className="brand-mark"><Icon name="compass" size={22} /></span><span>SupportPath</span></a>
      <div className="trust-note"><Icon name="shield" size={16} /><span>Information from Turn2us</span></div>
      <div className="top-actions">{hasStarted && <button className="text-button" onClick={() => { void resetJourney(); }} disabled={isWorking || isResetting}><Icon name="refresh" size={15} /> {isResetting ? 'Resetting…' : 'New chat'}</button>}<a className="source-link" href="https://www.turn2us.org.uk/" target="_blank" rel="noreferrer">Visit Turn2us <Icon name="external" size={14} /></a></div>
    </header>

    <main className={`workspace ${hasStarted ? 'is-active' : ''}`}>
      <section className="conversation-panel">
        {!hasStarted ? <div className="welcome">
          <div className="eyebrow"><span><Icon name="spark" size={14} /></span> A clearer path to support</div>
          <h1>What do you need<br/><em>help with?</em></h1>
          <p className="intro">Start with one topic, such as rent, benefits or energy bills.</p>
          <Composer hero input={input} isWorking={isWorking} setInput={updateInput} submitPrompt={submitPrompt} />
          {inputFeedback && <div className="input-feedback" role="alert">{inputFeedback}</div>}
          <div className="examples-header"><span>Or choose one example</span><span className="hairline" /></div>
          <div className="example-grid">{EXAMPLE_PROMPTS.map((example) => <button key={example.title} className="example-card" onClick={() => submitPrompt(example.prompt)} disabled={isWorking || isResetting}><span className={`example-icon ${example.icon}`}><Icon name={example.icon} size={20} /></span><span><strong>{example.title}</strong><small>{example.description}</small></span><span className="example-arrow">→</span></button>)}</div>
          {showError && <div className="error-banner" role="alert">{showError}{connectionError && <div className="error-actions"><button onClick={() => window.location.reload()}>Reconnect</button></div>}</div>}
          <div className="how-it-works"><div><span>1</span><p><strong>You describe</strong><br/>what you need</p></div><i/><div><span>2</span><p><strong>We navigate</strong><br/>the official site</p></div><i/><div><span>3</span><p><strong>You decide</strong><br/>what to do next</p></div></div>
        </div> : <div className="chat-layout">
          <div className="chat-heading"><div><span className={`status-dot ${isWorking ? 'working' : ''}`} /><span>{journeyStatus === 'user_in_control' ? 'You are in control' : journeyStatus === 'awaiting_takeover' ? 'Ready for your input' : isWorking ? 'Exploring Turn2us' : journeyStatus === 'found' ? 'Page found' : 'Support guide'}</span></div><span>{hopCount} of 5 steps used</span></div>
          <div className="messages" aria-live="polite">{messages.map((message) => { const isUser = message.role === 'user'; return <article key={message.id} className={`message-row ${isUser ? 'user' : 'assistant'}`}>{!isUser && <span className="assistant-avatar"><Icon name="compass" size={16} /></span>}<div className="message-body"><span className="message-author">{isUser ? 'You' : 'SupportPath'}</span><div className="message-bubble">{renderMessage(message)}</div></div></article>; })}{status === 'submitted' && <article className="message-row assistant"><span className="assistant-avatar"><Icon name="compass" size={16} /></span><div className="message-body"><span className="message-author">SupportPath</span><div className="thinking"><span/><span/><span/></div></div></article>}{showError && <div className="error-banner" role="alert"><span>{showError}</span><div className="error-actions">{connectionError ? <button onClick={() => window.location.reload()}>Reconnect</button> : <><button onClick={() => { void retryQuestion(); }} disabled={isWorking || isResetting}>Retry this question</button><button onClick={() => { void resetJourney(); }} disabled={isWorking || isResetting}>New chat</button></>}</div></div>}<div ref={messagesEndRef} /></div>
          <div className="chat-composer-wrap">{isWorking && <button className="stop-button" onClick={() => { void stopExploring(); }}><Icon name="stop" size={12} /> Stop exploring</button>}<Composer input={input} isWorking={isWorking || isResetting || journeyStatus === 'awaiting_takeover' || journeyStatus === 'user_in_control'} setInput={updateInput} submitPrompt={submitPrompt} />{inputFeedback && <div className="input-feedback" role="alert">{inputFeedback}</div>}</div>
        </div>}
      </section>

      <aside className="journey-panel">
        <div className="browser-card">
          <div className="browser-heading">
            <div><span className={`live-indicator ${liveUrl ? 'on' : ''}`} /> <strong>{liveUrl ? 'Live browser' : latestEvidence ? 'Saved page snapshot' : 'Browser preview'}</strong></div>
            {liveUrl && <span className="watching"><Icon name="eye" size={14} /> {journeyStatus === 'user_in_control' ? 'You have control' : 'View only'}</span>}
          </div>
          <div className="browser-frame">
            <div className="browser-chrome"><div className="traffic"><span/><span/><span/></div><div className="address"><Icon name="lock" size={11} /> {latestEvidence ? new URL(latestEvidence.url).hostname : 'turn2us.org.uk'}</div></div>
            {liveUrl ? <iframe title="SupportPath live browser" src={liveUrl} allow="clipboard-read; clipboard-write" /> : latestEvidence ? <>
              <img className="last-capture" src={`/${latestEvidence.key}`} alt={`Saved screenshot: ${latestEvidence.title}`} />
              <div className="capture-footer"><span>Browser closed · last page saved</span><a href={latestEvidence.url} target="_blank" rel="noreferrer">Open live page <Icon name="external" size={12} /></a></div>
            </> : <div className="browser-empty"><div className="preview-art"><span className="preview-logo"><Icon name="compass" size={30} /></span><i/><i/><i/></div><h2>Your guided journey<br/>will appear here</h2><p>Watch as SupportPath visits and reads<br/>the Turn2us website.</p></div>}
          </div>
        </div>
        {journeyStatus === 'awaiting_takeover' && <div className="handoff-card"><p>This tool may ask for personal details. Take control to continue privately.</p><button onClick={() => { void takeControl(); }} disabled={isHandingOff}>{isHandingOff ? 'Opening…' : 'Take control'}</button></div>}
        {journeyStatus === 'user_in_control' && <div className="handoff-card"><p>You control this browser now. SupportPath will not navigate or capture screenshots while you do.</p><button onClick={() => { void finishTakeover(); }} disabled={isHandingOff}>{isHandingOff ? 'Closing…' : 'Done, close browser'}</button></div>}
        <div className="journey-details"><div className="detail-heading"><div><Icon name="route" size={18} /><strong>Journey</strong></div>{route.length > 0 && <span>{route.length} page{route.length === 1 ? '' : 's'}</span>}</div>{routeItems.length ? <ol className="route-list">{routeItems.map((item, index) => <li key={item.url}><span>{index + 1}</span><div><strong>{item.title || 'Turn2us page'}</strong><a href={item.url} target="_blank" rel="noreferrer">Open source <Icon name="external" size={12} /></a></div></li>)}</ol> : <div className="empty-detail"><span className="empty-icon"><Icon name="route" size={20} /></span><p>The exact route will be recorded here as pages are visited.</p></div>}
          <button className="evidence-toggle" onClick={() => setEvidenceOpen((open) => !open)} disabled={!evidence.length}><span><Icon name="camera" size={17} /> Screenshot evidence</span><span>{evidence.length || '—'} {evidence.length ? (evidenceOpen ? '↑' : '↓') : ''}</span></button>
          {evidenceOpen && evidence.length > 0 && <div className="evidence-grid">{evidence.map((item, index) => <a href={`/${item.key}`} target="_blank" rel="noreferrer" className="evidence-item" key={item.key}><img src={`/${item.key}`} alt={`Evidence ${index + 1}: ${item.title}`} loading="lazy" /><span>{index + 1}. {item.title}</span></a>)}</div>}
        </div>
        <div className="privacy-card"><span><Icon name="shield" size={18} /></span><p><strong>You stay in control</strong> If a calculator asks for personal details, SupportPath will pause so you can complete it privately.</p></div>
      </aside>
    </main>
    <footer><span>Independent guide to Turn2us pages. SupportPath does not decide eligibility or provide legal, medical or financial advice.</span><span>Not affiliated with Turn2us</span></footer>
  </div>;
}

let sessionRequest: Promise<string> | null = null;

function loadSession(): Promise<string> {
  if (!sessionRequest) {
    sessionRequest = fetch('/api/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!response.ok) throw new Error('Session service unavailable');
        const data: { id?: string } = await response.json();
        if (!data.id) throw new Error('Session service returned no ID');
        return data.id;
      })
      .catch((error: unknown) => {
        sessionRequest = null;
        throw error;
      });
  }
  return sessionRequest;
}

function App() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let active = true;
    loadSession()
      .then((id) => { if (active) setSessionId(id); })
      .catch(() => { if (active) setSessionError(true); });
    return () => { active = false; };
  }, []);

  if (sessionError) {
    return <div className="session-screen"><h1>We couldn’t start your session</h1><p>Please try again in a moment.</p><button onClick={() => { setSessionError(false); loadSession().then(setSessionId).catch(() => setSessionError(true)); }}>Try again</button></div>;
  }
  if (!sessionId) return <div className="session-screen" role="status">Starting your private session…</div>;
  return <Workspace sessionId={sessionId} />;
}

export default App;
