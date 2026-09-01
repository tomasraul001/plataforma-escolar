import TurmasPage from "../../components/TurmasPage";

export default function TurmasAbertas() {
  return (
    <TurmasPage
      status="OPEN"
      title="Turmas Abertas"
      subtitle="Turmas abertas para inscrições"
      color="orange"
      basePath="/secretaria"
    />
  );
}
