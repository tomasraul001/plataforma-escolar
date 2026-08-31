import { Link } from "react-router-dom"
import { useRef, useState } from "react"
import { useAuth } from "../../contexts/AuthContext"

export default function Sigin(){
    let inputName = useRef()
    let inputEmail = useRef()
    let inputPassword = useRef()
    let inputKey = useRef()

    let [loading, setLoading] = useState(false)
    const { register } = useAuth()

    async function handleSigin(event){
        event.preventDefault();

        const accessKey = inputKey.current.value

        if(!inputKey.current.value) return alert("Insira a chave de acesso!")
        if(!inputName.current.value || !inputEmail.current.value || !inputPassword.current.value) return alert("Preencha todos os campos")

        try{
            setLoading(true)
            await register({
                name: inputName.current.value,
                email: inputEmail.current.value,
                password: inputPassword.current.value,
                accessKey: accessKey
            })

            alert("Usuario criado com sucesso")
        }catch (error){
            console.log('Erro ao criar usuario', error)
            alert("Erro ao criar usuario")
        }finally{
            setLoading(false)
        }
    }

    return (
        <section className="flex min-h-screen justify-center items-center px-4 py-10">
            <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl p-8 md:p-10">
                <div className="flex flex-col items-center mb-8">
                    <h3 className="font-bold text-3xl text-white mb-1">Criar Conta</h3>
                    <p className="text-blue-200 text-sm">Regista-te para aceder à plataforma</p>
                </div>

                <form className="flex flex-col gap-5" onSubmit={handleSigin}>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="name">Nome</label>
                        <input id="name" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" type="text" placeholder="O teu nome" ref={inputName} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="email">Email</label>
                        <input id="email" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" type="email" placeholder="exemplo@email.com" ref={inputEmail} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="password">Senha</label>
                        <input id="password" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" type="password" placeholder="••••••••" ref={inputPassword} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-blue-100" htmlFor="accessKey">Chave de Acesso</label>
                        <input id="accessKey" type="text" placeholder="Insere a chave fornecida" className="w-full bg-white/10 text-white placeholder:text-white/40 border border-white/20 focus:border-violet-400 focus:bg-white/15 outline-none rounded-lg px-4 py-3 transition-all" ref={inputKey} />
                    </div>
                    <button disabled={loading}
                        className={`w-full mt-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white py-3.5 font-bold rounded-lg hover:from-violet-500 hover:to-fuchsia-500 shadow-lg shadow-violet-900/40 transition-all cursor-pointer active:scale-[0.98] ${loading ? 'opacity-60 cursor-wait' : ''}`} type="submit">
                        {loading ? 'Processando...' : 'Criar Conta'}
                    </button>
                </form>

                <div className="flex justify-center items-center gap-2 mt-6">
                    <span className="text-blue-200">Já tens conta?</span>
                    <Link to="/Login" className="text-violet-300 font-semibold hover:text-violet-200 hover:underline transition-colors">Faz Login</Link>
                </div>
            </div>
        </section>
    )
}
