import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export default function SecretaryDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ openClasses: 0, closedClasses: 0, trainers: 0, students: 0 });
  const [closedClasses, setClosedClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchClosedClasses();
  }, []);

  const fetchStats = async () => {
    try {
      setStats({ openClasses: 12, closedClasses: 37, trainers: 24, students: 486 });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchClosedClasses = async () => {
    try {
      const res = await api.get("/classes/todas");
      const closed = res.data.filter(c => c.status === "CLOSED");
      setClosedClasses(closed);
    } catch (error) {
      console.error("Erro ao buscar turmas fechadas:", error);
    } finally {
      setLoading(false);
    }
  };

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
      alert("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const statusColors = {
    OPEN: "bg-green-100 text-green-800",
    CLOSED: "bg-red-100 text-red-800",
    DRAFT: "bg-yellow-100 text-yellow-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
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
              <p className="text-2xl font-bold text-gray-900">12</p>
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
              <p className="text-2xl font-bold text-gray-900">37</p>
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
              <p className="text-2xl font-bold text-gray-900">8</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-orange-100">
                <span className="text-2xl">📄</span>
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Pautas Pendentes</p>
              <p className="text-2xl font-bold text-gray-900">5</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas Fechadas Aguardando Conferência</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-4">Turma</th>
                <th className="pb-3 px-4">Formador</th>
                <th className="pb-3 px-4">Área</th>
                <th className="pb-3 px-4">Alunos</th>
                <th className="pb-3 px-4">Fechada em</th>
                <th className="pb-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 text-sm text-gray-900">Informática Básica - Turma 01</td>
                <td className="py-4 px-4 text-sm text-gray-500">João Manuel</td>
                <td className="py-4 px-4 text-sm text-gray-500">Informática</td>
                <td className="py-4 px-4 text-sm text-gray-500">25</td>
                <td className="py-4 px-4 text-sm text-gray-500">15/08/2026</td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                      Ver Pauta
                    </button>
                    <button 
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      onClick={() => handleDownloadPauta("6a9157360c5d2c1aa4fbfc9e")}
                    >
                      Baixar PDF
                    </button>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs">
                      Arquivar
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-gray-50">
                <td className="py-4 px-4 text-sm text-gray-900">Eletricidade Residencial - Turma 01</td>
                <td className="py-4 px-4 text-sm text-gray-500">Maria Santos</td>
                <td className="py-4 px-4 text-sm text-gray-500">Eletricidade</td>
                <td className="py-4 px-4 text-sm text-gray-500">18</td>
                <td className="py-4 px-4 text-sm text-gray-500">10/08/2026</td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs">
                      Ver Pauta
                    </button>
                    <button 
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-xs"
                      onClick={() => handleDownloadPauta("6a9157360c5d2c1aa4fbfc9e")}
                    >
                      Baixar PDF
                    </button>
                    <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded text-xs">
                      Arquivar
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h3>
        <div className="flex flex-wrap gap-3">
          <button className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium">
            Ver Todas as Turmas
          </button>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium">
            Gerar Relatório Mensal
          </button>
          <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium">
            Exportar Dados
          </button>
        </div>
      </div>
    </div>
  );
}