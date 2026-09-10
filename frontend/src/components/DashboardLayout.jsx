import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const colorConfig = {
  blue: {
    sidebar: "bg-blue-950/85",
    border: "border-blue-800/50",
    navActive: "bg-blue-800/70",
    navHover: "hover:bg-blue-800/30",
  },
  green: {
    sidebar: "bg-green-950/85",
    border: "border-green-800/50",
    navActive: "bg-green-800/70",
    navHover: "hover:bg-green-800/30",
  },
  purple: {
    sidebar: "bg-purple-950/85",
    border: "border-purple-800/50",
    navActive: "bg-purple-800/70",
    navHover: "hover:bg-purple-800/30",
  },
  orange: {
    sidebar: "bg-orange-950/85",
    border: "border-orange-800/50",
    navActive: "bg-orange-800/70",
    navHover: "hover:bg-orange-800/30",
  },
};

export default function DashboardLayout({ color, navItems, title, roleLabel }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const colors = colorConfig[color];

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 ${colors.sidebar} backdrop-blur-xl border-r ${colors.border} transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex h-16 items-center justify-between px-6 border-b ${colors.border}`}>
          <span className="text-xl font-bold text-white tracking-tight">{title}</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white/70 text-2xl leading-none hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        <nav className="mt-6 px-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg text-white/90 font-medium transition-all ${
                  isActive ? `${colors.navActive} text-white shadow-sm` : colors.navHover
                }`
              }
            >
              <span className="text-base">{item.icon}</span>
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${colors.border}`}>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-300/90 hover:text-red-100 font-medium rounded-lg hover:bg-red-900/20 transition-all text-sm"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden lg:ml-64">
        <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
          <div className="flex h-14 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100/50 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base lg:text-lg font-semibold text-gray-800 truncate">Painel do {roleLabel}</h1>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="hidden sm:inline">{user?.name || roleLabel}</span>
              <span className="hidden sm:inline text-xs bg-white/50 backdrop-blur-sm px-2.5 py-0.5 rounded-full border border-gray-200/50 text-gray-600">{roleLabel}</span>
            </div>
          </div>
        </header>
        <div className="p-3 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
