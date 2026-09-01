import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { useToast } from "../contexts/ToastContext";
import TurmasTable from "./TurmasTable";
import { LoadingCard } from "./badges";

export default function TurmasPage({ status, title, subtitle, color = "blue", basePath = "/coordenador" }) {
  const navigate = useNavigate();
  const toast = useToast().toast;
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClasses = async () => {
    try {
      const res = await api.get("/classes/todas");
      const all = res.data;
      setClasses(status ? all.filter((c) => c.status === status) : all);
    } catch (error) {
      console.error("Erro ao buscar turmas:", error);
      toast.error("Erro ao buscar turmas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

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

  const renderActions = (cls) => (
    <>
      <button
        onClick={() => navigate(`${basePath}/pautas/${cls.id}`)}
        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm"
      >
        Ver Pauta
      </button>
      <button
        onClick={() => handleDownloadPauta(cls.id)}
        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded text-sm"
      >
        Baixar PDF
      </button>
    </>
  );

  if (loading) return <LoadingCard color={color} />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        <p className="text-gray-600 mt-1">{subtitle}</p>
      </div>
      <TurmasTable classes={classes} renderActions={renderActions} />
    </div>
  );
}
