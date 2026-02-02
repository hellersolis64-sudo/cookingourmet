import { useMemo } from "react";
import type { Conversation, UserChat } from "../../types/chat";
import {
  Search as SearchIcon,
  RefreshCw,
  Users,
  Mail,
  User as UserIcon,
} from "lucide-react";

function convUnread(conv: Conversation, meId: number) {
  const last = (conv as any).lastMessage ?? (conv as any).last_message ?? null;
  if (!last?.created_at) return false;

  const parts = Array.isArray((conv as any).participants) ? (conv as any).participants : [];
  const mePart = parts.find((p: any) => Number(p.user_id) === Number(meId));
  const lr = mePart?.last_read_at ? new Date(mePart.last_read_at).getTime() : 0;
  const lm = new Date(last.created_at).getTime();
  return lr < lm;
}

function lastMessage(conv: Conversation) {
  return ((conv as any).lastMessage ?? (conv as any).last_message ?? null) as any;
}

function fmtTimeShort(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function initials(name?: string) {
  const s = String(name ?? "").trim();
  if (!s) return "";
  const parts = s.split(/\s+/).slice(0, 2);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  return (a + b).toUpperCase();
}

function clampPreview(v?: string, max = 88) {
  const s = String(v ?? "").replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function SkeletonRow() {
  return (
    <div className="w-full rounded-2xl border border-black/10 bg-white px-3 py-3 flex items-center gap-3 animate-pulse">
      <div className="h-11 w-11 rounded-full bg-black/10" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <div className="h-3 w-40 bg-black/10 rounded" />
          <div className="h-3 w-10 bg-black/10 rounded" />
        </div>
        <div className="mt-2 h-3 w-56 bg-black/10 rounded" />
        <div className="mt-2 h-3 w-44 bg-black/10 rounded" />
      </div>
    </div>
  );
}

export default function ChatUserList({
  meId,
  users,
  loading,
  loadingConvs,
  search,
  setSearch,
  onRefresh,
  onOpenUser,
  convByOtherId,
}: {
  meId: number;
  users: UserChat[];
  loading: boolean;
  loadingConvs: boolean;
  search: string;
  setSearch: (v: string) => void;
  onRefresh: () => void;
  onOpenUser: (u: UserChat) => void;
  convByOtherId: Map<number, Conversation>;
}) {
  const safeUsers = Array.isArray(users) ? users : [];

  const sorted = useMemo(() => {
    const arr = [...safeUsers];

    arr.sort((a, b) => {
      const convA = convByOtherId.get(Number(a.id)) ?? null;
      const convB = convByOtherId.get(Number(b.id)) ?? null;

      const unreadA = convA ? convUnread(convA, meId) : false;
      const unreadB = convB ? convUnread(convB, meId) : false;
      if (unreadA !== unreadB) return unreadA ? -1 : 1;

      const onA = !!(a as any).is_online;
      const onB = !!(b as any).is_online;
      if (onA !== onB) return onA ? -1 : 1;

      const lastA = convA ? lastMessage(convA) : null;
      const lastB = convB ? lastMessage(convB) : null;

      const tA = lastA?.created_at ? new Date(lastA.created_at).getTime() : 0;
      const tB = lastB?.created_at ? new Date(lastB.created_at).getTime() : 0;
      if (tA !== tB) return tB - tA;

      const nA = String((a as any).name ?? "").toLowerCase();
      const nB = String((b as any).name ?? "").toLowerCase();
      return nA.localeCompare(nB);
    });

    return arr;
  }, [safeUsers, convByOtherId, meId]);

  const isBusy = loading || loadingConvs;

  return (
    <div className="p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-start gap-2">
          <div className="h-9 w-9 rounded-2xl bg-black/[0.04] grid place-items-center border border-black/10">
            <Users className="h-5 w-5 text-black/60" />
          </div>

          <div>
            <div className="text-sm font-black tracking-tight">Usuarios</div>
            <div className="text-[11px] text-black/50">
              {loading ? "Cargando…" : `${sorted.length} disponibles`}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isBusy}
          className={[
            "h-10 px-3 rounded-2xl border border-black/10 font-extrabold text-xs",
            "bg-white hover:bg-black/5 transition flex items-center gap-2",
            "focus:outline-none focus:ring-2 focus:ring-[#FE003E]/25",
            isBusy ? "opacity-50" : "",
          ].join(" ")}
          title="Refrescar"
        >
          <RefreshCw className={["h-4 w-4", isBusy ? "animate-spin" : ""].join(" ")} />
          <span className="hidden sm:inline">Refrescar</span>
        </button>
      </div>

      {/* Search */}
      <div className="mt-3 relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-black/45" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar usuario…"
          className={[
            "w-full pl-9 pr-3 py-2.5 rounded-2xl border border-black/10 outline-none bg-white",
            "focus:ring-2 focus:ring-[#FE003E]/25 focus:border-[#FE003E]/30",
          ].join(" ")}
        />
      </div>

      {/* List */}
      <div className="mt-3 space-y-2 max-h-[520px] overflow-auto pr-1">
        {loading ? (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        ) : sorted.length === 0 ? (
          <div className="rounded-2xl border border-black/10 bg-white p-4 text-sm text-black/60">
            No hay usuarios para mostrar.
          </div>
        ) : (
          sorted.map((u) => {
            const conv = convByOtherId.get(Number(u.id)) ?? null;
            const hasUnread = conv ? convUnread(conv, meId) : false;

            const lm = conv ? lastMessage(conv) : null;
            const raw = (lm?.body ?? "") as string;
            const time = fmtTimeShort(lm?.created_at);

            const fromId = Number(lm?.sender_id ?? lm?.user_id ?? 0);
            const isMine = !!fromId && fromId === Number(meId);
            const preview = clampPreview(raw ? (isMine ? `Tú: ${raw}` : raw) : "");

            const online = !!(u as any).is_online;
            const ini = initials(u.name);

            return (
              <button
                key={u.id}
                type="button"
                onClick={() => onOpenUser(u)}
                className={[
                  "group w-full text-left rounded-2xl border px-3 py-3 transition",
                  "flex items-center gap-3 bg-white hover:bg-black/[0.03]",
                  "focus:outline-none focus:ring-2 focus:ring-[#FE003E]/25",
                  hasUnread
                    ? "border-[#FE003E]/40 shadow-[0_10px_30px_rgba(254,0,62,0.08)]"
                    : "border-black/10",
                ].join(" ")}
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div
                    className={[
                      "h-11 w-11 rounded-full grid place-items-center font-black text-white",
                      "bg-gradient-to-tr from-black to-black/70",
                      hasUnread ? "ring-2 ring-[#FE003E]/40" : "ring-1 ring-black/10",
                    ].join(" ")}
                  >
                    {ini ? (
                      <span className="text-sm">{ini}</span>
                    ) : (
                      <UserIcon className="h-5 w-5 text-white/85" />
                    )}
                  </div>

                  {/* Online dot */}
                  <span
                    className={[
                      "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                      online ? "bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.18)]" : "bg-black/25",
                    ].join(" ")}
                    title={online ? "Online" : "Offline"}
                  />
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-extrabold truncate leading-5">
                        {u.name}
                      </div>

                      <div className="text-[11px] text-black/55 truncate flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-black/35" />
                        <span className="truncate">{u.email}</span>
                      </div>
                    </div>

                    <div className="shrink-0 flex flex-col items-end gap-1">
                      {time && <span className="text-[10px] text-black/40">{time}</span>}

                      {hasUnread ? (
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#FE003E]" />
                          <span className="text-[10px] font-black px-2 py-1 rounded-full bg-[#FE003E] text-white">
                            Nuevo
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {conv && preview ? (
                    <div
                      className={[
                        "text-[11px] mt-2 truncate",
                        hasUnread ? "text-black/80" : "text-black/55",
                      ].join(" ")}
                    >
                      {preview}
                    </div>
                  ) : (
                    <div className="text-[11px] mt-2 text-black/30 truncate">
                      Sin mensajes todavía
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
