import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/formando", label: "Dashboard", icon: "📊" },
  { to: "/formando/turmas", label: "Minhas Turmas", icon: "🏫" },
  { to: "/formando/entrar-turma", label: "Entrar na Turma", icon: "🔑" },
  { to: "/formando/notas", label: "Minhas Notas", icon: "📝" },
];

export default function StudentLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-purple-950 transform transition-transform duration-300 ease-in-out lg:translate-x-0">
        <div className="flex h-16 items-center justify-between px-6 border-b border-purple-800">
          <span className="text-xl font-bold text-white">Formando</span>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-colors ${
                  isActive
                    ? "bg-purple-800"
                    : "hover:bg-purple-800/50"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-purple-800">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-300 hover:text-red-100 font-medium rounded-lg hover:bg-red-900/20 transition-colors"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="lg:ml-64 flex-1 min-h-screen">
        <header className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-6">
            <h1 className="text-xl font-semibold text-gray-800">Painel do Formando</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>👤 Formando</span>
            </div>
          </div>
        </header>
        <div className="p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}