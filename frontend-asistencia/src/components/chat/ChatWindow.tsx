import { useEffect, useMemo, useRef, useState } from "react";
import type { Message, UserChat } from "../../types/chat";
import { typingStart, typingStop } from "../../services/chat";
import {
  AlertTriangle,
  ArrowDown,
  Send,
  Loader2,
  MessageSquareText,
} from "lucide-react";
import MessageBubble from "./MessageBubble";

function fmtTime(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getMsgId(m: any) {
  return m?.id != null ? String(m.id) : "";
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="h-1.5 w-1.5 rounded-full bg-black/40 animate-bounce [animation-delay:-200ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-black/40 animate-bounce [animation-delay:-100ms]" />
      <span className="h-1.5 w-1.5 rounded-full bg-black/40 animate-bounce" />
    </div>
  );
}

export default function ChatWindow({
  conversationId,
  meId,
  user,
  messages,
  loading,
  text,
  setText,
  sending,
  onSend,
  isOtherTyping,
  error,
}: {
  conversationId: number | null;
  meId: number;
  user: UserChat | null;
  messages: Message[];
  loading: boolean;
  text: string;
  setText: (v: string) => void;
  sending: boolean;
  onSend: () => void;
  isOtherTyping: boolean;
  error: string | null;
}) {
  const safe = useMemo(() => (Array.isArray(messages) ? messages : []), [messages]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [atBottom, setAtBottom] = useState(true);
  const [newCount, setNewCount] = useState(0);

  const lastMsgId = safe.length ? getMsgId(safe[safe.length - 1]) : "";
  const lastSeenMsgIdRef = useRef<string>(lastMsgId);

  // ===== Typing debounce (start/stop) =====
  const typingTimerRef = useRef<number | null>(null);
  const typingOnRef = useRef(false);

  function scrollToBottom(behavior: ScrollBehavior = "smooth") {
    bottomRef.current?.scrollIntoView({ behavior, block: "end" });
  }

  function computeAtBottom() {
    const el = listRef.current;
    if (!el) return true;
    const threshold = 120;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  }

  // Track scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    const onScroll = () => {
      const ok = computeAtBottom();
      setAtBottom(ok);
      if (ok) setNewCount(0);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    setAtBottom(computeAtBottom());

    return () => el.removeEventListener("scroll", onScroll as any);
  }, []);

  // Intelligent auto-scroll on new messages
  useEffect(() => {
    if (loading) return;

    const currentLastId = lastMsgId;
    const prevLastId = lastSeenMsgIdRef.current;

    if (currentLastId && currentLastId === prevLastId) return;
    lastSeenMsgIdRef.current = currentLastId;

    if (atBottom) {
      scrollToBottom("smooth");
      setNewCount(0);
      return;
    }

    if (currentLastId) setNewCount((n) => n + 1);
  }, [lastMsgId, loading, atBottom]);

  // Typing indicator: solo baja si estás abajo
  useEffect(() => {
    if (!isOtherTyping) return;
    if (atBottom) scrollToBottom("smooth");
  }, [isOtherTyping, atBottom]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "0px";
    const max = 110;
    ta.style.height = Math.min(max, ta.scrollHeight) + "px";
  }, [text]);

  // ✅ Dispara typingStart/typingStop según escribes
  useEffect(() => {
    if (!conversationId) return;

    const hasText = text.trim().length > 0;

    if (hasText && !typingOnRef.current) {
      typingOnRef.current = true;
      typingStart(conversationId);
    }

    if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);

    typingTimerRef.current = window.setTimeout(() => {
      if (typingOnRef.current) {
        typingOnRef.current = false;
        typingStop(conversationId);
      }
    }, 1200);

    return () => {
      if (typingTimerRef.current) window.clearTimeout(typingTimerRef.current);
    };
  }, [text, conversationId]);

  // ✅ cuando envías (o se limpia el texto), apaga typing
  useEffect(() => {
    if (!conversationId) return;
    if (text.trim().length > 0) return;

    if (typingOnRef.current) {
      typingOnRef.current = false;
      typingStop(conversationId);
    }
  }, [text, conversationId]);

  const placeholder = user ? `Escribe a ${user.name}...` : "Escribe...";

  return (
    <div className="flex flex-col h-[520px] relative">
      {/* Barra superior interna (sutil) */}
      <div className="px-4 py-2.5 border-b border-black/10 bg-white">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl border border-black/10 bg-black/[0.03] grid place-items-center">
              <MessageSquareText className="h-5 w-5 text-black/55" />
            </div>
            <div className="min-w-0">
              <div className="font-extrabold text-sm truncate">{user?.name ?? "Chat"}</div>
              <div className="text-[11px] text-black/45">
                {isOtherTyping ? "Escribiendo…" : "Mensajes"}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-[11px] text-black/45 flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Cargando…
            </div>
          ) : null}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-sm bg-[#FE003E]/10 border-b border-[#FE003E]/20 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-[#FE003E] mt-0.5" />
          <div className="text-black/80">
            <b className="text-[#FE003E]">Error:</b> {error}
          </div>
        </div>
      )}

      <div ref={listRef} className="flex-1 p-3 overflow-auto bg-slate-50 relative">
        {loading ? (
          <div className="text-sm text-black/60">Cargando chat...</div>
        ) : safe.length === 0 ? (
          <div className="text-sm text-black/60">No hay mensajes aún.</div>
        ) : (
          <div className="space-y-2">
            {safe.map((m: any) => {
              const mine = Number(m.sender_id) === Number(meId);
              const pending = !!m.__pending;
              const errored = !!m.__error;

              return (
                <div key={m.id} className="space-y-1">
                  {/* Burbuja usando componente */}
                  <MessageBubble m={m} mine={mine} />

                  {/* Estado debajo (solo si es mío) */}
                  {mine && (pending || errored) ? (
                    <div className={"text-[10px] flex items-center gap-2 " + (mine ? "justify-end" : "justify-start")}>
                      {pending ? (
                        <span className="text-black/45 flex items-center gap-1.5">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          enviando…
                        </span>
                      ) : null}
                      {errored ? (
                        <span className="text-[#FE003E] font-bold" title="No se pudo enviar">
                          falló
                        </span>
                      ) : null}
                      {/* si tu bubble no muestra hora, aquí tienes acceso */}
                      <span className="text-black/35">{fmtTime(m.created_at)}</span>
                    </div>
                  ) : null}
                </div>
              );
            })}

            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="bg-white border border-black/10 rounded-2xl px-3 py-2 text-sm text-black/70 flex items-center gap-2">
                  <span className="text-[12px] text-black/60">Escribiendo</span>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {!atBottom && newCount > 0 && (
          <button
            type="button"
            onClick={() => {
              scrollToBottom("smooth");
              setNewCount(0);
              setAtBottom(true);
            }}
            className={[
              "absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full",
              "bg-black text-white px-3 py-2 text-xs font-extrabold shadow-lg",
              "flex items-center gap-2",
              "hover:scale-[1.02] transition",
              "focus:outline-none focus:ring-4 focus:ring-black/10",
            ].join(" ")}
            title="Ir a los nuevos mensajes"
          >
            <ArrowDown className="h-4 w-4" />
            Nuevos ({newCount})
          </button>
        )}
      </div>

      <div className="p-3 border-t border-black/10 bg-white">
        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={placeholder}
            rows={1}
            className={[
              "flex-1 resize-none rounded-2xl border border-black/10 px-3 py-2 outline-none leading-5",
              "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
              "bg-white",
            ].join(" ")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSend();
              }
            }}
          />

          <button
            type="button"
            onClick={onSend}
            disabled={sending || !text.trim()}
            className={[
              "rounded-2xl bg-[#FE003E] text-white px-4 py-2 font-extrabold",
              "disabled:opacity-60 disabled:cursor-not-allowed",
              "hover:brightness-95 transition",
              "focus:outline-none focus:ring-4 focus:ring-[#FE003E]/25",
              "flex items-center gap-2",
            ].join(" ")}
            title="Enviar"
          >
            {sending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Enviar
              </>
            )}
          </button>
        </div>

        <div className="mt-1 text-[11px] text-black/40">
          Enter para enviar · Shift+Enter para salto de línea
        </div>
      </div>
    </div>
  );
}
