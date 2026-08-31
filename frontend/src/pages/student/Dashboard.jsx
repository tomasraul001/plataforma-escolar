import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

export default function StudentDashboard() {
  const { user } = useAuth();
  const toast = useToast().toast;
  const [myClasses, setMyClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [secretKey, setSecretKey] = useState("");
  const [showGradesModal, setShowGradesModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [gradesData, setGradesData] = useState(null);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      const res = await api.get("/enrollments/minhas");
      setMyClasses(res.data);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    try {
      await api.post("/enrollments/join", { secretKey });
      setShowJoinModal(false);
      setSecretKey("");
      fetchMyClasses();
    } catch (error) {
      toast.error("Erro ao entrar na turma: " + (error.response?.data?.message || "Chave inválida"));
    }
  };

  const handleViewGrades = async (cls) => {
    setSelectedClass(cls);
    try {
      const res = await api.get(`/grades/pauta/${cls.id}`);
      setGradesData(res.data);
      setShowGradesModal(true);
    } catch (error) {
      toast.error("Erro ao carregar notas: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Minhas Turmas</h2>
          <p className="text-gray-600 mt-1">Acompanhe suas turmas e notas</p>
        </div>
        <button
          onClick={() => setShowJoinModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Entrar na Turma
        </button>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma ainda</h3>
          <p className="text-gray-600 mb-6">Clique em "Entrar na Turma" e use a chave que seu formador te deu.</p>
          <button
            onClick={() => setShowJoinModal(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Entrar na Turma
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myClasses.map((cls) => (
            <div key={cls.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  cls.status === "OPEN" ? "bg-green-100 text-green-800" :
                  cls.status === "CLOSED" ? "bg-red-100 text-red-800" :
                  "bg-gray-100 text-gray-800"
                }`}>
                  {cls.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <p>Formador: <span className="font-medium text-gray-900">{cls.trainer?.name || "—"}</span></p>
                <p>Área: <span className="font-medium text-gray-900">{cls.trainingArea?.name || "—"}</span></p>
                {cls.media !== undefined && cls.media !== null && (
                  <p>Média: <span className="font-bold text-purple-600">{cls.media}</span></p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewGrades(cls)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                >
                  Ver Notas
                </button>
                <button className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1.5 rounded text-sm">
                  Detalhes
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Entrar na Turma */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Entrar na Turma</h3>
            <form onSubmit={handleJoinClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Chave da Turma</label>
                <input
                  type="text"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Ex: X7K9-P2M4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button type="submit" className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium">
                  Entrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ver Notas */}
      {showGradesModal && gradesData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Minhas Notas - {gradesData.class.name}</h3>
                <p className="text-gray-600">Código: {gradesData.class.code}</p>
              </div>
              <button
                onClick={() => { setShowGradesModal(false); setGradesData(null); }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>
            <div>
              {gradesData.students.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">Nenhuma nota disponível ainda</p>
                </div>
              ) : (
                gradesData.students.map((s) => (
                  <div key={s.enrollmentId} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-gray-900">Suas Notas</h4>
                      {s.media !== null && s.media !== undefined && (
                        <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-bold">
                          Média: {s.media}
                        </span>
                      )}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                            <th className="pb-2 px-3">Avaliação</th>
                            <th className="pb-2 px-3 text-center">Peso</th>
                            <th className="pb-2 px-3 text-center">Nota</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {s.grades.map((g) => (
                            <tr key={g.assessmentId} className="hover:bg-gray-50">
                              <td className="py-3 px-3">{g.assessmentName}</td>
                              <td className="py-3 px-3 text-center">{g.weight}</td>
                              <td className="py-3 px-3 text-center font-bold text-gray-900">
                                {g.value !== null ? g.value : <span className="text-gray-400">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {s.media !== null && s.media !== undefined && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-end">
                        <span className="text-lg font-bold text-purple-600">Média Final: {s.media}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="mt-6 text-center">
              <button
                onClick={() => { setShowGradesModal(false); setGradesData(null); }}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium"
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