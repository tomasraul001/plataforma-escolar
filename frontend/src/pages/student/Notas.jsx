import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function Notas() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [searchParams] = useSearchParams();
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);

  useEffect(() => {
    fetchMyClasses();
  }, []);

  const fetchMyClasses = async () => {
    try {
      const res = await api.get("/enrollments/minhas");
      setMyClasses(res.data);
      const turmaParam = searchParams.get("turma");
      if (turmaParam && res.data.some((c) => c.id === turmaParam)) {
        setSelectedClass(turmaParam);
      } else if (res.data.length > 0) {
        setSelectedClass(res.data[0].id);
      }
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast.error("Erro ao buscar turmas");
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    if (selectedClass) {
      fetchGrades(selectedClass);
    } else {
      setGrades([]);
    }
  }, [selectedClass]);

  const fetchGrades = async (classId) => {
    setLoadingGrades(true);
    try {
      const res = await api.get(`/grades/${classId}`);
      setGrades(res.data);
    } catch (error) {
      console.error("Erro ao buscar notas:", error);
      toast.error("Erro ao carregar notas");
    } finally {
      setLoadingGrades(false);
    }
  };

  const selected = myClasses.find((c) => c.id === selectedClass) || null;

  const percentWeight = (name) => (name === "Exame" ? 60 : 40 / 3);
  const totalWeight = grades.reduce((acc, g) => acc + percentWeight(g.assessment?.name), 0);
  const weightedSum = grades.reduce((acc, g) => acc + (g.value || 0) * percentWeight(g.assessment?.name), 0);
  const media = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : null;

  if (loadingClasses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Minhas Notas</h2>
        <p className="text-gray-600 mt-1">Consulte suas notas por turma</p>
      </div>

      {myClasses.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">📝</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma</h3>
          <p className="text-gray-600 mb-6">Você precisa estar inscrito em uma turma para ver notas.</p>
          <button
            onClick={() => navigate("/formando/entrar-turma")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium"
          >
            Entrar na Turma
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione a Turma</label>
            <select
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-96 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
            >
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {selected && (
            <div className="text-sm text-gray-600 mb-2">
              Turma: <span className="font-semibold text-gray-900">{selected.name}</span>
              {" · "}Formador: <span className="font-semibold text-gray-900">{selected.trainer?.name || "—"}</span>
            </div>
          )}

          {loadingGrades ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : grades.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">Nenhuma nota lançada nesta turma ainda.</p>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                      <th className="pb-3 px-4">Avaliação</th>
                      <th className="pb-3 px-4 text-center">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {grades.map((g) => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="py-4 px-4 font-medium text-gray-900">{g.assessment?.name || "—"}</td>
                        <td className="py-4 px-4 text-center font-bold text-gray-900">
                          {g.value !== null && g.value !== undefined ? g.value : <span className="text-gray-400">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {media !== null && (
                <div className="p-4 border-t border-gray-200 flex justify-end">
                  <span className="text-lg font-bold text-purple-600">Média: {media}</span>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
