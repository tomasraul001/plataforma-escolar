import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

const STATUS_COLORS = {
  OPEN: "bg-green-100 text-green-800",
  CLOSED: "bg-red-100 text-red-800",
  DRAFT: "bg-yellow-100 text-yellow-800",
  ARCHIVED: "bg-gray-100 text-gray-800",
};

export default function Pautas() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      const res = await api.get("/classes/minhas");
      setMyClasses(res.data);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast.error("Erro ao buscar turmas");
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
      toast.error("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pautas</h2>
        <p className="text-gray-600 mt-1">Visualize e baixe as pautas das suas turmas</p>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma criada</h3>
          <p className="text-gray-600">Crie uma turma para gerar pautas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-4">Turma</th>
                  <th className="pb-3 px-4">Área</th>
                  <th className="pb-3 px-4">Alunos</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {myClasses.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{cls.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{cls.code}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls.trainingArea?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls.location?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls._count?.enrollments || 0}</td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cls.status] || "bg-gray-100 text-gray-800"}`}>
                        {cls.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/formador/pautas/${cls.id}`)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm"
                        >
                          Ver Pauta
                        </button>
                        <button
                          onClick={() => handleDownloadPauta(cls.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
                          disabled={cls.status !== "OPEN" && cls.status !== "CLOSED"}
                          title={cls.status === "DRAFT" ? "Turma deve estar aberta ou fechada para gerar PDF" : ""}
                        >
                          Baixar PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
