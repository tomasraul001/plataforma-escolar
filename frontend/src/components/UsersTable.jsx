import { RoleBadge } from "./badges";

export default function UsersTable({ users }) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">👤</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhum usuário encontrado</h3>
        <p className="text-gray-600">Não há usuários neste cargo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
              <th className="pb-3 px-6">Nome</th>
              <th className="pb-3 px-6">Email</th>
              <th className="pb-3 px-6">Cargo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="py-4 px-6 text-sm text-gray-900">{u.name}</td>
                <td className="py-4 px-6 text-sm text-gray-500">{u.email}</td>
                <td className="py-4 px-6"><RoleBadge role={u.role} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
