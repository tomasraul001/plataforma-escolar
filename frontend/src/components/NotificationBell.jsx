import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { log } from "../firebase";
import { usePolling } from "../hooks/usePolling";

// Sino de notificações.
//
// Substitui o WebSocket (descartado): o badge é polled a 60s contra
// /notifications/unread-count, que é um count com índice e devolve um número,
// não a lista. Só quando o utilizador abre é que a lista vem.
//
// A lista só é buscada à abertura (ou a cada minuto com o painel aberto), para
// não gastar requests com um dropdown fechado.

const relativeTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `há ${days} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef(null);

  // Poll do badge. Corre sempre que o header está montado, independente da
  // página — é o que torna o sino útil sem o utilizador estar numa página
  // "de dados".
  const fetchCount = useCallback(async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setCount(res.data.count);
    } catch {
      /* silencioso: um badge em erro não pode incomodar */
    }
  }, []);

  // Primeira leitura ao montar. O usePolling de propósito não dispara logo (a
  // página já fez o seu fetch inicial), mas aqui o badge é o único sinal: sem
  // isto quem entra na app vê um minuto inteiro como se não tivesse nada.
  useEffect(() => {
    fetchCount();
  }, [fetchCount]);

  usePolling(fetchCount);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/notifications?limit=20");
      setItems(res.data);
    } catch {
      /* idem */
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = async () => {
    const next = !open;
    setOpen(next);
    if (next) {
      await fetchItems();
      await fetchCount();
    }
  };

  const handleClick = async (notification) => {
    try {
      if (!notification.readAt) {
        await api.patch(`/notifications/${notification.id}/read`);
        setCount((c) => Math.max(0, c - 1));
        setItems((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n))
        );
      }
      log("notification_click", { type: notification.type });
    } catch {
      /* navegar mesmo se marcar como lida falhar */
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const handleMarkAllRead = async () => {
    try {
      await api.patch("/notifications/read-all");
      setCount(0);
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch {
      /* idem */
    }
  };

  // Fecha ao clicar fora ou apertar Escape.
  useEffect(() => {
    if (!open) return;

    const onClickOutside = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100/50 rounded-lg transition-colors"
        aria-label={`Notificações${count > 0 ? ` (${count} por ler)` : ""}`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200/60 shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50">
            <h3 className="text-sm font-semibold text-gray-900">Notificações</h3>
            {count > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-500">Sem notificações</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-gray-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
                      n.readAt ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.readAt && (
                        <span className="mt-1.5 w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{n.title}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{n.body}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{relativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}