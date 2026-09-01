import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingCard } from "../../components/badges";

const LOADING_COLORS = {
  green: "border-green-600",
  blue: "border-blue-600",
  orange: "border-orange-600",
  purple: "border-purple-600",
};

export default function PautaDeTurma({ color = "green" }) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast().toast;
  const { user } = useAuth();
  const [gradebook, setGradebook] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGradebook();
  }, [classId]);

  const fetchGradebook = async () => {
    try {
      const res = await api.get(`/grades/pauta/${classId}`);
      setGradebook(res.data);
    } catch (error) {
      console.error("Erro ao buscar pauta:", error);
      toast.error("Erro ao carregar pauta");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPauta = async () => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className={`animate-spin rounded-full h-12 w-12 border-4 ${LOADING_COLORS[color] || LOADING_COLORS.green} border-t-transparent`}></div>
      </div>
    );
  }

  if (!gradebook) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-gray-500">Turma não encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Pauta - {gradebook.class.name}</h2>
          <p className="text-gray-600 mt-1">
            Código: {gradebook.class.code} | Status: {gradebook.class.status}
          </p>
        </div>
        <div className="flex gap-2">
          {["formador", "coordenador"].includes(user?.role) && (
            <button
              onClick={() => navigate(`/formador/planilha/${classId}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📊 Planilha
            </button>
          )}
          <button
            onClick={handleDownloadPauta}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📄 Baixar PDF
          </button>
        </div>
      </div>

      {gradebook.students.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum aluno inscrito</h3>
          <p className="text-gray-600">Esta turma ainda não possui alunos para gerar a pauta.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                    <td className="py-3 px-3 text-center font-bold text-gray-900">
                      {s.media !== null && s.media !== undefined ? Math.round(s.media) : "—"}
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
