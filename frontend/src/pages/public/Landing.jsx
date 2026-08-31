import { Link } from "react-router-dom"
import iconeLogo from "../../assets/logo.png"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950/50 via-blue-900/50 to-indigo-900/50 flex flex-col">
      <header className="p-6 w-full">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <img className="w-40 rounded rounded-2xl" src={iconeLogo} />
          <nav className="flex gap-6">
            <Link to="/login" className="border-2 border-white text-white px-4 rounded-lg py-2 hover:text-blue-200">Entrar</Link>
            <Link to="/cadastro" className="bg-white text-blue-950 px-4 py-2 rounded-lg font-medium hover:bg-blue-50">
              Cadastrar
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-7xl font-bold text-white mb-6">
            Gestão Escolar <br />Simplificada
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Sistema completo para coordenação, formadores, formandos e secretaria.
            Turmas, pautas, notas e relatórios em um só lugar.
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              to="/cadastro"
              className="bg-white text-blue-950 px-8 py-2 md:py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition-colors"
            >
              Começar Agora
            </Link>
            <Link
              to="/login"
              className="border-2 border-white text-white px-8 py-2 sm:py-4 rounded-lg font-bold text-lg hover:bg-white/10 transition-colors flex items-center"
            >
              Entrar
            </Link>
          </div>
        </div>
      </main>

      <section className="py-20 px-6 hidden md:block">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            { icon: "🏫", title: "Turmas", desc: "Crie e gerencie turmas com chaves de acesso seguras" },
            { icon: "📋", title: "Pautas Automáticas", desc: "Notas e médias calculadas automaticamente" },
            { icon: "📊", title: "Relatórios", desc: "Acompanhamento completo para coordenação e secretaria" },
          ].map((feature, i) => (
            <div key={i} className="bg-white/10 backdrop-blur rounded-2xl p-8 text-white">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-blue-200">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="py-8 border-t border-white/10 text-center text-blue-300">
        <p>Plataforma de Gestão Escolar Provincial &copy; 2026</p>
      </footer>
    </div>
  )
}