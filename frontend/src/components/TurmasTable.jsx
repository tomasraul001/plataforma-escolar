import { StatusBadge } from "./badges";

export default function TurmasTable({ classes, renderActions }) {
  if (!classes || classes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
        <div className="text-6xl mb-4">🏫</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma turma encontrada</h3>
        <p className="text-gray-600">Não há turmas neste estado.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px]">
          <thead className="bg-gray-50">
            <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
              <th className="pb-3 px-4">Turma</th>
              <th className="pb-3 px-4">Área</th>
              <th className="pb-3 px-4">Formador</th>
              <th className="pb-3 px-4">Alunos</th>
              <th className="pb-3 px-4">Status</th>
              <th className="pb-3 px-4">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {classes.map((cls) => (
              <tr key={cls.id} className="hover:bg-gray-50">
                <td className="py-4 px-4">
                  <p className="font-medium text-gray-900">{cls.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{cls.code}</p>
                </td>
                <td className="py-4 px-4 text-sm text-gray-600">{cls.trainingArea?.name || "—"}</td>
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
