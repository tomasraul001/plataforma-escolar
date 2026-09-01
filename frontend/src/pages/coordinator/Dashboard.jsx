import { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function CoordinatorDashboard() {
  const toast = useToast().toast;
  const [stats, setStats] = useState({ openClasses: 0, closedClasses: 0, trainers: 0, students: 0 });
  const [activeClasses, setActiveClasses] = useState([]);
  const [areas, setAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaForm, setAreaForm] = useState({ name: "", code: "", description: "", active: true });

  useEffect(() => {
    fetchStats();
    fetchAreas();
  }, []);

  const fetchStats = async () => {
    try {
      const [classesRes, usersRes] = await Promise.all([
        api.get("/classes/todas"),
        api.get("/users/lista"),
      ]);
      const allClasses = classesRes.data;
      const users = usersRes.data;

      setActiveClasses(allClasses);
      setStats({
        openClasses: allClasses.filter((c) => c.status === "OPEN").length,
        closedClasses: allClasses.filter((c) => c.status === "CLOSED").length,
        trainers: users.filter((u) => u.role === "formador").length,
        students: users.filter((u) => u.role === "formando").length,
      });
    } catch (error) {
      console.error("Erro ao buscar estatísticas:", error);
    }
  };

  const fetchAreas = async () => {
    try {
      const res = await api.get("/classes/areas");
      setAreas(res.data);
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
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
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleCreateArea = async (e) => {
    e.preventDefault();
    try {
      await api.post("/classes/areas", areaForm);
      setShowAreaModal(false);
      setAreaForm({ name: "", code: "", description: "", active: true });
      fetchAreas();
      toast.success("Área criada com sucesso!");
    } catch (error) {
      toast.error("Erro ao criar área: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleEditArea = (area) => {
    setEditingArea(area);
    setAreaForm({
      name: area.name,
      code: area.code || "",
      description: area.description || "",
      active: area.active
    });
    setShowAreaModal(true);
  };

  const handleUpdateArea = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/classes/areas/${editingArea.id}`, areaForm);
      setShowAreaModal(false);
      setEditingArea(null);
      setAreaForm({ name: "", code: "", description: "", active: true });
      fetchAreas();
      toast.success("Área atualizada com sucesso!");
    } catch (error) {
      toast.error("Erro ao atualizar área: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const handleDeleteArea = async (id) => {
    if (!confirm("Tem certeza que deseja excluir esta área? Apenas áreas sem turmas podem ser excluídas.")) return;
    try {
      await api.delete(`/classes/areas/${id}`);
      fetchAreas();
      toast.success("Área excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const resetForm = () => {
    setEditingArea(null);
    setAreaForm({ name: "", code: "", description: "", active: true });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  const statusColors = {
    OPEN: "bg-green-100 text-green-800",
    CLOSED: "bg-red-100 text-red-800",
    DRAFT: "bg-yellow-100 text-yellow-800",
    ARCHIVED: "bg-gray-100 text-gray-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard do Coordenador</h2>
          <p className="text-gray-600 mt-1">Visão geral da plataforma</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-blue-100">
                <span className="text-xl md:text-2xl">🏫</span>
              </div>
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-sm font-medium text-gray-500">Turmas Abertas</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.openClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-red-100">
                <span className="text-xl md:text-2xl">🔴</span>
              </div>
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-sm font-medium text-gray-500">Turmas Fechadas</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.closedClasses}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-green-100">
                <span className="text-xl md:text-2xl">👨‍🏫</span>
              </div>
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-sm font-medium text-gray-500">Formadores</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.trainers}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-purple-100">
                <span className="text-xl md:text-2xl">🎓</span>
              </div>
            </div>
            <div className="ml-2 md:ml-4">
              <p className="text-sm font-medium text-gray-500">Formandos</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900">{stats.students}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Áreas de Formação */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Áreas de Formação</h3>
          <button
            onClick={() => { resetForm(); setShowAreaModal(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Nova Área
          </button>
        </div>

        {areas.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma área cadastrada</h3>
            <p className="text-gray-600 mb-6">Cadastre as áreas de formação para que os formadores possam criar turmas.</p>
            <button
              onClick={() => { resetForm(); setShowAreaModal(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
            >
              + Cadastrar Primeira Área
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-4">Nome</th>
                  <th className="pb-3 px-4">Código</th>
                  <th className="pb-3 px-4">Descrição</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 px-4">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {areas.map((area) => (
                  <tr key={area.id} className="hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <p className="font-medium text-gray-900">{area.name}</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-1 rounded">
                        {area.code || area.name.substring(0, 3).toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 max-w-xs truncate">
                      {area.description || "—"}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${area.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}`}>
                        {area.active ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditArea(area)}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteArea(area.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Modal Nova/Editar Área */}
        {showAreaModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                {editingArea ? "Editar Área" : "Nova Área de Formação"}
              </h3>
              <form onSubmit={editingArea ? handleUpdateArea : handleCreateArea} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input
                    type="text"
                    value={areaForm.name}
                    onChange={(e) => setAreaForm({ ...areaForm, name: e.target.value })}
                    placeholder="Ex: Informática, Eletricidade, Mecânica"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    disabled={editingArea}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código (Sigla)</label>
                  <input
                    type="text"
                    value={areaForm.code}
                    onChange={(e) => setAreaForm({ ...areaForm, code: e.target.value.toUpperCase() })}
                    placeholder="Ex: INF, ELE, MEC (auto se vazio)"
                    maxLength={10}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Se vazio, será gerado automaticamente do nome</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                  <textarea
                    value={areaForm.description}
                    onChange={(e) => setAreaForm({ ...areaForm, description: e.target.value })}
                    rows={3}
                    placeholder="Descrição da área de formação"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="active"
                    checked={areaForm.active}
                    onChange={(e) => setAreaForm({ ...areaForm, active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="ml-2 text-sm text-gray-700">
                    Área ativa (visível para formadores criarem turmas)
                  </label>
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAreaModal(false); resetForm(); }}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
                  >
                    {editingArea ? "Atualizar" : "Criar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Turmas Ativas */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Turmas Ativas</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-4">Área</th>
                <th className="pb-3 px-4">Turma</th>
                <th className="pb-3 px-4">Formador</th>
                <th className="pb-3 px-4">Alunos</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {activeClasses.map((cls) => (
                <tr key={cls.id} className="hover:bg-gray-50">
                  <td className="py-4 px-4 text-sm text-gray-900">{cls.trainingArea?.name || "—"}</td>
                  <td className="py-4 px-4 text-sm text-gray-900">{cls.name}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{cls.trainer?.name || "—"}</td>
                  <td className="py-4 px-4 text-sm text-gray-500">{cls._count?.enrollments || 0}</td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[cls.status] || "bg-gray-100 text-gray-800"}`}>
                      {cls.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <button
                      onClick={() => handleDownloadPauta(cls.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
                      disabled={cls.status !== "OPEN" && cls.status !== "CLOSED"}
                      title={cls.status === "DRAFT" ? "Turma deve estar aberta ou fechada para gerar PDF" : "Baixar Pauta em PDF"}
                    >
                      📄 PDF
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}