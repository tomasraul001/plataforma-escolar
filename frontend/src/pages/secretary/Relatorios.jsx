import { useState, useEffect } from "react";
import api from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import { LoadingCard } from "../../components/badges";

export default function Relatorios() {
  const toast = useToast().toast;
  const [classes, setClasses] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      const [classesRes, usersRes] = await Promise.all([
        api.get("/classes/todas"),
        api.get("/users/lista"),
      ]);
      setClasses(classesRes.data);
      setTotalStudents(usersRes.data.filter((u) => u.role === "formando").length);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast.error("Erro ao buscar turmas");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPauta = async (classId) => {
    try {
      const res = await api.get(`/reports/pauta/${classId}/pdf`, { responseType: "blob" });
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `pauta-${classId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Erro ao baixar PDF: " + (error.response?.data?.message || "Erro desconhecido"));
    }
  };

  const pdfClasses = classes.filter((c) => c.status === "OPEN" || c.status === "CLOSED");

  if (loading) return <LoadingCard color="orange" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Relatórios</h2>
        <p className="text-gray-600 mt-1">Gere relatórios e pautas em PDF</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Total de Turmas</p>
          <p className="text-2xl font-bold text-gray-900">{classes.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Turmas com Pauta</p>
          <p className="text-2xl font-bold text-gray-900">{pdfClasses.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <p className="text-sm font-medium text-gray-500">Formandos</p>
          <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Baixar Pauta por Turma</h3>
        {pdfClasses.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma turma disponível para gerar relatório.</p>
        ) : (
          <div className="divide-y divide-gray-200">
            {pdfClasses.map((cls) => (
              <div key={cls.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-900">{cls.name}</p>
                  <p className="text-xs text-gray-500 font-mono">{cls.code} · {cls.trainingArea?.name || "—"}</p>
                </div>
                <button
                  onClick={() => handleDownloadPauta(cls.id)}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded text-sm"
                >
                  📄 Baixar PDF
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
