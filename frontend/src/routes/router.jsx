import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

// Layouts
import CoordinatorLayout from "../layouts/CoordinatorLayout";
import TrainerLayout from "../layouts/TrainerLayout";
import StudentLayout from "../layouts/StudentLayout";
import SecretaryLayout from "../layouts/SecretaryLayout";

// Auth Pages
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Sigin";
import Perfil from "../pages/auth/Perfil";

// Coordinator Pages
import CoordinatorDashboard from "../pages/coordinator/Dashboard";
import CoordinatorUsers from "../pages/coordinator/Users";
import CoordinatorTurmas from "../pages/coordinator/Turmas";
import CoordinatorFormadores from "../pages/coordinator/Formadores";
import CoordinatorFormandos from "../pages/coordinator/Formandos";
import CoordinatorRelatorios from "../pages/coordinator/Relatorios";

// Trainer Pages
import TrainerDashboard from "../pages/trainer/Dashboard";
import TrainerNovaTurma from "../pages/trainer/NovaTurma";
import TrainerTurmas from "../pages/trainer/Turmas";
import TrainerPautas from "../pages/trainer/Pautas";
import Planilha from "../pages/trainer/Planilha";
import PautaDeTurma from "../pages/trainer/PautaDeTurma";
import AlunosDaTurma from "../pages/trainer/AlunosDaTurma";

// Student Pages
import StudentDashboard from "../pages/student/Dashboard";
import StudentMinhasTurmas from "../pages/student/MinhasTurmas";
import StudentEntrarNaTurma from "../pages/student/EntrarNaTurma";
import StudentNotas from "../pages/student/Notas";

// Secretary Pages
import SecretaryDashboard from "../pages/secretary/Dashboard";
import SecretaryTurmasAbertas from "../pages/secretary/TurmasAbertas";
import SecretaryTurmasFechadas from "../pages/secretary/TurmasFechadas";
import SecretaryTurmasArquivadas from "../pages/secretary/TurmasArquivadas";
import SecretaryFormadores from "../pages/secretary/Formadores";
import SecretaryFormandos from "../pages/secretary/Formandos";
import SecretaryPautas from "../pages/secretary/Pautas";
import SecretaryRelatorios from "../pages/secretary/Relatorios";

// Public Pages
import LandingPage from "../pages/public/Landing";
import Welcome from "../pages/public/Welcome";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function AppRouter() {
  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/welcome" element={<Welcome />} />

        {/* Coordinator Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["coordenador"]}>
              <CoordinatorLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/coordenador" element={<CoordinatorDashboard />} />
          <Route path="/coordenador/usuarios" element={<CoordinatorUsers />} />
          <Route path="/coordenador/turmas" element={<CoordinatorTurmas />} />
          <Route path="/coordenador/formadores" element={<CoordinatorFormadores />} />
          <Route path="/coordenador/formandos" element={<CoordinatorFormandos />} />
          <Route path="/coordenador/relatorios" element={<CoordinatorRelatorios />} />
          <Route path="/coordenador/turma/:classId/alunos" element={<AlunosDaTurma color="blue" />} />
          <Route path="/coordenador/pautas/:classId" element={<PautaDeTurma color="blue" />} />
          <Route path="/coordenador/perfil" element={<Perfil />} />
        </Route>

        {/* Trainer Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["formador", "coordenador"]}>
              <TrainerLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/formador" element={<TrainerDashboard />} />
          <Route path="/formador/turmas/nova" element={<TrainerNovaTurma />} />
          <Route path="/formador/turmas" element={<TrainerTurmas />} />
          <Route path="/formador/pautas" element={<TrainerPautas />} />
          <Route path="/formador/planilha/:classId" element={<Planilha />} />
          <Route path="/formador/turma/:classId/alunos" element={<AlunosDaTurma />} />
          <Route path="/formador/pautas/:classId" element={<PautaDeTurma />} />
          <Route path="/formador/perfil" element={<Perfil />} />
        </Route>

        {/* Student Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["formando", "formador", "coordenador", "secretaria"]}>
              <StudentLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/formando" element={<StudentDashboard />} />
          <Route path="/formando/turmas" element={<StudentMinhasTurmas />} />
          <Route path="/formando/entrar-turma" element={<StudentEntrarNaTurma />} />
          <Route path="/formando/notas" element={<StudentNotas />} />
          <Route path="/formando/perfil" element={<Perfil />} />
        </Route>

        {/* Secretary Routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["secretaria", "coordenador"]}>
              <SecretaryLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/secretaria" element={<SecretaryDashboard />} />
          <Route path="/secretaria/turmas/abertas" element={<SecretaryTurmasAbertas />} />
          <Route path="/secretaria/turmas/fechadas" element={<SecretaryTurmasFechadas />} />
          <Route path="/secretaria/turmas/arquivadas" element={<SecretaryTurmasArquivadas />} />
          <Route path="/secretaria/formadores" element={<SecretaryFormadores />} />
          <Route path="/secretaria/formandos" element={<SecretaryFormandos />} />
          <Route path="/secretaria/pautas" element={<SecretaryPautas />} />
          <Route path="/secretaria/relatorios" element={<SecretaryRelatorios />} />
          <Route path="/secretaria/turma/:classId/alunos" element={<AlunosDaTurma color="orange" />} />
          <Route path="/secretaria/pautas/:classId" element={<PautaDeTurma color="orange" />} />
          <Route path="/secretaria/perfil" element={<Perfil />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}