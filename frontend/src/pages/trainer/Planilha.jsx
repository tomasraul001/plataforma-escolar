import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../../contexts/ToastContext";

const FIXED_COLUMNS = [
  { id: "teste1", name: "Teste 1",  order: 1 },
  { id: "teste2", name: "Teste 2",  order: 2 },
  { id: "trabalho", name: "Trabalho Prático",  order: 3 },
  { id: "exame", name: "Exame",  order: 4 },
];

export default function Planilha() {
  const { classId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast().toast;
  const [planilhaData, setPlanilhaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null); // null, 'saving', 'saved', 'error'
  const [gradeInputs, setGradeInputs] = useState({});
  const [students, setStudents] = useState([]);
  const [columns] = useState([
    { id: "teste1", name: "Teste 1",  },
    { id: "teste2", name: "Teste 2",  },
    { id: "trabalho", name: "Trabalho Prático",  },
    { id: "exame", name: "Exame",  },
  ]);
  const saveTimeoutRef = useRef(null);
  const inputRefs = useRef({});

  useEffect(() => {
    fetchPlanilha();
  }, [classId]);

  const fetchPlanilha = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/grades/planilha/${classId}`);
      setPlanilhaData(res.data);
      setStudents(res.data.students || []);
      
      // Inicializar gradeInputs com valores existentes
      const initialInputs = {};
      res.data.students?.forEach((student) => {
        Object.entries(student.grades || {}).forEach(([colId, grade]) => {
          if (grade?.value !== null && grade?.value !== undefined) {
            initialInputs[`${student.enrollmentId}-${colId}`] = grade.value;
          }
        });
      });
      setGradeInputs(initialInputs);
    } catch (error) {
      console.error("Erro ao carregar planilha:", error);
      toast.error("Erro ao carregar planilha");
      navigate("/formador");
    } finally {
      setLoading(false);
    }
  };

  const handleGradeChange = (enrollmentId, columnId, value) => {
    // Validar: apenas números, 0-20, 2 casas decimais
    if (value === "") {
      setGradeInputs(prev => {
        const next = { ...prev };
        delete next[`${enrollmentId}-${columnId}`];
        return next;
      });
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 20) {
      return; // Não atualiza se inválido
    }

    // Limitar a 2 casas decimais
    const roundedValue = Math.round(value * 100) / 100;
    if (roundedValue.toString().length > value.toString().length) {
      return; // Não permitir mais de 2 casas decimais
    }

    setGradeInputs(prev => ({
      ...prev,
      [`${enrollmentId}-${columnId}`]: roundedValue,
    }));

    // Debounced auto-save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaving(true);
    setSaveStatus("saving");

    saveTimeoutRef.current = setTimeout(() => {
      autoSaveGrade(enrollmentId, columnId, roundedValue);
    }, 500);
  };

  const autoSaveGrade = async (enrollmentId, columnId, value) => {
    try {
      await api.post(`/grades/planilha/${classId}/auto-save`, {
        enrollmentId,
        columnId,
        value,
      });
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 2000);
    } catch (error) {
      console.error("Erro ao salvar:", error);
      setSaveStatus("error");
      // Reverter valor na UI
      setGradeInputs(prev => {
        const next = { ...prev };
        delete next[`${enrollmentId}-${columnId}`];
        return next;
      });
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e, enrollmentId, columnId, index, studentIndex) => {
    const colIds = ["teste1", "teste2", "trabalho", "exame"];
    const studentsList = planilhaData?.students || [];
    const currentColIndex = colIds.indexOf(e.currentTarget.dataset.colid);
    const currentStudentIndex = studentsList.findIndex(s => s.enrollmentId === enrollmentId);

    switch (e.key) {
      case "Tab":
        e.preventDefault();
        if (!e.shiftKey) {
          // Próxima coluna ou próximo aluno
          if (currentColIndex < 3) {
            focusInput(enrollmentId, colIds[currentColIndex + 1]);
          } else if (studentIndex < studentsList.length - 1) {
            focusInput(studentsList[studentIndex + 1].enrollmentId, "teste1");
          }
        } else {
          // Coluna anterior ou aluno anterior
          if (currentColIndex > 0) {
            focusInput(enrollmentId, colIds[currentColIndex - 1]);
          } else if (studentIndex > 0) {
            focusInput(studentsList[studentIndex - 1].enrollmentId, "exame");
          }
        }
        break;
      case "Enter":
        e.preventDefault();
        if (studentIndex < studentsList.length - 1) {
          focusInput(studentsList[studentIndex + 1].enrollmentId, columnId);
        }
        break;
      case "ArrowDown":
        e.preventDefault();
        if (studentIndex < studentsList.length - 1) {
          focusInput(studentsList[studentIndex + 1].enrollmentId, columnId);
        }
        break;
      case "ArrowUp":
        e.preventDefault();
        if (studentIndex > 0) {
          focusInput(studentsList[studentIndex - 1].enrollmentId, columnId);
        }
        break;
      case "ArrowRight":
        e.preventDefault();
        if (currentColIndex < 3) {
          focusInput(enrollmentId, colIds[currentColIndex + 1]);
        }
        break;
      case "ArrowLeft":
        e.preventDefault();
        if (currentColIndex > 0) {
          focusInput(enrollmentId, colIds[currentColIndex - 1]);
        }
        break;
    }
  };

  const focusInput = useCallback((enrollmentId, columnId) => {
    const inputKey = `${enrollmentId}-${columnId}`;
    setTimeout(() => {
      const input = inputRefs.current[inputKey];
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }, []);

  const calculateMedia = (student) => {
    const grades = student.grades || {};
    
    const teste1 = grades.teste1?.value;
    const teste2 = grades.teste2?.value;
    const trabalho = grades.trabalho?.value;
    const exame = grades.exame?.value;

    let totalWeightedSum = 0;
    let totalWeight = 0;

    // Teste 1, 2, Trabalho = 40% total (cada 13.33%)
    [teste1, teste2, trabalho].forEach(val => {
      if (val !== null && val !== undefined && val !== "") {
        totalWeightedSum += parseFloat(val) * (40/3);
        totalWeight += 40/3;
      }
    });

    // Exame = 60%
    if (exame !== null && exame !== undefined && exame !== "") {
      totalWeightedSum += parseFloat(exame) * 60;
      totalWeight += 60;
    }

    if (totalWeight === 0) return "—";
    return (totalWeightedSum / totalWeight).toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!planilhaData) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <p className="text-gray-500">Turma não encontrada</p>
      </div>
    );
  }

  const classInfo = planilhaData.class;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Planilha de Notas - {planilhaData.class?.name}</h1>
          <p className="text-gray-600 mt-1">Código: {planilhaData.class?.code} | Status: {planilhaData.class?.status}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/formador/turmas/${classId}/pautas`)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📋 Ver Pauta
          </button>
          <button
            onClick={() => navigate(`/formador/turmas/${classId}/pautas`)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📄 Baixar PDF
          </button>
        </div>
      </div>

      {/* Status de salvamento */}
      {saveStatus && (
        <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium transition-all ${
          saveStatus === "saving" ? "bg-yellow-100 text-yellow-800" :
          saveStatus === "saved" ? "bg-green-100 text-green-800" :
          "bg-red-100 text-red-800"
        }`}>
          {saveStatus === "saving" && <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> Salvando...</span>}
          {saveStatus === "saved" && "✓ Salvo com sucesso"}
          {saveStatus === "error" && "✗ Erro ao salvar"}
        </div>
      )}

      {/* Planilha */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-3 w-12 text-center font-semibold">Nº</th>
                <th className="pb-3 px-4 min-w-[200px] font-semibold">Aluno</th>
                {FIXED_COLUMNS.map(col => (
                  <th key={col.id} className="pb-3 px-3 w-28 text-center font-semibold">
                    <div className="flex flex-col items-center gap-1">
                      <span className="font-semibold">{col.name}</span>
                    </div>
                  </th>
                ))}
                <th className="pb-3 px-4 w-24 text-center font-semibold bg-purple-50 text-purple-700">
                  Média Final
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((student, rowIndex) => (
                <tr key={student.enrollmentId} className="hover:bg-gray-50">
                  <td className="py-3 px-3 w-12 text-center text-gray-500 font-mono">
                    {rowIndex + 1}
                  </td>
                  <td className="py-3 px-4 min-w-[200px]">
                    <p className="font-medium text-gray-900">{student.student?.name}</p>
                  </td>
                  {FIXED_COLUMNS.map(col => (
                    <td key={col.id} className="py-2 px-2 w-28 text-center">
                      <input
                        ref={(el) => { inputRefs.current[`${student.enrollmentId}-${col.id}`] = el; }}
                        type="number"
                        step="0.01"
                        min="0"
                        max="20"
                        value={gradeInputs[`${student.enrollmentId}-${col.id}`] ?? ""}
                        onChange={(e) => handleGradeChange(student.enrollmentId, col.id, e.target.value)}
                        onBlur={(e) => handleGradeChange(student.enrollmentId, col.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, student.enrollmentId, col.id)}
                        data-colid={col.id}
                        className="w-full px-2 py-1.5  rounded text-center text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white hover:bg-gray-50"
                        placeholder="—"
                        inputMode="decimal"
                      />
                    </td>
                  ))}
                  <td className="py-3 px-4 w-24 text-center font-bold text-gray-900 bg-purple-50">
                    {calculateMedia(student)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center gap-6 text-sm text-gray-600 mt-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-100 rounded"></div>
          <span>Salvando...</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span>Salvo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-100 rounded"></div>
          <span>Erro ao salvar</span>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <kbd className="px-2 py-1 bg-gray-100 rounded border">Tab</kbd>
          <span>Próxima célula</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <kbd className="px-2 py-1 bg-gray-100 rounded border">Enter</kbd>
          <span>Próximo aluno</span>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <kbd className="px-2 py-1 bg-gray-100 rounded border">↑↓←→</kbd>
          <span>Navegar</span>
        </div>
      </div>
    </div>
  );
}