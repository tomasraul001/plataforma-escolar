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

export default function MinhasTurmas() {
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

  const handleUpdateClassStatus = async (id, status) => {
    try {
      await api.patch(`/classes/${id}`, { status });
      toast.success(status === "OPEN" ? "Turma aberta para inscrições!" : "Turma fechada!");
      fetchMyClasses();
    } catch (error) {
      toast.error("Erro ao atualizar turma: " + (error.response?.data?.message || "Erro desconhecido"));
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Minhas Turmas</h2>
          <p className="text-gray-600 mt-1">Gerencie suas turmas e pautas</p>
        </div>
        <button
          onClick={() => navigate("/formador/turmas/nova")}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors self-start sm:self-auto"
        >
          + Nova Turma
        </button>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🏫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma criada</h3>
          <p className="text-gray-600 mb-6">Crie sua primeira turma para começar a acompanhar os formandos.</p>
          <button
            onClick={() => navigate("/formador/turmas/nova")}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            + Criar Turma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[cls.status] || "bg-gray-100 text-gray-800"}`}>
                  {cls.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Área: <span className="font-medium text-gray-900">{cls.trainingArea?.name || "—"}</span></p>
                <p>Local: <span className="font-medium text-gray-900">{cls.location?.name || "—"}</span></p>
                <p>Código: <span className="font-mono text-gray-900">{cls.code}</span></p>
                <p>Alunos: <span className="font-medium text-gray-900">{cls._count?.enrollments || 0}</span></p>
                {cls.secretKey && <p>Chave: <span className="font-mono text-gray-900">{cls.secretKey}</span></p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {cls.status === "CLOSED" || cls.status === "ARCHIVED" ? (
                  <>
                    <button
                      onClick={() => navigate(`/formador/pautas/${cls.id}`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      📋 Pauta
                    </button>
                    <button
                      onClick={() => navigate(`/formador/turma/${cls.id}/alunos`)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      👥 Alunos
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/formador/planilha/${cls.id}`)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                      disabled={cls.status !== "OPEN" && cls.status !== "CLOSED"}
                      title={cls.status === "DRAFT" ? "Turma deve estar aberta ou fechada para acessar a planilha" : ""}
                    >
                      📊 Planilha
                    </button>
                    <button
                      onClick={() => navigate(`/formador/turma/${cls.id}/alunos`)}
                      className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      👥 Alunos
                    </button>
                    <button
                      onClick={() => navigate(`/formador/pautas/${cls.id}`)}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      📋 Pauta
                    </button>
                    <button
                      onClick={() => handleDownloadPauta(cls.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                      disabled={cls.status !== "OPEN" && cls.status !== "CLOSED"}
                      title={cls.status === "DRAFT" ? "Turma deve estar aberta ou fechada para gerar PDF" : ""}
                    >
                      📄 PDF
                    </button>
                    {cls.status === "DRAFT" && (
                      <button
                        onClick={() => handleUpdateClassStatus(cls.id, "OPEN")}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                      >
                        Abrir
                      </button>
                    )}
                    {cls.status === "OPEN" && (
                      <button
                        onClick={() => handleUpdateClassStatus(cls.id, "CLOSED")}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                      >
                        Fechar
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
