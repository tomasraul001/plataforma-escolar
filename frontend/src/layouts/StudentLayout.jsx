import DashboardLayout from "../components/DashboardLayout";

const navItems = [
  { to: "/formando", label: "Dashboard", icon: "📊" },
  { to: "/formando/turmas", label: "Minhas Turmas", icon: "🏫" },
  { to: "/formando/entrar-turma", label: "Entrar na Turma", icon: "🔑" },
  { to: "/formando/notas", label: "Minhas Notas", icon: "📝" },
];

export default function StudentLayout() {
  return (
    <DashboardLayout
      color="purple"
      navItems={navItems}
      title="Formando"
      roleLabel="Formando"
    />
  );
}
