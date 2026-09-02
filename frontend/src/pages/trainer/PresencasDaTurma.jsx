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

const BASE_PATHS = {
  green: "/formador",
  blue: "/coordenador",
  orange: "/secretaria",
  purple: "/formador",
};

export default function PresencasDaTurma({ color = "green" }) {
  const { classId } = useParams();
  const navigate = useNavigate();
  const toast = useToast().toast;
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewSession, setShowNewSession] = useState(false);
  const [sessionDate, setSessionDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);
  const [saving, setSaving] = useState(false);

  const canManage = user.role === "formador" || user.role === "coordenador";
  const isOpen = classData?.status === "OPEN";
  const basePath = BASE_PATHS[color] || "/formador";

  useEffect(() => {
    fetchData();
  }, [classId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [classRes, sessionsRes] = await Promise.all([
        api.get(`/classes/${classId}`),
        api.get(`/attendance/classes/${classId}/sessions`),
      ]);
      setClassData(classRes.data);
      setSessions(sessionsRes.data);
      if (user.role === "secretaria") {
        const summaryRes = await api.get(`/attendance/classes/${classId}/summary`);
        setSummary(summaryRes.data);
      }
    } catch (error) {
      console.error("Erro ao carregar presenças:", error);
      toast.error("Erro ao carregar presenças");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionDate) {
      toast.error("Informe a data da sessão");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/attendance/classes/${classId}/sessions`, { date: sessionDate });
      toast.success("Sessão criada com sucesso!");
      setSessionDate("");
      setShowNewSession(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao criar sessão: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenSession = async (sessionId) => {
    try {
      const res = await api.get(`/attendance/classes/${classId}/sessions/${sessionId}`);
      setSessionDetail(res.data);
      setSelectedSession(sessionId);
    } catch (error) {
      toast.error("Erro ao abrir sessão");
    }
  };

  const handleTogglePresent = (enrollmentId) => {
    setSessionDetail((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.enrollmentId === enrollmentId ? { ...s, present: !s.present } : s
      ),
    }));
  };

  const handleSetAll = (value) => {
    if (!sessionDetail) return;
    setSessionDetail({
      ...sessionDetail,
      students: sessionDetail.students.map((s) => ({ ...s, present: value })),
    });
  };

  const handleSaveSession = async () => {
    if (!sessionDetail) return;
    setSaving(true);
    try {
      await api.patch(`/attendance/classes/${classId}/sessions/${selectedSession}`, {
        records: sessionDetail.students.map((s) => ({
          enrollmentId: s.enrollmentId,
          present: s.present,
        })),
      });
      toast.success("Presenças salvas!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao salvar presenças: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setSaving(false);
    }
  };

  if (loading || !classData) {
    return <LoadingCard color={color} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Presenças - {classData.name}</h2>
          <p className="text-gray-600 mt-1">
            Código: {classData.code} | Status: {classData.status}
          </p>
          <p className="text-gray-600 mt-1">
            Local: {classData.location?.name || "—"} | Área: {classData.trainingArea?.name || "—"}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`${basePath}/turma/${classId}/alunos`)}
            className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            👥 Alunos
          </button>
          {canManage && isOpen && (
            <button
              onClick={() => setShowNewSession(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              + Nova Sessão
            </button>
          )}
        </div>
      </div>

      {!isOpen && canManage && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-lg">
          Esta turma não está aberta. As presenças estão em modo somente leitura.
        </div>
      )}

      {/* Resumo (secretaria/coordenador) */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total de Sessões</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalSessions}</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <p className="text-sm text-gray-500">Total de Registros</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalRecords}</p>
          </div>
          <div className="bg-green-50 rounded-lg shadow-sm border border-green-200 p-4">
            <p className="text-sm text-green-700">Presentes</p>
            <p className="text-2xl font-bold text-green-800">{summary.present}</p>
          </div>
          <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-4">
            <p className="text-sm text-red-700">Faltosos</p>
            <p className="text-2xl font-bold text-red-800">{summary.absent}</p>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma sessão registrada</h3>
          <p className="text-gray-600">
            {canManage && isOpen
              ? "Crie uma sessão para começar a registrar as presenças."
              : "Ainda não há sessões de presença para esta turma."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4 text-center">Total</th>
                  <th className="py-3 px-4 text-center">Presentes</th>
                  <th className="py-3 px-4 text-center">Faltosos</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">
                      {new Date(s.date).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="py-3 px-4 text-center text-gray-700">{s.totalStudents}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {s.present}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {s.absent}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleOpenSession(s.id)}
                        className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
                      >
                        {canManage && isOpen ? "Registrar" : "Ver"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detalhe da sessão */}
      {sessionDetail && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Sessão de {new Date(sessionDetail.date).toLocaleDateString("pt-BR")}
              </h3>
              <p className="text-sm text-gray-500 mt-1">Marque os alunos presentes nesta sessão.</p>
            </div>
            {canManage && isOpen && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleSetAll(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm"
                >
                  Marcar todos presentes
                </button>
                <button
                  onClick={() => handleSetAll(false)}
                  className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded text-sm"
                >
                  Marcar todos faltosos
                </button>
              </div>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 border-b border-gray-200">
                  <th className="py-3 px-4">Aluno</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessionDetail.students.map((s) => (
                  <tr key={s.enrollmentId} className="hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900">{s.name}</p>
                      {s.email && <p className="text-xs text-gray-500">{s.email}</p>}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {canManage && isOpen ? (
                        <label className="inline-flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={s.present}
                            onChange={() => handleTogglePresent(s.enrollmentId)}
                            className="w-5 h-5 accent-green-600"
                          />
                          <span className={s.present ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                            {s.present ? "Presente" : "Faltou"}
                          </span>
                        </label>
                      ) : (
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            s.present ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {s.present ? "Presente" : "Faltou"}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canManage && isOpen && (
            <div className="px-4 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={handleSaveSession}
                disabled={saving}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? "Salvando..." : "Salvar Presenças"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal Nova Sessão */}
      {showNewSession && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Nova Sessão de Presença</h3>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data da Sessão *</label>
                <input
                  type="date"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  autoFocus
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewSession(false)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {submitting ? "Criando..." : "Criar Sessão"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
