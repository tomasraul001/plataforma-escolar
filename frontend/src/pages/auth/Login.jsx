import { Link, useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../contexts/ToastContext"

export default function Login(){
    let inputEmail = useRef()
    let inputPassword = useRef()
    let navigate = useNavigate()
    let [loading, setLoading] = useState(false)
    const { login } = useAuth()
    const toast = useToast().toast

    async function handleLogin(event){
        event.preventDefault();
        setLoading(true)

        try{
            const role = await login(inputEmail.current.value, inputPassword.current.value)

            // Redireciona baseado na role
            switch (role){
                case 'formador':
                    navigate('/formador')
                    break;
                case 'formando':
                    navigate('/formando')
                    break;
                case 'coordenador':
                    navigate('/coordenador')
                    break;
                case 'secretaria':
                    navigate('/secretaria')
                    break;
                default:
                    navigate('/welcome')
            }
            toast.success("Login efetuado com sucesso")
        }catch (error){
            console.log('email ou senha errados',error)
            toast.error("Email ou senha incorreto")
        }finally{
            setLoading(false)
        }
    }

    return (
        <section className="flex min-h-screen justify-center items-center px-4 py-10">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8 md:p-10">
                <div className="flex flex-col items-center mb-8">
                    <h3 className="font-bold text-3xl text-white mb-1">Bem-vindo de volta</h3>
                    <p className="text-blue-400 text-sm">Acessa a tua conta para continuar</p>
                </div>

                <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="email">Email</label>
                        <input id="email" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" type="email" placeholder="exemplo@email.com" ref={inputEmail} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="password">Senha</label>
                        <input id="password" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" type="password" placeholder="••••••••" ref={inputPassword} />
                    </div>
                    <button disabled={loading}
                        className={`w-full mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3.5 font-bold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition-all cursor-pointer active:scale-[0.98] ${loading ? 'opacity-60 cursor-wait' : ''}`} type="submit">
                        {loading ? 'Processando...' : 'Entrar'}
                    </button>
                </form>

                <div className="flex justify-center items-center gap-2 mt-6">
                    <span className="text-blue-400">Não tens conta?</span>
                    <Link to="/cadastro" className="text-violet-500 font-semibold hover:text-violet-200 hover:underline transition-colors">Cadastre-se</Link>
                </div>
            </div>
        </section>
    )
}
