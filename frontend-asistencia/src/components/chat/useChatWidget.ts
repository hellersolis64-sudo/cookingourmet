import { useEffect, useMemo, useRef, useState } from "react";
import type { Conversation, Message, UserChat } from "../../types/chat";
import { getUser } from "../../services/auth";
import {
  getChatUsers,
  getMessages,
  getOrCreateDirectConversation,
  listConversations,
  markRead,
  pingPresence,
  sendMessage,
} from "../../services/chat";

function otherUserFromConversation(conv: Conversation, meId: number) {
  const parts = Array.isArray((conv as any).participants) ? (conv as any).participants : [];
  const other = parts.find((p: any) => Number(p.user_id) !== Number(meId))?.user;
  return other ?? null;
}

function isUnread(conv: Conversation, meId: number) {
  const last = (conv as any).lastMessage ?? (conv as any).last_message ?? null;
  if (!last?.created_at) return false;

  const parts = Array.isArray((conv as any).participants) ? (conv as any).participants : [];
  const mePart = parts.find((p: any) => Number(p.user_id) === Number(meId));
  const lr = mePart?.last_read_at ? new Date(mePart.last_read_at).getTime() : 0;
  const lm = new Date(last.created_at).getTime();
  return lr < lm;
}

function safeJsonParse<T>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

/** 🔊 beep sin mp3 (WebAudio) */
function beepOnce(volume = 0.05, durationMs = 90, freq = 880) {
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext | undefined;
    if (!Ctx) return;

    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();

    o.type = "sine";
    o.frequency.value = freq;
    g.gain.value = volume;

    o.connect(g);
    g.connect(ctx.destination);

    o.start();
    setTimeout(() => {
      o.stop();
      ctx.close().catch(() => {});
    }, durationMs);
  } catch {
    // ignore
  }
}

const LS_KEY = "chat_widget_state_v1";
export type PersistState = {
  open: boolean;
  mode: "list" | "chat";
  activeUserId: number | null;
  conversationId: number | null;
  soundEnabled: boolean;
};

export function useChatWidget() {
  const me = getUser();
  const meId = me?.id ?? 0;

  // ===== Persisted UI state =====
  const persisted = useMemo(() => safeJsonParse<PersistState>(localStorage.getItem(LS_KEY)), []);
  const [open, setOpen] = useState<boolean>(persisted?.open ?? false);
  const [mode, setMode] = useState<"list" | "chat">(persisted?.mode ?? "list");
  const [soundEnabled, setSoundEnabled] = useState<boolean>(persisted?.soundEnabled ?? true);

  // users
  const [users, setUsers] = useState<UserChat[]>([]);
  const [search, setSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // conversations
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  // active chat
  const [activeUser, setActiveUser] = useState<UserChat | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(persisted?.conversationId ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // typing indicator
  const [isOtherTyping, setIsOtherTyping] = useState(false);

  // ===== Refs para detectar “nuevo mensaje” =====
  const lastIncomingSigRef = useRef<string>("");
  const userInteractedRef = useRef(false);

  // Marca interacción para permitir sonido
  useEffect(() => {
    const onAny = () => (userInteractedRef.current = true);
    window.addEventListener("pointerdown", onAny, { passive: true });
    window.addEventListener("keydown", onAny);
    return () => {
      window.removeEventListener("pointerdown", onAny as any);
      window.removeEventListener("keydown", onAny as any);
    };
  }, []);

  // Persistir estado
  useEffect(() => {
    const st: PersistState = {
      open,
      mode,
      activeUserId: activeUser?.id ?? null,
      conversationId,
      soundEnabled,
    };
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  }, [open, mode, activeUser?.id, conversationId, soundEnabled]);

  // Cerrar con ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // ========= Loaders =========
  async function loadUsers(q?: string) {
    setLoadingUsers(true);
    try {
      const list = await getChatUsers(q);
      setUsers(Array.isArray(list) ? list : []);
    } catch {
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  }

  async function loadConversations() {
    setLoadingConvs(true);
    try {
      const items = await listConversations();
      setConvs(Array.isArray(items) ? items : []);
    } catch {
      setConvs([]);
    } finally {
      setLoadingConvs(false);
    }
  }

  async function openDirect(user: UserChat) {
    if (!meId) return;

    setError(null);
    setActiveUser(user);
    setMode("chat");
    setLoadingChat(true);

    try {
      const conv = await getOrCreateDirectConversation(user.id);
      setConversationId(conv.id);

      const msgs = await getMessages(conv.id);
      const list = Array.isArray(msgs) ? msgs : [];
      setMessages(list);

      await markRead(conv.id).catch(() => {});
      await loadConversations();

      const last: any = list[list.length - 1];
      lastIncomingSigRef.current = last?.id != null ? String(last.id) : "";
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo abrir el chat");
      setMessages([]);
    } finally {
      setLoadingChat(false);
    }
  }

  // ✅ al cambiar conversación (por restore/persist), inicializa el “último”
  useEffect(() => {
    if (!open || mode !== "chat" || !conversationId) return;
    (async () => {
      try {
        const msgs = await getMessages(conversationId);
        const list = Array.isArray(msgs) ? msgs : [];
        setMessages(list);
        const last: any = list[list.length - 1];
        lastIncomingSigRef.current = last?.id != null ? String(last.id) : "";
      } catch {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, conversationId]);

  async function refreshChat() {
    if (!conversationId) return;

    try {
      const msgs = await getMessages(conversationId);
      const list = Array.isArray(msgs) ? msgs : [];
      setMessages(list);

      const last: any = list[list.length - 1];
      if (!last) return;

      const lastId = last?.id != null ? String(last.id) : "";
      const fromId = Number(last?.sender_id ?? last?.user_id ?? 0);

      const isIncoming = fromId && fromId !== Number(meId);
      const changed = lastId && lastId !== lastIncomingSigRef.current;

      if (changed && isIncoming) {
        lastIncomingSigRef.current = lastId;

        if (soundEnabled && userInteractedRef.current) {
          beepOnce();
        }
      }

      await markRead(conversationId).catch(() => {});
    } catch {
      // ignore
    }
  }

  async function onSend() {
    if (!conversationId) return;
    if (!text.trim()) return;
    if (sending) return;

    const body = text.trim();
    setText("");
    setError(null);

    const tempId = `tmp_${Date.now()}`;
    const optimistic: any = {
      id: tempId,
      body,
      created_at: new Date().toISOString(),
      sender_id: meId,
      __pending: true,
    };

    setMessages((m) => [...m, optimistic]);
    setSending(true);

    try {
      const real = await sendMessage(conversationId, body);

      setMessages((list) =>
        list.map((x: any) => (String(x.id) === String(tempId) ? { ...real, __pending: false } : x))
      );

      await markRead(conversationId).catch(() => {});
      await loadConversations();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? "No se pudo enviar");

      setMessages((list) =>
        list.map((x: any) => (String(x.id) === String(tempId) ? { ...x, __pending: false, __error: true } : x))
      );
    } finally {
      setSending(false);
    }
  }

  // ========= Presence ping =========
  useEffect(() => {
    if (!open) return;

    pingPresence().catch(() => {});
    const t = setInterval(() => pingPresence().catch(() => {}), 15000);
    return () => clearInterval(t);
  }, [open]);

  // ========= When open: load list =========
  useEffect(() => {
    if (!open) return;
    loadUsers(search);
    loadConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ========= Search debounce =========
  const searchRef = useRef<number | null>(null);
  useEffect(() => {
    if (!open) return;
    if (searchRef.current) window.clearTimeout(searchRef.current);

    searchRef.current = window.setTimeout(() => {
      loadUsers(search);
    }, 250);

    return () => {
      if (searchRef.current) window.clearTimeout(searchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, open]);

  // ========= Poll recents while open (badges) =========
  useEffect(() => {
    if (!open) return;
    const t = setInterval(() => loadConversations(), 5000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ========= Poll messages while in chat =========
  useEffect(() => {
    if (!open || mode !== "chat" || !conversationId) return;
    const t = setInterval(() => refreshChat(), 2500);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, conversationId]);

  // ========= Typing (como lo tenías) =========
  useEffect(() => {
    if (!open || mode !== "chat" || !conversationId) {
      setIsOtherTyping(false);
      return;
    }

    const apiBase = (import.meta as any).env?.VITE_API_URL ?? "http://localhost/control-asistencia/public/api";
    const base = String(apiBase).replace(/\/$/, "");

    const t = setInterval(async () => {
      try {
        const res = await fetch(`${base}/typing?conversation_id=${conversationId}`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
          },
        });
        if (!res.ok) return setIsOtherTyping(false);
        const j = await res.json();
        const list = Array.isArray(j?.data) ? j.data : [];
        setIsOtherTyping(list.some((id: any) => Number(id) !== Number(meId)));
      } catch {
        setIsOtherTyping(false);
      }
    }, 2000);

    return () => clearInterval(t);
  }, [open, mode, conversationId, meId]);

  // ========= Compute badges =========
  const convByOtherId = useMemo(() => {
    const map = new Map<number, Conversation>();
    if (!meId) return map;

    for (const c of convs) {
      const other = otherUserFromConversation(c, meId);
      if (!other?.id) continue;
      map.set(Number(other.id), c);
    }
    return map;
  }, [convs, meId]);

  const totalUnread = useMemo(() => {
    if (!meId) return 0;
    let n = 0;
    for (const c of convs) if (isUnread(c, meId)) n++;
    return n;
  }, [convs, meId]);

  // Título del navegador con unread
  useEffect(() => {
    const base = "Mensajes";
    document.title = totalUnread > 0 ? `(${totalUnread}) ${base}` : base;
    return () => {
      document.title = base;
    };
  }, [totalUnread]);

  // Restaurar “usuario activo” cuando carguen users
  useEffect(() => {
    if (!open) return;
    if (mode !== "chat") return;
    if (activeUser) return;

    const st = safeJsonParse<PersistState>(localStorage.getItem(LS_KEY));
    const uid = st?.activeUserId ?? null;
    if (!uid) return;

    const u = users.find((x) => Number(x.id) === Number(uid)) ?? null;
    if (u) setActiveUser(u);
  }, [open, mode, users, activeUser]);

  function resetToList() {
    setMode("list");
    setActiveUser(null);
    setConversationId(null);
    setMessages([]);
    setText("");
    setError(null);
    setIsOtherTyping(false);
    lastIncomingSigRef.current = "";
  }

  return {
    // state
    meId,
    open,
    mode,
    soundEnabled,

    users,
    search,
    loadingUsers,

    convs,
    loadingConvs,

    activeUser,
    conversationId,
    messages,
    loadingChat,
    text,
    sending,
    error,
    isOtherTyping,

    convByOtherId,
    totalUnread,

    // actions
    setOpen,
    setMode,
    setSoundEnabled,
    setSearch,
    setText,

    loadUsers,
    loadConversations,
    openDirect,
    onSend,
    resetToList,
  };
}
