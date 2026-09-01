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
  const [showGradebook, setShowGradebook] = useState(false);
  const [gradebook, setGradebook] = useState(null);
  const [showAssessments, setShowAssessments] = useState(false);
  const [assessments, setAssessments] = useState([]);
  const [assessmentsClass, setAssessmentsClass] = useState(null);

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

  const handleOpenGradebook = async (cls) => {
    try {
      const res = await api.get(`/grades/pauta/${cls.id}`);
      setGradebook(res.data);
      setShowGradebook(true);
    } catch (error) {
      toast.error("Erro ao carregar pauta: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleOpenAssessments = (cls) => {
    setAssessmentsClass(cls);
    setAssessments(cls.assessments || []);
    setShowAssessments(true);
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
                <p>Código: <span className="font-mono text-gray-900">{cls.code}</span></p>
                <p>Alunos: <span className="font-medium text-gray-900">{cls._count?.enrollments || 0}</span></p>
                {cls.secretKey && <p>Chave: <span className="font-mono text-gray-900">{cls.secretKey}</span></p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleOpenGradebook(cls)}
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
                <button
                  onClick={() => navigate(`/formador/planilha/${cls.id}`)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                  disabled={cls.status !== "OPEN" && cls.status !== "CLOSED"}
                  title={cls.status === "DRAFT" ? "Turma deve estar aberta ou fechada para acessar a planilha" : ""}
                >
                  📊 Planilha
                </button>
                <button
                  onClick={() => handleOpenAssessments(cls)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                >
                  📝 Avaliações
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
              </div>
            </div>
          ))}
        </div>
      )}

      {showAssessments && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Avaliações - {assessmentsClass?.name}</h3>
              <button
                onClick={() => setShowAssessments(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            {assessments.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Nenhuma avaliação cadastrada nesta turma.</p>
            ) : (
              <ul className="divide-y divide-gray-200">
                {assessments.map((a) => (
                  <li key={a.id} className="py-3 flex items-center justify-between">
                    <span className="font-medium text-gray-900">{a.name}</span>
                    <span className="text-sm text-gray-500">Peso {a.weight}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setShowAssessments(false)}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {showGradebook && gradebook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pauta - {gradebook.class.name}</h3>
                <p className="text-gray-600">Código: {gradebook.class.code} | Status: {gradebook.class.status}</p>
              </div>
              <button onClick={() => { setShowGradebook(false); setGradebook(null); }} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
            </div>
            {gradebook.students.length === 0 ? (
              <p className="text-center text-gray-500 py-12">Nenhum aluno inscrito nesta turma</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-2 px-3">Aluno</th>
                      {gradebook.assessments.map((a) => (
                        <th key={a.id} className="pb-2 px-3 text-center">{a.name}</th>
                      ))}
                      <th className="pb-2 px-3 text-center font-semibold">Média</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {gradebook.students.map((s) => (
                      <tr key={s.enrollmentId} className="hover:bg-gray-50">
                        <td className="py-3 px-3">
                          <p className="font-medium text-gray-900">{s.student.name}</p>
                        </td>
                        {gradebook.assessments.map((a) => {
                          const grade = s.grades.find((g) => g.assessmentId === a.id);
                          return (
                            <td key={a.id} className="py-3 px-3 text-center font-medium text-gray-900">
                              {grade?.value !== null && grade?.value !== undefined ? Math.round(grade.value) : <span className="text-gray-400">—</span>}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-bold text-gray-900">{s.media !== null && s.media !== undefined ? Math.round(s.media) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => { setShowGradebook(false); setGradebook(null); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
