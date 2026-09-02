import DashboardLayout from "../components/DashboardLayout";

const navItems = [
  { to: "/secretaria", label: "Dashboard", icon: "📊" },
  { to: "/secretaria/turmas/abertas", label: "Turmas Abertas", icon: "🟢" },
  { to: "/secretaria/turmas/fechadas", label: "Turmas Fechadas", icon: "🔴" },
  { to: "/secretaria/turmas/arquivadas", label: "Turmas Arquivadas", icon: "📦" },
  { to: "/secretaria/formadores", label: "Formadores", icon: "👨‍🏫" },
  { to: "/secretaria/formandos", label: "Formandos", icon: "🎓" },
  { to: "/secretaria/pautas", label: "Pautas & PDFs", icon: "📄" },
  { to: "/secretaria/relatorios", label: "Relatórios", icon: "📈" },
  { to: "/secretaria/perfil", label: "Meu Perfil", icon: "👤" },
];

export default function SecretaryLayout() {
  return (
    <DashboardLayout
      color="orange"
      navItems={navItems}
      title="Secretaria"
      roleLabel="Secretaria"
    />
  );
}
