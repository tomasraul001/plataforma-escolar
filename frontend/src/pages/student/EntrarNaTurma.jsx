import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";

export default function EntrarNaTurma() {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [secretKey, setSecretKey] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!secretKey.trim()) {
      toast.error("Digite a chave da turma");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/enrollments/join", { secretKey: secretKey.trim() });
      toast.success("Inscrito na turma com sucesso!");
      navigate("/formando/turmas");
    } catch (error) {
      toast.error("Erro: " + (error.response?.data?.message || "Chave inválida"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Entrar na Turma</h2>
        <p className="text-gray-600 mt-1">Use a chave fornecida pelo seu formador</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chave da Turma *</label>
            <input
              type="text"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              placeholder="Ex: X7K9-P2M4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono uppercase"
              required
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => navigate("/formando/turmas")}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
