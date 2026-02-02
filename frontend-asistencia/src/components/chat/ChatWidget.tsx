import ChatUserList from "./ChatUserList";
import ChatWindow from "./ChatWindow";
import { useChatWidget } from "./useChatWidget";
import {
  MessageCircle,
  X,
  ArrowLeft,
  Bell,
  BellOff,
} from "lucide-react";

export default function ChatWidget() {
  const {
    meId,
    open,
    mode,
    soundEnabled,

    users,
    search,
    loadingUsers,
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

    setOpen,
    setSoundEnabled,
    setSearch,
    setText,

    loadUsers,
    loadConversations,
    openDirect,
    onSend,
    resetToList,
  } = useChatWidget();

  return (
    <>
      {/* Botón flotante */}
      <div className="fixed z-[9999] bottom-5 right-5">
        <button
          type="button"
          onClick={() => {
            setOpen((wasOpen) => {
              const willOpen = !wasOpen;
              if (willOpen) resetToList();
              return willOpen;
            });
          }}
          className={[
            "relative h-14 w-14 rounded-full text-white shadow-2xl grid place-items-center",
            "bg-[#FE003E] hover:scale-105 transition-transform",
            "focus:outline-none focus:ring-4 focus:ring-[#FE003E]/25",
          ].join(" ")}
          title={open ? "Cerrar chat" : "Abrir chat"}
        >
          <MessageCircle className="h-6 w-6" />

          {totalUnread > 0 && (
            <span className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5 rounded-full bg-black text-white text-[10px] font-black grid place-items-center border-2 border-white">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
      </div>

      {open && (
        <div className="fixed z-[9999] bottom-24 right-5 w-[360px] max-w-[92vw]">
          <div className="rounded-3xl overflow-hidden shadow-2xl border border-black/10 bg-white">
            {/* header */}
            <div className="bg-black text-white px-4 py-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="font-extrabold truncate">
                  {mode === "list"
                    ? "Mensajes"
                    : activeUser
                    ? activeUser.name
                    : "Chat"}
                </div>

                {/* Subtítulo opcional */}
                <div className="text-[11px] text-white/60">
                  {mode === "list"
                    ? "Conversaciones"
                    : isOtherTyping
                    ? "Escribiendo…"
                    : "En línea"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Toggle sonido */}
                <button
                  type="button"
                  onClick={() => setSoundEnabled((v) => !v)}
                  className={[
                    "h-9 w-9 rounded-full grid place-items-center",
                    "bg-white/10 hover:bg-white/20",
                    "focus:outline-none focus:ring-2 focus:ring-white/20",
                  ].join(" ")}
                  title={soundEnabled ? "Sonido: ON" : "Sonido: OFF"}
                >
                  {soundEnabled ? (
                    <Bell className="h-4 w-4" />
                  ) : (
                    <BellOff className="h-4 w-4" />
                  )}
                </button>

                {mode === "chat" && (
                  <button
                    type="button"
                    onClick={resetToList}
                    className={[
                      "h-9 w-9 rounded-full grid place-items-center",
                      "bg-white/10 hover:bg-white/20",
                      "focus:outline-none focus:ring-2 focus:ring-white/20",
                    ].join(" ")}
                    title="Volver"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className={[
                    "h-9 w-9 rounded-full grid place-items-center",
                    "bg-white/10 hover:bg-white/20",
                    "focus:outline-none focus:ring-2 focus:ring-white/20",
                  ].join(" ")}
                  title="Cerrar (Esc)"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* body */}
            {mode === "list" ? (
              <ChatUserList
                meId={meId}
                users={users}
                loading={loadingUsers}
                loadingConvs={loadingConvs}
                search={search}
                setSearch={setSearch}
                onRefresh={() => {
                  loadUsers(search);
                  loadConversations();
                }}
                onOpenUser={openDirect}
                convByOtherId={convByOtherId}
              />
            ) : (
              <ChatWindow
                conversationId={conversationId}
                meId={meId}
                user={activeUser}
                messages={messages}
                loading={loadingChat}
                text={text}
                setText={setText}
                sending={sending}
                onSend={onSend}
                isOtherTyping={isOtherTyping}
                error={error}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}
