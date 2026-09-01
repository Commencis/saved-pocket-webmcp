"use client";

import { ExternalLink, Loader2, MessageSquare, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  text: string;
  items?: { id: string; title: string | null; url: string }[];
}

export function ChatDialog({
  onClose,
  onOpenItem,
  collectionId,
  collectionName,
}: {
  onClose: () => void;
  onOpenItem?: (id: string) => void;
  collectionId?: number;
  collectionName?: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmClose, setConfirmClose] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, ...(collectionId ? { collectionId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        return;
      }
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: data.answer, items: data.items },
      ]);
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  function requestClose() {
    if (messages.length > 0) setConfirmClose(true);
    else onClose();
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-end bg-black/20 pb-8 pl-4 pr-20 pt-4"
      onClick={requestClose}
    >
      <div
        className="relative flex h-[420px] w-full max-w-lg flex-col rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {confirmClose && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl bg-white/95 px-6 text-center backdrop-blur-sm">
            <p className="text-sm font-medium text-neutral-800">End this conversation?</p>
            <p className="text-xs text-neutral-500">Your chat history will be lost.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmClose(false)}
                className="rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
              >
                Keep chatting
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700"
              >
                End conversation
              </button>
            </div>
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <MessageSquare className="h-4 w-4 text-neutral-500" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-neutral-700">
              Chat with your library
            </span>
            {collectionName && (
              <span className="text-xs text-violet-600">
                Scoped to: {collectionName}
              </span>
            )}
          </div>
          <button
            onClick={requestClose}
            className="ml-auto rounded-lg p-1 text-neutral-400 hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-neutral-400">
              <MessageSquare className="h-8 w-8 opacity-30" />
              <p className="text-sm">
                Ask anything about your saved content.
              </p>
              <p className="text-xs opacity-70">
                e.g. "What did I save about React performance?" or "Show me finance tips"
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col gap-1 ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-800"
                }`}
              >
                {msg.role === "user" ? (
                  msg.text
                ) : (
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      ul: ({ children }) => <ul className="mb-1.5 ml-4 list-disc space-y-0.5">{children}</ul>,
                      ol: ({ children }) => <ol className="mb-1.5 ml-4 list-decimal space-y-0.5">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      h1: ({ children }) => <h1 className="mb-1 text-base font-bold">{children}</h1>,
                      h2: ({ children }) => <h2 className="mb-1 text-sm font-bold">{children}</h2>,
                      h3: ({ children }) => <h3 className="mb-1 text-sm font-semibold">{children}</h3>,
                      code: ({ children, className }) =>
                        className ? (
                          <code className="block rounded bg-neutral-200 px-2 py-1 font-mono text-xs my-1.5 whitespace-pre-wrap">{children}</code>
                        ) : (
                          <code className="rounded bg-neutral-200 px-1 font-mono text-xs">{children}</code>
                        ),
                      pre: ({ children }) => <pre className="my-1.5 overflow-x-auto">{children}</pre>,
                      a: ({ href, children }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" className="underline text-neutral-600 hover:text-neutral-900">{children}</a>
                      ),
                      hr: () => <hr className="my-2 border-neutral-300" />,
                    }}
                  >
                    {msg.text}
                  </ReactMarkdown>
                )}
              </div>
              {msg.role === "assistant" && msg.items && msg.items.length > 0 && (
                <div className="mt-1 flex flex-col gap-1 max-w-[85%]">
                  {msg.items.slice(0, 4).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white overflow-hidden"
                    >
                      <button
                        onClick={() => onOpenItem?.(item.id)}
                        className="flex-1 truncate px-2 py-1.5 text-left text-xs text-neutral-700 hover:bg-neutral-50"
                        title="Open in SavedPocket"
                      >
                        {item.title ?? item.url}
                      </button>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 border-l border-neutral-200 px-2 py-1.5 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"
                        title="Open original link"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex items-start">
              <div className="flex items-center gap-1.5 rounded-2xl bg-neutral-100 px-3 py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                <span className="text-xs text-neutral-400">Thinking…</span>
              </div>
            </div>
          )}
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </p>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-neutral-100 p-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about your saved content…"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400 max-h-32"
            style={{ height: "auto" }}
            onInput={(e) => {
              const t = e.currentTarget;
              t.style.height = "auto";
              t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
            }}
          />
          <button
            onClick={() => void send()}
            disabled={busy || !input.trim()}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
