// ---------------------------------------------------------------------------
// IntelligenceChatPage — Claude-like full-page AI chat interface
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useStrategicAgent } from '../../hooks/useStrategicAgent';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const suggestedQuestions = [
  { label: 'Weekly focus', question: 'What should I focus on this week?' },
  { label: 'Gallery allocation', question: 'Which gallery deserves more allocation?' },
  { label: 'Underpriced series', question: 'Are any series underpriced relative to demand?' },
  { label: 'Urgent attention', question: 'Which works need attention most urgently?' },
  { label: 'Collector opportunities', question: 'What are the top collector opportunities?' },
  { label: 'Market positioning', question: 'How is my market positioning evolving?' },
];

// ---------------------------------------------------------------------------
// Markdown-lite renderer
// ---------------------------------------------------------------------------
function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = i;

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={key} className="mb-1 mt-3 text-xs font-bold text-primary-900 first:mt-0">
          {line.slice(4)}
        </h4>,
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key} className="mb-1 mt-3 text-sm font-bold text-primary-900 first:mt-0">
          {line.slice(3)}
        </h3>,
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h2 key={key} className="mb-2 mt-3 text-sm font-bold text-primary-900 first:mt-0">
          {line.slice(2)}
        </h2>,
      );
    }
    // Bullet points
    else if (/^[-•*]\s/.test(line)) {
      elements.push(
        <p key={key} className="ml-3 text-xs leading-relaxed">
          <span className="mr-1.5 text-primary-400">•</span>
          {renderInline(line.replace(/^[-•*]\s/, ''))}
        </p>,
      );
    }
    // Numbered lists
    else if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1] || '';
      elements.push(
        <p key={key} className="ml-3 text-xs leading-relaxed">
          <span className="mr-1.5 font-medium text-primary-500">{num}.</span>
          {renderInline(line.replace(/^\d+\.\s/, ''))}
        </p>,
      );
    }
    // Empty line
    else if (line.trim() === '') {
      elements.push(<div key={key} className="h-2" />);
    }
    // Regular paragraph
    else {
      elements.push(
        <p key={key} className="text-xs leading-relaxed">
          {renderInline(line)}
        </p>,
      );
    }
  }

  return elements;
}

function renderInline(text: string): React.ReactNode {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return part;
  });
}

// ---------------------------------------------------------------------------
// Relative time formatter
// ---------------------------------------------------------------------------
function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export function IntelligenceChatPage() {
  const location = useLocation();
  const {
    conversations,
    asking,
    ask,
    fetchConversations,
    loadConversation,
    deleteConversation,
  } = useStrategicAgent();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const initialQuestionHandled = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  // Focus textarea on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // ---- Load conversation ---------------------------------------------------
  const handleLoadConversation = useCallback(
    async (id: string) => {
      const msgs = await loadConversation(id);
      if (msgs) {
        setMessages(
          msgs.map((m) => ({ role: m.role, content: m.content })),
        );
        setActiveConversationId(id);
      }
      setSidebarOpen(false);
    },
    [loadConversation],
  );

  // ---- New chat ------------------------------------------------------------
  const handleNewChat = useCallback(() => {
    setMessages([]);
    setActiveConversationId(null);
    setInput('');
    setSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  // ---- Delete conversation -------------------------------------------------
  const handleDelete = useCallback(
    async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      await deleteConversation(id);
      if (activeConversationId === id) {
        handleNewChat();
      }
    },
    [deleteConversation, activeConversationId, handleNewChat],
  );

  // ---- Submit message ------------------------------------------------------
  const handleSubmit = useCallback(
    async (question: string) => {
      if (!question.trim() || asking) return;

      const userMsg: ChatMessage = { role: 'user', content: question.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      const result = await ask(question.trim(), activeConversationId || undefined);
      if (result) {
        if (result.conversation_id) {
          setActiveConversationId(result.conversation_id);
        }
        setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }]);
        await fetchConversations();
      }
    },
    [asking, activeConversationId, ask, fetchConversations],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  // ---- Auto-submit from location state (e.g., "Research" button) ----------
  useEffect(() => {
    const state = location.state as { initialQuestion?: string } | null;
    if (state?.initialQuestion && !initialQuestionHandled.current) {
      initialQuestionHandled.current = true;
      // Clear state to prevent re-triggering on back/forward navigation
      window.history.replaceState({}, '');
      handleSubmit(state.initialQuestion);
    }
  }, [location.state, handleSubmit]);

  // ---- Render --------------------------------------------------------------
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 mt-16 w-72 border-r border-primary-100 bg-white transition-transform lg:relative lg:mt-0 lg:translate-x-0`}
      >
        <div className="flex h-full flex-col">
          {/* New Chat button */}
          <div className="border-b border-primary-100 p-3">
            <button
              type="button"
              onClick={handleNewChat}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary-200 bg-white px-4 py-2.5 text-xs font-medium text-primary-700 transition-colors hover:bg-primary-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                <path strokeLinecap="round" d="M8 3v10M3 8h10" />
              </svg>
              New Chat
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="px-3 py-8 text-center text-[11px] text-primary-400">
                No conversations yet
              </div>
            ) : (
              <div className="p-2">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => handleLoadConversation(conv.id)}
                    className={`group relative mb-0.5 flex w-full items-start rounded-lg px-3 py-2.5 text-left transition-colors ${
                      activeConversationId === conv.id
                        ? 'bg-primary-100 text-primary-900'
                        : 'text-primary-600 hover:bg-primary-50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {conv.title || 'Untitled conversation'}
                      </p>
                      <p className="mt-0.5 text-[10px] text-primary-400">
                        {relativeTime(conv.updated_at)}
                      </p>
                    </div>
                    {/* Delete button on hover */}
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, conv.id)}
                      className="ml-1 shrink-0 rounded p-1 text-primary-300 opacity-0 transition-all hover:bg-primary-200 hover:text-primary-600 group-hover:opacity-100"
                      title="Delete conversation"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3">
                        <path strokeLinecap="round" d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1M5 4v8a1 1 0 001 1h4a1 1 0 001-1V4" />
                      </svg>
                    </button>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-primary-100 px-3 py-2">
            <p className="text-center text-[10px] text-primary-300">
              Powered by NOA Intelligence
            </p>
          </div>
        </div>
      </aside>

      {/* Main chat area */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Chat header (mobile) */}
        <div className="flex items-center gap-3 border-b border-primary-100 px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-md p-1.5 text-primary-500 hover:bg-primary-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5">
              <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
            </svg>
          </button>
          <h1 className="text-sm font-medium text-primary-700">Intelligence Chat</h1>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-6">
            {messages.length === 0 ? (
              // Welcome state
              <div className="flex min-h-[60vh] flex-col items-center justify-center">
                {/* Logo/greeting */}
                <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-primary-900">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="h-7 w-7">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 3l.4 1.4a2 2 0 001.2 1.2L21 6l-1.4.4a2 2 0 00-1.2 1.2L18 9l-.4-1.4a2 2 0 00-1.2-1.2L15 6l1.4-.4a2 2 0 001.2-1.2L18 3z" />
                  </svg>
                </div>
                <h2 className="mb-2 font-display text-xl font-bold text-primary-900">
                  NOA Intelligence
                </h2>
                <p className="mb-8 max-w-md text-center text-sm text-primary-500">
                  Ask anything about your portfolio strategy, market positioning, or business decisions.
                </p>

                {/* Suggested questions grid */}
                <div className="grid w-full max-w-xl grid-cols-2 gap-2 sm:grid-cols-3">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q.question}
                      type="button"
                      onClick={() => handleSubmit(q.question)}
                      className="flex flex-col items-start rounded-xl border border-primary-200 bg-white p-3.5 text-left transition-all hover:border-primary-300 hover:shadow-sm"
                    >
                      <span className="text-[10px] font-medium uppercase tracking-wider text-primary-400">
                        {q.label}
                      </span>
                      <span className="mt-1.5 text-xs text-primary-700 leading-snug">
                        {q.question}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Message list
              <div className="space-y-6">
                {messages.map((msg, i) => (
                  <div key={i}>
                    {msg.role === 'user' ? (
                      // User message
                      <div className="flex justify-end">
                        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-primary-900 px-4 py-3 text-xs leading-relaxed text-white">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      // Assistant message
                      <div className="flex gap-3">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-primary-600">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1 text-primary-800">
                          {renderMarkdown(msg.content)}
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Typing indicator */}
                {asking && (
                  <div className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-100">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 text-primary-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                      </svg>
                    </div>
                    <div className="flex items-center gap-1 rounded-2xl bg-primary-50 px-4 py-3">
                      <LoadingSpinner size="sm" />
                      <span className="ml-2 text-xs text-primary-500">Thinking…</span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input area */}
        <div className="border-t border-primary-100 bg-white px-4 py-3">
          <div className="mx-auto max-w-3xl">
            <div className="flex items-end gap-2 rounded-xl border border-primary-200 bg-white px-3 py-2 transition-colors focus-within:border-primary-400 focus-within:ring-1 focus-within:ring-primary-400">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio…"
                maxLength={2000}
                rows={1}
                disabled={asking}
                className="max-h-40 min-h-[24px] flex-1 resize-none border-0 bg-transparent text-sm text-primary-900 placeholder:text-primary-400 focus:outline-none focus:ring-0 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || asking}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-900 text-white transition-colors hover:bg-primary-800 disabled:opacity-30"
                title="Send message"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13V3l10 5-10 5z" />
                </svg>
              </button>
            </div>
            <p className="mt-1.5 text-center text-[10px] text-primary-300">
              NOA Intelligence can make mistakes. Verify important strategic decisions.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
