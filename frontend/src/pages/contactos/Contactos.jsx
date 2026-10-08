import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { LoadingCard } from "../../components/badges";
import { copyToClipboard } from "../../utils/clipboard";
import { downloadCsv } from "../../utils/csv";
import { buildSmsGroupLink, buildWhatsAppLink, normalizePhone } from "../../utils/phone";

const FULL_ACCESS_ORDER = ["coordenador", "secretaria", "formador", "formando"];

const FULL_LABELS = {
  coordenador: "Coordenadores",
  secretaria: "Secretaria",
  formador: "Formadores",
  formando: "Formandos",
};

// O formador so ve duas categorias: os seus formandos e os formadores
// com turmas nas mesmas regioes.
const TRAINER_ORDER = ["formando", "formador"];
const TRAINER_LABELS = {
  formando: "Meus Formandos",
  formador: "Formadores das mesmas regiões",
};

const LOADING_COLOR = {
  coordenador: "blue",
  secretaria: "orange",
  formador: "green",
};

function groupByRole(users, role) {
  const order = role === "formador" ? TRAINER_ORDER : FULL_ACCESS_ORDER;
  const labels = role === "formador" ? TRAINER_LABELS : FULL_LABELS;

  const buckets = new Map();
  for (const user of users) {
    if (!buckets.has(user.role)) buckets.set(user.role, []);
    buckets.get(user.role).push(user);
  }

  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({ key, label: labels[key], contacts: buckets.get(key) }));
}

export default function Contactos() {
  const { user } = useAuth();
  const toast = useToast().toast;
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(new Set());
  const [message, setMessage] = useState("");

  const fetchContacts = async () => {
    try {
      const res = await api.get("/users/contactos");
      setContacts(res.data);
    } catch (error) {
      console.error("Erro ao buscar contactos:", error);
      toast.error("Não foi possível carregar os contactos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = useMemo(() => groupByRole(contacts, user.role), [contacts, user.role]);

  const toggleCategory = (key) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(categories.map((c) => c.key)));
  const collapseAll = () => setExpanded(new Set());

  const handleCopy = async (text, name, kind) => {
    const ok = await copyToClipboard(text);
    if (ok) {
      toast.success(`${kind} de ${name} copiado`);
    } else {
      toast.error("Não foi possível copiar para a área de transferência");
    }
  };

  const handleExportCsv = () => {
    const rows = categories.flatMap((category) =>
      category.contacts.map((c) => [
        category.label,
        c.name,
        c.email,
        c.phone || "",
      ])
    );
    const date = new Date().toISOString().slice(0, 10);
    downloadCsv(`contactos-${date}.csv`, ["Categoria", "Nome", "Email", "Telefone"], rows);
  };

  const handleSendWhatsApp = (contact) => {
    const link = buildWhatsAppLink(contact.phone, message);
    if (!link) {
      toast.error("Número de telefone inválido para WhatsApp");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleSendSms = (category) => {
    const link = buildSmsGroupLink(category.contacts.map((c) => c.phone), message);
    if (!link) {
      toast.error("Nenhum número válido nesta categoria");
      return;
    }
    window.location.assign(link);
  };

  if (loading) return <LoadingCard color={LOADING_COLOR[user.role] || "blue"} />;

  const total = contacts.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contactos</h2>
          <p className="text-gray-600 mt-1">{total} contacto(s) por categoria. Toque num contacto para copiar o telefone.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="bg-white/60 backdrop-blur-md border border-white/40 shadow-sm text-gray-700 hover:bg-white/80 px-4 py-2 rounded-lg font-medium text-sm"
          >
            Expandir todas
          </button>
          <button
            onClick={collapseAll}
            className="bg-white/60 backdrop-blur-md border border-white/40 shadow-sm text-gray-700 hover:bg-white/80 px-4 py-2 rounded-lg font-medium text-sm"
          >
            Recolher todas
          </button>
          <button
            onClick={handleExportCsv}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="contact-message">
          Mensagem a enviar
        </label>
        <textarea
          id="contact-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={2}
          placeholder="Escreve a mensagem. O 💬 de cada contacto abre o WhatsApp e o botão Enviar SMS da categoria abre a app de SMS com todos os números."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm resize-y"
        />
      </div>

      {categories.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">📇</p>
          <p className="text-lg font-medium text-gray-900">Sem contactos disponíveis</p>
          <p className="text-sm text-gray-500 mt-1">Os contactos aparecem aqui consoante a tua função.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {categories.map((category) => {
            const isOpen = expanded.has(category.key);
            return (
              <div key={category.key} className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 gap-3">
                  <button
                    onClick={() => toggleCategory(category.key)}
                    className="flex items-center gap-3 flex-1 text-left hover:bg-white/60 transition-colors"
                  >
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isOpen ? "bg-blue-100/80 text-blue-800" : "bg-gray-100/80 text-gray-800"}`}>
                      {category.label}
                    </span>
                    <span className="text-sm text-gray-500">{category.contacts.length} contacto(s)</span>
                    <svg
                      className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {(() => {
                    const validCount = category.contacts.filter((c) => normalizePhone(c.phone)).length;
                    return (
                      <button
                        onClick={() => handleSendSms(category)}
                        disabled={validCount === 0}
                        title={
                          validCount === 0
                            ? "Nenhum número válido nesta categoria"
                            : `Abrir SMS em grupo (${validCount} destinatário(s))`
                        }
                        className="disabled:opacity-40 disabled:cursor-not-allowed bg-green-600 hover:bg-green-700 disabled:hover:bg-green-600 text-white px-3 py-1.5 rounded-lg font-medium text-sm whitespace-nowrap"
                      >
                        📩 Enviar SMS ({validCount})
                      </button>
                    );
                  })()}
                </div>

                {isOpen && (
                  <ul className="divide-y divide-gray-100 border-t border-gray-100">
                    {category.contacts.map((contact) => (
                      <li
                        key={contact.id}
                        onClick={() => (contact.phone ? handleCopy(contact.phone, contact.name, "Telefone") : undefined)}
                        className={`flex items-center justify-between gap-3 px-5 py-3 ${contact.phone ? "cursor-pointer hover:bg-white/70" : "cursor-default"}`}
                        title={contact.phone ? "Tocar para copiar o telefone" : undefined}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">{contact.name}</p>
                          <p className="text-sm text-gray-500 truncate">{contact.email}</p>
                          <p className="text-sm text-gray-500 truncate">{contact.phone || "—"}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleSendWhatsApp(contact);
                            }}
                            disabled={!normalizePhone(contact.phone)}
                            title={normalizePhone(contact.phone) ? "Enviar WhatsApp" : "Número inválido para WhatsApp"}
                            className="text-gray-400 hover:text-green-600 transition-colors p-2 rounded-lg hover:bg-white/70 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:bg-transparent"
                          >
                            💬
                          </button>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopy(contact.email, contact.name, "Email");
                            }}
                            title="Copiar email"
                            className="text-gray-400 hover:text-blue-600 transition-colors p-2 rounded-lg hover:bg-white/70"
                          >
                            📧
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}