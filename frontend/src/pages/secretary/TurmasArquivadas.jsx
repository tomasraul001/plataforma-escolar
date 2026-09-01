import TurmasPage from "../../components/TurmasPage";

export default function TurmasArquivadas() {
  return (
    <TurmasPage
      status="ARCHIVED"
      title="Turmas Arquivadas"
      subtitle="Turmas arquivadas"
      color="orange"
      basePath="/secretaria"
    />
  );
}
