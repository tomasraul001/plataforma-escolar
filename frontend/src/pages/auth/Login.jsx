import { Link, useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"
import { useToast } from "../../contexts/ToastContext"
import { cardClass, subtitleClass, labelClass, inputClass, submitClass, footerTextClass } from "./authStyles"

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
            if (error.response?.status === 429) {
                toast.error("Muitas tentativas. Aguarde alguns minutos e tente novamente.")
            } else {
                toast.error("Email ou senha incorreto")
            }
        }finally{
            setLoading(false)
        }
    }

    return (
        <section className="flex min-h-screen justify-center items-center px-4 py-10">
            <div className={cardClass}>
                <div className="flex flex-col items-center mb-8">
                    <h3 className="font-bold text-3xl text-white mb-1">Bem-vindo de volta</h3>
                    <p className={subtitleClass}>Acessa a tua conta para continuar</p>
                </div>

                <form className="flex flex-col gap-5" onSubmit={handleLogin}>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="email">Email</label>
                        <input id="email" className={inputClass} type="email" placeholder="exemplo@gmail.com" ref={inputEmail} autoComplete="email" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className={labelClass} htmlFor="password">Senha</label>
                        <input id="password" className={inputClass} type="password" placeholder="A tua senha" ref={inputPassword} autoComplete="current-password" />
                    </div>
                    <button disabled={loading}
                        className={`${submitClass} ${loading ? 'opacity-60 cursor-wait' : ''}`} type="submit">
                        {loading ? 'Processando...' : 'Entrar'}
                    </button>
                </form>

                <div className="flex justify-center items-center gap-2 mt-6">
                    <span className={footerTextClass}>Não tens conta?</span>
                    <Link to="/cadastro" className="text-violet-400 font-semibold hover:text-violet-200 hover:underline transition-colors">Cadastre-se</Link>
                </div>
            </div>
        </section>
    )
}
