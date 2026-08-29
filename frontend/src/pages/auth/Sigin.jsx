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
        <section className="bg-blue-950 h-screen flex justify-center items-center">
            <div className="flex flex-col  border border-gray-500 shadow-lg p-8 md:p-15 rounded-lg">
                <h3 className="font-bold text-2xl text-center text-white mb-2">Cadastro</h3>

                <form className="flex flex-col gap-6 p-5 w-full" onSubmit={handleSigin}>
                    <input className="bg-gray-700 text-white p-1  placeholder:text-gray-400 border border-gray-600 focus:outline-white rounded" type="text" placeholder="Nome" ref={inputName} />  
                    <input className="bg-gray-700 text-white p-1 placeholder:text-gray-400 border border-gray-600 focus:outline-white rounded" type="email" placeholder="Email" ref={inputEmail}/>  
                    <input className="bg-gray-700 text-white p-1  placeholder:text-gray-400 border border-gray-600 focus:outline-white rounded" type="password" placeholder="Senha" ref={inputPassword}/> 
                    <input type="text" placeholder="Access Key" className="bg-gray-700 text-white p-1 px-2 placeholder:text-gray-400 border border-gray-600 focus:outline-none rounded" ref={inputKey} /> 
                    <button disabled={loading}
                        className={` bg-violet-700 text-white mt-2 p-1 font-bold rounded hover:bg-violet-500 cursor-pointer transition-color ${loading ? 'opacity-50 cursor-wait' : ''}`} type="submit" >
                        {loading ? 'Processando...' : 'Submeter'}
                    </button>
                </form>  

                <Link  to="/Login" className="text-blue-500 text-center m-2 hover:text-blue-600 hover:underline transition-color" >Ja tens conta? Faça Login </Link>
            </div>
            
        </section>
    )
}