import type { Message } from "../../types/chat";
import { Check, CheckCheck, Clock } from "lucide-react";

function fmtTime(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// Opcional: intenta inferir un "estado" sin romper si no existe en tu API
function getMsgStatus(m: any) {
  // Prioridad: status explícito
  const s = String(m?.status ?? "").toLowerCase(); // "sending" | "sent" | "delivered" | "read"
  if (s === "sending" || s === "pending") return "sending";
  if (s === "read" || s === "seen") return "read";
  if (s === "delivered") return "delivered";
  if (s === "sent") return "sent";

  // Fallbacks comunes:
  if (m?.is_sending) return "sending";
  if (m?.read_at) return "read";
  if (m?.delivered_at) return "delivered";

  // si hay id asumimos "sent"
  if (m?.id) return "sent";
  return "sent";
}

function StatusIcon({ status }: { status: string }) {
  // Tamaño pequeño para footer
  const cls = "h-3.5 w-3.5";
  if (status === "sending") return <Clock className={cls} />;
  if (status === "read") return <CheckCheck className={cls} />;
  if (status === "delivered") return <CheckCheck className={cls} />;
  return <Check className={cls} />; // sent
}

export default function MessageBubble({ m, mine }: { m: Message; mine: boolean }) {
  const status = mine ? getMsgStatus(m as any) : null;

  return (
    <div className={"flex " + (mine ? "justify-end" : "justify-start")}>
      <div className="max-w-[86%]">
        {/* Nombre arriba (cuando NO es mío) */}
        {!mine && (m as any)?.sender?.name && (
          <div className="text-[11px] font-extrabold text-black/50 mb-1 px-1">
            {(m as any).sender.name}
          </div>
        )}

        {/* Burbuja */}
        <div
          className={[
            "relative rounded-2xl px-3 py-2",
            "shadow-sm border",
            mine
              ? "bg-[#FE003E] text-white border-[#FE003E]/20"
              : "bg-white text-black border-black/10",
          ].join(" ")}
        >
          {/* Cola (tail) */}
          <span
            className={[
              "absolute bottom-1 h-3 w-3 rotate-45",
              mine
                ? "right-[-4px] bg-[#FE003E]"
                : "left-[-4px] bg-white border-l border-b border-black/10",
              mine ? "" : "",
            ].join(" ")}
          />

          {/* Mensaje */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {m.body}
          </div>

          {/* Footer: hora + checks */}
          <div
            className={[
              "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
              mine ? "text-white/75" : "text-black/50",
            ].join(" ")}
          >
            <span>{fmtTime(m.created_at)}</span>

            {mine && status ? (
              <span className={mine ? "text-white/75" : "text-black/50"} title={status}>
                <StatusIcon status={status} />
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
