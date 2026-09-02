import { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const colorConfig = {
  blue: {
    sidebar: "bg-blue-950",
    border: "border-blue-800",
    navActive: "bg-blue-800",
    navHover: "hover:bg-blue-800/50",
  },
  green: {
    sidebar: "bg-green-950",
    border: "border-green-800",
    navActive: "bg-green-800",
    navHover: "hover:bg-green-800/50",
  },
  purple: {
    sidebar: "bg-purple-950",
    border: "border-purple-800",
    navActive: "bg-purple-800",
    navHover: "hover:bg-purple-800/50",
  },
  orange: {
    sidebar: "bg-orange-950",
    border: "border-orange-800",
    navActive: "bg-orange-800",
    navHover: "hover:bg-orange-800/50",
  },
};

export default function DashboardLayout({ color, navItems, title, roleLabel }) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const colors = colorConfig[color];

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-gray-100/50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 ${colors.sidebar} transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className={`flex h-16 items-center justify-between px-6 border-b ${colors.border}`}>
          <span className="text-xl font-bold text-white">{title}</span>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white text-2xl leading-none hover:text-gray-300"
          >
            ✕
          </button>
        </div>
        <nav className="mt-6 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg text-white font-medium transition-colors ${
                  isActive ? colors.navActive : colors.navHover
                }`
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={`absolute bottom-0 left-0 right-0 p-4 border-t ${colors.border}`}>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-300 hover:text-red-100 font-medium rounded-lg hover:bg-red-900/20 transition-colors"
          >
            <span>🚪</span>
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden lg:ml-64">
        <header className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
          <div className="flex h-16 items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="text-base lg:text-xl font-semibold text-gray-800 truncate">Painel do {roleLabel}</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="hidden sm:inline">{user?.name || roleLabel}</span>
              <span className="hidden sm:inline text-xs bg-gray-100 px-2 py-0.5 rounded-full">{roleLabel}</span>
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
