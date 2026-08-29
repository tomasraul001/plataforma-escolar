import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: "📊" },
  { to: "/secretaria/turmas/abertas", label: "Turmas Abertas", icon: "🟢" },
  { to: "/secretaria/turmas/fechadas", label: "Turmas Fechadas", icon: "🔴" },
  { to: "/secretaria/turmas/arquivadas", label: "Turmas Arquivadas", icon: "📦" },
  { to: "/secretaria/formadores", label: "Formadores", icon: "👨‍🏫" },
  { to: "/secretaria/formandos", label: "Formandos", icon: "🎓" },
  { to: "/secretaria/pautas", label: "Pautas & PDFs", icon: "📄" },
  { to: "/secretaria/relatorios", label: "Relatórios", icon: "📈" },
];

export default function SecretaryLayout() {
  const { logout } = useAuth();

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-orange-950 transform transition-transform duration-300 ease-in-out lg:translate-x-0">
        <div className="flex h-16 items-center justify-between px-6 border-b border-orange-800">
          <span className="text-xl font-bold text-white">Secretaria</span>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-colors ${
                  isActive
                    ? "bg-orange-800"
                    : "hover:bg-orange-800/50"
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-orange-800">
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
            <h1 className="text-xl font-semibold text-gray-800">Painel da Secretaria</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span>👤 Secretaria</span>
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