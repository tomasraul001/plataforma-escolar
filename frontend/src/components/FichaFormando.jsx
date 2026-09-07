import { useState } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const colorMap = {
  blue: {
    bg: "bg-blue-600",
    hover: "hover:bg-blue-700",
    border: "border-blue-200",
    text: "text-blue-600",
    badge: {
      APROVADO: "bg-green-100 text-green-800",
      REPROVADO: "bg-red-100 text-red-800",
      "EM CURSO": "bg-blue-100 text-blue-800",
      "SEM AVALIAÇÕES": "bg-gray-100 text-gray-600",
    },
  },
  orange: {
    bg: "bg-orange-600",
    hover: "hover:bg-orange-700",
    border: "border-orange-200",
    text: "text-orange-600",
    badge: {
      APROVADO: "bg-green-100 text-green-800",
      REPROVADO: "bg-red-100 text-red-800",
      "EM CURSO": "bg-orange-100 text-orange-800",
      "SEM AVALIAÇÕES": "bg-gray-100 text-gray-600",
    },
  },
  green: {
    bg: "bg-green-600",
    hover: "hover:bg-green-700",
    border: "border-green-200",
    text: "text-green-600",
    badge: {
      APROVADO: "bg-green-100 text-green-800",
      REPROVADO: "bg-red-100 text-red-800",
      "EM CURSO": "bg-green-100 text-green-800",
      "SEM AVALIAÇÕES": "bg-gray-100 text-gray-600",
    },
  },
};

export default function FichaFormando({ color = "blue" }) {
  const toast = useToast().toast;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [fichaData, setFichaData] = useState(null);
  const [loadingFicha, setLoadingFicha] = useState(false);

  const colors = colorMap[color] || colorMap.blue;

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await api.get(`/reports/formandos/buscar`, { params: { q: query.trim() } });
      setResults(res.data);
    } catch (error) {
      toast.error("Erro ao buscar formandos: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = async (user) => {
    setSelectedUser(user);
    setLoadingFicha(true);
    setFichaData(null);
    try {
      const res = await api.get(`/reports/formandos/${user.id}/ficha`);
      setFichaData(res.data);
    } catch (error) {
      toast.error("Erro ao carregar ficha: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setLoadingFicha(false);
    }
  };

  const handleBack = () => {
    setSelectedUser(null);
    setFichaData(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Ficha do Formando</h2>
        <p className="text-gray-600 mt-1">Consulte a ficha completa dos formandos</p>
      </div>

      {!selectedUser && (
        <div className="space-y-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Pesquisar por nome..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
            <button
              type="submit"
              disabled={searching}
              className={`${colors.bg} ${colors.hover} text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50`}
            >
              {searching ? "Buscando..." : "Buscar"}
            </button>
          </form>

          {results.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead>
                    <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                      <th className="pb-3 px-4">Nome</th>
                      <th className="pb-3 px-4">Email</th>
                      <th className="pb-3 px-4">Celular</th>
                      <th className="pb-3 px-4">Sexo</th>
                      <th className="pb-3 px-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {results.map((u) => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="py-3 px-4 text-sm font-medium text-gray-900">{u.name}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.email}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.phone || "—"}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{u.sexo === "M" ? "Masculino" : u.sexo === "F" ? "Feminino" : "—"}</td>
                        <td className="py-3 px-4">
                          <button
                            onClick={() => handleSelectUser(u)}
                            className={`${colors.bg} ${colors.hover} text-white px-3 py-1 rounded text-sm`}
                          >
                            Ver Ficha
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {results.length === 0 && query && !searching && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Nenhum formando encontrado para "{query}"</p>
            </div>
          )}
        </div>
      )}

      {selectedUser && (
        <div className="space-y-4">
          <button
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1"
          >
            ← Voltar à busca
          </button>

          {loadingFicha ? (
            <div className="flex items-center justify-center h-32">
              <div className={`animate-spin rounded-full h-10 w-10 border-4 ${colors.border} border-t-transparent`}></div>
            </div>
          ) : fichaData && (
            <>
              <div className={`bg-white rounded-lg shadow-sm border ${colors.border} p-6`}>
                <h3 className={`text-lg font-semibold ${colors.text} mb-4`}>Dados Pessoais</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Nome:</span>
                    <p className="font-medium text-gray-900">{fichaData.user.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <p className="font-medium text-gray-900">{fichaData.user.email}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Celular:</span>
                    <p className="font-medium text-gray-900">{fichaData.user.phone || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Sexo:</span>
                    <p className="font-medium text-gray-900">{fichaData.user.sexo === "M" ? "Masculino" : fichaData.user.sexo === "F" ? "Feminino" : "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Data de Cadastro:</span>
                    <p className="font-medium text-gray-900">{new Date(fichaData.user.createdAt).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas</h3>
                {fichaData.turmas.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">Nenhuma turma encontrada</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px] text-sm">
                      <thead>
                        <tr className="text-left text-gray-500 border-b border-gray-200">
                          <th className="pb-2 px-3">Formação</th>
                          <th className="pb-2 px-3">Código</th>
                          <th className="pb-2 px-3">Turma</th>
                          <th className="pb-2 px-3 text-center">Presença</th>
                          <th className="pb-2 px-3">Notas</th>
                          <th className="pb-2 px-3 text-center">Média</th>
                          <th className="pb-2 px-3 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {fichaData.turmas.map((t) => (
                          <tr key={t.classId} className="hover:bg-gray-50">
                            <td className="py-3 px-3 text-gray-900">{t.trainingArea}</td>
                            <td className="py-3 px-3 font-mono text-gray-600">{t.classCode}</td>
                            <td className="py-3 px-3 text-gray-900">{t.className}</td>
                            <td className="py-3 px-3 text-center">
                              {t.presenca !== null ? (
                                <span className={`font-medium ${t.presenca >= 75 ? "text-green-600" : t.presenca >= 50 ? "text-yellow-600" : "text-red-600"}`}>
                                  {t.presenca}%
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              <div className="flex flex-wrap gap-1">
                                {t.notas.map((n) => (
                                  <span key={n.assessmentId} className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                                    {n.assessmentName}: {n.value !== null ? n.value : "—"}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-center font-bold text-gray-900">
                              {t.media !== null ? t.media : "—"}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors.badge[t.estado] || "bg-gray-100 text-gray-600"}`}>
                                {t.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
