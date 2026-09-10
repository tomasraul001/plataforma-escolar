import { RoleBadge } from "./badges";

export default function UsersTable({ users }) {
  if (!users || users.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">👤</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhum usuário encontrado</h3>
        <p className="text-gray-600 text-sm">Não há usuários neste cargo.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px]">
          <thead className="bg-white/40">
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200/50">
              <th className="pb-3 px-6 font-medium">Nome</th>
              <th className="pb-3 px-6 font-medium">Email</th>
              <th className="pb-3 px-6 font-medium">Cargo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-white/40 transition-colors">
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
