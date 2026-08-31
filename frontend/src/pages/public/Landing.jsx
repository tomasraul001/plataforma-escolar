import { Link } from "react-router-dom"
import iconeLogo from "../../assets/logo.png"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/40 via-blue-900/40 to-indigo-900/40 flex flex-col">
      <header className="px-4 pt-4 md:p-6">
        <div className="w-full mx-auto flex justify-between items-center">
          <img className="h-14 md:h-20 w-auto rounded-xl" src={iconeLogo} />
          <nav className="flex gap-2 md:gap-4">
            <Link to="/login" className="border border-white/60 text-white px-3 md:px-4 py-1.5 rounded-lg hover:bg-white/10 text-sm transition-colors">
              Entrar
            </Link>
            <Link to="/cadastro" className="bg-white text-blue-950 px-3 md:px-4 py-1.5 rounded-lg font-medium hover:bg-blue-50 text-sm transition-colors">
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl md:text-6xl font-bold text-white mb-3 md:mb-5 leading-tight">
            Gestão Escolar <br className="hidden sm:block" />Simplificada
          </h1>
          <p className="text-base md:text-xl text-blue-100 mb-6 md:mb-10 max-w-2xl mx-auto">
            Turmas, pautas, notas e relatórios num só lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 justify-center">
            <Link
              to="/cadastro"
              className="bg-white text-blue-950 px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg hover:bg-blue-50 transition-colors"
            >
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-3 md:py-4 rounded-lg font-bold text-base md:text-lg hover:bg-white/10 transition-colors"
            >
              Entrar
            </Link>
          </div>
        </div>
      </main>

      <footer className="py-4 md:py-6 text-center text-blue-300 text-xs md:text-sm">
        <p>Plataforma de Gestão Escolar Provincial &copy; 2026</p>
      </footer>
    </div>
  )
}
