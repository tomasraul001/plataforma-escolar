import { StatusBadge } from "./badges";

export default function TurmasTable({ classes, renderActions }) {
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm p-12 text-center">
        <div className="text-5xl mb-4">🏫</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Nenhuma turma encontrada</h3>
        <p className="text-gray-600 text-sm">Não há turmas neste estado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-md rounded-xl border border-white/40 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="bg-white/40">
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200/50">
              <th className="pb-3 px-4 font-medium">Turma</th>
              <th className="pb-3 px-4 font-medium">Área</th>
              <th className="pb-3 px-4 font-medium">Local</th>
              <th className="pb-3 px-4 font-medium">Formador</th>
              <th className="pb-3 px-4 font-medium">Alunos</th>
              <th className="pb-3 px-4 font-medium">Status</th>
              <th className="pb-3 px-4 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200/50">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-white/40 transition-colors">
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">{cls.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{cls.code}</p>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{cls.trainingArea?.name || "—"}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{cls.location?.name || "—"}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{cls.trainer?.name || "—"}</td>
                <td className="py-4 px-4 text-sm text-gray-600">{cls._count?.enrollments || 0}</td>
                <td className="py-4 px-4"><StatusBadge status={cls.status} /></td>
                <td className="py-4 px-4">
                  <div className="flex gap-2">{renderActions ? renderActions(cls) : <span className="text-gray-400">—</span>}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
