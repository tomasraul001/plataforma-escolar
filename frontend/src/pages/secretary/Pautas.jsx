import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { StatusBadge, LoadingCard } from "../../components/badges";

export default function Pautas() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/classes/todas");
      setClasses(res.data.filter((c) => c.status === "OPEN" || c.status === "CLOSED"));
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast.error("Erro ao buscar turmas");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPauta = async (classId) => {
    try {
      const res = await api.get(`/reports/pauta/${classId}/pdf`, { responseType: "blob" });
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

  if (loading) return <LoadingCard color="orange" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Pautas & PDFs</h2>
        <p className="text-gray-600 mt-1">Visualize e baixe as pautas das turmas</p>
      </div>

      {classes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📄</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma pauta disponível</h3>
          <p className="text-gray-600">Não há turmas abertas ou fechadas para gerar pautas.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-4">Turma</th>
                  <th className="pb-3 px-4">Área</th>
                  <th className="pb-3 px-4">Formador</th>
                  <th className="pb-3 px-4">Alunos</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {classes.map((cls) => (
                  <tr key={cls.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{cls.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{cls.code}</p>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls.trainingArea?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls.location?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls.trainer?.name || "—"}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{cls._count?.enrollments || 0}</td>
                    <td className="py-4 px-4"><StatusBadge status={cls.status} /></td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/secretaria/pautas/${cls.id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
                        >
                          Ver Pauta
                        </button>
                        <button
                          onClick={() => handleDownloadPauta(cls.id)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
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
