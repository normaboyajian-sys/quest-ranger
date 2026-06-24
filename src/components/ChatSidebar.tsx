import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { chatEditFile } from "@/lib/aiEdit.functions";
import {
  emitAIEdit,
  getActiveFile,
  getEditorContent,
  subscribeEditor,
  type ActiveFile,
} from "@/lib/editorBus";
import { saveFile } from "@/lib/designStore";

type Msg = { role: "user" | "assistant"; content: string };

const HISTORY_KEY = (design: string | undefined) =>
  `ai_chat_history:${design ?? "default"}`;

function loadHistory(design: string | undefined): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY(design));
    if (!raw) return [];
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.slice(-40);
  } catch {
    /* ignore */
  }
  return [];
}

function saveHistory(design: string | undefined, msgs: Msg[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY(design), JSON.stringify(msgs.slice(-40)));
  } catch {
    /* quota */
  }
}

export function ChatSidebar({ onClose }: { onClose: () => void }) {
  const [active, setActive] = useState<ActiveFile | null>(() =>
    getActiveFile(),
  );
  const [messages, setMessages] = useState<Msg[]>(() =>
    loadHistory(getActiveFile()?.design),
  );
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const send = useServerFn(chatEditFile);

  // Track active file from PagesEditor
  useEffect(() => {
    const off = subscribeEditor(() => {
      const next = getActiveFile();
      setActive((prev) => {
        if (prev?.design !== next?.design) {
          setMessages(loadHistory(next?.design));
        }
        return next;
      });
    });
    return off;
  }, []);

  // Persist messages whenever they change
  useEffect(() => {
    saveHistory(active?.design, messages);
  }, [messages, active?.design]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // Focus the textarea on open
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleSend() {
    const text = input.trim();
    if (!text || busy) return;
    const file = getActiveFile();
    if (!file) {
      setError("Open a file in the Pages tab first.");
      return;
    }
    setError(null);
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const oldContent = getEditorContent();
      const res = await send({
        data: {
          messages: next.map((m) => ({ role: m.role, content: m.content })),
          file: {
            design: file.design,
            designLabel: file.designLabel,
            page: file.page,
            pageLabel: file.pageLabel,
            kind: file.kind,
          },
          content: oldContent,
        },
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
      for (const edit of res.edits) {
        // Persist + tell the editor to update and flash the diff
        try {
          await saveFile(
            { design: file.design, page: file.page, kind: file.kind },
            edit.newContent,
          );
        } catch (e) {
          console.error(e);
        }
        emitAIEdit({
          file,
          oldContent,
          newContent: edit.newContent,
        });
      }
    } catch (e) {
      console.error(e);
      const msg = (e as Error).message ?? "Request failed";
      setError(msg);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${msg}` },
      ]);
    } finally {
      setBusy(false);
      // Re-focus the textarea after the reply lands
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function clearChat() {
    if (!window.confirm("Clear this chat history?")) return;
    setMessages([]);
    saveHistory(active?.design, []);
  }

  const ctx = active
    ? `${active.designLabel ?? active.design} · ${active.pageLabel ?? active.page}.${active.kind}`
    : "Open a file to start";

  return (
    <aside className="admin-chat">
      <div className="admin-chat-head">
        <div className="admin-chat-title">
          <span className="admin-chat-dot" /> AI editor
        </div>
        <div className="admin-chat-head-actions">
          <button
            type="button"
            className="admin-icon-btn"
            title="Clear chat"
            onClick={clearChat}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18" />
              <path d="M8 6V4h8v2" />
              <path d="M19 6l-1 14H6L5 6" />
            </svg>
          </button>
          <button
            type="button"
            className="admin-icon-btn"
            title="Close chat"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18" />
              <path d="M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="admin-chat-ctx" title={ctx}>
        {ctx}
      </div>

      <div className="admin-chat-list" ref={listRef}>
        {messages.length === 0 && (
          <div className="admin-chat-empty">
            Ask the AI to edit this file. It can rewrite HTML, CSS or JS.
            Edits show up live in the editor with a green flash for 20s.
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`admin-chat-msg admin-chat-msg-${m.role}`}
          >
            <div className="admin-chat-msg-body">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="admin-chat-msg admin-chat-msg-assistant">
            <div className="admin-chat-msg-body admin-chat-typing">
              <span /> <span /> <span />
            </div>
          </div>
        )}
        {error && !busy && (
          <div className="admin-chat-error">{error}</div>
        )}
      </div>

      <form
        className="admin-chat-composer"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSend();
        }}
      >
        <textarea
          ref={inputRef}
          className="admin-chat-input"
          rows={2}
          placeholder={
            active
              ? `Ask the AI to edit ${active.pageLabel ?? active.page}.${active.kind}…`
              : "Open a file in Pages first"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void handleSend();
            }
          }}
          disabled={busy || !active}
        />
        <button
          type="submit"
          className="admin-btn admin-btn-primary admin-chat-send"
          disabled={busy || !input.trim() || !active}
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </aside>
  );
}
