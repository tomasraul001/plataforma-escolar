import { useState, useEffect } from "react";
import api from "../../services/api";
import UsersTable from "../../components/UsersTable";
import { LoadingCard } from "../../components/badges";

export default function Formadores() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get("/users/lista");
      setUsers(res.data.filter((u) => u.role === "formador"));
    } catch (error) {
      console.error("Erro ao buscar formadores:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingCard color="orange" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Formadores</h2>
        <p className="text-gray-600 mt-1">Lista de formadores da plataforma</p>
      </div>
      <UsersTable users={users} />
    </div>
  );
}
