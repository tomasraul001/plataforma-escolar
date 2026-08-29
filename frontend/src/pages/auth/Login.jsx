import { Link, useNavigate } from "react-router-dom"
import { useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"

export default function Login(){
    let inputEmail = useRef()
    let inputPassword = useRef()
    let navigate = useNavigate()
    let [loading, setLoading] = useState(false)
    const { login } = useAuth()

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
            alert("Login efetuado com sucesso")
        }catch (error){
            console.log('email ou senha errados',error)
            alert("Email ou senha incorreto")
        }finally{
            setLoading(false)
        }
    }

    return (
        <section className="flex justify-center items-center h-screen bg-blue-950">
            <div className="flex flex-col  border border-gray-500 shadow-lg p-8 md:p-15 rounded-lg ">
                <h3 className="font-bold text-2xl text-center text-white mb-4">Login</h3>

                <form className="flex flex-col gap-6 " onSubmit={handleLogin}> 
                <input className="bg-gray-700 text-white p-1 px-2 placeholder:text-gray-400 border border-gray-600 focus:outline-none rounded" type="email" placeholder="Email" ref={inputEmail}/>  
                <input className="bg-gray-700 text-white p-1 px-2 placeholder:text-gray-400 border border-gray-600 focus:outline-none rounded" type="password" placeholder="Senha" ref={inputPassword} />  
                <button disabled={loading}
                        className={`w-full bg-violet-700 text-white p-1 font-bold rounded hover:bg-violet-500 cursor-pointer transition-color ${loading ? 'opacity-50 cursor-wait' : ''}`} type="submit" >
                        {loading ? 'Processando...' : 'Login'}
                </button>
                </form>  

                <Link  to="/cadastro" className="text-blue-400 text-center m-2 hover:text-blue-500 hover:underline transition-color" >Nao tens conta? Cadastre-se </Link>
            </div>
        </section>
    )
}