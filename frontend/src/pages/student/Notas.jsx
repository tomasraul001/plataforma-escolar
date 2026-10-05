import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { usePolling } from "../../hooks/usePolling";

// A cor vem do `status` calculado no backend (utils/attendance.js). O limiar
// de 75% é regra de domínio e não deve voltar a aparecer aqui como ternário:
// se mudar no backend, esta UI acompanha sozinha.
const STATUS_STYLES = {
  ok: "bg-green-100/80 text-green-800",
  warning: "bg-amber-100/80 text-amber-800",
  critical: "bg-red-100/80 text-red-800",
};

export default function Notas() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [searchParams] = useSearchParams();
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [grades, setGrades] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingGrades, setLoadingGrades] = useState(false);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

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

  const fetchAttendance = async (classId) => {
    setLoadingAttendance(true);
    try {
      const res = await api.get(`/attendance/minha?classId=${classId}`);
      setAttendance(res.data[0] || null);
    } catch (error) {
      console.error("Erro ao buscar presença:", error);
      setAttendance(null);
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    fetchMyClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchGrades(selectedClass);
      fetchAttendance(selectedClass);
    }
  }, [selectedClass]);

  // Pseudo-tempo real: substitui o WebSocket (descartado). O formador pode ter
  // acabado de lancar notas; o forming ve a pauta no maximo 60s depois.
  // Variante silenciosa: nunca toca em loading, senao a pagina pisca a cada minuto.
  const refreshSilently = useCallback(async () => {
    if (!selectedClass) return;
    try {
      const [gradesRes, attendanceRes] = await Promise.all([
        api.get(`/grades/${selectedClass}`),
        api.get(`/attendance/minha?classId=${selectedClass}`),
      ]);
      setGrades(gradesRes.data);
      setAttendance(attendanceRes.data[0] || null);
    } catch {
      /* falha silenciosa: o proximo tick volta a tentar */
    }
  }, [selectedClass]);

  usePolling(refreshSilently, { active: Boolean(selectedClass) });

  // Derivado durante o render: evita o setState sincrono dentro do effect.
  const visibleGrades = selectedClass ? grades : [];
  const visibleAttendance = selectedClass ? attendance : null;
  const selected = myClasses.find((c) => c.id === selectedClass) || null;

  const percentWeight = (name) => (name === "Exame" ? 60 : 40 / 3);
  const gradedEntries = visibleGrades.filter((g) => g.value !== null && g.value !== undefined);
  const totalWeight = gradedEntries.reduce((acc, g) => acc + percentWeight(g.assessment?.name), 0);
  const weightedSum = gradedEntries.reduce((acc, g) => acc + g.value * percentWeight(g.assessment?.name), 0);
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
        <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-12 text-center">
          <div className="text-5xl mb-4">📝</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma turma</h3>
          <p className="text-gray-600 mb-6 text-sm">Você precisa estar inscrito em uma turma para ver notas.</p>
          <button
            onClick={() => navigate("/formando/entrar-turma")}
            className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
          >
            Entrar na Turma
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-5">
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecione a Turma</label>
            <select
              value={selectedClass || ""}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full sm:w-96 px-3 py-2 border border-gray-300/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white/50"
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

          {selected && !loadingAttendance && visibleAttendance && (
            <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-4 mb-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700">Participação</p>
                <p className="text-xs text-gray-500">
                  {visibleAttendance.present} de {visibleAttendance.totalSessions} sessões
                </p>
                {visibleAttendance.status && visibleAttendance.status !== "ok" && (
                  <p className="text-xs text-red-600 mt-1">
                    Frequência abaixo do mínimo exigido.
                  </p>
                )}
              </div>
              <div className="text-right">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    STATUS_STYLES[visibleAttendance.status] || STATUS_STYLES.ok
                  }`}
                >
                  {visibleAttendance.percentage}%
                </span>
              </div>
            </div>
          )}

          {loadingGrades ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-600 border-t-transparent"></div>
            </div>
          ) : visibleGrades.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-sm">Nenhuma nota lançada nesta turma ainda.</p>
            </div>
          ) : (
            <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[440px] text-sm">
                  <thead>
                    <tr className="bg-white/40 text-left text-gray-500 border-b border-gray-200/50">
                      <th className="pb-3 px-4 font-medium">Avaliação</th>
                      <th className="pb-3 px-4 text-center font-medium">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200/50">
                    {visibleGrades.map((g) => (
                      <tr key={g.id} className="hover:bg-white/40 transition-colors">
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
                <div className="p-4 border-t border-gray-200/50 flex justify-end">
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
