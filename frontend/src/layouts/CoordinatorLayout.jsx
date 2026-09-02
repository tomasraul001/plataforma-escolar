import DashboardLayout from "../components/DashboardLayout";

const navItems = [
  { to: "/coordenador", label: "Dashboard", icon: "📊" },
  { to: "/coordenador/turmas", label: "Turmas", icon: "🏫" },
  { to: "/coordenador/formadores", label: "Formadores", icon: "👨‍🏫" },
  { to: "/coordenador/formandos", label: "Formandos", icon: "🎓" },
  { to: "/coordenador/relatorios", label: "Relatórios", icon: "📈" },
  { to: "/coordenador/perfil", label: "Meu Perfil", icon: "👤" },
];

export default function CoordinatorLayout() {
  return (
    <DashboardLayout
      color="blue"
      navItems={navItems}
      title="Coordenação"
      roleLabel="Coordenador"
    />
  );
}
