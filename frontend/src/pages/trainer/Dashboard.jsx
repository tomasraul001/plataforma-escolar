import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

export default function TrainerDashboard() {
  const { user } = useAuth();
  const toast = useToast().toast;
  const navigate = useNavigate();
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showCreateAssessment, setShowCreateAssessment] = useState(false);
  const [showGradebook, setShowGradebook] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [areas, setAreas] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [gradebook, setGradebook] = useState(null);
  const [newClassForm, setNewClassForm] = useState({ name: "", trainingAreaId: "", startDate: "", endDate: "" });
  const [newAssessmentForm, setNewAssessmentForm] = useState({ name: "", weight: 1 });
  const [gradeInputs, setGradeInputs] = useState({});

  useEffect(() => {
    fetchMyClasses();
    fetchAreas();
  }, []);

  const fetchMyClasses = async () => {
    try {
      const res = await api.get("/classes/minhas");
      setMyClasses(res.data);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get("/classes/areas");
      setAreas(res.data);
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
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
      toast.error("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const fetchClassDetails = async (classId) => {    try {
      const [assessRes, enrollRes] = await Promise.all([
        api.get(`/assessments/${classId}`),
        api.get(`/enrollments/turma/${classId}/alunos`),
      ]);
      setAssessments(assessRes.data);
      setEnrollments(enrollRes.data);
    } catch (error) {
      console.error("Erro ao buscar detalhes:", error);
    }
  };

  const fetchGradebook = async (classId) => {
    try {
      const res = await api.get(`/grades/pauta/${classId}`);
      setGradebook(res.data);
      setShowGradebook(true);
    } catch (error) {
      console.error("Erro ao buscar pauta:", error);
      toast.error("Erro ao carregar pauta");
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await api.post("/classes", newClassForm);
      setShowCreateClass(false);
      setNewClassForm({ name: "", trainingAreaId: "", startDate: "", endDate: "" });
      fetchMyClasses();
      toast.success("Turma criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar turma: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleCreateAssessment = async (e) => {
    e.preventDefault();
    try {
      await api.post("/assessments", { ...newAssessmentForm, classId: selectedClass.id });
      setShowCreateAssessment(false);
      setNewAssessmentForm({ name: "", weight: 1 });
      await fetchClassDetails(selectedClass.id);
      toast.success("Avaliação criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar avaliação: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleGradeChange = (enrollmentId, assessmentId, value) => {
    setGradeInputs(prev => ({
      ...prev,
      [`${enrollmentId}-${assessmentId}`]: value,
    }));
  };

  const handleSaveGrades = async () => {
    const gradesToSave = [];
    Object.entries(gradeInputs).forEach(([key, value]) => {
      if (value !== "" && value !== null) {
        const [enrollmentId, assessmentId] = key.split("-");
        gradesToSave.push({ enrollmentId, value: parseFloat(value) });
      }
    });  


    if (gradesToSave.length === 0) return;

    try {
      const firstAssessmentId = Object.keys(gradeInputs)[0]?.split("-")[1];
      await api.post("/grades/bulk", {
        assessmentId: firstAssessmentId,
        grades: gradesToSave,
      });
      setGradeInputs({});
      toast.success("Notas salvas com sucesso!");
      if (selectedClass) fetchGradebook(selectedClass.id);
    } catch (error) {
      toast.error("Erro ao salvar notas: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleUpdateClassStatus = async (classId, newStatus) => {
    try {
      await api.patch(`/classes/${classId}`, { status: newStatus });
      fetchMyClasses();
    } catch (error) {
      toast.error("Erro ao atualizar status: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleOpenGradebook = (cls) => {
    setSelectedClass(cls);
    fetchGradebook(cls.id);
  };

  const handleOpenAssessments = (cls) => {
    setSelectedClass(cls);
    fetchClassDetails(cls.id);
    setShowCreateAssessment(true);
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
          <p className="text-gray-600 mt-1">Gerencie suas turmas, avaliações e notas</p>
        </div>
        <button
          onClick={() => setShowCreateClass(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors self-start sm:self-auto"
        >
          + Nova Turma
        </button>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">🏫</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma criada</h3>
          <p className="text-gray-600 mb-6">Clique em "Nova Turma" para começar.</p>
          <button
            onClick={() => setShowCreateClass(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            + Nova Turma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {myClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  cls.status === "OPEN" ? "bg-green-100 text-green-800" :
                  cls.status === "CLOSED" ? "bg-red-100 text-red-800" :
                  "bg-yellow-100 text-yellow-800"
                }`}>
                  {cls.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Código: <span className="font-mono text-gray-900">{cls.code}</span></p>
                <p>Área: <span className="font-medium text-gray-900">{cls.trainingArea?.name || "—"}</span></p>
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

      {/* Modal Nova Turma */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nova Turma</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma</label>
                <input
                  type="text"
                  value={newClassForm.name}
                  onChange={(e) => setNewClassForm({ ...newClassForm, name: e.target.value })}
                  placeholder="Ex: Informática Básica - Turma 01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Área de Formação</label>
                <select
                  value={newClassForm.trainingAreaId}
                  onChange={(e) => setNewClassForm({ ...newClassForm, trainingAreaId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Selecione a área</option>
                  {areas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                  <input
                    type="date"
                    value={newClassForm.startDate}
                    onChange={(e) => setNewClassForm({ ...newClassForm, startDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Fim</label>
                  <input
                    type="date"
                    value={newClassForm.endDate}
                    onChange={(e) => setNewClassForm({ ...newClassForm, endDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreateClass(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Avaliações */}
      {showCreateAssessment && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-900">Avaliações - {selectedClass.name}</h3>
              <button
                onClick={() => { setShowCreateAssessment(false); setSelectedClass(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Form Nova Avaliação */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">Nova Avaliação</h4>
              <form onSubmit={handleCreateAssessment} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                  <input
                    type="text"
                    value={newAssessmentForm.name}
                    onChange={(e) => setNewAssessmentForm({ ...newAssessmentForm, name: e.target.value })}
                    placeholder="Ex: Teste 1, Prova Prática, Exame Final"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Peso</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={newAssessmentForm.weight}
                    onChange={(e) => setNewAssessmentForm({ ...newAssessmentForm, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div className="md:col-span-3 flex justify-end">
                  <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium">
                    Adicionar Avaliação
                  </button>
                </div>
              </form>
            </div>

            {/* Lista de Avaliações */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Avaliações Cadastradas</h4>
              {assessments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhuma avaliação cadastrada</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map((a) => (
                    <div key={a.id} className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{a.name}</p>
                        <p className="text-sm text-gray-500">Peso: {a.weight}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (confirm(`Excluir avaliação "${a.name}"?`)) {
                            api.delete(`/assessments/${a.id}`).then(() => fetchClassDetails(selectedClass.id));
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Excluir
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Pauta */}
      {showGradebook && gradebook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Pauta - {gradebook.class.name}</h3>
                <p className="text-gray-600">Código: {gradebook.class.code} | Status: {gradebook.class.status}</p>
              </div>
              <button
                onClick={() => { setShowGradebook(false); setGradebook(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {gradebook.students.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Nenhum aluno inscrito nesta turma</p>
              </div>
            ) : (
              <><div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                        <th className="pb-2 px-3">Aluno</th>
                        {gradebook.assessments.map((a) => (
                          <th key={a.id} className="pb-2 px-3 text-center">
                            {a.name}<br />
                            <span className="text-xs font-normal text-gray-400">(Peso {a.weight})</span>
                          </th>
                        ))}
                        <th className="pb-2 px-3 text-center font-semibold">Média</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {gradebook.students.map((s) => (
                        <tr key={s.enrollmentId} className="hover:bg-gray-50">
                          <td className="py-3 px-3">
                            <p className="font-medium text-gray-900">{s.student.name}</p>
                            <p className="text-xs text-gray-500">{s.student.email}</p>
                          </td>
                          {gradebook.assessments.map((a) => {
                            const grade = s.grades.find(g => g.assessmentId === a.id);
                            const inputKey = `${s.enrollmentId}-${a.id}`;
                            return (
                              <td key={a.id} className="py-3 px-3 text-center">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="20"
                                  value={gradeInputs[inputKey] ?? (grade?.value ?? "")}
                                  onChange={(e) => handleGradeChange(s.enrollmentId, a.id, e.target.value)}
                                  className="w-20 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  placeholder="—" />
                              </td>
                            );
                          })}
                          <td className="py-3 px-3 text-center font-bold text-gray-900">
                            {s.media ?? "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div><div className="mt-6 flex justify-end gap-3">
                    <button
                      onClick={() => { setShowGradebook(false); setGradebook(null); setGradeInputs({}); } }
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                    >
                      Fechar
                    </button>
                    <button
                      onClick={handleSaveGrades}
                      className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium"
                    >
                      Salvar Notas
                    </button>
                  </div></>
            )}
          </div>
        </div>
      )}
    </div>
  );
}