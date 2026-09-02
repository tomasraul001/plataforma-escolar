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
  const [areas, setAreas] = useState([]);
  const [regions, setRegions] = useState([]);
  const [newClassForm, setNewClassForm] = useState({ name: "", trainingAreaId: "", regionId: "", startDate: "" });

  useEffect(() => {
    fetchMyClasses();
    fetchAreas();
    fetchRegions();
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

  const fetchRegions = async () => {
    try {
      const res = await api.get("/classes/regions");
      setRegions(res.data.filter((r) => r.active));
    } catch (error) {
      console.error("Erro ao buscar locais/regiões:", error);
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

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      await api.post("/classes", newClassForm);
      setShowCreateClass(false);
      setNewClassForm({ name: "", trainingAreaId: "", regionId: "", startDate: "" });
      fetchMyClasses();
      toast.success("Turma criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar turma: " + (error.response?.data?.message || "Erro desconhecido"));
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
                <p>Local: <span className="font-medium text-gray-900">{cls.location?.name || "—"}</span></p>
                <p>Alunos: <span className="font-medium text-gray-900">{cls._count?.enrollments || 0}</span></p>
                {cls.secretKey && <p>Chave: <span className="font-mono text-gray-900">{cls.secretKey}</span></p>}
              </div>
              <div className="flex flex-wrap gap-2">
                {cls.status === "CLOSED" || cls.status === "ARCHIVED" ? (
                  <>
                    <button
                      onClick={() => navigate(`/formador/turma/${cls.id}/presencas`)}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      ✅ Presenças
                    </button>
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
                      onClick={() => navigate(`/formador/turma/${cls.id}/presencas`)}
                      className="bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded text-sm flex-1"
                    >
                      ✅ Presenças
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
                <select
                  value={newClassForm.regionId}
                  onChange={(e) => setNewClassForm({ ...newClassForm, regionId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Selecione o local</option>
                  {regions.map((region) => (
                    <option key={region.id} value={region.id}>{region.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Início</label>
                <input
                  type="date"
                  value={newClassForm.startDate}
                  onChange={(e) => setNewClassForm({ ...newClassForm, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
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
    </div>
  );
}