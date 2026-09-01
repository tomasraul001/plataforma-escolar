import TurmasPage from "../../components/TurmasPage";

export default function TurmasFechadas() {
  return (
    <TurmasPage
      status="CLOSED"
      title="Turmas Fechadas"
      subtitle="Turmas fechadas para conferência"
      color="orange"
      basePath="/secretaria"
    />
  );
}
