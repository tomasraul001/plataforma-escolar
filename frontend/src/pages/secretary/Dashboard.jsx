import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function SecretaryDashboard() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [stats, setStats] = useState({ openClasses: 0, closedClasses: 0, archivedClasses: 0, trainers: 0 });
  const [closedClasses, setClosedClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const [classesRes, usersRes] = await Promise.all([
        api.get("/classes/todas"),
        api.get("/users/lista"),
      ]);
      const allClasses = classesRes.data;
      const users = usersRes.data;

      setClosedClasses(allClasses.filter((c) => c.status === "CLOSED"));
      setStats({
        openClasses: allClasses.filter((c) => c.status === "OPEN").length,
        closedClasses: allClasses.filter((c) => c.status === "CLOSED").length,
        archivedClasses: allClasses.filter((c) => c.status === "ARCHIVED").length,
        trainers: users.filter((u) => u.role === "formador").length,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
      toast.error("Erro ao buscar estatísticas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleDownloadPauta = async (classId) => {
    try {
      const res = await api.get(`/reports/pauta/${classId}/pdf`, {
        responseType: "blob",
      });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pauta-${classId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleArchive = async (classId) => {
    if (!confirm("Tem certeza que deseja arquivar esta turma?")) return;
    try {
      await api.patch(`/classes/${classId}`, { status: "ARCHIVED" });
      toast.success("Turma arquivada com sucesso!");
      fetchStats();
    } catch (error) {
      toast.error("Erro ao arquivar: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Painel da Secretaria</h2>
          <p className="text-gray-600 mt-1">Gestão administrativa e documental</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                <span className="text-2xl">🟢</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Turmas Abertas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.openClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100">
                <span className="text-2xl">🔴</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Turmas Fechadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.closedClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-gray-100">
                <span className="text-2xl">📦</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Arquivadas</p>
              <p className="text-2xl font-bold text-gray-900">{stats.archivedClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100">
                <span className="text-2xl">👨‍🏫</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Formadores</p>
              <p className="text-2xl font-bold text-gray-900">{stats.trainers}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas Fechadas Aguardando Conferência</h3>
        {closedClasses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma turma fechada aguardando conferência.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-4">Turma</th>
                  <th className="pb-3 px-4">Formador</th>
                  <th className="pb-3 px-4">Área</th>
                  <th className="pb-3 px-4">Local</th>
                  <th className="pb-3 px-4">Alunos</th>
                  <th className="pb-3 px-4">Fechada em</th>
                  <th className="pb-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {closedClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4 text-sm text-gray-900">{cls.name}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{cls.trainer?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{cls.trainingArea?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{cls.location?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">{cls._count?.enrollments || 0}</td>
                    <td className="py-4 px-4 text-sm text-gray-500">
                      {cls.closedAt ? new Date(cls.closedAt).toLocaleDateString("pt-BR") : "—"}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/secretaria/pautas/${cls.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Ver Pauta
                        </button>
                        <button
                          onClick={() => handleDownloadPauta(cls.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                        >
                          Baixar PDF
                        </button>
                        <button
                          onClick={() => handleArchive(cls.id)}
                          className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs"
                        >
                          Arquivar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate("/secretaria/turmas/abertas")}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Ver Todas as Turmas
          </button>
          <button
            onClick={() => navigate("/secretaria/pautas")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Pautas & PDFs
          </button>
          <button
            onClick={() => navigate("/secretaria/relatorios")}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
          >
            Gerar Relatórios
          </button>
        </div>
      </div>
    </div>
  );
}
