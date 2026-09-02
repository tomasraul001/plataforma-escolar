import DashboardLayout from "../components/DashboardLayout";

const navItems = [
  { to: "/formador", label: "Dashboard", icon: "📊" },
  { to: "/formador/turmas/nova", label: "Criar Turma", icon: "➕" },
  { to: "/formador/turmas", label: "Minhas Turmas", icon: "🏫" },
  { to: "/formador/pautas", label: "Pautas", icon: "📋" },
  { to: "/formador/perfil", label: "Meu Perfil", icon: "👤" },
];

export default function TrainerLayout() {
  return (
    <DashboardLayout
      color="green"
      navItems={navItems}
      title="Formador"
      roleLabel="Formador"
    />
  );
}
