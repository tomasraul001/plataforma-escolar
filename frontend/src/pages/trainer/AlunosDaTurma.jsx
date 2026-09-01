import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";
import { LoadingCard } from "../../components/badges";

const LOADING_COLORS = {
  green: "border-green-600",
  blue: "border-blue-600",
  orange: "border-orange-600",
  purple: "border-purple-600",
};

const BASE_PATHS = {
  green: "/formador",
  blue: "/coordenador",
  orange: "/secretaria",
  purple: "/formador",
};

export default function AlunosDaTurma({ color = "green" }) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast().toast;
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [alunos, setAlunos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [manualName, setManualName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canManage = user.role === "formador" || user.role === "coordenador";

  useEffect(() => {
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, alunosRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/enrollments/turma/${classId}/alunos`),
      ]);
      setClassData(classRes.data);
      setAlunos(alunosRes.data);
    } catch (error) {
      console.error("Erro ao carregar alunos:", error);
      toast.error("Erro ao carregar alunos da turma");
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!manualName.trim()) {
      toast.error("Informe o nome do aluno");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/enrollments/turma/${classId}/alunos`, { manualName });
      toast.success("Aluno adicionado com sucesso!");
      setManualName("");
      setShowAddModal(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao adicionar aluno: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId) => {
    if (!confirm("Remover este aluno da turma? As notas lançadas serão ocultadas.")) return;
    try {
      await api.delete(`/enrollments/turma/${classId}/alunos/${enrollmentId}`);
      toast.success("Aluno removido da turma");
      fetchData();
    } catch (error) {
      toast.error("Erro ao remover aluno: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  if (loading || !classData) {
    return <LoadingCard color={color} />;
  }

  const basePath = BASE_PATHS[color] || "/formador";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Alunos - {classData.name}</h2>
          <p className="text-gray-600 mt-1">
            Código: {classData.code} | Área: {classData.trainingArea?.name || "—"}
          </p>
          <p className="text-gray-600 mt-1">
            Local: {classData.location?.name || "—"} | Status: {classData.status}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`${basePath}/pautas/${classId}`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📋 Ver Pauta
          </button>
          {canManage && classData.status !== "CLOSED" && classData.status !== "ARCHIVED" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Adicionar Aluno
            </button>
          )}
        </div>
      </div>

      {alunos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">👥</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum aluno inscrito</h3>
          <p className="text-gray-600 mb-6">
            {canManage && classData.status !== "CLOSED" && classData.status !== "ARCHIVED"
              ? "Adicione alunos manualmente ou compartilhe a chave da turma."
              : "Esta turma ainda não possui alunos."}
          </p>
          {canManage && classData.status !== "CLOSED" && classData.status !== "ARCHIVED" && (
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              + Adicionar Primeiro Aluno
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px]">
              <thead>
                <tr className="bg-gray-50 text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-4 pt-3">Aluno</th>
                  <th className="pb-3 px-4 pt-3">Tipo</th>
                  <th className="pb-3 px-4 pt-3">Entrou em</th>
                  {canManage && <th className="pb-3 px-4 pt-3">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {alunos.map((enrollment) => (
                  <tr key={enrollment.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{enrollment.student?.name || enrollment.manualName || "—"}</p>
                      {enrollment.student?.email && (
                        <p className="text-xs text-gray-500">{enrollment.student.email}</p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${enrollment.student ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                        {enrollment.student ? "Com conta" : "Manual"}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {new Date(enrollment.joinedAt).toLocaleDateString("pt-BR")}
                    </td>
                    {canManage && (
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleRemoveStudent(enrollment.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remover
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Adicionar Aluno */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Adicionar Aluno</h3>
            <p className="text-sm text-gray-600 mb-4">
              Para alunos que não têm conta na plataforma, insira o nome manualmente.
            </p>
            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Aluno *</label>
                <input
                  type="text"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  placeholder="Ex: João dos Santos"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? "Adicionando..." : "Adicionar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}