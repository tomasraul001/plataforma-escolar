import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function NovaTurma() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [areas, setAreas] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", trainingAreaId: "", regionId: "", startDate: "", endDate: "" });

  useEffect(() => {
    fetchAreas();
    fetchRegions();
  }, []);

  const fetchAreas = async () => {
    try {
      const res = await api.get("/classes/areas");
      setAreas(res.data.filter((a) => a.active));
    } catch (error) {
      console.error("Erro ao buscar áreas:", error);
      toast.error("Erro ao carregar áreas de formação");
    } finally {
      setLoadingAreas(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const res = await api.get("/classes/regions");
      setRegions(res.data.filter((r) => r.active));
    } catch (error) {
      console.error("Erro ao buscar locais/regiões:", error);
      toast.error("Erro ao carregar locais/regiões");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.trainingAreaId || !form.regionId) {
      toast.error("Preencha o nome, a área de formação e o local");
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post("/classes", form);
      toast.success("Turma criada com sucesso!");
      navigate("/formador/turmas");
    } catch (error) {
      toast.error("Erro ao criar turma: " + (error.response?.data?.message || "Erro desconhecido"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAreas) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Criar Nova Turma</h2>
        <p className="text-gray-600 mt-1">Preencha os dados para criar uma turma</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Informática Básica - Turma 02"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Área de Formação *</label>
            <select
              value={form.trainingAreaId}
              onChange={(e) => setForm({ ...form, trainingAreaId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              required
            >
              <option value="">Selecione uma área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            {areas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhuma área ativa disponível. Peça ao coordenador para cadastrar áreas.</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local *</label>
            <select
              value={form.regionId}
              onChange={(e) => setForm({ ...form, regionId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              required
            >
              <option value="">Selecione o local</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            {regions.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhum local ativo disponível. Peça ao coordenador para cadastrar locais/regiões.</p>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data de Término</label>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-4">
            <button
              type="button"
              onClick={() => navigate("/formador/turmas")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? "Criando..." : "Criar Turma"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
