import { Link } from 'react-router-dom'

export default function LandingPage(){
    
    return (
        <section className="bg-[url('../../fundo.png')] h-screen w-full bg-no-repeat bg-cover">

            <div className="bg-blue-900/80 h-full w-full flex flex-col justify-center align-middle gap-10">

                <h1 className="text-center mt-12 text-white font-bold p-5 opacity-100 md:text-5xl">Seja Bem vindo</h1>

                <div className="w-4/5 m-auto  p-5 bg-blue-500/70 shadow-xl rounded-md md:w-1/3 lg:w-1/4">

                    <p className="text-center font-bold text-white italic">Desfrute dos nossos servicos e ajude nos a melhorar a qualidade e o conforto do seu trabalho</p>

                    <p className="animate-spin mt-5 text-center font-bold text-white text-2xl  rounded-tl-2xl rounded-br-2xl w-1/4 m-auto flex justify-center align-middle">❄</p>

                    <div className="flex justify-between mt-5">
                        <button className="p-2 m-4 bg-violet-700 text-white font-bold text-center cursor-pointer shadow-sm  rounded-md hover:bg-violet-600 transition-colors">
                            <Link to="/login" className="p-3">Entrar</Link>
                        </button>
                        <button className="p-2 m-4 bg-violet-700 text-white font-bold text-center cursor-pointer shadow-sm  rounded-md hover:bg-violet-600 transition-colors">
                            <Link to="/cadastro" className="p-3">Criar conta</Link>
                        </button>
                    </div>
                </div>
            </div>

        </section>
    )
}