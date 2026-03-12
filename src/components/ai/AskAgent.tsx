// ---------------------------------------------------------------------------
// AskAgent — floating chat modal for conversational AI Q&A
// ---------------------------------------------------------------------------

import { useState, useRef, useEffect, useCallback } from 'react';

interface AskAgentProps {
  asking: boolean;
  onAsk: (question: string, conversationId?: string) => Promise<{ answer: string; conversation_id: string } | null>;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const suggestedQuestions = [
  'What should I focus on this week?',
  'Which gallery deserves more allocation?',
  'Are any series underpriced relative to demand?',
  'Which works need attention most urgently?',
  'What are the top collector opportunities?',
];

export function AskAgent({ asking, onAsk }: AskAgentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = useCallback(
    async (question: string) => {
      if (!question.trim() || asking) return;

      const userMsg: ChatMessage = { role: 'user', content: question.trim() };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');

      const result = await onAsk(question.trim(), conversationId);
      if (result) {
        setConversationId(result.conversation_id);
        setMessages((prev) => [...prev, { role: 'assistant', content: result.answer }]);
      }
    },
    [asking, conversationId, onAsk],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const startNewConversation = () => {
    setMessages([]);
    setConversationId(undefined);
  };

  return (
    <>
      {/* Floating action button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary-900 text-white shadow-lg transition-all hover:bg-primary-800 hover:shadow-xl"
        title="Ask NOA Intelligence"
      >
        {isOpen ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M6 14l8-8" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 3a7 7 0 00-6.32 10.05L3 17l3.95-.68A7 7 0 1010 3z" />
            <circle cx="7" cy="10" r="0.75" fill="currentColor" />
            <circle cx="10" cy="10" r="0.75" fill="currentColor" />
            <circle cx="13" cy="10" r="0.75" fill="currentColor" />
          </svg>
        )}
      </button>

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 flex h-[500px] w-[380px] flex-col overflow-hidden rounded-xl border border-primary-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-primary-100 bg-primary-900 px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-white">NOA Intelligence</h3>
              <p className="text-[10px] text-primary-300">Ask about your portfolio</p>
            </div>
            <button
              type="button"
              onClick={startNewConversation}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-primary-300 transition-colors hover:bg-primary-800 hover:text-white"
              title="New conversation"
            >
              New Chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {messages.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center">
                <div className="mb-4 rounded-full bg-primary-50 p-3">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6 text-primary-400">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                </div>
                <p className="mb-4 text-center text-xs text-primary-500">
                  Ask anything about your portfolio strategy
                </p>
                <div className="w-full space-y-1.5">
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleSubmit(q)}
                      className="w-full rounded-lg border border-primary-100 px-3 py-2 text-left text-[11px] text-primary-600 transition-colors hover:border-primary-300 hover:bg-primary-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary-900 text-white'
                          : 'bg-primary-50 text-primary-800'
                      }`}
                    >
                      {msg.content.split('\n').map((line, j) => (
                        <p key={j} className={j > 0 ? 'mt-1.5' : ''}>
                          {line.startsWith('**') && line.endsWith('**')
                            ? <strong>{line.slice(2, -2)}</strong>
                            : line.startsWith('- ') || line.startsWith('• ')
                              ? <span className="ml-2">{line}</span>
                              : line
                          }
                        </p>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Typing indicator */}
                {asking && (
                  <div className="flex justify-start">
                    <div className="rounded-lg bg-primary-50 px-3 py-2">
                      <div className="flex gap-1">
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '0ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '150ms' }} />
                        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-400" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-primary-100 p-3">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your portfolio…"
                maxLength={1000}
                disabled={asking}
                className="flex-1 rounded-lg border border-primary-200 px-3 py-2 text-xs text-primary-900 placeholder:text-primary-400 focus:border-primary-400 focus:outline-none focus:ring-1 focus:ring-primary-400 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => handleSubmit(input)}
                disabled={!input.trim() || asking}
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-900 text-white transition-colors hover:bg-primary-800 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2 8h12M8 2l6 6-6 6" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
