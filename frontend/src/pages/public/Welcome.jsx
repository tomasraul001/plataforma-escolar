import { useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../../contexts/AuthContext"

export default function Welcome() {
  const navigate = useNavigate()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (!loading && user) {
      switch (user.role) {
        case "coordenador":
          navigate("/coordenador")
          break
        case "formador":
          navigate("/formador")
          break
        case "formando":
          navigate("/formando")
          break
        case "secretaria":
          navigate("/secretaria")
          break
        default:
          navigate("/")
      }
    }
  }, [user, loading, navigate])

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 to-indigo-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white border-t-transparent mx-auto mb-6"></div>
        <h2 className="text-2xl font-bold">Redirecionando...</h2>
        <p className="text-blue-200 mt-2">Carregando seu painel</p>
      </div>
    </div>
  )
}