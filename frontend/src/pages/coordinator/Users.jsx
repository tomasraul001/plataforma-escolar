import { useState, useEffect } from "react";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";

export default function CoordinatorUsers() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await api.get("/users/lista");
        setUsers(res.data);
      } catch (error) {
        console.error("Erro ao buscar usuários:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  const roleLabels = {
    coordenador: "Coordenador",
    formador: "Formador",
    formando: "Formando",
    secretaria: "Secretaria",
  };

  const roleColors = {
    coordenador: "bg-blue-100 text-blue-800",
    formador: "bg-green-100 text-green-800",
    formando: "bg-purple-100 text-purple-800",
    secretaria: "bg-orange-100 text-orange-800",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gestão de Usuários</h2>
          <p className="text-gray-600 mt-1">Lista de formadores, formandos e secretarias</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">Nome</th>
                <th className="pb-3 px-6">Email</th>
                <th className="pb-3 px-6">Cargo</th>
                <th className="pb-3 px-6">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="py-4 px-6 text-sm text-gray-900">{u.name}</td>
                  <td className="py-4 px-6 text-sm text-gray-500">{u.email}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || "bg-gray-100 text-gray-800"}`}>
                      {roleLabels[u.role] || u.role}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <button className="text-red-600 hover:text-red-900 text-sm font-medium">
                      Remover
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