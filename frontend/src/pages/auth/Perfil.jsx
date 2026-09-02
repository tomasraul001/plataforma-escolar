import { useState } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

export default function Perfil() {
  const { user, setUser } = useAuth();
  const toast = useToast().toast;
  const [activeTab, setActiveTab] = useState("perfil");

  // Form perfil
  const [perfilForm, setPerfilForm] = useState({
    name: user?.name || "",
    email: "",
    currentPassword: "",
  });
  const [perfilSubmitting, setPerfilSubmitting] = useState(false);

  // Form senha
  const [senhaForm, setSenhaForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [senhaSubmitting, setSenhaSubmitting] = useState(false);

  const handleUpdatePerfil = async (e) => {
    e.preventDefault();
    if (!perfilForm.name.trim()) {
      toast.error("O nome é obrigatório");
      return;
    }
    setPerfilSubmitting(true);
    try {
      const payload = { name: perfilForm.name };
      if (perfilForm.email) {
        payload.email = perfilForm.email;
        payload.currentPassword = perfilForm.currentPassword;
      }
      const res = await api.patch("/users/perfil", payload);
      setUser((prev) => ({ ...prev, name: res.data.user.name }));
      localStorage.setItem("userName", res.data.user.name);
      setPerfilForm({ ...perfilForm, email: "", currentPassword: "" });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao atualizar perfil");
    } finally {
      setPerfilSubmitting(false);
    }
  };

  const handleTrocarSenha = async (e) => {
    e.preventDefault();
    if (!senhaForm.currentPassword || !senhaForm.newPassword) {
      toast.error("Preencha todos os campos");
      return;
    }
    if (senhaForm.newPassword !== senhaForm.confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (senhaForm.newPassword.length < 6) {
      toast.error("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    setSenhaSubmitting(true);
    try {
      const res = await api.post("/users/trocar-senha", {
        currentPassword: senhaForm.currentPassword,
        newPassword: senhaForm.newPassword,
      });
      setSenhaForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      toast.success(res.data.message);
    } catch (error) {
      toast.error(error.response?.data?.message || "Erro ao trocar senha");
    } finally {
      setSenhaSubmitting(false);
    }
  };

  const roleLabels = {
    coordenador: "Coordenador",
    formador: "Formador",
    formando: "Formando",
    secretaria: "Secretaria",
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>
        <p className="text-gray-600 mt-1">Gerencie seus dados pessoais</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab("perfil")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "perfil"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Dados Pessoais
        </button>
        <button
          onClick={() => setActiveTab("senha")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "senha"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Trocar Senha
        </button>
      </div>

      {/* Tab Perfil */}
      {activeTab === "perfil" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6 space-y-2 text-sm text-gray-600">
            <p>Nome: <span className="font-medium text-gray-900">{user?.name || "—"}</span></p>
            <p>Cargo: <span className="font-medium text-gray-900">{roleLabels[user?.role] || user?.role}</span></p>
          </div>
          <form onSubmit={handleUpdatePerfil} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input
                type="text"
                value={perfilForm.name}
                onChange={(e) => setPerfilForm({ ...perfilForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Novo Email (opcional)</label>
              <input
                type="email"
                value={perfilForm.email}
                onChange={(e) => setPerfilForm({ ...perfilForm, email: e.target.value })}
                placeholder="Deixe vazio para manter o email atual"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {perfilForm.email && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual (obrigatória para trocar email)</label>
                <input
                  type="password"
                  value={perfilForm.currentPassword}
                  onChange={(e) => setPerfilForm({ ...perfilForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={perfilSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {perfilSubmitting ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab Senha */}
      {activeTab === "senha" && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <form onSubmit={handleTrocarSenha} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual *</label>
              <input
                type="password"
                value={senhaForm.currentPassword}
                onChange={(e) => setSenhaForm({ ...senhaForm, currentPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha *</label>
              <input
                type="password"
                value={senhaForm.newPassword}
                onChange={(e) => setSenhaForm({ ...senhaForm, newPassword: e.target.value })}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha *</label>
              <input
                type="password"
                value={senhaForm.confirmPassword}
                onChange={(e) => setSenhaForm({ ...senhaForm, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={senhaSubmitting}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {senhaSubmitting ? "Alterando..." : "Trocar Senha"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}